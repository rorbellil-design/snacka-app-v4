import nodemailer from 'nodemailer';

export default async function handler(req: any, res: any) {
  // CORS configuration for Vercel serverless functions
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, code, childName, purpose } = req.body || {};

  if (!email || !code) {
    return res.status(400).json({ error: 'E-post och kod krävs' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanCode = String(code).trim();
  const cleanChildName = childName ? String(childName).trim() : 'ditt barn';

  let purposeTitle = 'Verifieringskod för förälder';
  let purposeDescription = 'Använd denna 6-siffriga engångskod för att verifiera föräldrakontrollen i Snacka.';

  if (purpose === 'recovery') {
    purposeTitle = 'Återställning av Föräldra-PIN';
    purposeDescription = 'Du har begärt att återställa din PIN-kod för föräldraläget.';
  } else if (purpose === 'onboarding') {
    purposeTitle = 'Välkommen till Snacka – Verifiera förälder';
    purposeDescription = `Du håller på att installera Snacka för ${cleanChildName}. Ange denna kod för att låsa upp föräldrainställningarna.`;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .card { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
          .logo { font-size: 24px; font-weight: 900; color: #4f46e5; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; background: #e0e7ff; color: #4338ca; font-size: 12px; font-weight: 700; margin-bottom: 16px; }
          h1 { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 8px; }
          p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px; }
          .code-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0; }
          .code-label { font-size: 11px; text-transform: uppercase; font-weight: 800; color: #64748b; letter-spacing: 0.05em; margin-bottom: 6px; }
          .code-digits { font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #4f46e5; }
          .warning { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 12px; font-size: 12px; color: #92400e; margin-top: 20px; }
          .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">📞 Snacka</div>
          <div class="badge">Säkerhet & Föräldrakontroll</div>
          <h1>${purposeTitle}</h1>
          <p>${purposeDescription}</p>
          
          <div class="code-box">
            <div class="code-label">Engångskod (giltig i 10 minuter)</div>
            <div class="code-digits">${cleanCode}</div>
          </div>

          <p style="font-size: 13px;">Kopplat konto: <strong>${cleanEmail}</strong><br>Barnets profil: <strong>${cleanChildName}</strong></p>

          <div class="warning">
            🔒 <strong>Dela aldrig denna kod med barnet.</strong> Koden ger full tillgång till att ändra godkända kontakter, se samtalshistorik och byta PIN.
          </div>

          <div class="footer">
            Detta mejl skickades från Snacka Barnapp. Om du inte begärt koden kan du ignorera detta meddelande.
          </div>
        </div>
      </body>
    </html>
  `;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (!smtpHost && !process.env.GMAIL_USER) {
    return res.status(200).json({
      success: true,
      method: 'local',
      message: `Kod genererad (${cleanCode})`,
      code: cleanCode,
    });
  }

  try {
    let transporter;
    let fromEmail = process.env.SMTP_FROM || `"Snacka Föräldrakontroll" <${smtpUser}>`;

    if (smtpHost && smtpUser && smtpPass) {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
    } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });
      fromEmail = `"Snacka Föräldrakontroll" <${process.env.GMAIL_USER}>`;
    }

    if (!transporter) {
      return res.status(200).json({
        success: true,
        method: 'local',
        message: `Kod skapad (${cleanCode})`,
        code: cleanCode,
      });
    }

    const info = await transporter.sendMail({
      from: fromEmail,
      to: cleanEmail,
      subject: `Din Snacka-kod: ${cleanCode} (Föräldraverifiering)`,
      text: `Din 6-siffriga verifieringskod för Snacka är: ${cleanCode}\n\nAnvänd denna kod för att låsa upp eller konfigurera föräldrakontrollen för ${cleanChildName}. Dela aldrig koden med barnet.`,
      html: htmlContent,
    });

    console.log(`[REAL EMAIL SENT via Vercel Function] Code: ${cleanCode} -> ${cleanEmail} | MessageId: ${info.messageId}`);

    return res.status(200).json({
      success: true,
      method: 'smtp',
      message: `Verifieringskod skickad till ${cleanEmail}!`,
    });
  } catch (err: any) {
    console.error('Error sending email via SMTP:', err);
    return res.status(500).json({
      error: 'Kunde inte skicka mejlet via e-postservern',
      details: err?.message || String(err),
      fallbackCode: cleanCode,
    });
  }
}
