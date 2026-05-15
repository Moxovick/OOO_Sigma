const express = require('express');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');
const multer  = require('multer');
const zlib    = require('zlib');

// ─── Supabase + JWT (Vercel env) ──────────────────────────────────────────────
let supabase = null;
try {
  const sbKey = process.env.SUPABASE_SECRET || process.env.SUPABASE_SERVICE_KEY;
  if (process.env.SUPABASE_URL && sbKey) {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(process.env.SUPABASE_URL, sbKey);
  }
} catch(_) {}

let jwt = null;
try { jwt = require('jsonwebtoken'); } catch(_) {}

const JWT_SECRET = process.env.JWT_SECRET || 'local-dev-secret-change-me';

const app         = express();
const PORT        = process.env.PORT || 3000;
const PUBLIC_DIR  = path.join(__dirname, 'templates');   // HTML pages
// On Vercel, wp-content/wp-includes are @vercel/static CDN assets and never
// reach this function. Use /tmp paths so NFT doesn't bundle the 230MB directory.
const _staticRoot    = process.env.VERCEL ? '/tmp' : __dirname;
const WP_CONTENT_DIR  = path.join(_staticRoot, 'wp-content');
const WP_INCLUDES_DIR = path.join(_staticRoot, 'wp-includes');
const CONFIG_PATH = path.join(__dirname, 'config.json');
const SUBMISSIONS_PATH = path.join(__dirname, 'submissions.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Sigma@Admin2026';

// ─── Cyrillic → Latin transliteration (for vakansii URLs) ────────────────────
const TRANSLIT_MAP = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z',
  'и':'i','й':'j','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
  'с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh',
  'щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
  'А':'A','Б':'B','В':'V','Г':'G','Д':'D','Е':'E','Ё':'Yo','Ж':'Zh','З':'Z',
  'И':'I','Й':'J','К':'K','Л':'L','М':'M','Н':'N','О':'O','П':'P','Р':'R',
  'С':'S','Т':'T','У':'U','Ф':'F','Х':'Kh','Ц':'Ts','Ч':'Ch','Ш':'Sh',
  'Щ':'Shch','Ъ':'','Ы':'Y','Ь':'','Э':'E','Ю':'Yu','Я':'Ya'
};
function transliterate(str) {
  return str.split('').map(c => TRANSLIT_MAP[c] !== undefined ? TRANSLIT_MAP[c] : c).join('');
}

// Build a lookup: transliterated-slug → original-dirname (for vakansii)
let _vakansiiMap = null;
function getVakansiiMap() {
  if (_vakansiiMap) return _vakansiiMap;
  _vakansiiMap = {};
  const dir = path.join(PUBLIC_DIR, 'vakansii');
  try {
    fs.readdirSync(dir).forEach(entry => {
      const translit = transliterate(entry).toLowerCase();
      if (translit !== entry.toLowerCase()) {
        _vakansiiMap[translit] = entry; // only non-ASCII originals
      }
    });
  } catch (_) {}
  return _vakansiiMap;
}

// ─── RevSlider extension stubs (injected inline) ─────────────────────────────
// Pre-registers all marker functions so waitForScripts() fires immediately.
const REV_EXT_STUBS = `<script id="revExtStubsInjected">
(function() {
  function tryRegister() {
    if (typeof jQuery === 'undefined' || typeof jQuery.fn.revolution === 'undefined') {
      return setTimeout(tryRegister, 30);
    }
    var _R = jQuery.fn.revolution;
    if (_R._extStubsDone) return;
    _R._extStubsDone = true;
    jQuery.extend(true, _R, {
      animateSlide: function(t, pe, opt, nextSlide, currentSlide, bg, speed, tl) {
        if (!tl) tl = new punchgs.TimelineLite();
        if (nextSlide) tl.add(punchgs.TweenLite.to(nextSlide, 0.6, { autoAlpha: 1, zIndex: 20 }), 0);
        if (currentSlide && nextSlide && currentSlide[0] !== nextSlide[0])
          tl.add(punchgs.TweenLite.to(currentSlide, 0.6, { autoAlpha: 0 }), 0);
        return tl;
      },
      animateNewSlide: function() {},
      animateOldSlide: function() {},
      createNavigation: function() {},
      setNavigation: function() {},
      hideUnhideNavigation: function() {},
      prepareNavigation: function() {},
      handleStaticLayers: function() {},
      animateTheCaptions: function() {},
      removeTheCaptions: function() {},
      toggleLayerAnimations: function() {},
      layerAnimateStop: function() {},
      checkActions: function() {},
      triggerLayerAction: function() {},
      resetVideo: function() {},
      isVideoPlaying: function() { return false; },
      startVideo: function() {},
      stopVideo: function() {},
      stopKenBurn: function() {},
      startKenBurn: function() {},
      prepareCarousel: function() {},
      checkForParallax: function() {},
      scrollHandling: function() {},
      migration: function(el, opt) { return opt; }
    });
  }
  tryRegister();
})();
</script>`;

// ─── Calculator replacement (ucalc.pro was removed by cleanup.js) ────────────
const CALC_REPLACEMENT = `
<div class="sigma-calc-form" style="background:#f8f9fa;border:1px solid #e0e0e0;border-radius:8px;padding:28px 24px;max-width:560px;margin:16px auto;font-family:system-ui,sans-serif;">
  <h3 style="margin:0 0 6px;font-size:18px;color:#222;">Рассчитать стоимость охраны</h3>
  <p style="margin:0 0 20px;font-size:14px;color:#666;">Оставьте заявку — мы рассчитаем стоимость и свяжемся с вами</p>
  <form class="sigma-calc-inner" method="POST">
    <div style="display:grid;gap:12px;">
      <input name="your-name" type="text" placeholder="Ваше имя *" required
        style="padding:11px 14px;border:1px solid #ccc;border-radius:6px;font-size:14px;width:100%;box-sizing:border-box;">
      <input name="tel-463" type="tel" placeholder="+7 (___) ___-__-__" required
        style="padding:11px 14px;border:1px solid #ccc;border-radius:6px;font-size:14px;width:100%;box-sizing:border-box;">
      <input name="your-email" type="email" placeholder="Email"
        style="padding:11px 14px;border:1px solid #ccc;border-radius:6px;font-size:14px;width:100%;box-sizing:border-box;">
      <textarea name="your-message" rows="3" placeholder="Опишите объект или задачу"
        style="padding:11px 14px;border:1px solid #ccc;border-radius:6px;font-size:14px;width:100%;box-sizing:border-box;resize:vertical;"></textarea>
      <button type="submit"
        style="padding:12px 28px;background:#d4990a;border:none;border-radius:6px;color:#fff;font-size:15px;font-weight:600;cursor:pointer;transition:background .2s;">
        Получить расчёт
      </button>
    </div>
  </form>
</div>`;

