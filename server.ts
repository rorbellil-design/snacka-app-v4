import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import webpush from 'web-push';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = 3000;

// Enable CORS for external PWA builders, tools, and cross-origin fetches
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Set permissive Cross-Origin-Resource-Policy so external tools like PWABuilder can read icons/assets
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

app.use(express.json());

// Setup VAPID Keys for Web Push Notifications (Standby ringing)
const VAPID_FILE = path.join(process.cwd(), 'vapid_keys.json');
let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
};

try {
  if (fs.existsSync(VAPID_FILE)) {
    const raw = fs.readFileSync(VAPID_FILE, 'utf-8');
    vapidKeys = JSON.parse(raw);
  }
} catch (e) {
  console.warn('Could not read vapid_keys.json:', e);
}

if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  vapidKeys = webpush.generateVAPIDKeys();
  try {
    fs.writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys, null, 2), 'utf-8');
    console.log('Generated and saved new VAPID keys for Web Push');
  } catch (e) {
    console.error('Error saving VAPID keys to disk:', e);
  }
}

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:support@snacka-appen.se',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Push Subscriptions storage
interface StoredSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  email: string;
  updatedAt: number;
}

const PUSH_SUBS_FILE = path.join(process.cwd(), 'push_subscriptions.json');
const pushSubscriptions = new Map<string, StoredSubscription[]>();

try {
  if (fs.existsSync(PUSH_SUBS_FILE)) {
    const raw = fs.readFileSync(PUSH_SUBS_FILE, 'utf-8');
    const data: Record<string, StoredSubscription[]> = JSON.parse(raw);
    for (const [email, subs] of Object.entries(data)) {
      pushSubscriptions.set(email.toLowerCase(), subs);
    }
  }
} catch (e) {
  console.warn('Could not load push subscriptions from disk:', e);
}

function savePushSubscriptionsToDisk() {
  try {
    const obj: Record<string, StoredSubscription[]> = {};
    for (const [email, subs] of pushSubscriptions.entries()) {
      obj[email] = subs;
    }
    fs.writeFileSync(PUSH_SUBS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving push subscriptions to disk:', e);
  }
}

// Enable CORS for all incoming requests (crucial for PWABuilder, Google Play verification, and external assets)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Explicit static assets routing with precise Content-Types and CORS
const publicDir = path.join(process.cwd(), 'public');
app.use(express.static(publicDir, {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
  }
}));

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Helper to create Nodemailer transport
async function getEmailTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (smtpHost && smtpUser && smtpPass) {
    return {
      transporter: nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      }),
      from: process.env.SMTP_FROM || `"Snacka Föräldrakontroll" <${smtpUser}>`,
      isTest: false,
    };
  }

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return {
      transporter: nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      }),
      from: `"Snacka Föräldrakontroll" <${process.env.GMAIL_USER}>`,
      isTest: false,
    };
  }

  // Fallback: Ethereal test account (real mail generation & test inbox preview)
  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    return {
      transporter,
      from: '"Snacka Säkerhet" <no-reply@snacka-appen.se>',
      isTest: true,
    };
  } catch (err) {
    console.warn('Could not create test mail transport, using direct fallback:', err);
    return null;
  }
}

// In-memory / file cached family accounts store
interface FamilyRecord {
  parentEmail: string;
  secondParentEmail?: string;
  childEmail: string;
  childName: string;
  syncCode?: string;
  settings: any;
  contacts: any[];
  callLogs?: any[];
  updatedAt: number;
}

const FAMILIES_FILE = path.join(process.cwd(), 'families_store.json');
const familyStore = new Map<string, FamilyRecord>();

// Load from disk if exists
try {
  if (fs.existsSync(FAMILIES_FILE)) {
    const raw = fs.readFileSync(FAMILIES_FILE, 'utf-8');
    const list: FamilyRecord[] = JSON.parse(raw);
    for (const item of list) {
      if (item.parentEmail) {
        familyStore.set(item.parentEmail.toLowerCase(), item);
      }
    }
  }
} catch (err) {
  console.error('Error loading families store:', err);
}

