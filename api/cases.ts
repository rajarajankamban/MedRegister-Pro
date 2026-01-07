import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

// Initialize pool outside the handler for connection re-use across serverless invocations
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase/AWS managed Postgres
  },
  max: 10, // Adjust based on your Supabase tier
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;

  // CORS Headers for cross-origin safety
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') return res.status(200).end();

  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    return res.status(500).json({ 
      error: 'Environment Error', 
      message: 'POSTGRES_URL variable is not defined in Vercel settings.' 
    });
  }

  try {
    switch (method) {
      case 'GET':
        // date::text and time::text formatting ensures standard strings are returned to the frontend
        const getResult = await pool.query(`
          SELECT 
            id, serial_number, date::text as date, hospital, patient_name, 
            age, sex, diagnosis, anesthesia, procedure, 
            start_time::text as start_time, end_time::text as end_time, 
            duration, payment_mode, payment_status, surgeon_name, 
            amount, remarks 
          FROM cases 
          ORDER BY date DESC, serial_number DESC 
          LIMIT 1000
        `);
        return res.status(200).json(getResult.rows);

      case 'POST':
        const b = req.body;
        // Logic: Increment serial number per specific day
        const serialResult = await pool.query(
          'SELECT COALESCE(MAX(serial_number), 0) + 1 as next_serial FROM cases WHERE date = $1',
          [b.date]
        );
        const nextSerial = serialResult.rows[0].next_serial;

        const insertResult = await pool.query(`
          INSERT INTO cases (
            serial_number, date, hospital, patient_name, age, sex, 
            diagnosis, anesthesia, procedure, start_time, end_time, 
            duration, payment_mode, payment_status, surgeon_name, amount, remarks
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
          ) RETURNING *, date::text as date, start_time::text as start_time, end_time::text as end_time
        `, [
          nextSerial, b.date, b.hospital, b.patientName, b.age || null, b.sex,
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
          WHERE id = $16
          RETURNING *, date::text as date, start_time::text as start_time, end_time::text as end_time
        `, [
          u.hospital, u.patientName, u.age, u.sex, u.diagnosis, u.anesthesia,
          u.procedure, u.startTime, u.endTime, u.duration, u.paymentMode,
          u.paymentStatus, u.surgeonName, u.amount, u.remarks, id
        ]);
        
        if (updateResult.rowCount === 0) {
          return res.status(404).json({ error: 'Case not found' });
        }
        return res.status(200).json(updateResult.rows[0]);

      case 'DELETE':
        const deleteId = req.query.id;
        if (!deleteId) return res.status(400).json({ error: 'ID required' });
        await pool.query('DELETE FROM cases WHERE id = $1', [deleteId]);
        return res.status(204).end();

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error: any) {
    console.error('Database Operation Error:', error);
    return res.status(500).json({ 
      error: 'Database Error', 
      message: error.message,
      code: error.code,
      hint: error.message.includes('authentication') ? 'Check your password and URL encoding.' : 'Check table existence.'
    });
  }
}