import puppeteer from 'puppeteer';

async function createRealFeatureGraphic() {
  console.log('Rendering 1024x500 Feature Graphic with real app UI...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 500, deviceScaleFactor: 1 });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800;900&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            width: 1024px;
            height: 500px;
            overflow: hidden;
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: linear-gradient(135deg, #4f46e5 0%, #6366f1 40%, #8b5cf6 70%, #ec4899 100%);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 60px;
            position: relative;
          }
          .blob1 {
            position: absolute;
            top: -100px;
            left: -100px;
            width: 400px;
            height: 400px;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 50%;
            filter: blur(50px);
          }
          .blob2 {
            position: absolute;
            bottom: -120px;
            right: 150px;
            width: 450px;
            height: 450px;
            background: rgba(251, 191, 36, 0.2);
            border-radius: 50%;
            filter: blur(60px);
          }
          .left {
            z-index: 10;
            max-width: 460px;
            color: white;
          }
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            padding: 6px 14px;
            border-radius: 999px;
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-bottom: 16px;
            border: 1px solid rgba(255, 255, 255, 0.3);
          }
          .title {
            font-size: 52px;
            font-weight: 900;
            line-height: 1.05;
            letter-spacing: -1.5px;
            margin-bottom: 14px;
            text-shadow: 0 4px 16px rgba(0,0,0,0.2);
          }
          .subtitle {
            font-size: 18px;
            font-weight: 700;
            line-height: 1.4;
            opacity: 0.92;
            margin-bottom: 24px;
          }
          .tags {
            display: flex;
            gap: 10px;
          }
          .tag {
            background: white;
            color: #4338ca;
            padding: 8px 16px;
            border-radius: 14px;
            font-size: 13px;
            font-weight: 800;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          .right {
            z-index: 10;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .phone-frame {
            width: 250px;
            height: 480px;
            background: #0f172a;
            border-radius: 36px;
            padding: 10px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 2px rgba(255,255,255,0.2);
            transform: rotate(3deg) translateY(20px);
            overflow: hidden;
          }
          .phone-screen {
            width: 100%;
            height: 100%;
            border-radius: 26px;
            background-image: url('http://localhost:3000/screenshot-mobile-1.png');
            background-size: cover;
            background-position: top center;
          }
          .phone-frame-back {
            position: absolute;
            left: -90px;
            top: 40px;
            width: 220px;
            height: 440px;
            background: #1e1b4b;
            border-radius: 32px;
            padding: 8px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
            transform: rotate(-8deg);
            opacity: 0.85;
            z-index: -1;
          }
          .phone-screen-back {
            width: 100%;
            height: 100%;
            border-radius: 24px;
            background-image: url('http://localhost:3000/screenshot-mobile-2.png');
            background-size: cover;
            background-position: top center;
          }
        </style>
      </head>
      <body>
        <div class="blob1"></div>
        <div class="blob2"></div>
        <div class="left">
          <div class="badge">🎙️ Trygg röstchatt & Walkie-Talkie</div>
          <h1 class="title">Snacka</h1>
          <p class="subtitle">Ett tryck för att ringa familjen. Tryggt, enkelt och 100% fritt från reklam och främlingar.</p>
          <div class="tags">
            <div class="tag">📞 Enkla röstsamtal</div>
            <div class="tag">🛡️ Föräldrakontroll</div>
          </div>
        </div>
        <div class="right">
          <div class="phone-frame-back">
            <div class="phone-screen-back"></div>
          </div>
          <div class="phone-frame">
            <div class="phone-screen"></div>
          </div>
        </div>
      </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: 'public/feature-graphic.png', type: 'png' });
  await page.screenshot({ path: 'public/feature-graphic.jpg', type: 'jpeg', quality: 95 });

  await browser.close();
  console.log('✅ Real 1024x500 Feature Graphic created successfully!');
}

createRealFeatureGraphic().catch((err) => {
  console.error('Error creating feature graphic:', err);
  process.exit(1);
});
