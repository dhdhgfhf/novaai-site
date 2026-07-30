import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';

const files = [
  'nova-ai-3-6/app-1.b64',
  'nova-ai-3-6/app-2.b64',
  'nova-ai-3-6/app-3.b64',
];

const clean = files
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('')
  .replace(/[^A-Za-z0-9+/]/g, '');

const padded = clean + '='.repeat((4 - (clean.length % 4)) % 4);
const compressed = Buffer.from(padded, 'base64');
const raw = zlib.gunzipSync(compressed).toString('utf8');
const html = raw
  .replace(/<title>[\s\S]*?<\/title>/i, '<title>NOVA AI</title>')
  .replaceAll('NovaAI', 'NOVA AI');

if (!html.includes('<html') || !html.includes('initApp')) {
  throw new Error('The reconstructed original page is incomplete.');
}

fs.mkdirSync(path.dirname('nova-ai-original/index.html'), { recursive: true });
fs.writeFileSync('nova-ai-original/index.html', html, 'utf8');
console.log(`Wrote raw original page (${Buffer.byteLength(html)} bytes)`);
