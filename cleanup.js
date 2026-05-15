/**
 * cleanup.js — одноразовый скрипт.
 * Чистит все HTML файлы от внешних трекеров, тяжёлых скриптов и
 * исправляет пути sigma-profi.com → локальные.
 * Запускать один раз: node cleanup.js
 */

const fs   = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, 'public');

// ─── patterns to strip ───────────────────────────────────────────────────────

// Удаляем <script> блоки если их содержимое или src содержит эти строки
const BLOCK_SCRIPT_CONTENT = [
  'mc.yandex.ru', 'metrika', 'ym(346676',
  'googletagmanager', 'gtag(', 'dataLayer.push',
  'fbq(', 'fbevents',
  'ucalc.pro', 'widgetOptions358554', 'widgetOptions235652',
  'adsbygoogle',
  'wp-emoji-release', 'wpemojiSettings',
  'advarkads', 'postclick', 's3.advarkads.com',
  'jivosite', 'jivositeloaded', 'code.jivosite.com',
  'mango-office.ru', 'mango.js', 'MangoObject',
];

const BLOCK_SCRIPT_SRC = [
  'api-maps.yandex.ru',
  'mc.yandex.ru',
  'googletagmanager.com',
  'google-analytics.com',
  'facebook.net',
  'connect.facebook.net',
  'ucalc.pro',
  // CF7 JS — формы статичные, бэкенда нет, CF7 JS только шлёт CORS-запросы на sigma-profi.com
  'contact-form-7/includes/swv/js',
  'contact-form-7/includes/js/index',
  'contact-form-7/includes/js/html5-fallback',
];

const BLOCK_NOSCRIPT_CONTENT = [
  'yandex', 'google', 'facebook', 'fbevents',
];

const BLOCK_LINK_HREF = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// ─── cleanup function ─────────────────────────────────────────────────────────

