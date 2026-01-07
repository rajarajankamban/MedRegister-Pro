import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;

  // Set CORS headers for local development if necessary
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (method) {
      case 'GET':
        // Fetch cases. We cast date to text to prevent timezone shifts during JSON serialization
        const { rows } = await sql`
          SELECT 
            id, 
            serial_number, 
            date::text as date, 
            hospital, 
            patient_name, 
            age, 
            sex, 
            diagnosis, 
            anesthesia, 
            procedure, 
            start_time::text as start_time, 
            end_time::text as end_time, 
            duration, 
            payment_mode, 
            payment_status, 
            surgeon_name, 
            amount, 
            remarks 
          FROM cases 
          ORDER BY date DESC, serial_number DESC 
          LIMIT 1000
        `;
        return res.status(200).json(rows);

      case 'POST':
        const b = req.body;
        
        // Securely calculate next serial number for this specific day
        const serialResult = await sql`
          SELECT COALESCE(MAX(serial_number), 0) + 1 as next_serial 
          FROM cases 
          WHERE date = ${b.date}
        `;
        const nextSerial = serialResult.rows[0].next_serial;

        const insertResult = await sql`
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
        const updateResult = await sql`
          UPDATE cases SET 
            hospital = ${u.hospital},
            patient_name = ${u.patientName},
            age = ${u.age},
            sex = ${u.sex},
            diagnosis = ${u.diagnosis},
            anesthesia = ${u.anesthesia},
            procedure = ${u.procedure},
            start_time = ${u.startTime},
            end_time = ${u.endTime},
            duration = ${u.duration},
            payment_mode = ${u.paymentMode},
            payment_status = ${u.paymentStatus},
            surgeon_name = ${u.surgeonName},
            amount = ${u.amount},
            remarks = ${u.remarks}
          WHERE id = ${id as string}
          RETURNING *, date::text as date, start_time::text as start_time, end_time::text as end_time
        `;
        return res.status(200).json(updateResult.rows[0]);

      case 'DELETE':
        const deleteId = req.query.id;
        await sql`DELETE FROM cases WHERE id = ${deleteId as string}`;
        return res.status(204).end();

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error: any) {
    console.error('Serverless DB Error:', error);
    return res.status(500).json({ 
      error: 'Backend failure', 
      message: error.message,
      hint: 'Ensure POSTGRES_URL in Vercel is set to your Supabase Transaction Pooler URI (Port 6543).'
    });
  }
}