// Lazy-load polyfill + RevSlider DOM-replacement carousel
const LAZY_FIX = `<script id="sigmaLazyFix">
(function(){

  /* ── 1. Image lazy-load ──────────────────────────────────────────────────── */
  function loadLazy(){
    document.querySelectorAll('img[data-src],img[data-lazy-src]').forEach(function(img){
      var s=img.getAttribute('data-src')||img.getAttribute('data-lazy-src');
      if(!s)return;
      var cur=img.getAttribute('src')||'';
      if(cur.indexOf('lazy_placeholder')!==-1||cur==='#'||cur===''){
        img.src=s;img.classList.remove('lazy-hidden','lazy');
      }
    });
    document.querySelectorAll('img[data-lazyload]').forEach(function(img){
      var s=img.getAttribute('data-lazyload');
      if(!s)return;
      var cur=img.getAttribute('src')||'';
      if(cur.indexOf('dummy.png')!==-1||cur===''||cur==='#') img.src=s;
    });
  }

  /* ── 2. Replace RevSlider with a working carousel ───────────────────────── *
   * Runs at DOMContentLoaded — BEFORE jQuery's ready() fires the RevSlider   *
   * init. We pull image URLs from the original <li> slides, build our own    *
   * carousel markup, and swap the wrapper HTML so RevSlider JS finds nothing. */
  function buildCarousels(){
    document.querySelectorAll('.rev_slider_wrapper').forEach(function(wrapper){
      var slider = wrapper.querySelector('.rev_slider');
      if(!slider) return;

      // Collect slide data
      var slides = [];
      slider.querySelectorAll(':scope > ul > li').forEach(function(li){
        var img = li.querySelector('img.rev-slidebg');
        if(!img) return;
        // data-lazyload on main page, real src on Вооружение
        var src = img.getAttribute('data-lazyload') || img.getAttribute('src') || '';
        if(!src || src.indexOf('dummy.png')!==-1 || src==='') return;
        // Grab optional caption from data layers
        var title = li.getAttribute('data-title') || '';
        slides.push({src:src, title:title});
      });

      if(slides.length===0) return; // nothing to build

      // Unique ID per carousel on the page
      var uid = 'sgc-' + Math.random().toString(36).slice(2,7);

      // Build carousel HTML
      var html = '<div id="'+uid+'" class="sigma-carousel" style="'
        + 'position:relative;width:100%;overflow:hidden;background:#000;'
        + 'max-height:500px;line-height:0;">';

      // Track
      html += '<div class="sgc-track" style="display:flex;transition:transform .55s cubic-bezier(.4,0,.2,1);">';
      slides.forEach(function(s){
        html += '<img src="'+s.src+'" alt="'+s.title+'" style="'
          + 'min-width:100%;width:100%;max-height:500px;'
          + 'object-fit:cover;object-position:center top;'
          + 'flex-shrink:0;display:block;">';
      });
      html += '</div>';

      // Prev / Next buttons
      html += '<button class="sgc-btn sgc-prev" aria-label="Назад" style="'
        + 'position:absolute;top:50%;left:14px;transform:translateY(-50%);'
        + 'z-index:20;background:rgba(0,0,0,.45);color:#fff;border:none;'
        + 'width:46px;height:46px;font-size:24px;cursor:pointer;'
        + 'border-radius:4px;line-height:46px;text-align:center;">'
        + '&#10094;</button>';
      html += '<button class="sgc-btn sgc-next" aria-label="Вперёд" style="'
        + 'position:absolute;top:50%;right:14px;transform:translateY(-50%);'
        + 'z-index:20;background:rgba(0,0,0,.45);color:#fff;border:none;'
        + 'width:46px;height:46px;font-size:24px;cursor:pointer;'
        + 'border-radius:4px;line-height:46px;text-align:center;">'
        + '&#10095;</button>';

      // Dots
      if(slides.length > 1){
        html += '<div class="sgc-dots" style="'
          + 'position:absolute;bottom:12px;left:0;right:0;'
          + 'text-align:center;z-index:20;">';
        slides.forEach(function(_,i){
          html += '<span class="sgc-dot" data-i="'+i+'" style="'
            + 'display:inline-block;width:10px;height:10px;border-radius:50%;'
            + 'background:'+(i===0?'#fff':'rgba(255,255,255,.45)')+';'
            + 'margin:0 4px;cursor:pointer;transition:background .25s;"></span>';
        });
        html += '</div>';
      }

      html += '</div>'; // .sigma-carousel

      // Preserve wrapper dimensions by keeping the wrapper element but clearing inside
      wrapper.innerHTML = html;

      // Wire up interactivity
      var car   = wrapper.querySelector('#'+uid);
      var track = car.querySelector('.sgc-track');
      var dots  = car.querySelectorAll('.sgc-dot');
      var cur   = 0;
      var total = slides.length;
      var timer;

      function goTo(n){
        cur = (n + total) % total;
        track.style.transform = 'translateX(-'+cur+'00%)';
        dots.forEach(function(d,i){
          d.style.background = i===cur ? '#fff' : 'rgba(255,255,255,.45)';
        });
      }

      function startAuto(){
        clearInterval(timer);
        if(total>1) timer = setInterval(function(){ goTo(cur+1); }, 5000);
      }

      car.querySelector('.sgc-prev').addEventListener('click',function(){
        goTo(cur-1); startAuto();
      });
      car.querySelector('.sgc-next').addEventListener('click',function(){
        goTo(cur+1); startAuto();
      });
      dots.forEach(function(d){
        d.addEventListener('click',function(){
          goTo(+this.getAttribute('data-i')); startAuto();
        });
      });

      // Touch swipe
      var tx0;
      car.addEventListener('touchstart',function(e){ tx0=e.touches[0].clientX; },{passive:true});
      car.addEventListener('touchend',function(e){
        var dx=e.changedTouches[0].clientX-tx0;
        if(Math.abs(dx)>40){ goTo(dx<0?cur+1:cur-1); startAuto(); }
      },{passive:true});

      // Pause on hover
      car.addEventListener('mouseenter',function(){ clearInterval(timer); });
      car.addEventListener('mouseleave',startAuto);

      startAuto();
    });
  }

  /* ── 3. Neuter RevSlider so it doesn't re-show the hidden original markup ── */
  function neutraliseRevSlider(){
    // If jQuery is available, replace .revolution so RevSlider's ready() is a no-op
    if(window.jQuery && jQuery.fn.revolution){
      jQuery.fn.revolution = function(){ return this; };
    }
    // Also block via __revFn
    window.__revFn = function(){ return this; };
  }

  /* ── 4. Run order ────────────────────────────────────────────────────────── */
  function init(){
    buildCarousels();
    neutraliseRevSlider();
    loadLazy();
  }

  if(document.readyState==='loading')
    document.addEventListener('DOMContentLoaded', init);
  else init();

  window.addEventListener('load', loadLazy);
  var st; window.addEventListener('scroll',function(){
    clearTimeout(st); st=setTimeout(loadLazy,80);
  },{passive:true});

})();
</script>`;

// PopupMaker polyfill: opens .popmake-XXXX overlays without backend AJAX
const POPUP_FIX = `<script id="sigmaPumFix">
(function(){
  function openPum(id){
    var ov=document.getElementById('pum-'+id);
    if(!ov) return;
    // Already visible (e.g. pum JS handled it) — do nothing
    var cs=window.getComputedStyle(ov);
    if(cs.display!=='none'&&cs.display!=='') return;
    ov.style.cssText='display:flex!important;align-items:flex-start;justify-content:center;position:fixed;top:0;left:0;right:0;bottom:0;z-index:1999999990;background:rgba(0,0,0,.7);padding-top:80px;box-sizing:border-box;';
    var box=ov.querySelector('.pum-container');
    if(box) box.style.cssText='display:block;background:#fff;border-radius:6px;max-width:640px;width:94%;max-height:80vh;overflow-y:auto;padding:24px;box-sizing:border-box;';
    function close(){ov.style.display='none';document.removeEventListener('keydown',onKey);}
    function onKey(ev){if(ev.key==='Escape')close();}
    ov.addEventListener('click',function(ev){if(ev.target===ov)close();},{once:true});
    document.addEventListener('keydown',onKey);
    ov.querySelectorAll('.pum-close,.popmake-close').forEach(function(btn){btn.onclick=close;});
  }
  function init(){
    document.addEventListener('click',function(e){
      var el=e.target;
      while(el&&el!==document){
        if(el.classList){
          var cls=Array.from(el.classList).find(function(c){return/^popmake-\d+$/.test(c);});
          if(cls){
            e.preventDefault();
            // Defer check so pum JS can handle it first
            var id=cls.replace('popmake-','');
            setTimeout(function(){openPum(id);},50);
            return;
          }
        }
        el=el.parentElement;
      }
    },true); // capture phase so we run before other handlers
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
</script>`;

// Simple slider nav styles (RevSlider static render handled by JS interception)
const SLIDER_NAV_CSS = `<style id="sigmaSliderNav">
.sigma-nav-btn{position:absolute;top:50%;transform:translateY(-50%);z-index:100;background:rgba(0,0,0,.45);color:#fff;border:none;width:44px;height:44px;font-size:22px;cursor:pointer;border-radius:3px;line-height:44px;text-align:center;transition:background .2s}
.sigma-nav-btn:hover{background:rgba(0,0,0,.7)}
.sigma-nav-prev{left:12px}.sigma-nav-next{right:12px}
.rev_slider_wrapper{position:relative}
</style>`;

// ─── helpers ─────────────────────────────────────────────────────────────────

function defaultConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch { return {}; }
}

async function loadConfig() {
  if (supabase) {
    const { data } = await supabase.from('site_config').select('data').eq('id', 1).single();
    return data?.data || defaultConfig();
  }
  return defaultConfig();
}

