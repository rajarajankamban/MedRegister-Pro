import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

// This is the most effective way to resolve SELF_SIGNED_CERT_IN_CHAIN in Vercel
// when connecting to databases with self-signed or non-standard CA chains.
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

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') return res.status(200).end();

  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    return res.status(500).json({ error: 'POSTGRES_URL is not defined.' });
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
          ORDER BY date DESC, serial_number DESC 
          LIMIT 1000
        `);
        return res.status(200).json(getResult.rows);

      case 'POST':
        const b = req.body;
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
        return res.status(200).json(updateResult.rows[0]);

      case 'DELETE':
        const deleteId = req.query.id;
        await pool.query('DELETE FROM cases WHERE id = $1', [deleteId]);
        return res.status(204).end();

      default:
        return res.status(405).end();
    }
  } catch (error: any) {
    console.error('Database Error:', error);
    return res.status(500).json({ 
      error: 'Database Connection Error', 
      message: error.message,
      code: error.code 
    });
  }
}