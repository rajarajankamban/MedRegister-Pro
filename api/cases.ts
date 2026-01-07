import { VercelRequest, VercelResponse } from '@vercel/node';
import { createPool } from '@vercel/postgres';

// Initialize pool outside the handler for connection re-use in serverless
const pool = createPool({
  connectionString: process.env.POSTGRES_URL
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') return res.status(200).end();

  if (!process.env.POSTGRES_URL) {
    return res.status(500).json({ 
      error: 'Config Error', 
      message: 'POSTGRES_URL is missing in environment variables.' 
    });
  }

  try {
    switch (method) {
      case 'GET':
        // Using pool.sql for tagged template queries
        const { rows } = await pool.sql`
          SELECT 
            id, serial_number, date::text as date, hospital, patient_name, 
            age, sex, diagnosis, anesthesia, procedure, 
            start_time::text as start_time, end_time::text as end_time, 
            duration, payment_mode, payment_status, surgeon_name, 
            amount, remarks 
          FROM cases 
          ORDER BY date DESC, serial_number DESC 
          LIMIT 1000
        `;
        return res.status(200).json(rows);

      case 'POST':
        const b = req.body;
        const serialResult = await pool.sql`
          SELECT COALESCE(MAX(serial_number), 0) + 1 as next_serial 
          FROM cases WHERE date = ${b.date}
        `;
        const nextSerial = serialResult.rows[0].next_serial;

        const insertResult = await pool.sql`
          INSERT INTO cases (
            serial_number, date, hospital, patient_name, age, sex, 
            diagnosis, anesthesia, procedure, start_time, end_time, 
            duration, payment_mode, payment_status, surgeon_name, amount, remarks
          ) VALUES (
            ${nextSerial}, ${b.date}, ${b.hospital}, ${b.patientName}, 
            ${b.age || null}, ${b.sex}, ${b.diagnosis}, ${b.anesthesia}, 
            ${b.procedure}, ${b.startTime}, ${b.endTime}, ${b.duration}, 
            ${b.paymentMode}, ${b.paymentStatus}, ${b.surgeonName}, 
            ${b.amount}, ${b.remarks || ''}
          ) RETURNING *, date::text as date, start_time::text as start_time, end_time::text as end_time
        `;
        return res.status(201).json(insertResult.rows[0]);

      case 'PATCH':
        const { id } = req.query;
        const u = req.body;
        const updateResult = await pool.sql`
          UPDATE cases SET 
            hospital = ${u.hospital}, patient_name = ${u.patientName},
            age = ${u.age}, sex = ${u.sex}, diagnosis = ${u.diagnosis},
            anesthesia = ${u.anesthesia}, procedure = ${u.procedure},
            start_time = ${u.startTime}, end_time = ${u.endTime},
            duration = ${u.duration}, payment_mode = ${u.paymentMode},
            payment_status = ${u.paymentStatus}, surgeon_name = ${u.surgeonName},
            amount = ${u.amount}, remarks = ${u.remarks}
          WHERE id = ${id as string}
          RETURNING *, date::text as date, start_time::text as start_time, end_time::text as end_time
        `;
        return res.status(200).json(updateResult.rows[0]);

      case 'DELETE':
        const deleteId = req.query.id;
        await pool.sql`DELETE FROM cases WHERE id = ${deleteId as string}`;
        return res.status(204).end();

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error: any) {
    console.error('Postgres Pool Error:', error);
    return res.status(500).json({ 
      error: 'Database Error', 
      details: error.message,
      code: error.code
    });
  }
}