function saveFamiliesToDisk() {
  try {
    const list = Array.from(familyStore.values());
    fs.writeFileSync(FAMILIES_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving families store to disk:', err);
  }
}

// Helper to find family by email or syncCode
function findFamily(identifier: string): FamilyRecord | undefined {
  if (!identifier) return undefined;
  const key = identifier.trim().toLowerCase();
  
  // Try direct match by parent email
  if (familyStore.has(key)) return familyStore.get(key);

  // Search by secondParent, childEmail, or syncCode
  for (const record of familyStore.values()) {
    if (
      record.parentEmail.toLowerCase() === key ||
      (record.secondParentEmail && record.secondParentEmail.toLowerCase() === key) ||
      (record.childEmail && record.childEmail.toLowerCase() === key) ||
      (record.syncCode && record.syncCode.toLowerCase() === key)
    ) {
      return record;
    }
  }
  return undefined;
}

// API: Save/Sync family profile
app.post('/api/family/sync', (req, res) => {
  const { parentEmail, settings, contacts, callLogs, syncCode } = req.body;
  if (!parentEmail && !settings?.parentEmail && !settings?.childEmail) {
    return res.status(400).json({ error: 'Föräldra- eller barn-epost krävs' });
  }

  const primaryEmail = (parentEmail || settings?.parentEmail || settings?.childEmail).trim().toLowerCase();
  const existing = findFamily(primaryEmail);

  const newSyncCode = syncCode || existing?.syncCode || `SNACKA-${Math.floor(1000 + Math.random() * 9000)}`;

  const record: FamilyRecord = {
    parentEmail: primaryEmail,
    secondParentEmail: settings?.secondParentEmail?.trim().toLowerCase(),
    childEmail: (settings?.childEmail || 'astrid@familjen.se').trim().toLowerCase(),
    childName: settings?.childName || 'Astrid',
    syncCode: newSyncCode,
    settings: settings || existing?.settings || {},
    contacts: Array.isArray(contacts) ? contacts : (existing?.contacts || []),
    callLogs: Array.isArray(callLogs) ? callLogs : (existing?.callLogs || []),
    updatedAt: Date.now(),
  };

  familyStore.set(primaryEmail, record);
  saveFamiliesToDisk();
  return res.json({ success: true, syncCode: newSyncCode, updatedAt: record.updatedAt });
});

// API: Load family profile by email or sync code
app.post('/api/family/load', (req, res) => {
  const { identifier } = req.body;
  if (!identifier) {
    return res.status(400).json({ error: 'Ange e-post eller synk-kod' });
  }

  const record = findFamily(identifier);
  if (!record) {
    return res.status(404).json({ error: 'Ingen familjeprofil hittades med denna e-post eller kod' });
  }

  return res.json({
    success: true,
    family: {
      settings: record.settings,
      contacts: record.contacts,
      callLogs: record.callLogs || [],
      syncCode: record.syncCode,
      updatedAt: record.updatedAt,
    },
  });
});

// API: Send verification code to parent email
app.post('/api/send-parent-code', async (req, res) => {
  const { email, code, childName, purpose } = req.body;

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
          .header { display: flex; align-items: center; margin-bottom: 24px; }
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

  try {
    const mailSetup = await getEmailTransporter();

    if (!mailSetup) {
      console.log(`[SIMULATED MAIL] To: ${cleanEmail} | Code: ${cleanCode}`);
      return res.json({
        success: true,
        method: 'local',
        message: `Kod genererad för ${cleanEmail}`,
        code: cleanCode,
      });
    }

    const info = await mailSetup.transporter.sendMail({
      from: mailSetup.from,
      to: cleanEmail,
      subject: `Din Snacka-kod: ${cleanCode} (Föräldraverifiering)`,
      text: `Din 6-siffriga verifieringskod för Snacka är: ${cleanCode}\n\nAnvänd denna kod för att låsa upp eller konfigurera föräldrakontrollen för ${cleanChildName}. Dela aldrig koden med barnet.`,
      html: htmlContent,
    });

    let previewUrl: string | undefined;
    if (mailSetup.isTest) {
      previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      console.log(`[TEST EMAIL SENT] Code: ${cleanCode} -> ${cleanEmail} | Preview: ${previewUrl}`);
    } else {
      console.log(`[REAL EMAIL SENT] Code: ${cleanCode} -> ${cleanEmail} | MessageId: ${info.messageId}`);
    }

    return res.json({
      success: true,
      method: mailSetup.isTest ? 'ethereal' : 'smtp',
      message: `Verifieringskod skickad till ${cleanEmail}!`,
      previewUrl,
      code: mailSetup.isTest ? cleanCode : undefined, // included in test mode for instant local convenience
    });
  } catch (err: any) {
    console.error('Error sending email:', err);
    return res.status(500).json({
      error: 'Kunde inte skicka mejlet via e-postservern',
      details: err?.message || String(err),
      fallbackCode: cleanCode,
    });
  }
});

// API: Send invitation to co-parent / second guardian
app.post('/api/invite-co-parent', async (req, res) => {
  const { secondParentEmail, secondParentName, childName, invitingParentEmail, pin, syncUrl } = req.body;

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
          .feature-title { font-size: 13px; font-weight: 800; color: #1e293b; margin-bottom: 8px; }
          .feature-list { margin: 0; padding-left: 20px; font-size: 13px; color: #475569; }
          .feature-list li { margin-bottom: 6px; }
          .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 15px; padding: 14px 28px; border-radius: 14px; text-align: center; margin: 16px 0; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3); }
          .pin-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 14px; padding: 14px; text-align: center; margin: 16px 0; }
          .pin-label { font-size: 11px; text-transform: uppercase; font-weight: 800; color: #64748b; margin-bottom: 4px; }
          .pin-digits { font-family: monospace; font-size: 28px; font-weight: 900; letter-spacing: 6px; color: #4f46e5; }
          .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">📞 Snacka</div>
          <div class="badge">👨‍👩‍👧 Vårdnadshavar-inbjudan</div>
          <h1>Hej ${cleanName}!</h1>
          <p>
            Du har blivit inbjuden som vårdnadshavare för <strong>${cleanChildName}</strong> i barnappen <strong>Snacka</strong> ${invitingParentEmail ? `av ${invitingParentEmail}` : ''}.
          </p>
          
          <div class="feature-box">
            <div class="feature-title">Med vårdnadshavarkontot får du:</div>
            <ul class="feature-list">
              <li>📞 Ringa och ta emot röstsamtal & röstmeddelanden direkt till ${cleanChildName}</li>
              <li>🛡️ Godkänna och lägga till säkra kontakter för barnet</li>
              <li>⏰ Se samtalshistorik och ställa in tysta tider (sovtid)</li>
            </ul>
          </div>

          <div style="text-align: center;">
            <a href="${cleanSyncUrl}" class="btn">Öppna Snacka & Anslut som Vårdnadshavare 📲</a>
          </div>

          <div class="pin-box">
            <div class="pin-label">Er gemensamma Föräldra-PIN</div>
            <div class="pin-digits">${cleanPin}</div>
          </div>

          <p style="font-size: 12px; color: #64748b;">
            💡 <em>Öppna länken på din telefon och ange PIN-koden ovan för att automatiskt synkronisera barnets kontaktlista.</em>
          </p>

          <div class="footer">
            Detta mejl skickades från Snacka Barnapp till ${cleanEmail}.
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const mailSetup = await getEmailTransporter();

    if (!mailSetup) {
      console.log(`[SIMULATED CO-PARENT INVITE] To: ${cleanEmail} | Child: ${cleanChildName}`);
      return res.json({
        success: true,
        method: 'local',
        message: `Inbjudan förberedd för ${cleanEmail}`,
      });
    }

    const info = await mailSetup.transporter.sendMail({
      from: mailSetup.from,
      to: cleanEmail,
      subject: `👨‍👩‍👧 Inbjudan: Du har lagts till som vårdnadshavare för ${cleanChildName} i Snacka`,
      text: `Hej ${cleanName}!\n\nDu har blivit inbjuden som vårdnadshavare för ${cleanChildName} i Snacka.\n\nÖppna länken på din telefon för att ansluta: ${cleanSyncUrl}\n\nGemensam Föräldra-PIN: ${cleanPin}`,
      html: htmlContent,
    });

    let previewUrl: string | undefined;
    if (mailSetup.isTest) {
      previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      console.log(`[TEST CO-PARENT EMAIL SENT] To: ${cleanEmail} | Preview: ${previewUrl}`);
    }

    return res.json({
      success: true,
      method: mailSetup.isTest ? 'ethereal' : 'smtp',
      message: `Inbjudan har skickats till ${cleanEmail}!`,
      previewUrl,
    });
  } catch (err: any) {
    console.error('Error sending co-parent invite email:', err);
    return res.status(500).json({
      error: 'Kunde inte skicka inbjudan via e-postservern',
      details: err?.message || String(err),
    });
  }
});

// Web Push API: Public Key
app.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// Web Push API: Subscribe client device
app.post('/api/push/subscribe', (req, res) => {
  const { email, subscription } = req.body;
  if (!email || !subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'E-post och prenumeration krävs' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const existingList = pushSubscriptions.get(cleanEmail) || [];

  // Deduplicate by endpoint
  const filtered = existingList.filter((s) => s.endpoint !== subscription.endpoint);
  filtered.push({
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    email: cleanEmail,
    updatedAt: Date.now(),
  });

  pushSubscriptions.set(cleanEmail, filtered);
  savePushSubscriptionsToDisk();

  console.log(`[PUSH] Subscribed device for ${cleanEmail}. Total devices for user: ${filtered.length}`);
  return res.json({ success: true, count: filtered.length });
});

// Web Push API: Send Incoming Call Alert to Target Contact / Child
app.post('/api/push/send-call', async (req, res) => {
  const { targetEmail, callerEmail, callerName, callerAvatar, ringtone } = req.body;

  if (!targetEmail || !callerEmail) {
    return res.status(400).json({ error: 'Mottagare och avsändare krävs' });
  }

  const cleanTarget = String(targetEmail).trim().toLowerCase();
  const subs = pushSubscriptions.get(cleanTarget) || [];

  if (subs.length === 0) {
    console.log(`[PUSH] No active push subscriptions found for ${cleanTarget}`);
    return res.json({ success: true, delivered: 0, reason: 'no_subscriptions' });
  }

  const payload = JSON.stringify({
    type: 'INCOMING_CALL',
    callerEmail: String(callerEmail).trim().toLowerCase(),
    callerName: callerName || 'En kompis',
    callerAvatar: callerAvatar || '📞',
    ringtone: ringtone || 'marimba',
    timestamp: Date.now(),
  });

  let deliveredCount = 0;
  const invalidEndpoints = new Set<string>();

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          payload,
          {
            TTL: 60, // 60 seconds
            urgency: 'high',
            topic: 'incoming-call',
          }
        );
        deliveredCount++;
      } catch (err: any) {
        console.warn(`[PUSH ERROR] Failed push to ${cleanTarget} (${sub.endpoint}):`, err?.statusCode || err?.message);
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          invalidEndpoints.add(sub.endpoint);
        }
      }
    })
  );

  // Clean up expired subscriptions
  if (invalidEndpoints.size > 0) {
    const validSubs = subs.filter((s) => !invalidEndpoints.has(s.endpoint));
    pushSubscriptions.set(cleanTarget, validSubs);
    savePushSubscriptionsToDisk();
  }

  console.log(`[PUSH] Sent incoming call push to ${cleanTarget}: ${deliveredCount}/${subs.length} delivered`);
  return res.json({ success: true, delivered: deliveredCount });
});