async function saveConfig(cfg) {
  if (supabase) {
    await supabase.from('site_config').upsert({ id: 1, data: cfg });
    return;
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

async function loadSubmissions() {
  if (supabase) {
    const { data } = await supabase.from('submissions')
      .select('*').order('created_at', { ascending: false });
    return (data || []).map(r => ({
      id: r.id, time: r.created_at, page: r.page,
      name: r.name, phone: r.phone, email: r.email,
      subject: r.subject, message: r.message, raw: r.raw || {}
    }));
  }
  if (!fs.existsSync(SUBMISSIONS_PATH)) return [];
  try { return JSON.parse(fs.readFileSync(SUBMISSIONS_PATH, 'utf8')); } catch { return []; }
}

async function saveSubmission(entry) {
  if (supabase) {
    await supabase.from('submissions').insert({
      id: entry.id, created_at: new Date(entry.time).toISOString(),
      page: entry.page, name: entry.name, phone: entry.phone,
      email: entry.email, subject: entry.subject, message: entry.message,
      raw: entry.raw || {}
    });
    return;
  }
  const list = await loadSubmissions();
  list.unshift(entry);
  fs.writeFileSync(SUBMISSIONS_PATH, JSON.stringify(list, null, 2), 'utf8');
}

function applyConfig(html, cfg) {
  const p = cfg.phones;
  const e = cfg.emails;
  const a = cfg.address;
  const s = cfg.social || {};

  const mainDisp = p.main.display   || '';
  const freeDisp = p.free.display   || '';
  const spbDisp  = p.spb.display    || '';
  const mobDisp  = p.mobile.display || '';

  const replacements = [
    // ── phones href ──────────────────────────────────────────────────────────
    [/href="tel:\+74959376000"/g,      `href="tel:${p.main.href}"`],
    [/href="tel:84959376000"/g,        `href="tel:${p.main.href}"`],
    [/href="tel:\+78005503961[^"]*"/g, `href="tel:${p.free.href}"`],
    [/href="tel:\+78123177426"/g,      `href="tel:${p.spb.href}"`],
    [/href="tel:\+79039675163"/g,      `href="tel:${p.mobile.href}"`],
    [/href="tel:\+749952069582"/g,     `href="tel:${p.mobile.href}"`],
    // ── phones display (cover all formats found in HTML) ─────────────────────
    [/\+7 \(495\) 937-60-00/g,        mainDisp],
    [/8 \(495\) 937-60-00/g,          mainDisp],
    [/8-800-550-39-61/g,              freeDisp],
    [/8 800 550-39-61/g,              freeDisp],
    [/8 \(800\) 550-39-61/g,          freeDisp],
    [/\+7 \(800\) 550-39-61/g,        freeDisp],
    [/\+7 \(812\) 317-74-26/g,        spbDisp],
    [/\+7 \(903\) 967-51-63/g,        mobDisp],
    // ── emails ───────────────────────────────────────────────────────────────
    [/info@sigma-profi\.org/g,        e.info   || 'info@sigma-profi.org'],
    [/client@sigma-profi\.org/g,      e.client || 'client@sigma-profi.org'],
    [/kadr@sigma-profi\.org/g,        e.kadr   || 'kadr@sigma-profi.org'],
    [/tender@sigma-profi\.org/g,      e.tender || 'tender@sigma-profi.org'],
    // ── address (commented-out in most pages but replace where present) ──────
    [/г\. Москва, Огородный проезд, д\. 20, стр\. 27, 5 этаж/g,           a.full || ''],
    [/г\. Москва, Огородный проезд, д\. 20, стр\. 27, 5-й этаж/g,         a.full || ''],
    [/127322, г\. Москва, Огородный проезд, д\. 20, стр\. 27, 5-й этаж/g, a.index ? `${a.index}, ${a.full}` : ''],
    // ── social (removed — strip all social media icons from pages) ──────────
    [/<li>\s*<a[^>]*(?:vk\.com|youtube\.com|instagram\.com|facebook\.com|twitter\.com|telegram\.me|t\.me|odnoklassniki\.ru|ok\.ru)[^>]*>[\s\S]*?<\/a>\s*<\/li>/gi, ''],
    [/<li>\s*<a[^>]*class="[^"]*instagram[^"]*"[^>]*>[\s\S]*?<\/a>\s*<\/li>/gi, ''],
  ];

  for (const [pattern, replacement] of replacements) {
    html = html.replace(pattern, replacement);
  }
  return html;
}

function applyDogovorData(html, cfg) {
  const c = cfg.company || {};
  const a = cfg.address || {};
  // Replace hardcoded company data in dogovor-oferty
  if (c.legal_name)    html = html.replace(/ООО ЧОП «СИГМА-ПРОФИ»/g, c.legal_name);
  if (c.inn)           html = html.replace(/ИНН 7707293185/g, `ИНН ${c.inn}`);
  if (c.kpp)           html = html.replace(/КПП 771601001/g, `КПП ${c.kpp}`);
  if (c.ogrn)          html = html.replace(/ОГРН 1037739060666/g, `ОГРН ${c.ogrn}`);
  if (c.director)      html = html.replace(/Машуров Г\.Н\./g, c.director);
  if (c.rs)            html = html.replace(/40702810738040020050/g, c.rs);
  if (c.ks)            html = html.replace(/30101810400000000225/g, c.ks);
  if (c.bik)           html = html.replace(/044525225/g, c.bik);
  if (c.bank_name)     html = html.replace(/ПАО Сбербанк России г\. Москва/g, c.bank_name);
  if (c.legal_address) html = html.replace(
    /129347, г\. Москва, ул\. Холмогорская, д\.6, корп\.2, стр\.2/g,
    c.legal_address
  );
  return html;
}

function fixRootRedirect(html) {
  return html.replace(/<META HTTP-EQUIV="Refresh" CONTENT="0; URL=en\/index\.html">/i, '');
}

// ─── session auth (JWT on Vercel, in-memory locally) ─────────────────────────
const sessions = new Set(); // used only when jwt module unavailable

function generateToken() {
  if (jwt) return jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '7d' });
  const t = crypto.randomBytes(24).toString('hex');
  sessions.add(t);
  return t;
}

function isAuthenticated(req) {
  const token = req.cookies && req.cookies['admin_token'];
  if (!token) return false;
  if (jwt) {
    try { jwt.verify(token, JWT_SECRET); return true; } catch { return false; }
  }
  return sessions.has(token);
}

// ─── multer (multipart/form-data for file uploads) ────────────────────────────
const UPLOADS_DIR = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, 'uploads');
try { if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch(_) {}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ─── middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const raw = req.headers.cookie || '';
  req.cookies = {};
  raw.split(';').forEach(pair => {
    const [k, ...v] = pair.trim().split('=');
    if (k) req.cookies[k.trim()] = v.join('=').trim();
  });
  next();
});

