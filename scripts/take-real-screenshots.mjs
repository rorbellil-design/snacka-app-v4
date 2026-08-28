import puppeteer from 'puppeteer';

const SAMPLE_CONTACTS = [
  {
    id: 'contact_mamma',
    name: 'Mamma',
    email: 'mamma@snacka.se',
    avatar: '👩',
    color: 'emerald',
    status: 'online',
    relation: 'Mamma',
    category: 'familj',
    isApproved: true,
    activityStatus: 'Tillgänglig',
  },
  {
    id: 'contact_pappa',
    name: 'Pappa',
    email: 'pappa@snacka.se',
    avatar: '👨',
    color: 'sky',
    status: 'online',
    relation: 'Pappa',
    category: 'familj',
    isApproved: true,
    activityStatus: 'På jobbet',
  },
  {
    id: 'contact_mormor',
    name: 'Mormor',
    email: 'mormor@snacka.se',
    avatar: '👵',
    color: 'purple',
    status: 'online',
    relation: 'Mormor',
    category: 'familj',
    isApproved: true,
    activityStatus: 'Hemma',
  },
  {
    id: 'contact_morfar',
    name: 'Morfar',
    email: 'morfar@snacka.se',
    avatar: '👴',
    color: 'amber',
    status: 'offline',
    relation: 'Morfar',
    category: 'familj',
    isApproved: true,
    activityStatus: 'I trädgården',
  },
];

const SAMPLE_SETTINGS = {
  pin: '123456',
  childName: 'Alex',
  childEmail: 'alex@snacka.se',
  childAvatar: '🧒',
  childColor: 'amber',
  bedtimeLockEnabled: false,
  bedtimeStart: '20:00',
  bedtimeEnd: '07:00',
  onlyAllowApprovedContacts: true,
  maxCallDurationMinutes: 30,
  ringtone: 'playful',
  soundVolume: 80,
  theme: 'light',
};

const SAMPLE_LOGS = [
  {
    id: 'log_1',
    contactName: 'Mamma',
    contactEmail: 'mamma@snacka.se',
    type: 'voice',
    direction: 'outgoing',
    status: 'completed',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    durationSeconds: 145,
  },
  {
    id: 'log_2',
    contactName: 'Pappa',
    contactEmail: 'pappa@snacka.se',
    type: 'voice',
    direction: 'incoming',
    status: 'completed',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    durationSeconds: 82,
  },
];

async function captureRealScreenshots() {
  console.log('Launching browser for authentic UI captures...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage();

  // Mobile viewport: 9:16 aspect ratio (1080 x 1920 scaled)
  await page.setViewport({
    width: 414,
    height: 736,
    deviceScaleFactor: 2.608695,
    isMobile: true,
    hasTouch: true,
  });

  // Inject data before any script runs
  await page.evaluateOnNewDocument(
    (contacts, settings, logs) => {
      localStorage.setItem('kompisring_onboarded_v1', 'true');
      localStorage.setItem('kompisring_contacts', JSON.stringify(contacts));
      localStorage.setItem('kompisring_settings', JSON.stringify(settings));
      localStorage.setItem('kompisring_logs', JSON.stringify(logs));
    },
    SAMPLE_CONTACTS,
    SAMPLE_SETTINGS,
    SAMPLE_LOGS
  );

  // Navigate to application
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));

  // --- SCREENSHOT 1: Real Contact List & Kid Dashboard ---
  console.log('📸 Capturing Real Screenshot 1: Kid Dashboard & Contacts...');
  await page.screenshot({ path: 'public/screenshot-mobile-1.png', type: 'png' });

  // --- SCREENSHOT 2: Real Active Voice Call Screen ---
  console.log('📞 Initiating real voice call with Mamma (#voice-call-btn-contact_mamma)...');
  await page.waitForSelector('#voice-call-btn-contact_mamma', { timeout: 5000 });
  await page.click('#voice-call-btn-contact_mamma');

  await new Promise((r) => setTimeout(r, 1500));
  console.log('📸 Capturing Real Screenshot 2: Real Active Call Screen...');
  await page.screenshot({ path: 'public/screenshot-mobile-2.png', type: 'png' });

  // Re-open fresh page for screenshot 3
  const page2 = await browser.newPage();
  await page2.setViewport({
    width: 414,
    height: 736,
    deviceScaleFactor: 2.608695,
    isMobile: true,
    hasTouch: true,
  });

  await page2.evaluateOnNewDocument(
    (contacts, settings, logs) => {
      localStorage.setItem('kompisring_onboarded_v1', 'true');
      localStorage.setItem('kompisring_contacts', JSON.stringify(contacts));
      localStorage.setItem('kompisring_settings', JSON.stringify(settings));
      localStorage.setItem('kompisring_logs', JSON.stringify(logs));
    },
    SAMPLE_CONTACTS,
    SAMPLE_SETTINGS,
    SAMPLE_LOGS
  );

  await page2.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));

  // --- SCREENSHOT 3: Real Parent Dashboard ---
  console.log('🛡️ Opening Parent PIN modal (#open-parent-mode-btn)...');
  await page2.waitForSelector('#open-parent-mode-btn', { timeout: 5000 });
  await page2.click('#open-parent-mode-btn');

  await new Promise((r) => setTimeout(r, 600));

  console.log('🔢 Entering PIN 123456...');
  await page2.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    ['1', '2', '3', '4', '5', '6'].forEach((digit) => {
      const btn = buttons.find((b) => b.textContent?.trim() === digit);
      if (btn) btn.click();
    });
  });

  await new Promise((r) => setTimeout(r, 1200));
  console.log('📸 Capturing Real Screenshot 3: Real Parent Dashboard...');
  await page2.screenshot({ path: 'public/screenshot-mobile-3.png', type: 'png' });

  await browser.close();
  console.log('✅ All 3 REAL application screenshots captured directly from the live React app!');
}

captureRealScreenshots().catch((err) => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