function cleanHtml(html) {
  // 0. Исправляем HTTrack-баг: defer попал в query string (два варианта кавычек)
  html = html.replace(/'%20defer='defer/g, '');      // вариант с одинарной кавычкой
  html = html.replace(/"%20defer='defer"/g, '"');    // вариант с двойной кавычкой: src="..."%20defer='defer" → src="..."

  // 0a. RevSlider fix: сохраняем fn.revolution сразу после загрузки и восстанавливаем в init.
  // Шаг 1: после revolution.min.js — сохраняем
  html = html.replace(
    /(<script[^>]*jquery\.themepunch\.revolution\.min[^>]*><\/script>)/i,
    '$1\n<script>if(window.jQuery&&jQuery.fn.revolution)window.__revFn=jQuery.fn.revolution;</script>'
  );
  // Шаг 2: в inline init — восстанавливаем перед проверкой
  html = html.replace(
    /var\s+(revapi\w+)\s*,[\s\n\t]*tpj\s*=\s*jQuery\s*;/g,
    'var $1,\n\ttpj=(function(){if(window.__revFn&&window.jQuery&&!jQuery.fn.revolution){jQuery.fn.revolution=window.__revFn;}return jQuery;})();'
  );

  // 0b. Переносим RevSlider scripts в <head> (сразу после jquery-migrate),
  //     чтобы jQuery.fn.revolution было готово раньше любого другого кода.
  //     Находим теги, вырезаем из тела, вставляем после jquery-migrate.
  const revToolsRe   = /<script[^>]*jquery\.themepunch\.tools\.min[^>]*><\/script>/i;
  const revMainRe    = /<script[^>]*jquery\.themepunch\.revolution\.min[^>]*><\/script>/i;
  const jqMigrateRe  = /(<script[^>]*jquery-migrate[^>]*><\/script>)/i;

  let revTools = (html.match(revToolsRe) || [''])[0];
  let revMain  = (html.match(revMainRe)  || [''])[0];

  if (revTools && revMain && jqMigrateRe.test(html)) {
    // Remove from original positions
    html = html.replace(revToolsRe, '');
    html = html.replace(revMainRe,  '');
    // Insert right after jquery-migrate
    html = html.replace(jqMigrateRe, '$1\n' + revTools + '\n' + revMain);
  }

  // 1. Все ссылки sigma-profi.com → локальные (http/https и protocol-relative //)
  // Обычные URL
  html = html.replace(/https?:\/\/sigma-profi\.com\/wp-content\//g, '/wp-content/');
  html = html.replace(/https?:\/\/sigma-profi\.com\//g, '/');
  html = html.replace(/\/\/sigma-profi\.com\//g, '/');
  // JSON-экранированные URL (https:\/\/sigma-profi.com\/)
  html = html.replace(/https?:\\\/\\\/sigma-profi\.com\\\/wp-content\\\//g, '/wp-content/');
  html = html.replace(/https?:\\\/\\\/sigma-profi\.com\\\//g, '/');

  // 2. Убираем <script>...</script> блоки по содержимому
  html = html.replace(/<script[\s\S]*?<\/script>/gi, (match) => {
    for (const pat of BLOCK_SCRIPT_CONTENT) {
      if (match.includes(pat)) return '<!-- script removed -->';
    }
    return match;
  });

  // 3. Убираем <script src="..."> теги по src
  html = html.replace(/<script[^>]*src="([^"]*)"[^>]*><\/script>/gi, (match, src) => {
    for (const pat of BLOCK_SCRIPT_SRC) {
      if (src.includes(pat)) return '';
    }
    return match;
  });
  html = html.replace(/<script[^>]*src="([^"]*)"[^>]*\/>/gi, (match, src) => {
    for (const pat of BLOCK_SCRIPT_SRC) {
      if (src.includes(pat)) return '';
    }
    return match;
  });

  // 4. Убираем <noscript> блоки трекеров
  html = html.replace(/<noscript[\s\S]*?<\/noscript>/gi, (match) => {
    for (const pat of BLOCK_NOSCRIPT_CONTENT) {
      if (match.toLowerCase().includes(pat)) return '';
    }
    return match;
  });

  // 5. Google Fonts — убираем <link> теги (двойные И одинарные кавычки)
  html = html.replace(/<link[^>]*href=["']([^"']*)["'][^>]*\/?>/gi, (match, href) => {
    for (const pat of BLOCK_LINK_HREF) {
      if (href.includes(pat)) return '';
    }
    return match;
  });

  // 6. Google Fonts через preload/onload
  html = html.replace(/<link[^>]*onload="this\.rel='stylesheet'"[^>]*>/gi, '');

  // 7. Комментарии HTTrack
  html = html.replace(/<!-- Mirrored from[\s\S]*?-->/g, '');
  html = html.replace(/<!-- Added by HTTrack -->[\s\S]*?<!-- \/Added by HTTrack -->/g, '');

  // 7b. JivoSite wrapper comments
  html = html.replace(/<!-- BEGIN JIVOSITE CODE[\s\S]*?<!-- \{\/literal\} END JIVOSITE CODE -->/gi, '');

  // 7c. Google Tag Manager noscript remnants
  html = html.replace(/<!-- Google Tag Manager \(noscript\) -->[\s\S]*?<!-- End Google Tag Manager \(noscript\) -->/gi, '');

  // 8. Вставляем быстрый системный шрифт вместо Google Fonts
  if (!html.includes('local-font-stack')) {
    const fontStyle = `<style id="local-font-stack">
body,h1,h2,h3,h4,h5,h6,p,a,span,div,li,td,th,button,input,textarea,select{
  font-family:'Segoe UI',Arial,sans-serif;
}
</style>`;
    html = html.replace(/<\/head>/i, fontStyle + '\n</head>');
  }

  // 9. Ссылки на удалённые новости → /novosti/
  const DELETED_NEWS = [
    '25-let-gk-sigma-profi','8-march-2025','biznes-tsentr-botanica-pod-okhranoy-sigma-profi',
    'four-seasons-hotel-moscow-pod-okhranoj-gk-sigma-profi','gk-sigma-profi-24-goda',
    'gonka-geroev-2024-komanda-sigma-profi','gonka-geroev-2024-video','gruppe-kompaniy-sigma-profi-23',
    'ludi-v-chernom-sorevnovaniya-2024','olimpiyskie-objekti-pod-okhranoy-gk-sigma-profi',
    'pozdravlyaem-s-8-marta','pozdravlyaem-s-8-marta-2','pozdravlyaem-s-9-maya',
    'pozdravlyaem-s-dnem-pobedy','pozdravlyaem-s-dnem-pobedy-2025','pozdravlyaem-s-dnem-rossii-2025',
    'predstavitelstvo-vologodskoy-oblasti-pod-okhranoy-sigma-profi',
    's-dnem-rossii','s-dnem-zashitnika-otechestva','s-novim-godom-2025',
    'sigma-profi-lider-reitinga-chop-2025','sigma-profi-lider-reytinga-chop-2024',
    'teatr-na-strastnom-pod-okhranoy-gk-sigma-profi','trc-botanica-pod-okhranoy-gk-sigma-profi',
    'ucheniya-sotrudnikov-gk-sigma-profi-v-objecte-v-skolkovo','videorolik-so-sborov-telohranitelej',
    'vsemirniy-molodezhi-i-studentov-2024','zk-prime-park-pod-okhranoy-gk-sigma-profi',
  ];
  for (const slug of DELETED_NEWS) {
    const re = new RegExp(`href="[^"]*novosti/${slug}[^"]*"`, 'g');
    html = html.replace(re, 'href="/novosti/"');
  }

  // 10. EN/ZH ссылки → /
  html = html.replace(/href="[^"]*\/en\/[^"]*"/g, 'href="/"');
  html = html.replace(/href="[^"]*\/zh\/[^"]*"/g, 'href="/"');
  html = html.replace(/href="en\/index\.html"/g, 'href="/"');
  html = html.replace(/href="zh\/index\.html"/g, 'href="/"');

  // 11. reCAPTCHA (google.com/recaptcha) — убираем, контакт-формы статичны
  html = html.replace(/<script[^>]*recaptcha[^>]*><\/script>/gi, '');
  html = html.replace(/<script[^>]*recaptcha[^>]*\/>/gi, '');
  html = html.replace(/<script[^>]*src="[^"]*recaptcha[^"]*"[^>]*><\/script>/gi, '');

  return html;
}

