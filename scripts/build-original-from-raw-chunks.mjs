import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const base = 'nova-ai-original-clean';
const directParts = ['raw-1.js', 'raw-2.js', 'raw-3.js', 'raw-4.js', 'raw-5.js'];
const encodedParts = ['raw-6b.js', 'raw-7b.js', 'raw-8b.js'];

globalThis.window = { __NOVA_HTML: [], __NOVA_JS64: [] };

for (const file of directParts) {
  const fullPath = path.join(base, file);
  vm.runInThisContext(fs.readFileSync(fullPath, 'utf8'), { filename: fullPath });
}

for (const file of encodedParts) {
  const fullPath = path.join(base, file);
  vm.runInThisContext(fs.readFileSync(fullPath, 'utf8'), { filename: fullPath });
}

if (window.__NOVA_HTML.length !== 5) {
  throw new Error(`Expected 5 direct HTML chunks, got ${window.__NOVA_HTML.length}`);
}
if (window.__NOVA_JS64.length !== 3) {
  throw new Error(`Expected 3 encoded HTML chunks, got ${window.__NOVA_JS64.length}`);
}

for (const encoded of window.__NOVA_JS64) {
  const clean = String(encoded).replace(/[^A-Za-z0-9+/=]/g, '');
  const js = Buffer.from(clean, 'base64').toString('utf8');
  vm.runInThisContext(js, { filename: 'decoded-nova-chunk.js' });
}

if (window.__NOVA_HTML.length !== 8) {
  throw new Error(`Expected 8 total HTML chunks, got ${window.__NOVA_HTML.length}`);
}

let html = window.__NOVA_HTML.join('');
html = html
  .replace(/<title>[\s\S]*?<\/title>/i, '<title>NOVA AI</title>')
  .replaceAll('NovaAI', 'NOVA AI');

if (!html.includes('<html') || !html.includes('initApp()')) {
  throw new Error('The reconstructed NOVA AI page is incomplete.');
}
if (html.includes('__NOVA_HTML') || html.includes('__NOVA_B64') || html.includes('DecompressionStream')) {
  throw new Error('The reconstructed page still contains loader code.');
}

for (const output of ['nova-ai-original/index.html', 'nova-ai-original-clean/index.html']) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, html, 'utf8');
  console.log(`Wrote ${output} (${Buffer.byteLength(html)} bytes)`);
}
