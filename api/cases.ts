import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;
  const userId = req.headers['x-user-id'] as string;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');

  if (method === 'OPTIONS') return res.status(200).end();

  // Security Check: Every request must have a valid User ID from Supabase Auth
  if (!userId || userId === 'undefined' || userId === 'null') {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Access denied. Please log in with Google to manage your clinical records.' 
    });
  }

  try {
    switch (method) {
      case 'GET':
        const getResult = await pool.query(`
          SELECT 
            id, serial_number, date::text as date, hospital, patient_name, 
            age, sex, diagnosis, anesthesia, procedure, 
            start_time::text as start_time, end_time::text as end_time, 
            duration, payment_mode, payment_status, surgeon_name, 
            amount, remarks 
          FROM cases 
          WHERE user_id = $1
          ORDER BY date DESC, serial_number DESC 
          LIMIT 1000
        `, [userId]);
        return res.status(200).json(getResult.rows);

      case 'POST':
        const b = req.body;
        // Calculate daily serial number specific to THIS authenticated user
        const serialResult = await pool.query(
          'SELECT COALESCE(MAX(serial_number), 0) + 1 as next_serial FROM cases WHERE date = $1 AND user_id = $2',
          [b.date, userId]
        );
        const nextSerial = serialResult.rows[0].next_serial;

        const insertResult = await pool.query(`
          INSERT INTO cases (
            user_id, serial_number, date, hospital, patient_name, age, sex, 
            diagnosis, anesthesia, procedure, start_time, end_time, 
            duration, payment_mode, payment_status, surgeon_name, amount, remarks
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
          ) RETURNING *, date::text as date, start_time::text as start_time, end_time::text as end_time
        `, [
          userId, nextSerial, b.date, b.hospital, b.patientName, b.age || null, b.sex,
          b.diagnosis, b.anesthesia, b.procedure, b.startTime, b.endTime,
          b.duration, b.paymentMode, b.paymentStatus, b.surgeonName, b.amount, b.remarks || ''
        ]);
        return res.status(201).json(insertResult.rows[0]);

      case 'PATCH':
        const { id } = req.query;
        const u = req.body;
        const updateResult = await pool.query(`
          UPDATE cases SET 
            hospital = $1, patient_name = $2, age = $3, sex = $4, 
            diagnosis = $5, anesthesia = $6, procedure = $7, 
            start_time = $8, end_time = $9, duration = $10, 
            payment_mode = $11, payment_status = $12, 
            surgeon_name = $13, amount = $14, remarks = $15
          WHERE id = $16 AND user_id = $17
          RETURNING *, date::text as date, start_time::text as start_time, end_time::text as end_time
        `, [
          u.hospital, u.patientName, u.age, u.sex, u.diagnosis, u.anesthesia,
          u.procedure, u.startTime, u.endTime, u.duration, u.paymentMode,
          u.paymentStatus, u.surgeonName, u.amount, u.remarks, id, userId
        ]);
        
        if (updateResult.rowCount === 0) return res.status(404).json({ error: 'Case not found or unauthorized access.' });
        return res.status(200).json(updateResult.rows[0]);

      case 'DELETE':
        const deleteId = req.query.id;
        const deleteResult = await pool.query('DELETE FROM cases WHERE id = $1 AND user_id = $2', [deleteId, userId]);
        if (deleteResult.rowCount === 0) return res.status(404).json({ error: 'Case not found or unauthorized access.' });
        return res.status(204).end();

      default:
        return res.status(405).end();
    }
  } catch (error: any) {
    console.error('Database Error:', error);
    return res.status(500).json({ error: 'Database Error', message: error.message });
  }
}