// ─── build hash map: "style.min.css" → "style.min32d4.css" ──────────────────

const HASH_MAP = {}; // relPath (no leading /) -> hashed filename

function buildHashMap(dir, relBase = '') {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relDir = relBase ? relBase + '/' + entry.name : entry.name;
    if (entry.isDirectory()) {
      buildHashMap(path.join(dir, entry.name), relBase ? relBase + '/' + entry.name : entry.name);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (ext !== '.css' && ext !== '.js') continue;
      const base = entry.name.slice(0, -ext.length);
      if (/[0-9a-f]{4}$/.test(base)) {
        const noHash = base.slice(0, -4) + ext;
        const dirPath = relBase || '';
        const key = (dirPath ? dirPath + '/' : '') + noHash;
        HASH_MAP[key] = (dirPath ? dirPath + '/' : '') + entry.name;
      }
    }
  }
}

buildHashMap(PUBLIC);
console.log(`Hash map: ${Object.keys(HASH_MAP).length} entries`);

// Fix hashless CSS/JS references in an HTML string
function fixAssetHashes(html, htmlFilePath) {
  // Resolve relative paths to absolute from the HTML file's directory
  const htmlDir = path.dirname(htmlFilePath);

  return html.replace(/(href|src)=['"]([^'"?#]+(?:\.css|\.js))([^'"]*)['"]/gi,
    (match, attr, filePath, rest) => {
      // Normalize to a public-relative path
      let pubRel;
      if (filePath.startsWith('/')) {
        pubRel = filePath.slice(1); // already root-relative
      } else {
        const abs = path.resolve(htmlDir, filePath);
        pubRel = path.relative(PUBLIC, abs).replace(/\\/g, '/');
      }

      // Check if the file exists on disk
      if (fs.existsSync(path.join(PUBLIC, pubRel))) return match;

      // Look up in hash map
      if (HASH_MAP[pubRel]) {
        const hashedRel = HASH_MAP[pubRel];
        // Reconstruct the original reference format (absolute or relative)
        let newPath;
        if (filePath.startsWith('/')) {
          newPath = '/' + hashedRel;
        } else {
          newPath = path.relative(htmlDir, path.join(PUBLIC, hashedRel)).replace(/\\/g, '/');
        }
        return `${attr}="${newPath}${rest}"`;
      }
      return match;
    }
  );
}

// ─── walk all HTML files ──────────────────────────────────────────────────────

let total = 0, cleaned = 0;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.name.endsWith('.html')) {
      total++;
      const original = fs.readFileSync(fullPath, 'utf8');
      let result = cleanHtml(original);
      result = fixAssetHashes(result, fullPath);
      if (result !== original) {
        fs.writeFileSync(fullPath, result, 'utf8');
        cleaned++;
      }
    }
  }
}

console.log('Cleaning HTML files in', PUBLIC, '...');
walk(PUBLIC);
console.log(`Done. Processed ${total} files, cleaned ${cleaned}.`);

// ─── verify ───────────────────────────────────────────────────────────────────
const mainHtml = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
const checks = [
  ['mc.yandex.ru',            'Яндекс.Метрика'],
  ['googletagmanager',        'Google Tag Manager'],
  ['facebook.com/tr',         'FB Pixel'],
  ['api-maps.yandex.ru',      'Яндекс.Карты API'],
  ['ucalc.pro',               'ucalc'],
  ['fonts.googleapis.com',    'Google Fonts'],
  ['sigma-profi.com/wp-content', 'Внешние картинки'],
];
console.log('\nПроверка index.html:');
for (const [pat, label] of checks) {
  const found = mainHtml.includes(pat);
  console.log(found ? `  ✗ ОСТАЛОСЬ: ${label} (${(mainHtml.match(new RegExp(pat.replace('.','\\.'),'g'))||[]).length}x)` : `  ✓ Убрано: ${label}`);
}
