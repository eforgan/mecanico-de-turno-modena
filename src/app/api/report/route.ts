import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { base, inspector, dateStr, timeStr, location, weather, activityComment, activityAudioBase64, novelties, verifiedAircraft, fuelDeposits, items } = body;

    // Create a transporter using environment variables (SMTP)
    // For production, these must be set in .env or deployment settings
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Supabase DB Insert
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        await supabase.from('inspection_reports').insert({
          base_name: base,
          inspector_id: user?.id || null, 
          location_data: location,
          weather_data: weather,
          novelties_count: novelties?.length || 0,
          status: 'SUBMITTED',
          items_data: { checklist: items, verifiedAircraft: verifiedAircraft || [], fuelDeposits: fuelDeposits || [] },
          activity_comments: activityComment || null
        });
        console.log("Supabase insert exitoso");
      } catch (dbError) {
        console.error("Error guardando en Supabase, enviando solo correo...", dbError);
      }
    }

    // Generate HTML for multiple novelties
    const noveltiesHtml = novelties && novelties.length > 0 
      ? novelties.map((nov: any) => `
        <div style="border: 1px solid #ddd; padding: 10px; margin-bottom: 8px;">
          <h4 style="margin: 0 0 5px 0; color: #b30000; text-transform: uppercase;">▶ ${nov.category}</h4>
          <p style="margin: 0; font-size: 14px;">${nov.text || '<em>Solo evidencia de audio/foto adjunta.</em>'}</p>
        </div>
      `).join('')
      : '<p style="margin:0; font-size: 14px;">Ninguna falla reportada.</p>';

    // Checklist Formatting (Mock conversion to text)
    const checklistMap: Record<number, string> = {
      1: "Estado general de limpieza y orden en hangares",
      2: "Niveles de fluidos auxiliares y grupos electrógenos",
      3: "Matafuegos y sistemas de alarma accesibles y en regla",
      4: "Estado de la plataforma y señalización correcta"
    };
    const checklistHtml = Object.keys(items || {}).map(id => {
      const status = items[Number(id)];
      const color = status ? 'green' : 'red';
      const label = status ? 'APTO' : 'NO APTO';
      return `<li style="margin-bottom: 4px;"><strong>${checklistMap[Number(id)] || `Item ${id}`}:</strong> <span style="color: ${color}; font-weight: bold;">[${label}]</span></li>`;
    }).join('') || "<li>No se completaron ítems</li>";

    // Format Verified Aircraft
    const aircraftHtml = verifiedAircraft && verifiedAircraft.length > 0
      ? `<table class="print-table" style="width:100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #002244; color: white;">
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Matrícula</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Marca/Modelo</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">TG</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Estado</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Novedades</th>
            </tr>
          </thead>
          <tbody>
            ${verifiedAircraft.map((a: any) => `
              <tr style="background-color: #f8fafc;">
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>${a.registration || '-'}</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${a.brand} ${a.model}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${a.tg || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: ${a.status === 'EN SERVICIO' ? 'green' : 'red'}; font-weight: bold;">${a.status}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px;">${a.novelties || 'Sin Novedades'}</td>
              </tr>
            `).join('')}
          </tbody>
         </table>`
      : '<p style="font-size:14px;">No se registraron aeronaves en este turno.</p>';

    // Format Fuel Deposits
    const fuelHtml = fuelDeposits && fuelDeposits.length > 0
      ? `<table class="print-table" style="width:100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #002244; color: white;">
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Depósito/Cisterna</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Cantidad</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Prueba</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Observaciones</th>
            </tr>
          </thead>
          <tbody>
            ${fuelDeposits.map((d: any) => `
              <tr style="background-color: #f8fafc;">
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>${d.type || '-'}</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${d.amount || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: ${d.testResult === 'APROBADO' ? 'green' : 'red'}; font-weight: bold;">${d.testResult || 'NO EVALUADO'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px;">${d.testNotes || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
         </table>`
      : '<p style="font-size:14px;">No se registraron pruebas de cisternas en este turno.</p>';

    // Format the email HTML body (A4 Layout)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { background-color: #f0f0f0; padding: 20px; font-family: Arial, Helvetica, sans-serif; }
          .container { max-width: 800px; margin: 0 auto; background-color: #ffffff; padding: 40px; border: 1px solid #ccc; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
          .section { border: 1px solid #002244; margin-bottom: 20px; page-break-inside: avoid; }
          .section-title { background: #002244; color: #fff; padding: 8px 12px; font-weight: bold; text-transform: uppercase; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .section-content { padding: 12px; font-size: 14px; }
          @media print {
            body { background-color: #ffffff; padding: 0; }
            .container { box-shadow: none; border: none; padding: 0; max-width: 100%; }
            .section-title { background-color: #002244 !important; color: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .print-table { border: 1px solid #000 !important; }
            .print-bg { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          
          <!-- HEADER -->
          <div style="border-bottom: 3px solid #002244; padding-bottom: 15px; margin-bottom: 20px; text-align: center;">
            <h1 style="color: #002244; margin: 0; font-size: 24px; text-transform: uppercase;">Reporte de Inspección Diaria</h1>
            <h3 style="color: #666; margin: 5px 0 0 0;">Gruppo Modena - Transporte Aéreo</h3>
          </div>

          <!-- INFO GENERAL -->
          <table class="print-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td class="print-bg" style="padding: 10px; border: 1px solid #002244; background: #f8fafc; width: 50%;">
                <strong>Base Operativa:</strong> ${base || 'N/A'}<br/>
                <strong>Inspector:</strong> ${inspector || 'Mecánico de Turno'}
              </td>
              <td class="print-bg" style="padding: 10px; border: 1px solid #002244; background: #f8fafc; width: 50%;">
                <strong>Fecha:</strong> ${dateStr || 'N/A'}<br/>
                <strong>Hora:</strong> ${timeStr || 'N/A'}
              </td>
            </tr>
          </table>

          <!-- CLIMA Y GPS -->
          <div class="section">
            <div class="section-title">1. Ubicación y Meteorología</div>
            <div class="section-content">
              <p style="margin: 0 0 5px 0;"><strong>Coordenadas GPS:</strong> ${location ? `${location.lat}, ${location.lng}` : 'N/A'}</p>
              <p style="margin: 0 0 5px 0;"><strong>Condiciones:</strong> ${weather?.conditions || 'N/A'} | <strong>Temperatura:</strong> ${weather?.temp || 'N/A'}</p>
              <p style="margin: 0;"><strong>Horarios Solares:</strong> Amanecer: ${weather?.sunrise || 'N/A'} / Atardecer: ${weather?.sunset || 'N/A'}</p>
            </div>
          </div>

          <!-- AERONAVES VERIFICADAS -->
          <div class="section">
            <div class="section-title">2. Flota Verificada</div>
            <div class="section-content">
              ${aircraftHtml}
            </div>
          </div>

          <!-- CISTERNAS Y COMBUSTIBLE -->
          <div class="section">
            <div class="section-title">3. Pruebas de Combustible y Cisternas</div>
            <div class="section-content">
              ${fuelHtml}
              <p style="margin: 0; font-size: 12px; color: #666; font-style: italic;">* Las fotografías de las pruebas del frasco correspondientes a cada cisterna se encuentran adjuntas a este correo.</p>
            </div>
          </div>

          <!-- CHECKLIST -->
          <div class="section">
            <div class="section-title">4. Checklist de Instalaciones y Apoyo Operativo</div>
            <div class="section-content">
              <ul style="margin: 0; padding-left: 20px;">
                ${checklistHtml}
              </ul>
            </div>
          </div>

          <!-- COMENTARIOS DE ACTIVIDAD -->
          <div class="section">
            <div class="section-title">5. Comentarios de Actividad / Turno</div>
            <div class="section-content" style="min-height: 80px; background: #f9f9f9;" class="print-bg">
              ${activityComment ? `<p style="margin:0; white-space: pre-wrap;">${activityComment}</p>` : '<p style="margin:0; color: #999; font-style: italic;">Sin comentarios adicionales registrados para este turno.</p>'}
              ${activityAudioBase64 ? `<p style="margin-top: 10px; font-size: 12px; color: #008800; font-weight: bold;">(Evidencia de audio STT adjunta al correo).</p>` : ''}
            </div>
          </div>

          <!-- FALLAS -->
          <div class="section">
            <div class="section-title">4. Reporte de Fallas en Instalaciones/Equipos</div>
            <div class="section-content">
              ${noveltiesHtml}
            </div>
          </div>

          <!-- FOOTER -->
          <div style="text-align: center; margin-top: 40px; padding-top: 10px; border-top: 1px dashed #ccc; font-size: 12px; color: #888;">
            Generado automáticamente por el Sistema de Control de Mantenimiento - Modena
          </div>
        </div>
      </body>
      </html>
    `;

    // Process attachments
    const attachments: any[] = [];
    
    if (fuelDeposits && fuelDeposits.length > 0) {
      fuelDeposits.forEach((dep: any, idx: number) => {
        if (dep.photoBase64) {
          const base64Data = dep.photoBase64.split(';base64,').pop();
          attachments.push({
            filename: `cisterna_${idx + 1}_prueba_frasco.jpg`,
            content: base64Data,
            encoding: 'base64',
          });
        }
      });
    }

    if (novelties && novelties.length > 0) {
      novelties.forEach((nov: any, idx: number) => {
        if (nov.photoUrl) {
          const photoData = nov.photoUrl.split(';base64,').pop();
          attachments.push({
            filename: `novedad_${idx + 1}_foto.jpg`,
            content: photoData,
            encoding: 'base64',
          });
        }
        if (nov.audioBase64) {
          const audioData = nov.audioBase64.split(';base64,').pop();
          attachments.push({
            filename: `novedad_${idx + 1}_audio.webm`,
            content: audioData,
            encoding: 'base64',
          });
        }
      });
    }

    if (activityAudioBase64) {
      const actAudioData = activityAudioBase64.split(';base64,').pop();
      attachments.push({
        filename: 'comentario_actividad.webm',
        content: actAudioData,
        encoding: 'base64',
      });
    }

    // Send Mail
    await transporter.sendMail({
      from: '"App Modena" <noreply@gruppomodena.com>',
      to: 'eforgan@gruppomodena.com',
      subject: `Reporte de Inspección - Base: ${base}`,
      html: htmlContent,
      attachments,
    });

    return NextResponse.json({ success: true, message: 'Reporte enviado con éxito' });
  } catch (error) {
    console.error('Error enviando el reporte:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