// Web Push API: Cancel / End Call notification
app.post('/api/push/cancel-call', async (req, res) => {
  const { targetEmail } = req.body;
  if (!targetEmail) return res.status(400).json({ error: 'targetEmail krävs' });

  const cleanTarget = String(targetEmail).trim().toLowerCase();
  const subs = pushSubscriptions.get(cleanTarget) || [];

  if (subs.length > 0) {
    const payload = JSON.stringify({
      type: 'CANCEL_CALL',
      timestamp: Date.now(),
    });

    await Promise.all(
      subs.map((sub) =>
        webpush
          .sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            payload,
            {
              TTL: 10,
              urgency: 'high',
              topic: 'cancel-call',
            }
          )
          .catch(() => {})
      )
    );
  }

  return res.json({ success: true });
});

// Web Push API: Test Push
app.post('/api/push/test', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'E-post krävs' });

  const cleanEmail = String(email).trim().toLowerCase();
  const subs = pushSubscriptions.get(cleanEmail) || [];

  if (subs.length === 0) {
    return res.status(404).json({ error: 'Ingen enhet har registrerats för push på denna e-postadress än.' });
  }

  const payload = JSON.stringify({
    type: 'TEST',
    title: '🔔 Snacka: Notistest lyckades!',
    body: 'Din telefon kan nu ta emot samtal även när skärmen är låst.',
  });

  let delivered = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          payload,
          {
            TTL: 60,
            urgency: 'high',
          }
        );
        delivered++;
      } catch (e) {
        console.warn('[PUSH TEST ERR]', e);
      }
    })
  );

  return res.json({ success: true, delivered });
});

// Digital Asset Links for Google Play TWA (removes Chrome URL bar)
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'se.snacka.app',
        sha256_cert_fingerprints: [
          'FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C'
        ]
      }
    }
  ]);
});

// Start Server and mount Vite middleware
async function startServer() {
  // Always serve public directory for manifest, icons, screenshots, and assetlinks
  app.use(express.static(path.join(process.cwd(), 'public')));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
