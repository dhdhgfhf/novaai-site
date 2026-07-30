import fs from 'node:fs';
import zlib from 'node:zlib';
import vm from 'node:vm';
import path from 'node:path';

function normaliseBase64(value) {
  const clean = value.replace(/\s+/g, '').replace(/[^A-Za-z0-9+/=]/g, '');
  const withoutPadding = clean.replace(/=/g, '');
  return withoutPadding + '='.repeat((4 - (withoutPadding.length % 4)) % 4);
}

function decodeGzipParts(files) {
  const parts = files.map((file) => fs.readFileSync(file, 'utf8'));
  const candidates = [];

  // Most reliable when files are slices of one Base64 stream.
  candidates.push(Buffer.from(normaliseBase64(parts.join('')), 'base64'));

  // Fallback when each file was encoded independently.
  candidates.push(Buffer.concat(parts.map((part) => Buffer.from(normaliseBase64(part), 'base64'))));

  let lastError;
  for (const candidate of candidates) {
    try {
      return zlib.gunzipSync(candidate).toString('utf8');
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Could not reconstruct application HTML: ${lastError?.message || 'unknown error'}`);
}

function brandAsNovaAI(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, '<title>NOVA AI</title>')
    .replaceAll('NovaAI', 'NOVA AI');
}

function readElevenLabsPatch(loaderHtml) {
  const start = loaderHtml.indexOf('const patch=');
  const marker = loaderHtml.indexOf("html=html.replace('</body>'", start);
  if (start < 0 || marker < 0) return '';

  const end = loaderHtml.lastIndexOf(';', marker);
  if (end < start) return '';

  const literal = loaderHtml.slice(start + 'const patch='.length, end).trim();
  const patch = vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 1000 });
  return typeof patch === 'string' ? patch : '';
}

function writePage(target, html) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html, 'utf8');
  console.log(`Wrote ${target} (${Buffer.byteLength(html)} bytes)`);
}

const original = brandAsNovaAI(
  decodeGzipParts([
    'nova-ai-3-6/app-1.b64',
    'nova-ai-3-6/app-2.b64',
    'nova-ai-3-6/app-3.b64',
  ]),
);
writePage('nova-ai-original/index.html', original);

let latest = brandAsNovaAI(
  decodeGzipParts(['app-1.b64', 'app-2.b64', 'app-3.b64']),
);
const loaderHtml = fs.readFileSync('index.html', 'utf8');
const patch = readElevenLabsPatch(loaderHtml);
if (!patch.trim()) {
  throw new Error('ElevenLabs patch was not found in the current loader.');
}
latest = latest.replace('</body>', `<script>${patch}<\/script></body>`);
writePage('nova-ai-final/index.html', latest);
