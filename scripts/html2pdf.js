// Convert HTML bulletin to PDF using Puppeteer
const puppeteer = require('puppeteer');
const path = require('path');

const htmlPath = path.resolve(__dirname, '..', 'docs', '开发公报_XMUMDorm_V3.0.html');
const pdfPath = path.resolve(__dirname, '..', 'docs', '开发公报_XMUMDorm_V3.0.pdf');
const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Collect console messages for debugging
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
  });
  page.on('pageerror', err => console.log('PAGE CRASH:', err.message));

  console.log('Loading HTML...');
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 60000 });

  // Check what loaded
  const chartLoaded = await page.evaluate(() => {
    return typeof Chart !== 'undefined';
  });
  console.log('Chart.js loaded:', chartLoaded);

  if (chartLoaded) {
    console.log('Waiting for charts to render...');
    // Wait for Chart.js to initialize all canvases
    await page.waitForFunction(() => {
      const canvases = document.querySelectorAll('canvas');
      return canvases.length >= 16 && Array.from(canvases).every(c => c.width > 0 && c.height > 0);
    }, { timeout: 15000 }).catch(() => {
      console.log('Warning: not all charts rendered, proceeding anyway...');
    });
  } else {
    console.log('Chart.js not loaded from CDN — PDF will render without charts');
  }

  // Extra wait for any remaining rendering
  await new Promise(r => setTimeout(r, 3000));

  console.log('Generating PDF...');
  await page.pdf({
    path: pdfPath,
    format: 'A3',
    landscape: true,
    printBackground: true,
    margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' },
    scale: 1.0,
    displayHeaderFooter: false,
    preferCSSPageSize: false,
  });

  // Get file size
  const fs = require('fs');
  const stat = fs.statSync(pdfPath);
  console.log(`PDF saved to: ${pdfPath}`);
  console.log(`PDF size: ${(stat.size / 1024).toFixed(1)} KB`);
  await browser.close();
  console.log('Done!');
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
