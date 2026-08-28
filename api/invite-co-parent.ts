import nodemailer from 'nodemailer';

export default async function handler(req: any, res: any) {
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

  const { secondParentEmail, secondParentName, childName, invitingParentEmail, pin, syncUrl } = req.body || {};

  if (!secondParentEmail) {
    return res.status(400).json({ error: 'E-post till medförälder krävs' });
  }

  const cleanEmail = String(secondParentEmail).trim().toLowerCase();
  const cleanName = secondParentName ? String(secondParentName).trim() : 'Medförälder';
  const cleanChildName = childName ? String(childName).trim() : 'barnet';
  const cleanPin = pin ? String(pin).trim() : '123456';
  const cleanSyncUrl = syncUrl || 'https://snacka.app';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
          .logo { font-size: 26px; font-weight: 900; color: #4f46e5; margin-bottom: 6px; }
          .badge { display: inline-block; padding: 5px 14px; border-radius: 9999px; background: #e0e7ff; color: #4338ca; font-size: 12px; font-weight: 800; margin-bottom: 18px; }
          h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
          p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px; }
          .feature-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; margin: 20px 0; }
          .pin-box { background: #f0fdf4; border: 2px dashed #86efac; border-radius: 16px; padding: 16px; text-align: center; margin: 20px 0; }
          .pin-digits { font-family: monospace; font-size: 28px; font-weight: 900; letter-spacing: 6px; color: #16a34a; }
          .cta-btn { display: block; text-align: center; background: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 15px; padding: 14px 24px; border-radius: 16px; margin: 24px 0 16px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25); }
          .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">📞 Snacka</div>
          <div class="badge">Inbjudan till Föräldrakontroll</div>
          <h1>Hej ${cleanName}!</h1>
          <p>Du har blivit inbjuden som medförälder/vårdnadshavare för <strong>${cleanChildName}</strong> i barnappen Snacka.</p>

          <div class="pin-box">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #15803d; margin-bottom: 4px;">Gemensam PIN-kod till föräldraläget:</div>
            <div class="pin-digits">${cleanPin}</div>
          </div>

          <a href="${cleanSyncUrl}" class="cta-btn" style="color: #ffffff;">Öppna Snacka & Synka Kontot</a>

          <div class="footer">
            Inbjudan skickades från Snacka på begäran av ${invitingParentEmail || 'vårdnadshavare'}.
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
      message: `Inbjudningslänk redo`,
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
        message: 'Inbjudan redo lokalt',
      });
    }

    const info = await transporter.sendMail({
      from: fromEmail,
      to: cleanEmail,
      subject: `Inbjudan till Snacka Föräldrakontroll (${cleanChildName})`,
      text: `Hej ${cleanName}!\n\nDu har blivit inbjuden till föräldrakontrollen i Snacka för ${cleanChildName}.\nPIN-koden är: ${cleanPin}\nÖppna appen här: ${cleanSyncUrl}`,
      html: htmlContent,
    });

    return res.status(200).json({
      success: true,
      method: 'smtp',
      message: `Inbjudan skickad till ${cleanEmail}!`,
    });
  } catch (err: any) {
    console.error('Error sending co-parent invite:', err);
    return res.status(500).json({
      error: 'Kunde inte skicka inbjudan via mejl',
      details: err?.message || String(err),
    });
  }
}
