
import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        const { rows } = await sql`SELECT * FROM cases ORDER BY date DESC, serial_number DESC`;
        return res.status(200).json(rows);

      case 'POST':
        const body = req.body;
        // Server-side calculation of daily serial number
        const serialResult = await sql`
          SELECT COALESCE(MAX(serial_number), 0) + 1 as next_serial 
          FROM cases WHERE date = ${body.date}
        `;
        const nextSerial = serialResult.rows[0].next_serial;

        const insertResult = await sql`
          INSERT INTO cases (
            serial_number, date, hospital, patient_name, age, sex, 
            diagnosis, anesthesia, procedure, start_time, end_time, 
            duration, payment_mode, payment_status, surgeon_name, amount, remarks
          ) VALUES (
            ${nextSerial}, ${body.date}, ${body.hospital}, ${body.patientName}, 
            ${body.age}, ${body.sex}, ${body.diagnosis}, ${body.anesthesia}, 
            ${body.procedure}, ${body.startTime}, ${body.endTime}, ${body.duration}, 
            ${body.paymentMode}, ${body.paymentStatus}, ${body.surgeonName}, 
            ${body.amount}, ${body.remarks}
          ) RETURNING *
        `;
        return res.status(201).json(insertResult.rows[0]);

      case 'PATCH':
        const { id } = req.query;
        const updateBody = req.body;
        const updateResult = await sql`
          UPDATE cases SET 
            hospital = ${updateBody.hospital},
            patient_name = ${updateBody.patientName},
            age = ${updateBody.age},
            sex = ${updateBody.sex},
            diagnosis = ${updateBody.diagnosis},
            anesthesia = ${updateBody.anesthesia},
            procedure = ${updateBody.procedure},
            start_time = ${updateBody.startTime},
            end_time = ${updateBody.endTime},
            duration = ${updateBody.duration},
            payment_mode = ${updateBody.paymentMode},
            payment_status = ${updateBody.paymentStatus},
            surgeon_name = ${updateBody.surgeonName},
            amount = ${updateBody.amount},
            remarks = ${updateBody.remarks}
          WHERE id = ${id as string}
          RETURNING *
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
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
