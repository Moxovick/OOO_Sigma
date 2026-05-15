/**
 * build.js — подготовка к деплою на Vercel.
 * Запекает текущий config.json в все HTML файлы папки public/.
 * Запускать перед каждым деплоем: node build.js
 */

const fs   = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, 'public');
const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

function applyConfig(html, cfg) {
  const p = cfg.phones;
  const e = cfg.emails;
  const a = cfg.address;

  const replacements = [
    // Телефоны в href
    [/href="tel:\+74959376000"/g,       `href="tel:${p.main.href}"`],
    [/href="tel:84959376000"/g,         `href="tel:${p.main.href}"`],
    [/href="tel:\+78005503961[^"]*"/g,  `href="tel:${p.free.href}"`],
    [/href="tel:\+78123177426"/g,       `href="tel:${p.spb.href}"`],
    [/href="tel:\+79039675163"/g,       `href="tel:${p.mobile.href}"`],
    [/href="tel:\+749952069582"/g,      `href="tel:${p.mobile.href}"`],

    // Телефоны (отображение)
    [/\+7 \(495\) 937-60-00/g,    p.main.display],
    [/8-800-550-39-61/g,           p.free.display],
    [/8 800 550-39-61/g,           p.free.display],
    [/\+7 \(812\) 317-74-26/g,    p.spb.display],
    [/\+7 \(903\) 967-51-63/g,    p.mobile.display],

    // Email
    [/info@sigma-profi\.com/g,     e.info],
    [/client@sigma-profi\.com/g,   e.client],
    [/kadr@sigma-profi\.com/g,     e.kadr],
    [/tender@sigma-profi\.com/g,   e.tender],

    // Адрес
    [/г\. Москва, Огородный проезд, д\. 20, стр\. 27, 5 этаж/g,       a.full],
    [/г\. Москва, Огородный проезд, д\. 20, стр\. 27, 5-й этаж/g,     a.full],
    [/127322, г\. Москва, Огородный проезд, д\. 20, стр\. 27, 5-й этаж/g, `${a.index}, ${a.full}`],
  ];

  for (const [re, val] of replacements) {
    html = html.replace(re, val);
  }
  return html;
}

let total = 0, changed = 0;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full);
    } else if (e.name.endsWith('.html')) {
      total++;
      const original = fs.readFileSync(full, 'utf8');
      const result   = applyConfig(original, CONFIG);
      if (result !== original) {
        fs.writeFileSync(full, result, 'utf8');
        changed++;
      }
    }
  }
}

console.log('Baking config into HTML files...');
walk(PUBLIC);
console.log(`Done. ${total} files processed, ${changed} updated.`);
console.log('\nConfig baked:');
console.log('  Phones:', CONFIG.phones.main.display, '|', CONFIG.phones.free.display);
console.log('  Email: ', CONFIG.emails.info);
console.log('  Address:', CONFIG.address.full);
console.log('\nReady for Vercel deploy. Run: vercel --prod');