// ─── admin routes ─────────────────────────────────────────────────────────────
app.get('/admin/login', (req, res) => {
  if (isAuthenticated(req)) return res.redirect('/admin');
  res.send(loginPage());
});
app.post('/admin/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    const token = generateToken();
    res.setHeader('Set-Cookie', `admin_token=${token}; Path=/; HttpOnly; SameSite=Strict`);
    return res.redirect('/admin');
  }
  res.send(loginPage('Неверный пароль'));
});
app.get('/admin/logout', (req, res) => {
  const token = req.cookies['admin_token'];
  if (token && !jwt) sessions.delete(token);
  res.setHeader('Set-Cookie', 'admin_token=; Path=/; Max-Age=0');
  res.redirect('/admin/login');
});
app.get('/admin', async (req, res) => {
  if (!isAuthenticated(req)) return res.redirect('/admin/login');
  const cfg  = await loadConfig();
  const subs = await loadSubmissions();
  res.send(adminPage(cfg, subs));
});
app.post('/admin/save', async (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const cfg = await loadConfig();
    const b   = req.body;

    // phones
    cfg.phones.main.display   = b.phone_main_display   || cfg.phones.main.display;
    cfg.phones.main.href      = b.phone_main_href       || cfg.phones.main.href;
    cfg.phones.free.display   = b.phone_free_display    || cfg.phones.free.display;
    cfg.phones.free.href      = b.phone_free_href       || cfg.phones.free.href;
    cfg.phones.spb.display    = b.phone_spb_display     || cfg.phones.spb.display;
    cfg.phones.spb.href       = b.phone_spb_href        || cfg.phones.spb.href;
    cfg.phones.mobile.display = b.phone_mobile_display  || cfg.phones.mobile.display;
    cfg.phones.mobile.href    = b.phone_mobile_href     || cfg.phones.mobile.href;

    // emails
    cfg.emails.info    = b.email_info    || cfg.emails.info;
    cfg.emails.client  = b.email_client  || cfg.emails.client;
    cfg.emails.kadr    = b.email_kadr    || cfg.emails.kadr;
    cfg.emails.tender  = b.email_tender  || cfg.emails.tender;

    // address
    cfg.address.full   = b.address_full  || cfg.address.full;
    cfg.address.index  = b.address_index || cfg.address.index;
    cfg.address.legal  = b.address_legal || cfg.address.legal;

    // company
    cfg.company.name         = b.company_name         || cfg.company.name;
    cfg.company.legal_name   = b.company_legal_name   || cfg.company.legal_name;
    cfg.company.inn          = b.company_inn          !== undefined ? b.company_inn : cfg.company.inn;
    cfg.company.kpp          = b.company_kpp          !== undefined ? b.company_kpp : cfg.company.kpp;
    cfg.company.ogrn         = b.company_ogrn         !== undefined ? b.company_ogrn : cfg.company.ogrn;
    cfg.company.director     = b.company_director     || cfg.company.director;
    cfg.company.bank_name    = b.company_bank_name    || cfg.company.bank_name;
    cfg.company.rs           = b.company_rs           !== undefined ? b.company_rs : cfg.company.rs;
    cfg.company.ks           = b.company_ks           !== undefined ? b.company_ks : cfg.company.ks;
    cfg.company.bik          = b.company_bik          !== undefined ? b.company_bik : cfg.company.bik;
    cfg.company.legal_address = b.company_legal_address || cfg.company.legal_address;

    await saveConfig(cfg);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a submission
app.post('/admin/submissions/delete', async (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  const id = req.body.id;
  if (supabase) {
    await supabase.from('submissions').delete().eq('id', id);
  } else {
    const list = (await loadSubmissions()).filter(s => s.id !== id);
    fs.writeFileSync(SUBMISSIONS_PATH, JSON.stringify(list, null, 2), 'utf8');
  }
  res.json({ ok: true });
});

// ─── Page content editor ──────────────────────────────────────────────────────
const EDITABLE_PAGES = {
  'dostavka-dokumentov': path.join(PUBLIC_DIR, 'uslugi/dostavka-dokumentov/index.html'),
};

async function getPageContent(pageKey) {
  if (supabase) {
    const { data } = await supabase.from('page_content')
      .select('html').eq('page_key', pageKey).single();
    // If Supabase has content use it; otherwise fall through to file
    if (data?.html) return data.html;
  }
  const filePath = EDITABLE_PAGES[pageKey];
  if (!filePath) return null;
  try {
    const html = fs.readFileSync(filePath, 'utf8');
    const startTag = `<!-- SIGMA-EDITABLE-START: ${pageKey} -->`;
    const endTag   = `<!-- SIGMA-EDITABLE-END: ${pageKey} -->`;
    const s = html.indexOf(startTag);
    const e = html.indexOf(endTag);
    if (s === -1 || e === -1) return null;
    return html.slice(s + startTag.length, e).trim();
  } catch { return null; }
}

async function savePageContent(pageKey, newContent) {
  if (supabase) {
    const { error } = await supabase.from('page_content')
      .upsert({ page_key: pageKey, html: newContent, updated_at: new Date().toISOString() });
    return !error;
  }
  const filePath = EDITABLE_PAGES[pageKey];
  if (!filePath) return false;
  try {
    let html = fs.readFileSync(filePath, 'utf8');
    const startTag = `<!-- SIGMA-EDITABLE-START: ${pageKey} -->`;
    const endTag   = `<!-- SIGMA-EDITABLE-END: ${pageKey} -->`;
    const s = html.indexOf(startTag);
    const e = html.indexOf(endTag);
    if (s === -1 || e === -1) return false;
    html = html.slice(0, s + startTag.length) + '\n' + newContent + '\n' + html.slice(e);
    fs.writeFileSync(filePath, html, 'utf8');
    return true;
  } catch { return false; }
}

app.get('/admin/page-content', async (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  const pageKey = req.query.page;
  const content = await getPageContent(pageKey);
  if (content === null) return res.status(404).json({ error: 'Page not found' });
  res.json({ ok: true, content });
});

app.post('/admin/page-content/save', async (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  const pageKey  = req.body.page;
  const content  = req.body.content;
  if (!pageKey || content === undefined) return res.status(400).json({ error: 'Missing params' });
  const ok = await savePageContent(pageKey, content);
  if (!ok) return res.status(404).json({ error: 'Page not found or markers missing' });
  res.json({ ok: true });
});

// ─── Vakansii: resolve transliterated Latin slugs → Cyrillic directories ──────
// When a link like /vakansii/sotrudnitsa-v-ofis-propuskov-moskva/ is requested
// (transliterated from a Cyrillic directory name), find and serve the real dir.
app.get(/^\/vakansii\/([^/]+)\/?$/, (req, res, next) => {
  const slug = req.params[0];
  // Already exists as-is → skip (static handler will serve it)
  const directPath = path.join(PUBLIC_DIR, 'vakansii', slug, 'index.html');
  if (fs.existsSync(directPath)) return next();
  // Try to find a Cyrillic dir whose transliteration matches this slug
  const map = getVakansiiMap();
  const origDir = map[slug.toLowerCase()];
  if (!origDir) return next();
  const cyrillicPath = path.join(PUBLIC_DIR, 'vakansii', origDir, 'index.html');
  if (!fs.existsSync(cyrillicPath)) return next();
  // Serve the Cyrillic page (reusing the full HTML pipeline below via internal redirect)
  req.url = '/vakansii/' + encodeURIComponent(origDir) + '/';
  next('route'); // skip this route, fall through to HTML middleware
});

// ─── CF7 REST API endpoints ───────────────────────────────────────────────────
// wpcf7 v6 sends AJAX to /wp-json/contact-form-7/v1/contact-forms/{id}/feedback
// with multipart/form-data (supports file uploads).

// GET schema (called on page load by wpcf7 JS to enable client-side validation)
app.get('/wp-json/contact-form-7/v1/contact-forms/:id/feedback', (req, res) => {
  res.json({ schema: {} });
});
// GET refill (called after form reset)
app.get('/wp-json/contact-form-7/v1/contact-forms/:id/refill', (req, res) => {
  res.json({});
});
app.post(
  '/wp-json/contact-form-7/v1/contact-forms/:id/feedback',
  upload.any(),
  async (req, res) => {
    const body   = req.body || {};
    const files  = req.files || [];
    const formId = req.params.id;

    // Extract well-known fields
    const name  = body['your-name']   || body['name']  || '';
    const email = body['your-email']  || body['email'] || '';
    const phone = body['tel-463']     || body['tel-402'] || body['phone'] || body['tel'] || '';
    const msg   = body['your-message']|| body['textarea-191'] || body['text-305'] || body['message'] || '';
    const subj  = body['text-882']    || body['subject'] || '';

    // Build raw fields object (exclude CF7 internal fields)
    const raw = Object.fromEntries(
      Object.entries(body).filter(([k]) => !k.startsWith('_wpcf7') && !k.startsWith('g-recaptcha'))
    );

    // Attach uploaded file names
    if (files.length) {
      raw['__files'] = files.map(f => f.originalname).join(', ');
    }

    // Always save even if fields are sparse (at minimum we have form ID)
    const entry = {
      id:      crypto.randomBytes(8).toString('hex'),
      time:    new Date().toISOString(),
      page:    req.get('Referer') || `/form-${formId}`,
      name,
      email,
      phone,
      subject: subj,
      message: msg,
      raw,
    };
    await saveSubmission(entry);

    // Return CF7-compatible JSON response so the JS shows "sent" state
    res.json({
      status:        'mail_sent',
      message:       'Ваша заявка принята! Мы свяжемся с вами в ближайшее время.',
      posted_data_hash: crypto.randomBytes(16).toString('hex'),
      into:          `#wpcf7-f${formId}-o1`,
      invalid_fields: [],
      spam:          false,
    });
  }
);

// Also intercept old-style POST to /wp-admin/post.php (CF7 v5)
app.post('/wp-admin/post.php', (req, res) => {
  const body = req.body || {};
  const name  = body['your-name']  || body['name']  || '';
  const email = body['your-email'] || body['email'] || '';
  const phone = body['tel-463']    || body['tel-402'] || body['phone'] || '';
  const msg   = body['your-message'] || body['message'] || '';
  const raw   = Object.fromEntries(
    Object.entries(body).filter(([k]) => !k.startsWith('_wpcf7') && !k.startsWith('g-recaptcha'))
  );
  if (name || phone || email) {
    saveSubmission({
      id: crypto.randomBytes(8).toString('hex'),
      time: new Date().toISOString(),
      page: req.get('Referer') || '/wp-admin/post.php',
      name, email, phone, subject: '', message: msg, raw,
    });
  }
  const referer = req.get('Referer') || '/';
  res.redirect(referer.split('?')[0] + '?form_sent=1');
});

// ─── form submission interceptor ─────────────────────────────────────────────
// Catches all POST requests that look like contact / CF7 form submissions
app.use(async (req, res, next) => {
  if (req.method !== 'POST') return next();
  const body = req.body;
  if (!body) return next();

  // Skip admin routes
  if (req.path.startsWith('/admin')) return next();

  // Detect any submission that has a name or phone or email field
  const name  = body['your-name']    || body['name']          || '';
  const email = body['your-email']   || body['email']         || '';
  const phone = body['tel-463']      || body['tel-402']       || body['phone'] || body['tel'] || '';
  const msg   = body['your-message'] || body['textarea-191']  || body['text-305'] || body['message'] || '';
  const subj  = body['text-882']     || body['subject']       || '';

  // Only intercept if at least name OR phone is provided
  if (!name && !phone && !email) return next();

  const entry = {
    id:      crypto.randomBytes(8).toString('hex'),
    time:    new Date().toISOString(),
    page:    req.path,
    name,
    email,
    phone,
    subject: subj,
    message: msg,
    raw:     Object.fromEntries(
      Object.entries(body).filter(([k]) => !k.startsWith('_wpcf7') && !k.startsWith('g-recaptcha'))
    ),
  };
  await saveSubmission(entry);
  // Redirect back to the referring page with success flag
  const referer = req.get('Referer') || '/';
  const sep     = referer.includes('?') ? '&' : '?';
  res.redirect(referer.split('?')[0] + sep + 'form_sent=1');
});

// ─── CSS/JS hash fallback ─────────────────────────────────────────────────────
app.use((req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  if (ext !== '.css' && ext !== '.js') return next();

  const urlPath  = decodeURIComponent(req.path).split('?')[0];
  const filePath = path.join(PUBLIC_DIR, urlPath);
  if (fs.existsSync(filePath)) return next();

  const dir  = path.dirname(filePath);
  const base = path.basename(filePath, ext);
  try {
    const files  = fs.readdirSync(dir);
    const hashed = files.find(f =>
      f.startsWith(base) && f.endsWith(ext) &&
      /[0-9a-f]{4}$/.test(f.slice(0, -ext.length))
    );
    if (hashed) return res.sendFile(path.join(dir, hashed));
  } catch (_) {}
  next();
});

// ─── EN/ZH redirect ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const decoded = decodeURIComponent(req.path);
  if (decoded.startsWith('/en/') || decoded.startsWith('/zh/')) {
    return res.redirect(301, '/');
  }
  next();
});

