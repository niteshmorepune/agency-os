// Generates NEDS-Platform-Guide.pdf from the server helpGuide HTML
// Run with: node gen-platform-guide.mjs
import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Extract the GUIDE_HTML constant from the TypeScript service file
const serviceFile = readFileSync(
  path.join(__dirname, 'server/src/services/helpGuide.service.ts'),
  'utf8'
);
const match = serviceFile.match(/const GUIDE_HTML = `([\s\S]*?)`;/);
if (!match) { console.error('Could not extract GUIDE_HTML'); process.exit(1); }
const html = match[1];

const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle0' });
const pdf = await page.pdf({ format: 'A4', printBackground: true });
await browser.close();

const outPath = path.join(__dirname, 'NEDS-Platform-Guide.pdf');
writeFileSync(outPath, pdf);
console.log(`PDF written to ${outPath}`);
