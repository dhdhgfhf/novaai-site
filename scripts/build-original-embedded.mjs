import fs from 'node:fs';
import path from 'node:path';

const files = [
  'nova-ai-3-6/app-1.b64',
  'nova-ai-3-6/app-2.b64',
  'nova-ai-3-6/app-3.b64',
];

const base64 = files
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('')
  .replace(/[^A-Za-z0-9+/]/g, '');

if (!base64.startsWith('H4sI')) {
  throw new Error('Original application data does not look like gzip Base64.');
}

const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>NOVA AI</title>
<style>
*{box-sizing:border-box}html,body{height:100%;margin:0}body{display:grid;place-items:center;background:#0d0d12;color:#ededf5;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}.box{text-align:center;padding:24px}.logo{font-size:32px;font-weight:800;margin-bottom:10px}.msg{font-size:14px;color:#9999b5}.err{max-width:580px;line-height:1.8;color:#ff8bad;white-space:pre-wrap}
</style>
</head>
<body>
<div class="box"><div class="logo">NOVA AI</div><div class="msg" id="status">جاري تشغيل الموقع…</div></div>
<script>
(async()=>{
 const status=document.getElementById('status');
 try{
  if(typeof DecompressionStream==='undefined') throw new Error('افتح الموقع في أحدث إصدار من Chrome.');
  const input=${JSON.stringify(base64)};
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const map=new Int16Array(128);map.fill(-1);
  for(let i=0;i<alphabet.length;i++) map[alphabet.charCodeAt(i)]=i;
  const out=[];let buffer=0,bits=0;
  for(let i=0;i<input.length;i++){
   const code=input.charCodeAt(i),value=code<128?map[code]:-1;
   if(value<0) continue;
   buffer=(buffer<<6)|value;bits+=6;
   if(bits>=8){bits-=8;out.push((buffer>>bits)&255);buffer&=(1<<bits)-1;}
  }
  const bytes=new Uint8Array(out);
  if(bytes.length<2||bytes[0]!==31||bytes[1]!==139) throw new Error('بيانات التطبيق غير مكتملة.');
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  let page=await new Response(stream).text();
  page=page.replace(/<title>[\s\S]*?<\/title>/i,'<title>NOVA AI</title>').replaceAll('NovaAI','NOVA AI');
  document.open();document.write(page);document.close();
 }catch(e){status.className='err';status.textContent='حدثت مشكلة أثناء تشغيل NOVA AI: '+(e?.message||e);}
})();
<\/script>
</body>
</html>`;

fs.mkdirSync(path.dirname('nova-ai-original/index.html'), { recursive: true });
fs.writeFileSync('nova-ai-original/index.html', html, 'utf8');
console.log(`Wrote embedded original page (${Buffer.byteLength(html)} bytes)`);