// ─── HTML serving ─────────────────────────────────────────────────────────────
app.use(async (req, res, next) => {
  const urlPath = decodeURIComponent(req.path);
  let filePath  = path.join(PUBLIC_DIR, urlPath);

  if (urlPath === '/' || urlPath.endsWith('/')) {
    filePath = path.join(filePath, 'index.html');
  } else if (!path.extname(urlPath)) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!filePath.endsWith('.html')) return next();

  const resolvedPath = filePath; // capture for EDITABLE_PAGES lookup inside callback

  // Read as binary buffer first so we can handle gzip-compressed files
  fs.readFile(filePath, async (err, rawBuf) => {
    let html = '';
    if (!err && rawBuf) {
      // Detect gzip magic bytes (1f 8b)
      if (rawBuf[0] === 0x1f && rawBuf[1] === 0x8b) {
        try {
          rawBuf = zlib.gunzipSync(rawBuf);
        } catch (e) {
          // Not valid gzip — use as-is
        }
      }
      html = rawBuf.toString('utf8');
    }

    // Helper: is this URL a novosti article (not the listing or pagination)?
    const isNovostiArticle = urlPath.startsWith('/novosti/')
      && urlPath !== '/novosti/'
      && !urlPath.startsWith('/novosti/page')
      && !urlPath.startsWith('/novosti/feed');

    if (err) {
      // Missing file → redirect to listing with notice
      if (isNovostiArticle) return res.redirect(302, '/novosti/?article_missing=1');
      return next();
    }

    // File exists but is actually the auth wall (HTTrack captured auth page, not article)
    if (isNovostiArticle && html.includes('lor_auth_')) {
      return res.redirect(302, '/novosti/?article_missing=1');
    }

    const cfg = await loadConfig();
    html = applyConfig(html, cfg);

    // Inject Supabase page content if available
    for (const [pageKey, filePath] of Object.entries(EDITABLE_PAGES)) {
      if (filePath === resolvedPath) {
        const content = await getPageContent(pageKey);
        if (content) {
          const startTag = `<!-- SIGMA-EDITABLE-START: ${pageKey} -->`;
          const endTag   = `<!-- SIGMA-EDITABLE-END: ${pageKey} -->`;
          const s = html.indexOf(startTag);
          const e = html.indexOf(endTag);
          if (s !== -1 && e !== -1) {
            html = html.slice(0, s + startTag.length) + '\n' + content + '\n' + html.slice(e);
          }
        }
        break;
      }
    }

    if (urlPath.startsWith('/dogovor-oferty')) {
      html = applyDogovorData(html, cfg);
    }

    if (urlPath === '/' || urlPath === '/index.html') {
      html = fixRootRedirect(html);
    }

    html = html.replace(/<!-- Mirrored from[\s\S]*?-->/g, '');
    html = html.replace(/<!-- Added by HTTrack -->[\s\S]*?<!-- \/Added by HTTrack -->/g, '');

    // Inject RevSlider extension stubs on pages that have RevSlider
    if (html.includes('jquery.themepunch.revolution') && !html.includes('revExtStubsInjected')) {
      html = html.replace('</body>', REV_EXT_STUBS + '\n</body>');
    }

    // RevSlider pages always get the lazy+carousel fix (even without data-src)
    if (html.includes('rev_slider_wrapper') && !html.includes('sigmaLazyFix')) {
      html = html.replace('</body>', LAZY_FIX + '\n</body>');
    }

    // Magnific popup image scaling — force lightbox images to fill popup (not show at native tiny size)
    if (html.includes('magnific-popup') && !html.includes('sigmaMfpFix')) {
      html = html.replace('</head>',
        `<style id="sigmaMfpFix">
/* Scale up images to fill the lightbox — small thumbnails (220×330) stretch to ~80vh */
.mfp-img{
  height:80vh!important;
  width:auto!important;
  max-width:92vw!important;
  max-height:88vh!important;
  min-height:200px!important;
  object-fit:contain!important;
  display:block!important;
  margin:auto!important;
  background:transparent!important;
}
.mfp-figure{padding-top:0!important;background:transparent!important}
.mfp-figure figure{margin:0}
.mfp-image-holder .mfp-content{max-width:92vw;text-align:center}
.mfp-image-holder .mfp-figure{line-height:0}
.mfp-container{padding:10px 8px;background:rgba(0,0,0,.85)!important}
.mfp-wrap .mfp-close{font-size:30px;top:8px;right:8px}
</style>\n</head>`);
    }

    // ── Fix broken 3D viewer links (forma-odezhdy) ────────────────────────────
    // Replace <a href="*/3d/N.html"><img data-src="URL"></a>
    // with a non-clickable image container (photos are display-only, no popup).
    if (html.includes('/3d/') && html.includes('d3d')) {
      html = html.replace(
        /<a(\s+[^>]*?)href="([^"]*\/3d\/\d+\.html)"([^>]*)>([\s\S]*?)<\/a>/gi,
        (match, pre, href, post, inner) => {
          // Extract the real image URL from data-src or noscript
          const dsrcM = inner.match(/data-src="([^"]+)"/);
          const srcM  = inner.match(/<noscript>[^<]*<img[^>]+src="([^"]+)"/i);
          const imgUrl = (dsrcM && dsrcM[1]) || (srcM && srcM[1]) || '';
          if (!imgUrl) return match;
          // Build img with real src, wrapped in a non-clickable span
          const newInner = inner
            .replace(/src="[^"]*lazy_placeholder[^"]*"/, `src="${imgUrl}"`)
            .replace(/data-src="[^"]*"/, `data-src="${imgUrl}"`);
          return `<span style="cursor:default;display:block;">${newInner}</span>`;
        }
      );
    }

    // ── Grafik/smena pages: fix vacancy cards ──────────────────────────────────
    if (urlPath.startsWith('/grafik/')) {
      // 1. Replace src="#" imgvak cards with the сотрудница fallback image
      const FALLBACK_IMG = '/wp-content/uploads/2017/11/tts-bts-gos.png';
      html = html.replace(
        /<img([^>]*class="imgvak"[^>]*)src="#"([^>]*)>/gi,
        (match, pre, post) => `<img${pre}src="${FALLBACK_IMG}"${post}>`
      );

      // 2. Transliterate Cyrillic /vakansii/SLUG/ hrefs → Latin slugs
      //    Matches both relative /vakansii/... and absolute https://sigma-profi.org/vakansii/...
      //    so URLs show cleanly in the address bar and work on any server.
      html = html.replace(
        /href="(?:https?:\/\/sigma-profi.org)?(\/vakansii\/([^"]*[а-яёА-ЯЁ][^"]*)\/)"/gi,
        (match, full, slug) => `href="/vakansii/${transliterate(slug).toLowerCase().replace(/\s+/g,'-')}/"`
      );
    }

    // Fix broken src="#" images globally (vacancy cards, etc.) — replace with placeholder
    html = html.replace(/<img([^>]*)\ssrc="#"([^>]*)>/gi, (match, pre, post) => {
      const styleM = (pre + post).match(/style="([^"]*)"/);
      const style = styleM ? styleM[1] : 'height:118px;';
      return `<div style="${style}background:#eee;border-radius:4px;display:flex;align-items:center;justify-content:center;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div>`;
    });

    // Replace empty ucalc calculator divs with a simple request form
    if (html.includes('uCalc_') && !html.includes('sigma-calc-form')) {
      html = html.replace(/<div class="uCalc_\d+"><\/div>/g, CALC_REPLACEMENT);
      // Also strip the "<!-- script removed -->" placeholder left by cleanup.js near ucalc
      html = html.replace(/<p><!-- script removed --><\/p>/g, '');
    }

    // Lazy-load polyfill (pages with a3-lazy-load images)
    if (html.includes('data-src') && !html.includes('sigmaLazyFix')) {
      html = html.replace('</body>', LAZY_FIX + '\n</body>');
    }

    // PopupMaker polyfill (pages with pum- popups)
    if (html.includes('popmake-') && !html.includes('sigmaPumFix')) {
      html = html.replace('</body>', POPUP_FIX + '\n</body>');
    }

    // Notice toast for missing novosti article (redirected here with ?article_missing=1)
    if (urlPath.startsWith('/novosti') && !html.includes('sigmaArticleNotice')) {
      html = html.replace('</body>',
        `<script id="sigmaArticleNotice">
(function(){
  if(new URLSearchParams(window.location.search).get('article_missing')){
    var t=document.createElement('div');
    t.style.cssText='position:fixed;top:20px;right:20px;background:#856404;color:#fff;padding:14px 20px;border-radius:8px;font-family:sans-serif;font-size:14px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,.3);max-width:320px;line-height:1.4';
    t.textContent='Статьи недоступны в данной копии сайта — они требовали авторизации при сохранении. Показан список новостей.';
    document.body.appendChild(t);
    setTimeout(function(){t.remove();},6000);
    history.replaceState(null,'',window.location.pathname);
  }
})();
</script>\n</body>`);
    }

    // Show success toast after any form submission (wpcf7 or our calc form)
    if ((html.includes('wpcf7-form') || html.includes('sigma-calc-form') || html.includes('name="your-name"')) && !html.includes('sigmaFormHandler')) {
      html = html.replace('</body>',
        `<script id="sigmaFormHandler">
(function() {
  var params = new URLSearchParams(window.location.search);
  if (!params.get('form_sent')) return;
  var msg = document.createElement('div');
  msg.style.cssText = 'position:fixed;top:20px;right:20px;background:#238636;color:#fff;padding:16px 24px;border-radius:8px;font-family:sans-serif;font-size:15px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,.3)';
  msg.textContent = '✓ Ваша заявка принята! Мы свяжемся с вами в ближайшее время.';
  document.body.appendChild(msg);
  setTimeout(function() { msg.remove(); }, 5000);
  // Strip param from URL
  history.replaceState(null,'', window.location.pathname + window.location.hash);
})();
</script>\n</body>`);
    }

    // ── Rewrite absolute sigma-profi.org URLs to relative paths ─────────────
    // HTTrack sometimes saves pages with full URLs. Replace https://sigma-profi.org/
    // with / so all links, images, and scripts resolve locally.
    html = html.replace(/https?:\/\/sigma-profi.org\//g, '/');
    // Also fix src="../wp-content/" relative paths that end up double-slashed
    // after replacements (not needed but defensive)

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  });
});

