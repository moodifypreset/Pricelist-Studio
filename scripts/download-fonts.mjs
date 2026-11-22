// Unduh semua font Google yang dipakai Price List Studio ke app/fonts/ (sekali saja, butuh internet).
// Jalankan: npm run fonts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'app', 'index.html'), 'utf8');
const outDir = path.join(root, 'app', 'fonts');
// sudah ada? lewati (hemat waktu). Paksa unduh ulang: npm run fonts -- --force
if (fs.existsSync(path.join(outDir, 'fonts.css')) && !process.argv.includes('--force')) { console.log('Font sudah ada, dilewati.'); process.exit(0); }
fs.mkdirSync(outDir, { recursive: true });

// ambil daftar FONTS dari aplikasi: ['Nama','serif','Serif','sumbu'] (sumbu null = font sistem)
const block = html.slice(html.indexOf('const FONTS=['), html.indexOf('];', html.indexOf('const FONTS=[')));
const fonts = [...block.matchAll(/\['([^']+)','[^']*','[^']*',(null|'[^']*')\]/g)]
  .filter(m => m[2] !== 'null').map(m => ({ name: m[1], axes: m[2].slice(1, -1) }));
console.log(`Ditemukan ${fonts.length} font.`);

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const KEEP = /latin(-ext)?\s*\*\//; // simpan subset latin & latin-ext saja (cukup untuk Bahasa Indonesia & Inggris)
let css = '/* Font dari Google Fonts, dibundel untuk pemakaian offline. Lisensi: SIL Open Font License / Apache 2.0 (lihat OFL.txt). */\n';
let n = 0, bytes = 0;

for (const f of fonts) {
  const url = `https://fonts.googleapis.com/css2?family=${f.name.replace(/ /g, '+')}${f.axes ? ':' + f.axes : ''}&display=swap`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) { console.warn('  ! gagal:', f.name, res.status); continue; }
  const text = await res.text();
  const blocks = text.split(/(?=\/\*\s*[\w-]+\s*\*\/)/);
  let k = 0;
  for (const b of blocks) {
    if (!KEEP.test(b.slice(0, 40))) continue;
    const m = b.match(/url\((https:[^)]+\.woff2)\)/); if (!m) continue;
    const file = `${f.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${++k}.woff2`;
    const fr = await fetch(m[1]); const buf = Buffer.from(await fr.arrayBuffer());
    fs.writeFileSync(path.join(outDir, file), buf); bytes += buf.length; n++;
    css += b.replace(m[1], file) + '\n';
  }
  console.log(`  ✓ ${f.name} (${k} file)`);
}
fs.writeFileSync(path.join(outDir, 'fonts.css'), css);
fs.writeFileSync(path.join(outDir, 'OFL.txt'), 'Font di folder ini berasal dari Google Fonts dan dilisensikan di bawah SIL Open Font License 1.1 (https://openfontlicense.org) atau Apache License 2.0. Font tidak dijual terpisah; disertakan sebagai bagian dari aplikasi Price List Studio.\n');
console.log(`\nSelesai: ${n} file font, ${(bytes / 1048576).toFixed(1)} MB → app/fonts/`);