// Static assets (wp-content / wp-includes live at project root, not inside public/)
app.use('/wp-content', express.static(WP_CONTENT_DIR));
app.use('/wp-includes', express.static(WP_INCLUDES_DIR));
app.use(express.static(PUBLIC_DIR));

// ─── uploads image fallback ───────────────────────────────────────────────────
app.use('/wp-content/uploads', (req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return next();

  const fullPath = path.join(WP_CONTENT_DIR, 'uploads', decodeURIComponent(req.path));
  if (fs.existsSync(fullPath)) return next();

  const dir  = path.dirname(fullPath);
  const base = path.basename(fullPath, ext);
  try {
    const files = fs.readdirSync(dir);
    const thumb = files.find(f =>
      f.startsWith(base + '-') && f.endsWith(ext) &&
      /-\d+x\d+$/.test(f.slice(0, -ext.length))
    );
    if (thumb) return res.sendFile(path.join(dir, thumb));
    const any = files.find(f => f.startsWith(base) && f.endsWith(ext) && f !== path.basename(fullPath));
    if (any) return res.sendFile(path.join(dir, any));
  } catch (_) {}
  next();
});

// ─── HTML templates ───────────────────────────────────────────────────────────

function loginPage(error = '') {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Вход — Sigma-Profi</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#0d1117;min-height:100vh;display:flex;align-items:center;justify-content:center}
.card{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:40px;width:100%;max-width:380px}
h1{color:#e6edf3;font-size:22px;margin-bottom:8px;text-align:center}
.sub{color:#8b949e;font-size:14px;text-align:center;margin-bottom:28px}
label{display:block;color:#cdd9e5;font-size:13px;margin-bottom:6px}
input[type=password]{width:100%;padding:10px 14px;background:#0d1117;border:1px solid #30363d;border-radius:8px;color:#e6edf3;font-size:15px;outline:none;transition:border .2s}
input[type=password]:focus{border-color:#388bfd}
.error{background:#3d1f1f;border:1px solid #f85149;color:#f85149;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:16px}
button{width:100%;margin-top:20px;padding:11px;background:#238636;border:none;border-radius:8px;color:#fff;font-size:15px;cursor:pointer;font-weight:600}
button:hover{background:#2ea043}
.lock{font-size:36px;text-align:center;margin-bottom:16px}
</style>
</head>
<body>
<div class="card">
  <div class="lock">🔐</div>
  <h1>Sigma-Profi</h1>
  <p class="sub">Панель управления</p>
  ${error ? `<div class="error">${error}</div>` : ''}
  <form method="POST" action="/admin/login">
    <label>Пароль</label>
    <input type="password" name="password" autofocus placeholder="Введите пароль">
    <button type="submit">Войти</button>
  </form>
</div>
</body>
</html>`;
}

function adminPage(cfg, subs) {
  const p = cfg.phones;
  const e = cfg.emails;
  const a = cfg.address;
  const c = cfg.company || {};
  const s = cfg.social  || {};

  const subsHtml = subs.length === 0
    ? '<p style="color:#8b949e;text-align:center;padding:24px">Заявок пока нет</p>'
    : subs.map(sub => `
      <div class="sub-card" data-id="${esc(sub.id)}">
        <div class="sub-meta">
          <span class="sub-time">${new Date(sub.time).toLocaleString('ru-RU')}</span>
          <span class="sub-page">${esc(sub.page)}</span>
          <button class="del-btn" onclick="delSub('${esc(sub.id)}')">✕</button>
        </div>
        <div class="sub-fields">
          ${sub.name    ? `<div><b>Имя:</b> ${esc(sub.name)}</div>`    : ''}
          ${sub.phone   ? `<div><b>Телефон:</b> ${esc(sub.phone)}</div>` : ''}
          ${sub.email   ? `<div><b>Email:</b> ${esc(sub.email)}</div>` : ''}
          ${sub.subject ? `<div><b>Тема:</b> ${esc(sub.subject)}</div>` : ''}
          ${sub.message ? `<div><b>Сообщение:</b> ${esc(sub.message)}</div>` : ''}
          ${(() => {
            // Show extra raw fields not already covered by the standard ones above
            const skip = new Set(['your-name','name','your-email','email','tel-463','tel-402','phone','tel','your-message','textarea-191','message','text-882','subject','agree']);
            const fieldLabels = {
              'text-305': 'Место жительства',
              'number-75': 'Возраст',
              'number-76': 'Вес (кг)',
              'radio-222': 'Группа',
              'radio-30': 'Рост',
              'dynamichidden-324': 'Источник',
              '__files': 'Прикреплённые файлы',
            };
            const extras = Object.entries(sub.raw || {})
              .filter(([k, v]) => !skip.has(k) && v !== '' && v !== null && v !== undefined)
              .map(([k, v]) => `<div><b>${esc(fieldLabels[k] || k)}:</b> ${esc(String(v))}</div>`)
              .join('');
            return extras;
          })()}
        </div>
      </div>`).join('');

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Админка — Sigma-Profi</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#0d1117;color:#e6edf3;min-height:100vh}
header{background:#161b22;border-bottom:1px solid #30363d;padding:14px 28px;display:flex;align-items:center;justify-content:space-between}
header h1{font-size:17px;font-weight:700}
.hdr-right{display:flex;align-items:center;gap:12px}
.site-btn{color:#58a6ff;text-decoration:none;font-size:13px;border:1px solid #30363d;padding:5px 14px;border-radius:6px}
.logout{color:#f85149;text-decoration:none;font-size:13px;border:1px solid #f85149;padding:5px 14px;border-radius:6px}
.tabs{display:flex;gap:0;border-bottom:1px solid #30363d;background:#161b22;padding:0 28px}
.tab{padding:12px 22px;cursor:pointer;font-size:14px;color:#8b949e;border-bottom:2px solid transparent;margin-bottom:-1px;user-select:none}
.tab.active{color:#e6edf3;border-color:#388bfd}
.panel{display:none;max-width:900px;margin:28px auto;padding:0 20px}
.panel.active{display:block}
section{background:#161b22;border:1px solid #30363d;border-radius:10px;margin-bottom:20px;overflow:hidden}
section h2{font-size:12px;font-weight:600;padding:14px 20px;border-bottom:1px solid #30363d;color:#8b949e;text-transform:uppercase;letter-spacing:.05em}
.fields{padding:18px 20px;display:grid;gap:14px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.field{display:flex;flex-direction:column;gap:5px}
.field label{font-size:12px;color:#8b949e;font-weight:500;text-transform:uppercase;letter-spacing:.04em}
.field input{padding:8px 12px;background:#0d1117;border:1px solid #30363d;border-radius:7px;color:#e6edf3;font-size:14px;outline:none;transition:border .2s}
.field input:focus{border-color:#388bfd}
.hint{font-size:11px;color:#6e7681}
.actions{padding:16px 20px;display:flex;align-items:center;gap:12px;border-top:1px solid #30363d}
.btn-save{padding:9px 24px;background:#238636;border:none;border-radius:7px;color:#fff;font-size:14px;cursor:pointer;font-weight:600}
.btn-save:hover{background:#2ea043}
.toast{display:none;padding:9px 16px;background:#1f4a2a;border:1px solid #2ea043;border-radius:7px;color:#3fb950;font-size:13px}
.toast.err{background:#3d1f1f;border-color:#f85149;color:#f85149}
/* submissions */
.sub-card{background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:16px;margin-bottom:12px}
.sub-meta{display:flex;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap}
.sub-time{color:#8b949e;font-size:12px}
.sub-page{background:#21262d;border-radius:4px;padding:2px 8px;font-size:12px;color:#58a6ff}
.del-btn{margin-left:auto;background:none;border:1px solid #f85149;color:#f85149;padding:3px 10px;border-radius:5px;cursor:pointer;font-size:12px}
.sub-fields{display:grid;gap:4px;font-size:14px}
.sub-fields b{color:#8b949e}
.badge{background:#388bfd;color:#fff;border-radius:10px;padding:1px 7px;font-size:11px;margin-left:6px}
@media(max-width:600px){.row{grid-template-columns:1fr}}
/* wysiwyg editor */
#editorToolbar{display:flex;flex-wrap:wrap;gap:4px;padding:10px 12px;background:#21262d;border:1px solid #30363d;border-radius:7px 7px 0 0;border-bottom:none}
.ed-btn{padding:5px 11px;background:#0d1117;border:1px solid #30363d;border-radius:5px;color:#c9d1d9;cursor:pointer;font-size:13px;line-height:1.4;transition:all .15s}
.ed-btn:hover{background:#388bfd;border-color:#388bfd;color:#fff}
.ed-sep{width:1px;background:#30363d;margin:2px 6px;align-self:stretch}
#pageEditor{min-height:440px;padding:22px 26px;background:#0d1117;border:1px solid #30363d;border-radius:0 0 7px 7px;color:#e6edf3;font-size:15px;line-height:1.75;outline:none;font-family:system-ui,sans-serif}
#pageEditor:focus{border-color:#388bfd}
#pageEditor h2{font-size:19px;font-weight:700;color:#e6edf3;margin:20px 0 8px;padding-bottom:6px;border-bottom:1px solid #21262d}
#pageEditor h3{font-size:16px;font-weight:600;color:#c9d1d9;margin:16px 0 6px}
#pageEditor p{margin-bottom:10px}
#pageEditor ul,#pageEditor ol{padding-left:22px;margin-bottom:10px}
#pageEditor li{margin-bottom:3px}
#pageEditor strong,#pageEditor b{color:#fff;font-weight:600}
#pageEditor img{max-width:100%;height:auto;border-radius:6px;display:block;margin:10px 0}
#pageEditor .mdlcall{background:#0f2b14;border:1px solid #2ea043;border-radius:8px;padding:14px 20px;margin:18px 0;display:flex;align-items:center;justify-content:space-between;gap:16px;cursor:default;flex-wrap:wrap}
#pageEditor .kc-cta-desc h2{font-size:15px;margin:0;color:#3fb950;border:none;padding:0;font-weight:600}
#pageEditor .kc-cta-button a{background:#238636;color:#fff;padding:8px 18px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;pointer-events:none}
.page-select-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
#pageSelect{padding:8px 12px;background:#0d1117;border:1px solid #30363d;border-radius:7px;color:#e6edf3;font-size:14px;outline:none;flex:1;min-width:200px}
</style>
</head>
<body>
<header>
  <h1>⚙️ Sigma-Profi — Панель управления</h1>
  <div class="hdr-right">
    <a class="site-btn" href="/" target="_blank">🌐 Сайт</a>
    <a class="logout" href="/admin/logout">Выйти</a>
  </div>
</header>

<div class="tabs">
  <div class="tab active" onclick="showTab('contacts')">Контакты</div>
  <div class="tab" onclick="showTab('company')">Компания</div>
  <div class="tab" onclick="showTab('pages')">Страницы</div>
  <div class="tab" onclick="showTab('submissions')">Заявки <span class="badge">${subs.length}</span></div>
</div>

<!-- ── CONTACTS TAB ── -->
<div class="panel active" id="tab-contacts">
  <form id="formContacts">

    <section>
      <h2>📞 Телефоны</h2>
      <div class="fields">
        <div class="row">
          <div class="field"><label>Основной — отображение</label><input name="phone_main_display" value="${esc(p.main.display)}"></div>
          <div class="field"><label>Основной — href (tel:)</label><input name="phone_main_href" value="${esc(p.main.href)}"><span class="hint">+74959376000</span></div>
        </div>
        <div class="row">
          <div class="field"><label>8-800 — отображение</label><input name="phone_free_display" value="${esc(p.free.display)}"></div>
          <div class="field"><label>8-800 — href</label><input name="phone_free_href" value="${esc(p.free.href)}"></div>
        </div>
        <div class="row">
          <div class="field"><label>СПб — отображение</label><input name="phone_spb_display" value="${esc(p.spb.display)}"></div>
          <div class="field"><label>СПб — href</label><input name="phone_spb_href" value="${esc(p.spb.href)}"></div>
        </div>
        <div class="row">
          <div class="field"><label>Мобильный — отображение</label><input name="phone_mobile_display" value="${esc(p.mobile.display)}"></div>
          <div class="field"><label>Мобильный — href</label><input name="phone_mobile_href" value="${esc(p.mobile.href)}"></div>
        </div>
      </div>
    </section>

    <section>
      <h2>✉️ Email-адреса</h2>
      <div class="fields">
        <div class="row">
          <div class="field"><label>Основной (info)</label><input name="email_info" value="${esc(e.info)}" type="email"></div>
          <div class="field"><label>Клиентский (client)</label><input name="email_client" value="${esc(e.client)}" type="email"></div>
        </div>
        <div class="row">
          <div class="field"><label>Кадры (kadr)</label><input name="email_kadr" value="${esc(e.kadr)}" type="email"></div>
          <div class="field"><label>Тендеры (tender)</label><input name="email_tender" value="${esc(e.tender)}" type="email"></div>
        </div>
      </div>
    </section>

    <section>
      <h2>📍 Адрес</h2>
      <div class="fields">
        <div class="field"><label>Адрес (на сайте)</label><input name="address_full" value="${esc(a.full)}"></div>
        <div class="row">
          <div class="field"><label>Почтовый индекс</label><input name="address_index" value="${esc(a.index)}"></div>
          <div class="field"><label>Юридический адрес</label><input name="address_legal" value="${esc(a.legal)}"></div>
        </div>
      </div>
    </section>

    <div class="actions">
      <button type="submit" class="btn-save">Сохранить контакты</button>
      <div class="toast" id="t-contacts"></div>
    </div>
  </form>
</div>

<!-- ── COMPANY TAB ── -->
<div class="panel" id="tab-company">
  <form id="formCompany">
    <section>
      <h2>🏢 Данные компании</h2>
      <div class="fields">
        <div class="row">
          <div class="field"><label>Торговое название</label><input name="company_name" value="${esc(c.name||'')}"></div>
          <div class="field"><label>Юридическое название</label><input name="company_legal_name" value="${esc(c.legal_name||'')}"></div>
        </div>
        <div class="row">
          <div class="field"><label>ИНН</label><input name="company_inn" value="${esc(c.inn||'')}"></div>
          <div class="field"><label>КПП</label><input name="company_kpp" value="${esc(c.kpp||'')}"></div>
        </div>
        <div class="row">
          <div class="field"><label>ОГРН</label><input name="company_ogrn" value="${esc(c.ogrn||'')}"></div>
          <div class="field"><label>Генеральный директор</label><input name="company_director" value="${esc(c.director||'')}"></div>
        </div>
        <div class="field"><label>Юридический адрес</label><input name="company_legal_address" value="${esc(c.legal_address||'')}"></div>
      </div>
    </section>

    <section>
      <h2>🏦 Банковские реквизиты</h2>
      <div class="fields">
        <div class="field"><label>Банк</label><input name="company_bank_name" value="${esc(c.bank_name||'')}"></div>
        <div class="row">
          <div class="field"><label>р/с</label><input name="company_rs" value="${esc(c.rs||'')}"></div>
          <div class="field"><label>к/с</label><input name="company_ks" value="${esc(c.ks||'')}"></div>
        </div>
        <div class="row">
          <div class="field"><label>БИК</label><input name="company_bik" value="${esc(c.bik||'')}"></div>
        </div>
      </div>
    </section>

    <div class="actions">
      <button type="submit" class="btn-save">Сохранить данные компании</button>
      <div class="toast" id="t-company"></div>
    </div>
  </form>
</div>

<!-- ── PAGES TAB ── -->
<div class="panel" id="tab-pages">
  <section>
    <h2>📄 Редактор страниц</h2>
    <div class="fields">

      <div class="field">
        <label>Страница</label>
        <div class="page-select-row">
          <select id="pageSelect" onchange="loadPageContent()">
            <option value="dostavka-dokumentov">Доставка документов — /uslugi/dostavka-dokumentov/</option>
          </select>
          <a id="pagePreviewLink" href="/uslugi/dostavka-dokumentov/" target="_blank" style="color:#58a6ff;font-size:13px;text-decoration:none;border:1px solid #30363d;padding:7px 14px;border-radius:7px;white-space:nowrap">🔗 Открыть</a>
        </div>
      </div>

      <div class="field">
        <label>Контент</label>
        <div id="editorToolbar">
          <button class="ed-btn" title="Заголовок 2-го уровня" onmousedown="event.preventDefault();edFmt('formatBlock','h2')">H2</button>
          <button class="ed-btn" title="Заголовок 3-го уровня" onmousedown="event.preventDefault();edFmt('formatBlock','h3')">H3</button>
          <button class="ed-btn" title="Обычный абзац"        onmousedown="event.preventDefault();edFmt('formatBlock','p')">¶ Текст</button>
          <div class="ed-sep"></div>
          <button class="ed-btn" title="Жирный"  onmousedown="event.preventDefault();edFmt('bold')"><b>Ж</b></button>
          <button class="ed-btn" title="Курсив"  onmousedown="event.preventDefault();edFmt('italic')"><i>К</i></button>
          <div class="ed-sep"></div>
          <button class="ed-btn" title="Маркированный список"  onmousedown="event.preventDefault();edFmt('insertUnorderedList')">• Список</button>
          <button class="ed-btn" title="Нумерованный список"   onmousedown="event.preventDefault();edFmt('insertOrderedList')">1. Список</button>
          <div class="ed-sep"></div>
          <button class="ed-btn" title="Вставить изображение"  onmousedown="event.preventDefault();edInsertImg()">🖼 Картинка</button>
          <button class="ed-btn" title="Вставить кнопку-призыв к действию" onmousedown="event.preventDefault();edInsertCTA()" style="background:#1a3a24;border-color:#2ea043;color:#3fb950">+ Кнопка CTA</button>
        </div>
        <div id="pageEditor" contenteditable="true" spellcheck="true"></div>
        <span class="hint">Кликайте прямо в текст — редактируйте как в Word. Выделите текст и нажмите кнопку форматирования.</span>
      </div>

    </div>
    <div class="actions">
      <button class="btn-save" id="pageSaveBtn" onclick="savePageContent()">Сохранить страницу</button>
      <div class="toast" id="t-pages"></div>
    </div>
  </section>
</div>

<!-- ── SUBMISSIONS TAB ── -->
<div class="panel" id="tab-submissions">
  <div style="padding:20px 0">
    ${subsHtml}
  </div>
</div>

<script>
const TAB_NAMES = ['contacts','company','pages','submissions'];
function showTab(name) {
  document.querySelectorAll('.tab').forEach((t,i)=>{t.classList.toggle('active', TAB_NAMES[i]===name)});
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  if (name === 'pages') loadPageContent();
}

async function saveForm(formId, toastId) {
  const form  = document.getElementById(formId);
  const toast = document.getElementById(toastId);
  const btn   = form.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Сохраняю...';
  try {
    const data = new URLSearchParams(new FormData(form));
    const res  = await fetch('/admin/save', {method:'POST', body: data});
    const json = await res.json();
    toast.style.display = 'block';
    toast.className = json.ok ? 'toast' : 'toast err';
    toast.textContent = json.ok ? '✓ Сохранено' : '✗ Ошибка: ' + json.error;
  } catch(err) {
    toast.style.display = 'block'; toast.className = 'toast err'; toast.textContent = '✗ Ошибка соединения';
  }
  btn.disabled = false;
  btn.textContent = formId === 'formContacts' ? 'Сохранить контакты' : 'Сохранить данные компании';
  setTimeout(()=>{ toast.style.display='none'; }, 3500);
}

document.getElementById('formContacts').addEventListener('submit', e=>{ e.preventDefault(); saveForm('formContacts','t-contacts'); });
document.getElementById('formCompany').addEventListener('submit', e=>{ e.preventDefault(); saveForm('formCompany','t-company'); });

async function delSub(id) {
  if (!confirm('Удалить заявку?')) return;
  const res = await fetch('/admin/submissions/delete', {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:'id='+encodeURIComponent(id)});
  const json = await res.json();
  if (json.ok) document.querySelector('.sub-card[data-id="'+id+'"]')?.remove();
}

const PAGE_URLS = { 'dostavka-dokumentov': '/uslugi/dostavka-dokumentov/' };

async function loadPageContent() {
  const pageKey = document.getElementById('pageSelect').value;
  const editor  = document.getElementById('pageEditor');
  const link    = document.getElementById('pagePreviewLink');
  link.href = PAGE_URLS[pageKey] || '/';
  editor.innerHTML = '<span style="color:#8b949e;font-style:italic">Загрузка...</span>';
  try {
    const res  = await fetch('/admin/page-content?page=' + encodeURIComponent(pageKey));
    const json = await res.json();
    if (json.ok) {
      editor.innerHTML = json.content;
    } else {
      editor.innerHTML = '<span style="color:#f85149">Ошибка: ' + json.error + '</span>';
    }
  } catch(e) {
    editor.innerHTML = '<span style="color:#f85149">Ошибка загрузки</span>';
  }
}

async function savePageContent() {
  const pageKey = document.getElementById('pageSelect').value;
  const content = document.getElementById('pageEditor').innerHTML;
  const toast   = document.getElementById('t-pages');
  const btn     = document.getElementById('pageSaveBtn');
  btn.disabled  = true; btn.textContent = 'Сохраняю...';
  try {
    const body = 'page=' + encodeURIComponent(pageKey) + '&content=' + encodeURIComponent(content);
    const res  = await fetch('/admin/page-content/save', {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body});
    const json = await res.json();
    toast.style.display = 'block';
    toast.className = json.ok ? 'toast' : 'toast err';
    toast.textContent = json.ok ? '✓ Страница сохранена' : '✗ Ошибка: ' + json.error;
  } catch(e) {
    toast.style.display = 'block'; toast.className = 'toast err'; toast.textContent = '✗ Ошибка соединения';
  }
  btn.disabled = false; btn.textContent = 'Сохранить страницу';
  setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

function edFmt(cmd, val) {
  document.getElementById('pageEditor').focus();
  document.execCommand(cmd, false, val || null);
}

function edInsertImg() {
  const url = prompt('URL изображения (относительный или абсолютный):', '../../wp-content/uploads/');
  if (!url) return;
  const alt = prompt('Краткое описание изображения (alt текст):', '') || '';
  document.getElementById('pageEditor').focus();
  document.execCommand('insertHTML', false,
    '<p><img src="' + url + '" alt="' + alt.replace(/"/g,'&quot;') + '" style="width:100%;height:auto;"/></p>');
}

function edInsertCTA() {
  const title = prompt('Текст заголовка блока:', 'Рассчитайте стоимость услуги');
  if (!title) return;
  const btnText = prompt('Текст кнопки:', 'Оставить заявку') || 'Оставить заявку';
  const html = '<div class="kc-elm kc-call-to-action kc-cta-3 kc-is-button mdlcall">'
    + '<div class="kc-cta-desc"><h2>' + title + '</h2></div>'
    + '<div class="kc-cta-button"><a href="#foob">' + btnText + '</a></div>'
    + '</div>';
  document.getElementById('pageEditor').focus();
  document.execCommand('insertHTML', false, html);
}
</script>
</body>
</html>`;
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── start (local only — on Vercel api/index.js exports the app) ─────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n  Sigma-Profi сайт запущен:`);
    console.log(`  🌐  http://localhost:${PORT}`);
    console.log(`  ⚙️   http://localhost:${PORT}/admin`);
    console.log(`  🔑  Пароль: ${ADMIN_PASSWORD}\n`);
  });
}

module.exports = app;
