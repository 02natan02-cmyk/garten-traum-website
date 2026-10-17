/* Der Garten-Traum · Interaktionen */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const G = window.GT || {};
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const sstore = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} } };

  /* ---------------- Sprache DE / PL ---------------- */
  const T = {
    de: { open: 'Jetzt geöffnet', closed: 'Geschlossen', until: 'bis 18:30 Uhr', opens: 'öffnet', today: 'heute', tomorrow: 'morgen', mon: 'Montag', at: 'um', free: 'Lieferung kostenlos', cost: 'Lieferung ca.', ask: 'Preis für die Lieferung auf Anfrage', km: 'ca. {k} km Straße von Kirkel', min: 'Unter 1.000 € Einkaufswert: Lieferpreis bitte kurz anfragen.', yours: 'Ihr Ort', pick: 'Ort antippen oder Nadel setzen', sent: 'Danke! Ihre Anfrage ist angekommen.', askMsg: 'Hallo, ich interessiere mich für: {n}. Bitte um Preis und Verfügbarkeit.', dealMsg: 'Hallo, ich interessiere mich für Restposten / Sonderangebote. Was ist noch da?', toPlan: '„{n}“ steht jetzt in Ihrem Garten – ziehen Sie es an die richtige Stelle.', gaMsg: 'Hallo, wir möchten eine Gaststube / einen Biergarten mit Massivholz einrichten. Bitte um einen Rückruf.' },
    pl: { open: 'Teraz otwarte', closed: 'Zamknięte', until: 'do 18:30', opens: 'otwarcie', today: 'dziś', tomorrow: 'jutro', mon: 'w poniedziałek', at: 'o', free: 'Dostawa bezpłatna', cost: 'Dostawa ok.', ask: 'Cena dostawy na zapytanie', km: 'ok. {k} km drogą od Kirkel', min: 'Przy zakupach poniżej 1000 €: prosimy zapytać o cenę dostawy.', yours: 'Twoje miejsce', pick: 'Dotknij miejscowości albo postaw pinezkę', sent: 'Dziękujemy! Twoje zapytanie dotarło.', askMsg: 'Dzień dobry, interesuje mnie: {n}. Proszę o cenę i dostępność.', dealMsg: 'Dzień dobry, interesują mnie ostatnie sztuki / oferty specjalne. Co jeszcze jest dostępne?', toPlan: '„{n}” stoi teraz w Twoim ogrodzie – przeciągnij w odpowiednie miejsce.', gaMsg: 'Dzień dobry, chcemy urządzić salę / ogródek piwny meblami z litego drewna. Prosimy o kontakt.' }
  };
  let LANG = 'de';
  const tr = (k, o = {}) => (T[LANG][k] || T.de[k] || k).replace(/\{(\w+)\}/g, (m, x) => o[x] ?? m);
  window.GTL = () => LANG; window.GTtr = tr;
  function setLang(l, initial) {
    LANG = l === 'pl' ? 'pl' : 'de';
    document.documentElement.lang = LANG;
    $$('[data-pl]').forEach(el => { if (el.dataset.de === undefined) el.dataset.de = el.textContent; el.textContent = LANG === 'pl' ? el.dataset.pl : el.dataset.de; });
    $$('[data-plh]').forEach(el => { if (el.dataset.deh === undefined) el.dataset.deh = el.innerHTML; el.innerHTML = LANG === 'pl' ? el.dataset.plh : el.dataset.deh; });
    $$('[data-pla]').forEach(el => { if (el.dataset.dea === undefined) el.dataset.dea = el.getAttribute('aria-label') || ''; el.setAttribute('aria-label', LANG === 'pl' ? el.dataset.pla : el.dataset.dea); });
    $$('[data-plt]').forEach(el => { if (el.dataset.det === undefined) el.dataset.det = el.getAttribute('title') || ''; el.setAttribute('title', LANG === 'pl' ? el.dataset.plt : el.dataset.det); });
    $$('[data-lang]').forEach(b => { const on = b.dataset.lang === LANG; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    const fl = $('[data-flang]'); if (fl) fl.value = LANG === 'pl' ? 'polski' : 'niemiecki'; // Feld „Język“ der Anfrage-Mail (polnisch)
    if (!initial || qLang) store.set('gt-lang', LANG); // Sprache aus ?lang= merken (Impressum, Datenschutz, nach dem Absenden)
    document.dispatchEvent(new CustomEvent('gt-lang', { detail: LANG }));
    status();
  }
  $$('[data-lang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
  const qLang = new URLSearchParams(location.search).get('lang');
  const startLang = qLang || store.get('gt-lang') || ((navigator.languages || [navigator.language || '']).some(x => /^pl/i.test(x)) ? 'pl' : 'de');

  /* ---------------- Toast ---------------- */
  const toastEl = $('[data-toast]'); let toastT;
  const toast = (m, ms = 3600) => { if (!toastEl) return; toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), ms); };
  window.GTtoast = toast;

  /* ---------------- Intro ---------------- */
  const intro = $('[data-intro]');
  function endIntro() { document.body.classList.remove('is-loading'); document.dispatchEvent(new Event('gt-ready')); }
  if (intro) {
    const seen = sstore.get('gt-intro');
    if (RM || seen) { intro.classList.add('gone'); endIntro(); }
    else {
      requestAnimationFrame(() => requestAnimationFrame(() => intro.classList.add('go')));
      setTimeout(() => { intro.classList.add('out'); endIntro(); sstore.set('gt-intro', '1'); }, 2500);
      setTimeout(() => intro.classList.add('gone'), 3700);
      intro.addEventListener('click', () => { intro.classList.add('out'); endIntro(); setTimeout(() => intro.classList.add('gone'), 1100); }, { once: true });
    }
  } else endIntro();

  /* ---------------- Header & Menü ---------------- */
  const hdr = $('[data-hdr]'), burger = $('[data-burger]'), mnav = $('[data-mnav]');
  let lastY = 0;
  function onScrollHdr() {
    const y = scrollY; if (!hdr) return;
    hdr.classList.toggle('scrolled', y > 40);
    hdr.classList.toggle('hide', y > 500 && y > lastY + 4 && !(mnav && !mnav.hidden));
    if (y < lastY - 4) hdr.classList.remove('hide');
    lastY = y;
  }
  addEventListener('scroll', onScrollHdr, { passive: true }); onScrollHdr();
  if (burger && mnav) {
    burger.addEventListener('click', () => { const o = mnav.hidden; mnav.hidden = !o; burger.setAttribute('aria-expanded', o); });
    $$('a', mnav).forEach(a => a.addEventListener('click', () => { mnav.hidden = true; burger.setAttribute('aria-expanded', false); }));
  }

  /* ---------------- Öffnungszeiten live (Mo–Sa 8:30–18:30, Europe/Berlin) ---------------- */
  function berlinNow() {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const g = k => (p.find(x => x.type === k) || {}).value;
    const wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[g('weekday')];
    return { d: wd, m: (+g('hour') % 24) * 60 + +g('minute') };
  }
  function status() {
    const { d, m } = berlinNow(); const open = d >= 1 && d <= 6 && m >= 510 && m < 1110;
    let sub;
    if (open) sub = tr('until');
    else if (d >= 1 && d <= 6 && m < 510) sub = `${tr('opens')} ${tr('today')} ${tr('at')} 8:30`;
    else if (d === 6 || d === 0) sub = `${tr('opens')} ${tr('mon')} ${tr('at')} 8:30`;
    else sub = `${tr('opens')} ${tr('tomorrow')} ${tr('at')} 8:30`;
    const pill = $('[data-nowpill]'); if (pill) { pill.classList.toggle('open', open); $('b', pill).textContent = open ? tr('open') : tr('closed'); }
    const nw = $('[data-now]'); if (nw) { nw.classList.toggle('open', open); $('[data-now-t]', nw).textContent = open ? tr('open') : tr('closed'); $('[data-now-s]', nw).textContent = '· ' + sub; }
    $$('[data-hours] li').forEach(li => li.classList.toggle('today', +li.dataset.day === d));
  }
  setInterval(status, 60000);

  /* ---------------- Reveal ---------------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.rv').forEach(el => io.observe(el));
  const inView = (el, cb, margin = '200px') => { if (!el) return; const o = new IntersectionObserver(([e]) => cb(e.isIntersecting), { rootMargin: margin }); o.observe(el); };
  // einmalig, sobald ein Element wirklich im Bild ist
  const firstView = (el, cb, margin = '0px 0px -22% 0px') => { if (!el) return; const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { o.disconnect(); cb(); } }, { rootMargin: margin }); o.observe(el); };

  /* ---------------- Impuls-Hinweise („← ziehen →“): erscheinen beim ersten Sichtkontakt, verschwinden nach der ersten echten Bedienung ---------------- */
  const NUDGE = {};
  $$('[data-nudge]').forEach(n => { NUDGE[n.dataset.nudge] = n; firstView(n.parentElement, () => { if (!n.classList.contains('gone')) setTimeout(() => n.classList.add('on'), 450); }); });
  const nudgeOff = k => { const n = NUDGE[k]; if (n) n.classList.add('gone'); };
  window.GTnudgeOff = nudgeOff;

  /* ================= HERO ================= */
  const hero = $('[data-hero]');
  if (hero) {
    const light = $('[data-hwlight]'); let heroVis = true;
    inView(hero, v => heroVis = v, '0px');
    hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); hero.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%'); hero.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%'); });
    // Wind-Blätter
    const cv = $('[data-leaves]'), ctx = cv.getContext('2d'); let W = 0, H = 0, DPR = Math.min(2, devicePixelRatio || 1);
    const leaves = []; let wind = 0, lastPX = null;
    const COLS = ['#c8812f', '#e0a33f', '#a4541f', '#8fae3c', '#d9b24a', '#7a3d14'];
    function rs() { W = hero.clientWidth; H = hero.clientHeight; cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
    rs(); addEventListener('resize', rs);
    const N = innerWidth < 700 ? 14 : 26;
    const mk = (y) => ({ x: Math.random() * W, y: y ?? -20 - Math.random() * H, s: 7 + Math.random() * 9, r: Math.random() * 6.28, vr: (Math.random() - .5) * .06, vy: .5 + Math.random() * .8, ph: Math.random() * 6.28, c: COLS[Math.random() * COLS.length | 0] });
    for (let i = 0; i < N; i++) leaves.push(mk(Math.random() * H));
    hero.addEventListener('pointermove', e => { if (lastPX !== null) wind = clamp(wind + (e.clientX - lastPX) * .05, -6, 6); lastPX = e.clientX; });
    function leaf(l) {
      ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.r); ctx.scale(1, .55 + .45 * Math.sin(l.ph));
      ctx.fillStyle = l.c; ctx.beginPath(); ctx.moveTo(0, -l.s); ctx.quadraticCurveTo(l.s * .9, -l.s * .2, 0, l.s); ctx.quadraticCurveTo(-l.s * .9, -l.s * .2, 0, -l.s); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(0, -l.s * .9); ctx.lineTo(0, l.s * 1.1); ctx.stroke(); ctx.restore();
    }
    function tick() {
      if (heroVis && !RM) {
        ctx.clearRect(0, 0, W, H); wind *= .97;
        for (const l of leaves) {
          l.ph += .05; l.y += l.vy; l.x += Math.sin(l.ph * .5) * .6 + wind; l.r += l.vr + wind * .004;
          if (l.y > H + 20 || l.x < -40 || l.x > W + 40) Object.assign(l, mk(), { x: wind > 1 ? -20 : wind < -1 ? W + 20 : Math.random() * W });
          leaf(l);
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    // Produkt-Parallax
    const set = $('[data-heroset]');
    addEventListener('scroll', () => { if (!heroVis || !set) return; const y = scrollY; set.style.transform = `translateY(${y * .12}px) rotate(${Math.sin(y / 300) * .6}deg)`; }, { passive: true });
  }

  /* ---------------- Brandzeichen (Text wird eingebrannt) ---------------- */
  const burnEl = $('[data-burn]');
  const burn = (() => {
    if (!burnEl) return null;
    const cv = $('[data-burncv]', burnEl), ctx = cv.getContext('2d'); let raf, smoke = [];
    function run() {
      cancelAnimationFrame(raf);
      const lines = (LANG === 'pl' ? burnEl.dataset.plBurn : burnEl.dataset.de).split('|');
      const w = burnEl.clientWidth || 600, DPR = Math.min(2, devicePixelRatio || 1);
      const fs = clamp(w * (LANG === 'pl' ? .165 : .19), 46, 150), lh = fs * 1.02, pad = fs * .18;
      const H = Math.round(lh * lines.length + pad * 2), W = Math.round(w);
      const SC = Math.min(DPR, 1.5);
      cv.width = W * SC; cv.height = H * SC; cv.style.aspectRatio = W + '/' + H;
      // Maske
      const m = document.createElement('canvas'); m.width = cv.width; m.height = cv.height; const mc = m.getContext('2d');
      mc.scale(SC, SC); mc.fillStyle = '#fff'; mc.textBaseline = 'alphabetic';
      lines.forEach((l, i) => { mc.font = `${i === 1 ? 'italic ' : ''}400 ${fs}px Gloock, Georgia, serif`; mc.fillText(l, 2, pad + lh * (i + 1) - fs * .2); });
      const md = mc.getImageData(0, 0, m.width, m.height).data;
      const N = m.width * m.height, thr = new Float32Array(N), alpha = new Uint8ClampedArray(N);
      // Brennfront: von links nach rechts pro Zeile + Rauschen
      for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
        const i = y * m.width + x; alpha[i] = md[i * 4 + 3];
        const line = Math.floor((y / SC - pad) / lh);
        thr[i] = clamp(x / m.width, 0, 1) * .72 + clamp(line, 0, 1) * .22 + (Math.sin(x * .045 + y * .09) * Math.cos(y * .05 - x * .02)) * .05 + Math.random() * .03;
      }
      const img = ctx.createImageData(m.width, m.height), d = img.data;
      const dur = RM ? 1 : 2400; let t0 = null;
      const step = ts => {
        if (t0 === null) t0 = ts; const t = clamp((ts - t0) / dur, 0, 1) * 1.08;
        for (let i = 0; i < N; i++) {
          const a = alpha[i]; if (!a) { d[i * 4 + 3] = 0; continue; }
          const k = t - thr[i];
          if (k < 0) { d[i * 4 + 3] = 0; continue; }
          if (k < .05) { const g = 1 - k / .05; d[i * 4] = 255; d[i * 4 + 1] = 120 + 120 * g; d[i * 4 + 2] = 40 + 120 * g * g; d[i * 4 + 3] = a; }
          else { const c = clamp((k - .05) / .2, 0, 1); d[i * 4] = lerp(255, 236, c); d[i * 4 + 1] = lerp(140, 214, c); d[i * 4 + 2] = lerp(60, 170, c); d[i * 4 + 3] = a; }
        }
        ctx.putImageData(img, 0, 0);
        // Glut-Schimmer + Rauch
        ctx.save(); ctx.scale(SC, SC);
        if (t < 1.0 && Math.random() < .6) smoke.push({ x: (t / .72) * W * (.92 + Math.random() * .12), y: pad + Math.random() * lh * lines.length, r: 10 + Math.random() * 14, a: .16, vy: -.5 - Math.random() * .6, vx: (Math.random() - .5) * .4 });
        smoke = smoke.filter(p => (p.a -= .0025) > 0);
        for (const p of smoke) { p.x += p.vx; p.y += p.vy; p.r += .35; const ed = clamp(Math.min(W - p.x, p.x, p.y, H - p.y) / p.r, 0, 1), pa = p.a * ed * ed; const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, `rgba(210,190,170,${pa})`); g.addColorStop(1, 'rgba(210,190,170,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill(); }
        ctx.restore();
        if (t < 1.08 || smoke.length) raf = requestAnimationFrame(step);
        else { ctx.putImageData(img, 0, 0); cv.classList.add('done'); }
      };
      raf = requestAnimationFrame(step);
    }
    return { run };
  })();
  if (burn) {
    const go = () => (document.fonts && document.fonts.load ? Promise.all([document.fonts.load('400 80px Gloock'), document.fonts.load('italic 400 80px Gloock')]) : Promise.resolve()).then(() => burn.run());
    document.addEventListener('gt-ready', () => setTimeout(go, intro && !intro.classList.contains('gone') ? 700 : 100), { once: true });
    document.addEventListener('gt-lang', () => { if (!document.body.classList.contains('is-loading')) go(); });
    let rw = innerWidth; addEventListener('resize', () => { if (Math.abs(innerWidth - rw) > 40) { rw = innerWidth; go(); } });
  }

  /* ================= KAPITEL 1: Säge ================= */
  const sawSec = $('[data-sawsec]');
  if (sawSec) {
    const log = $('[data-log]'), saw = $('.saw', sawSec), sl = $$('.sl', sawSec), prog = $$('[data-sp]', sawSec);
    const dust = $('[data-dust]', sawSec), dctx = dust.getContext('2d'), stage = $('[data-sawstage]', sawSec);
    let parts = [], sawing = false, vis = false, lastK = -1, base = [];
    inView(sawSec, v => vis = v);
    // unverschobene Lage jeder Scheibe (relativ zur Bühne) – einmal messen statt jedes Bild
    function measure() {
      const sr = stage.getBoundingClientRect();
      base = sl.map(s => { const d = $('.sl-disc', s), t = d.style.transform; d.style.transform = 'none'; const r = d.getBoundingClientRect(); d.style.transform = t; return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2, w: r.width }; });
    }
    function rsD() { const r = stage.getBoundingClientRect(); dust.width = r.width; dust.height = r.height; measure(); }
    rsD(); addEventListener('resize', rsD);
    // v6b: läuft von selbst – sobald der Abschnitt im Bild ist, sägt die Säge Scheibe für Scheibe (ca. 1,9 s pro Kapitel).
    // Kein langer Scroll-Weg mehr; die Kapitel-Scheiben unten bleiben anklickbar und beenden den Selbstlauf.
    const DUR = 1.9; let P = 0, playing = false, stopped = false, tgt = null, lastT = 0;
    firstView(sawSec, () => { if (!stopped) { playing = true; lastT = performance.now(); } }, '0px 0px -35% 0px');
    prog.forEach((b, i) => b.addEventListener('click', () => {
      if (RM) { sl[i].scrollIntoView({ block: 'center' }); return; }
      stopped = true; playing = false; tgt = (i + .86) / (sl.length * 1.04);
    }));
    function update(p) {
      const n = sl.length, f = p * n * 1.04;
      const k = Math.min(n - 1, Math.floor(f)), u = clamp(f - k, 0, 1);
      log.style.transform = `translateX(${(k + (u > .45 ? 1 : 0)) * 3.2}%)`;
      sawing = u < .42 && p > 0 && p < 1;
      saw.classList.toggle('down', u < .42); saw.classList.toggle('run', sawing || u < .5);
      const sr = stage.getBoundingClientRect(), lr = log.getBoundingClientRect();
      const lx = lr.left - sr.left, ly = lr.top - sr.top + lr.height / 2;
      if (!base.length || !base[0].w) measure();
      // v6: Während die Säge die nächste Scheibe schneidet, bleibt das vorige Kapitel stehen (kein leerer Bildschirm);
      // erst wenn die neue Scheibe fällt, rollt die alte in den Stapel.
      const CUT = .3;
      if (p > .06) nudgeOff('saw');
      sl.forEach((s, i) => {
        const disc = $('.sl-disc', s), txt = $('.sl-t', s), b = base[i] || { x: 0, y: 0, w: 1 };
        let o = 0, prog2 = 0, fly = -1;
        if (i === k) { prog2 = clamp((u - CUT) / .4, 0, 1); o = u < CUT ? 0 : 1; }
        else if (i === k - 1 && u < CUT + .12) { fly = clamp((u - (CUT - .05)) / .17, 0, 1); o = fly < .97 ? 1 : 0; } // vorige Scheibe: steht, dann rollt sie in den Stapel
        if (i === n - 1 && p >= .999) { prog2 = 1; o = 1; }
        s.style.opacity = o; s.classList.toggle('on', o > .5 && fly < .05);
        if (o > 0 && fly >= 0) {
          const mr = $('i', prog[i]).getBoundingClientRect(), e2 = ease(fly);
          const tx = lerp(0, mr.left - sr.left + mr.width / 2 - b.x, e2), ty = lerp(0, mr.top - sr.top + mr.height / 2 - b.y, e2) - Math.sin(e2 * Math.PI) * 80;
          disc.style.transform = `translate(${tx}px,${ty}px) rotate(${lerp(0, -300, e2)}deg) scale(${lerp(1, mr.width / b.w, e2)})`;
          txt.style.opacity = clamp(1 - fly * 2, 0, 1); txt.style.transform = 'none';
        } else if (o > 0) {
          // Start: Stamm-Ende, Ziel: Endposition
          const ex = lx - b.x, ey = ly - b.y;
          const e2 = ease(prog2);
          const tx = lerp(ex, 0, e2), ty = lerp(ey, 0, e2) - Math.sin(e2 * Math.PI) * 60;
          disc.style.transform = `translate(${tx}px,${ty}px) perspective(800px) rotateY(${lerp(-78, 0, e2)}deg) rotate(${lerp(-14, 0, e2)}deg) scale(${lerp(lr.height / b.w, 1, e2)})`;
          const to = clamp((prog2 - .3) / .3, 0, 1);
          txt.style.opacity = to; txt.style.transform = `translateY(${(1 - to) * 18}px)`;
        }
      });
      prog.forEach((b, i) => { b.classList.toggle('on', i < k - 1 || (i === k - 1 && u >= CUT + .1)); b.classList.toggle('cur', (i === k && u >= CUT) || (i === k - 1 && u < CUT)); });
      if (k !== lastK) { lastK = k; }
      // Sägestaub
      if (sawing && vis) {
        const sw = saw.getBoundingClientRect(), bx = sw.left + sw.width / 2 - sr.left, by = lr.top - sr.top + 2, rr = sw.width * .36;
        for (let i = 0; i < 5; i++) { const side = Math.random() < .7 ? -1 : 1; parts.push({ x: bx + side * rr * (.6 + Math.random() * .4), y: by, vx: side * (1.5 + Math.random() * 4.5), vy: -1.5 - Math.random() * 4, s: 1 + Math.random() * 2.6, a: 1, c: Math.random() > .5 ? '#e9c58f' : '#c99450' }); }
      }
    }
    function loop(now) {
      const dt = Math.min(.25, Math.max(0, (now - (lastT || now)) / 1000)); lastT = now;
      if (vis) {
        if (playing) { P += dt / (sl.length * 1.04 * DUR); if (P >= 1) { P = 1; playing = false; } }
        else if (tgt !== null) { const d = tgt - P; P += Math.sign(d) * Math.min(Math.abs(d), Math.max(.004, Math.abs(d) * .12)); if (Math.abs(tgt - P) < .0008) { P = tgt; tgt = null; } }
        update(P);
        dctx.clearRect(0, 0, dust.width, dust.height);
        parts = parts.filter(q => (q.a -= .012) > 0 && q.y < dust.height + 10);
        for (const q of parts) { q.vy += .12; q.x += q.vx; q.y += q.vy; q.vx *= .99; dctx.globalAlpha = q.a; dctx.fillStyle = q.c; dctx.fillRect(q.x, q.y, q.s, q.s); }
        dctx.globalAlpha = 1;
      }
      requestAnimationFrame(loop);
    }
    if (RM) { sl.forEach(s => { s.style.opacity = 1; s.style.position = 'relative'; }); prog.forEach(b => b.classList.add('on')); }
    else requestAnimationFrame(loop);
  }

  /* ================= KAPITEL 2: Rundgang ================= */
  const board = $('[data-board]');
  let LBlist = [];
  if (board) {
    const inner = $('[data-boardin]', board), all = $$('.pr', board), P = G.photos || [];
    let items = all.slice();
    let rows, rowH, pos = [], Wt = 0, off = 0, vel = 0, drag = null, moved = 0, hover = false, vis = false;
    inView(board, v => vis = v);
    function layout() {
      const h = board.clientHeight; rows = innerWidth < 640 ? 2 : 3; rowH = h / rows;
      const xs = new Array(rows).fill(0); pos = [];
      const rnd = (i, s) => { const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); };
      items.forEach((it, i) => {
        const pi = +it.dataset.pr, ar = (P[pi] && P[pi][3]) || 1.33, ih = rowH * (.62 + rnd(i, 1) * .16), w = Math.min(ih * ar, innerWidth * (innerWidth < 640 ? .7 : .36));
        let r = 0; for (let j = 1; j < rows; j++) if (xs[j] < xs[r]) r = j;
        const x = xs[r] + 30 + rnd(i, 2) * 30, y = r * rowH + (rowH - ih - 36) * rnd(i, 3) + 14;
        it.style.setProperty('--w', w + 18 + 'px'); it.style.setProperty('--ar', w / ih); it.style.setProperty('--r', ((rnd(i, 4) - .5) * 7).toFixed(2) + 'deg');
        pos.push({ x, y, w: w + 18 }); xs[r] = x + w + 18;
      });
      Wt = Math.max(...xs) + 40;
      render();
    }
    let fits = false;
    function render() {
      const vw = board.clientWidth; fits = Wt <= vw;
      items.forEach((it, i) => {
        let x = fits ? pos[i].x + (vw - Wt) / 2 : ((pos[i].x + off) % Wt + Wt) % Wt; if (!fits && x > vw + 60) x -= Wt;
        it.style.left = x + 'px'; it.style.top = pos[i].y + 'px';
      });
      let best = 0, bd = 1e9; const c = vw / 2;
      items.forEach((it, i) => { let x = fits ? pos[i].x + (vw - Wt) / 2 : ((pos[i].x + off) % Wt + Wt) % Wt; const d = Math.abs(x + pos[i].w / 2 - c); if (d < bd) { bd = d; best = i; } });
      const bn = $('[data-bn]'); if (bn) bn.textContent = String(best + 1).padStart(2, '0');
    }
    board.addEventListener('pointerdown', e => { if (e.button) return; drag = { x: e.clientX, y: e.clientY, o: off, t: performance.now(), id: e.pointerId, axis: null }; moved = 0; vel = 0; });
    addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.axis) { if (Math.abs(dx) > 6 || Math.abs(dy) > 6) { drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'; if (drag.axis === 'x') { board.classList.add('drag'); nudgeOff('board'); try { board.setPointerCapture(e.pointerId); } catch (er) {} } } return; }
      if (drag.axis !== 'x') return;
      const now = performance.now(), no = drag.o + dx; vel = (no - off) / Math.max(1, now - drag.t) * 16; drag.t = now; off = no; moved = Math.abs(dx); render();
    });
    const up = e => { if (!drag) return; board.classList.remove('drag'); drag = null; };
    addEventListener('pointerup', up); addEventListener('pointercancel', up);
    board.addEventListener('wheel', e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); nudgeOff('board'); off -= e.deltaX; render(); } }, { passive: false });
    board.addEventListener('pointerenter', () => hover = true); board.addEventListener('pointerleave', () => hover = false);
    all.forEach(it => it.addEventListener('click', e => { if (moved > 8) { e.preventDefault(); return; } nudgeOff('board'); openLB(items.indexOf(it)); }));
    // Filter: Board sortiert sich neu, Lightbox blättert nur durch die Auswahl
    const btot = $('[data-btot]'), mkLB = () => { LBlist = items.map(it => { const p = P[+it.dataset.pr]; return { src: 'img/f/' + p[0] + '.webp', de: p[1], pl: p[2] }; }); };
    $$('[data-pf]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.pf; nudgeOff('board');
      $$('[data-pf]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
      items = all.filter(it => k === 'all' || it.dataset.pc.split(' ').includes(k));
      all.forEach(it => { const on = items.includes(it); it.hidden = !on; it.classList.remove('pop'); });
      off = 0; vel = 0; layout(); mkLB(); if (btot) btot.textContent = items.length;
      items.forEach((it, j) => { it.style.setProperty('--d', (j % 12) * 35 + 'ms'); void it.offsetWidth; it.classList.add('pop'); });
    }));
    // Bilder im Querscroller vorladen, sobald das Board in die Nähe kommt (nicht nur lazy)
    inView(board, v => { if (v) all.forEach(it => { const im = $('img', it); if (im.loading === 'lazy') im.loading = 'eager'; }); }, '1600px');
    // Polaroid „entwickelt“ sich, sobald das Foto geladen ist – nie ein grauer Kasten
    all.forEach(it => { const im = $('img', it), ok = () => im.classList.add('ld'); if (im.complete && im.naturalWidth) ok(); else { im.addEventListener('load', ok, { once: true }); im.addEventListener('error', ok, { once: true }); } });
    $$('[data-bstep]').forEach(b => b.addEventListener('click', () => { nudgeOff('board'); const tgt = off - (+b.dataset.bstep) * Math.min(420, board.clientWidth * .6); const s = off; let t0; const an = ts => { if (!t0) t0 = ts; const k = clamp((ts - t0) / 600, 0, 1); off = lerp(s, tgt, ease(k)); render(); if (k < 1) requestAnimationFrame(an); }; requestAnimationFrame(an); }));
    function loop() { if (vis && !drag && !fits) { if (Math.abs(vel) > .05) { off += vel; vel *= .95; render(); } else if (!hover && !RM) { off -= .35; render(); } } requestAnimationFrame(loop); }
    layout(); addEventListener('resize', layout); requestAnimationFrame(loop);
    mkLB();
    // Impuls: beim ersten Sichtkontakt schwungvoll ein Stück weiterschieben
    firstView(board, () => { if (!RM && !drag) setTimeout(() => { if (!drag) vel = innerWidth < 640 ? -11 : -15; }, 350); });
  }
  /* Lightbox */
  const lb = $('[data-lb]'); let lbi = 0, lbBack = null;
  function showLB() { const it = LBlist[lbi]; if (!it) return; $('[data-lbimg]').src = it.src; $('[data-lbimg]').alt = it.de; $('[data-lbcap]').textContent = LANG === 'pl' ? it.pl : it.de; }
  function openLB(i) { lbi = i; showLB(); lb.hidden = false; document.body.style.overflow = 'hidden'; $('[data-lbx]').focus(); }
  function closeLB() { lb.hidden = true; document.body.style.overflow = ''; if (lbBack) { LBlist = lbBack; lbBack = null; } }
  // eigene Bildfolge öffnen (z. B. Gastronomie), danach wieder der Rundgang
  function openSet(keys, i) { const P = G.photos || []; lbBack = LBlist; LBlist = keys.map(k => { const p = P.find(x => x[0] === k) || [k, '', '']; return { src: 'img/f/' + k + '.webp', de: p[1], pl: p[2] }; }); openLB(i); }
  if (lb) {
    $('[data-lbx]').addEventListener('click', closeLB);
    lb.addEventListener('click', e => { if (e.target === lb) closeLB(); });
    $$('[data-lbn]').forEach(b => b.addEventListener('click', () => { lbi = (lbi + (+b.dataset.lbn) + LBlist.length) % LBlist.length; showLB(); }));
    addEventListener('keydown', e => { if (lb.hidden) return; if (e.key === 'Escape') closeLB(); if (e.key === 'ArrowRight') { lbi = (lbi + 1) % LBlist.length; showLB(); } if (e.key === 'ArrowLeft') { lbi = (lbi - 1 + LBlist.length) % LBlist.length; showLB(); } });
    let sx = null; lb.addEventListener('touchstart', e => sx = e.touches[0].clientX, { passive: true }); lb.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) { lbi = (lbi + (dx < 0 ? 1 : -1) + LBlist.length) % LBlist.length; showLB(); } sx = null; });
  }

  /* ================= KAPITEL 3: Drehteller ================= */
  const turn = $('[data-turn]');
  let ttFront = 0;
  if (turn) {
    const disc = $('[data-disc]', turn), its = $$('.tt-it', turn), caps = $$('[data-ttc]'), N = its.length, step = 360 / N;
    let A = 0, vA = 0, target = 0, drag = null, vis = false, idle = 0;
    inView(turn, v => vis = v);
    const keys = G.turn || [], prod = G.prod || {};
    function place() {
      const W = turn.clientWidth, Hh = turn.clientHeight, R = Math.min(W * .4, 330), tilt = .26;
      disc.style.setProperty('--rot', (-A) + 'deg');
      let front = 0, fz = -2;
      its.forEach((it, i) => {
        const a = (A + i * step) * Math.PI / 180, x = Math.sin(a) * R, z = Math.cos(a);
        const zz = (z + 1) / 2, sc = .24 + .76 * Math.pow(zz, 3), k = keys[i], pw = prod[k] ? prod[k].w : 230, bw = Math.min(W * .74, 560) * clamp(pw / 240, .78, 1.05);
        it.style.setProperty('--w', bw + 'px');
        it.style.transform = `translate(calc(-50% + ${x}px), calc(-100% + ${z * R * tilt}px)) scale(${sc})`;
        it.style.zIndex = Math.round(z * 100) + 100; it.style.opacity = (.12 + .88 * zz * zz).toFixed(2);
        it.style.filter = `blur(${((1 - zz) * 2.4).toFixed(1)}px) saturate(${(.6 + .4 * zz).toFixed(2)})`;
        if (z > fz) { fz = z; front = i; }
      });
      if (front !== ttFront) { ttFront = front; caps.forEach((c, i) => c.classList.toggle('on', i === front)); }
    }
    const snap = () => { target = Math.round(A / step) * step; };
    turn.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; drag = { x: e.clientX, y: e.clientY, a: A, axis: null, id: e.pointerId, t: performance.now() }; vA = 0; idle = 0; });
    addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.axis) { if (Math.abs(dx) > 6 || Math.abs(dy) > 6) { drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'; if (drag.axis === 'x') { turn.classList.add('drag'); touched = true; nudgeOff('tt'); } } return; }
      if (drag.axis !== 'x') return;
      const na = drag.a - dx * .32, now = performance.now(); vA = (na - A) / Math.max(1, now - drag.t) * 16; drag.t = now; A = na; target = A; place();
    });
    const up = () => { if (!drag) return; turn.classList.remove('drag'); if (drag.axis === 'x') { target = Math.round((A + vA * 8) / step) * step; } drag = null; };
    addEventListener('pointerup', up); addEventListener('pointercancel', up);
    $$('[data-ttn]').forEach(b => b.addEventListener('click', () => { touched = true; nudgeOff('tt'); target = Math.round(A / step) * step - (+b.dataset.ttn) * step; idle = 0; }));
    its.forEach((it, i) => it.addEventListener('click', () => { if (i === ttFront) return; touched = true; nudgeOff('tt'); let d = ((-(i * step) - A) % 360 + 540) % 360 - 180; target = A + d; idle = 0; }));
    // Impuls beim ersten Sichtkontakt: einmal eine Garnitur weiter und zurück – der Teller zeigt, dass er sich dreht
    let touched = false;
    firstView(turn, () => { if (RM) return; setTimeout(() => { if (!touched && !drag) { target = Math.round(A / step) * step - step; idle = 0; } }, 600); setTimeout(() => { if (!touched && !drag) { target += step; idle = 0; } }, 2300); });
    function loop() {
      if (vis && !drag) {
        idle++; if (idle > 300 && !RM) { target = Math.round(A / step) * step - step; idle = 0; }
        A += (target - A) * .09; place();
      }
      requestAnimationFrame(loop);
    }
    place(); addEventListener('resize', place); requestAnimationFrame(loop);
    const cur = () => { const k = keys[ttFront]; return { k, n: prod[k] ? (LANG === 'pl' ? prod[k].pl : prod[k].n) : k }; };
    const ask = $('[data-ask]'); if (ask) ask.addEventListener('click', () => prefill(tr('askMsg', { n: cur().n }), ['Gartenmöbel aus Eiche']));
    const tp = $('[data-toplan]'); if (tp) tp.addEventListener('click', () => toPlanner(cur().k));
  }

  function toPlanner(k) {
    const pl = $('#planer'); if (!pl) return;
    pl.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => { if (window.GTP) { window.GTP.add(k); const p = (G.prod || {})[k]; toast(tr('toPlan', { n: p ? (LANG === 'pl' ? p.pl : p.n) : k })); } }, RM ? 50 : 700);
  }
  window.GTtoPlanner = toPlanner;

  /* ================= KAPITEL 4: Schaukel ================= */
  const swSec = $('[data-swingsec]');
  if (swSec) {
    const obj = $('[data-swing]'), img = $('[data-swimg]'), sh = $('[data-swsh]'), lights = $('[data-lights]');
    let th = 0, om = 0, drag = null, vis = false, cur = 'schaukel1';
    inView(swSec, v => vis = v);
    // Lichterkette
    const path = $('path', lights), bulbs = [];
    for (let i = 0; i < 22; i++) { const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('r', 5); c.setAttribute('class', 'bulb'); lights.appendChild(c); bulbs.push(c); }
    function lightsAt(sw) {
      const d = `M-10 18 Q ${300 + sw * 14} ${112 + Math.abs(sw) * 3} 600 36 T 1210 26`; path.setAttribute('d', d);
      const L = path.getTotalLength(); bulbs.forEach((b, i) => { const p = path.getPointAtLength(L * (i + .5) / bulbs.length); b.setAttribute('cx', p.x); b.setAttribute('cy', p.y + 7); b.style.opacity = .7 + .3 * Math.sin(performance.now() / 400 + i); });
    }
    // Glühwürmchen
    const fc = $('[data-flies]'), fx = fc.getContext('2d'); let flies = [];
    function rsF() { fc.width = swSec.clientWidth; fc.height = swSec.clientHeight; flies = Array.from({ length: innerWidth < 700 ? 14 : 28 }, () => ({ x: Math.random() * fc.width, y: fc.height * (.35 + Math.random() * .6), a: Math.random() * 6.28, s: .3 + Math.random() * .6 })); }
    rsF(); addEventListener('resize', rsF);
    let lastAct = performance.now();
    obj.addEventListener('pointerdown', e => { drag = { x: e.clientX, th0: th, id: e.pointerId }; lastAct = performance.now(); obj.classList.add('drag'); try { obj.setPointerCapture(e.pointerId); } catch (er) {} });
    obj.addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id) return; const nt = clamp(drag.th0 + (e.clientX - drag.x) * .035, -7, 7); if (Math.abs(e.clientX - drag.x) > 6) nudgeOff('swing'); om = nt - th; th = nt; lastAct = performance.now(); });
    const up = () => { if (!drag) return; drag = null; obj.classList.remove('drag'); };
    obj.addEventListener('pointerup', up); obj.addEventListener('pointercancel', up);
    $('[data-push]').addEventListener('click', () => { nudgeOff('swing'); lastAct = performance.now(); om += (th >= 0 ? 1 : -1) * 0.9 + .5; });
    $$('[data-sw]').forEach(b => b.addEventListener('click', () => {
      $$('[data-sw]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
      cur = b.dataset.sw; img.src = 'img/c/' + cur + '.webp'; obj.classList.remove('drop'); void obj.offsetWidth; obj.classList.add('drop'); th = 0; om = .6;
    }));
    const sp = $('[data-swplan]'); if (sp) sp.addEventListener('click', () => toPlanner(cur));
    function loop() {
      if (vis) {
        if (!drag) { const acc = -th * .018 - om * .012; om += acc; th = clamp(th + om, -7, 7); }
        // läuft von selbst weiter: kommt die Schaukel zur Ruhe, gibt ihr der Abendwind einen sanften Schubs
        if (!drag && !RM && Math.abs(th) < .4 && Math.abs(om) < .05 && performance.now() - lastAct > 5000) { om += (Math.random() < .5 ? -1 : 1) * .55; lastAct = performance.now(); }
        obj.style.transform = `translateX(${th * 2.2}px) rotate(${th}deg)`;
        sh.style.transform = `translateX(calc(-50% + ${th * 7}px)) scaleX(${1 - Math.abs(th) * .012})`;
        lightsAt(th);
        fx.clearRect(0, 0, fc.width, fc.height);
        for (const f of flies) { f.a += (Math.random() - .5) * .3; f.x += Math.cos(f.a) * f.s; f.y += Math.sin(f.a) * f.s * .6; if (f.x < 0) f.x = fc.width; if (f.x > fc.width) f.x = 0; if (f.y < fc.height * .3) f.y = fc.height * .3; if (f.y > fc.height) f.y = fc.height * .6; const g = .5 + .5 * Math.sin(performance.now() / 300 + f.a * 3); fx.fillStyle = `rgba(255,230,120,${.25 + .6 * g})`; fx.shadowColor = '#ffd36a'; fx.shadowBlur = 10; fx.beginPath(); fx.arc(f.x, f.y, 1.8, 0, 6.28); fx.fill(); }
        fx.shadowBlur = 0;
      }
      requestAnimationFrame(loop);
    }
    // kleiner Anstoß, wenn die Schaukel ins Bild kommt
    inView(obj, v => { if (v && Math.abs(th) < .2) om = 1.1; }, '-20% 0px');
    requestAnimationFrame(loop);
  }

  /* ================= KAPITEL 5: Gießerei – Holzschalung, Beton wird gegossen, härtet aus, wird ausgeschalt ================= */
  const cast = $('[data-cast]');
  if (cast) {
    const block = $('[data-block]', cast), cimg = $('[data-castimg]', cast), cv = $('[data-shards]', cast), x = cv.getContext('2d'), pour = $('[data-pour]', cast), steps = $$('[data-cs]', cast);
    const puff = $('[data-puff]', cast), pctx = puff.getContext('2d'), fun = $('.funnel', cast), castV = $('.cast-v', cast), sc = $('[data-castscroll]', cast);
    let shards = [], BW = 0, BH = 0, OX = 0, OY = 0, FX = 0, FY = 0, FW = 0, FH = 0, vis = false, pp = [], tex = null, wood = null, sil = null, lastP = -1, dpr = Math.min(2, devicePixelRatio || 1);
    // Selbstablauf: play = { t0, from } spielt den Guss bis zum Ende; stay = danach fertig stehen lassen, bis der Abschnitt verlassen wird
    let play = null, stay = false, autoDone = false, still = performance.now(), lastY = scrollY;
    inView(cast, v => { vis = v; if (!v) { stay = false; play = null; } });
    const R = (i, k) => { const v = Math.sin(i * 91.7 + k * 37.3) * 43758.5453; return v - Math.floor(v); };
    function concreteTex() {
      const c = document.createElement('canvas'); c.width = c.height = 256; const t = c.getContext('2d');
      t.fillStyle = '#a7a59e'; t.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 9000; i++) { const v = 120 + Math.random() * 80 | 0; t.fillStyle = `rgba(${v},${v - 2},${v - 6},${Math.random() * .35})`; const s = Math.random() * 2.2; t.fillRect(Math.random() * 256, Math.random() * 256, s, s); }
      for (let i = 0; i < 70; i++) { t.fillStyle = 'rgba(60,58,54,.35)'; t.beginPath(); t.arc(Math.random() * 256, Math.random() * 256, .6 + Math.random() * 1.6, 0, 6.28); t.fill(); }
      return c;
    }
    function woodTex() {
      const c = document.createElement('canvas'); c.width = 256; c.height = 64; const t = c.getContext('2d');
      const g = t.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, '#c8925a'); g.addColorStop(.5, '#b47c45'); g.addColorStop(1, '#9c6633'); t.fillStyle = g; t.fillRect(0, 0, 256, 64);
      for (let i = 0; i < 30; i++) { t.strokeStyle = `rgba(80,45,18,${.1 + Math.random() * .22})`; t.lineWidth = .5 + Math.random() * 1.1; t.beginPath(); const y0 = Math.random() * 64; t.moveTo(0, y0); for (let xx = 0; xx <= 256; xx += 16) t.lineTo(xx, y0 + Math.sin(xx * .03 + i) * 2.5); t.stroke(); }
      return c;
    }
    function build() {
      const r = cv.getBoundingClientRect(); cv.width = r.width * dpr; cv.height = r.height * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
      puff.width = puff.clientWidth; puff.height = puff.clientHeight;
      // Bildrechteck der Figur im Block
      const br = block.getBoundingClientRect(), iw = cimg.naturalWidth || 600, ih = cimg.naturalHeight || 700, s0 = Math.min(br.width / iw, br.height / ih);
      const fw = iw * s0, fh = ih * s0, fx = (br.width - fw) / 2, fy = br.height - fh;
      FX = fx + (br.left - r.left); FY = fy + (br.top - r.top); FW = fw; FH = fh;
      OX = (fx - br.width * .02) + (br.left - r.left); OY = (fy - br.height * .04) + (br.top - r.top); BW = fw + br.width * .04; BH = fh + br.height * .04;
      const cols = innerWidth < 640 ? 6 : 8, rows = innerWidth < 640 ? 8 : 10, P = [];
      for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) { const jx = (i > 0 && i < cols) ? (R(i, j) - .5) * .7 : 0, jy = (j > 0 && j < rows) ? (R(j, i + 9) - .5) * .7 : 0; P.push([OX + (i + jx) / cols * BW, OY + (j + jy) / rows * BH + (j === 0 ? (R(i, 3) - .5) * BH * .04 : 0)]); }
      shards = [];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const a = P[j * (cols + 1) + i], b = P[j * (cols + 1) + i + 1], c = P[(j + 1) * (cols + 1) + i + 1], d = P[(j + 1) * (cols + 1) + i];
        const tris = R(i, j + 5) > .5 ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]];
        tris.forEach(tr => { const cx = (tr[0][0] + tr[1][0] + tr[2][0]) / 3, cy = (tr[0][1] + tr[1][1] + tr[2][1]) / 3, n = shards.length; shards.push({ p: tr, cx, cy, t: .46 + ((cy - OY) / BH) * .26 + R(n, 1) * .08, vx: (cx - (OX + BW / 2)) / BW * 2 + (R(n, 2) - .5) * 1.2, vr: (R(n, 3) - .5) * 4, sh: .88 + R(n, 4) * .2, puffed: false }); });
      }
      if (!tex) tex = concreteTex();
      if (!wood) wood = woodTex();
      // Schattenriss der Figur – zeigt in der leeren Form, was entsteht
      if (cimg.naturalWidth) { sil = document.createElement('canvas'); sil.width = cimg.naturalWidth; sil.height = cimg.naturalHeight; const sx = sil.getContext('2d'); sx.drawImage(cimg, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = '#4c4a45'; sx.fillRect(0, 0, sil.width, sil.height); }
    }
    // Holzschalung: Seitenwände aus Brettern + Boden; beim Ausschalen klappen die Wände weg
    function plank(px, py, pw, ph, n, horiz) {
      x.save(); x.beginPath(); x.rect(px, py, pw, ph); x.clip();
      const pat = x.createPattern(wood, 'repeat'); x.fillStyle = pat; x.fillRect(px, py, pw, ph);
      x.strokeStyle = 'rgba(50,28,10,.55)'; x.lineWidth = 1.2;
      for (let i = 1; i < n; i++) { x.beginPath(); if (horiz) { const xx = px + pw * i / n; x.moveTo(xx, py); x.lineTo(xx, py + ph); } else { const yy = py + ph * i / n; x.moveTo(px, yy); x.lineTo(px + pw, yy); } x.stroke(); }
      x.fillStyle = 'rgba(40,40,40,.75)';
      for (let i = 0; i < n; i++) { const c = horiz ? [px + pw * (i + .5) / n, py + ph * .5] : [px + pw * .5, py + ph * (i + .5) / n]; x.beginPath(); x.arc(c[0], c[1], 1.6, 0, 6.28); x.fill(); }
      x.restore();
      x.strokeStyle = 'rgba(50,28,10,.6)'; x.lineWidth = 1.5; x.strokeRect(px, py, pw, ph);
    }
    function form(open, behind) {
      const t = Math.max(11, BW * .05), top = OY - BH * .05, h = OY + BH - top, bot = OY + BH, a = 1 - open;
      if (a <= 0) return;
      if (behind) {
        // Rückwand der Form (man schaut von vorne in die offene Form)
        x.save(); x.globalAlpha = .55 * a; x.fillStyle = x.createPattern(wood, 'repeat'); x.fillRect(OX, top, BW, h); x.fillStyle = 'rgba(30,18,8,.35)'; x.fillRect(OX, top, BW, h);
        x.strokeStyle = 'rgba(40,22,8,.35)'; x.lineWidth = 1; for (let i = 1; i < 6; i++) { const yy = top + h * i / 6; x.beginPath(); x.moveTo(OX, yy); x.lineTo(OX + BW, yy); x.stroke(); }
        x.restore(); return;
      }
      x.save(); x.globalAlpha = a;
      // Boden
      plank(OX - t, bot, BW + t * 2, t * .85, 4, true);
      // linke Wand – klappt nach außen
      x.save(); x.translate(OX - t, bot); x.rotate(-open * 1.25); x.translate(-open * 30, open * 40); plank(0, -h, t, h, 5, false); x.restore();
      // rechte Wand
      x.save(); x.translate(OX + BW + t, bot); x.rotate(open * 1.25); x.translate(open * 30, open * 40); plank(-t, -h, t, h, 5, false); x.restore();
      // Spannbänder oben
      if (open < .05) { x.fillStyle = 'rgba(55,55,58,.85)'; x.fillRect(OX - t - 3, top + h * .18, t + 6, 5); x.fillRect(OX + BW - 3, top + h * .18, t + 6, 5); x.fillRect(OX - t - 3, top + h * .72, t + 6, 5); x.fillRect(OX + BW - 3, top + h * .72, t + 6, 5); }
      x.restore();
    }
    function draw(p, now) {
      const W = cv.width / dpr, H = cv.height / dpr; x.clearRect(0, 0, W, H);
      const fill = clamp(p / .28, 0, 1), cure = clamp((p - .28) / .16, 0, 1), open = clamp((p - .42) / .12, 0, 1);
      cimg.style.opacity = p < .27 ? 0 : 1;
      if (fun) { fun.style.opacity = p > .36 ? 0 : 1; fun.style.transform = `translateX(-50%) translateY(${p > .36 ? -30 : 0}px)`; }
      const level = OY + BH * (1 - fill), pat = x.createPattern(tex, 'repeat');
      form(open, true);
      // leere Form: Schattenriss der Figur, die gleich entsteht
      if (fill < 1 && sil) { x.save(); x.globalAlpha = .16 * (1 - fill); x.drawImage(sil, FX, FY, FW, FH); x.restore(); }
      if (fill < 1) {
        if (fill > 0) {
          // flüssiger Beton: glatte, leicht wellige Oberfläche statt einzelner Dreiecke
          const amp = 2.4 * (1 - fill * .6), ph = now / 170;
          x.save(); x.beginPath(); x.moveTo(OX, OY + BH);
          for (let i = 0; i <= 24; i++) { const xx = OX + BW * i / 24; x.lineTo(xx, level + Math.sin(i * 1.15 + ph) * amp * (i % 23 ? 1 : 0)); }
          x.lineTo(OX + BW, OY + BH); x.closePath(); x.clip();
          x.fillStyle = pat; x.fillRect(OX, level - 6, BW, BH + 6);
          x.fillStyle = 'rgba(78,76,71,.5)'; x.fillRect(OX, level - 6, BW, BH + 6);
          const gl = x.createLinearGradient(0, level - 4, 0, level + 26); gl.addColorStop(0, 'rgba(235,233,226,.55)'); gl.addColorStop(1, 'rgba(235,233,226,0)'); x.fillStyle = gl; x.fillRect(OX, level - 6, BW, 32);
          x.restore();
        }
      } else {
        for (const s of shards) {
          let q = 0; if (p > s.t) q = clamp((p - s.t) / .14, 0, 1);
          if (q >= 1) continue;
          x.save();
          const dy = q * q * 520, dx = s.vx * q * 90, rot = s.vr * q;
          x.translate(s.cx + dx, s.cy + dy); x.rotate(rot); x.translate(-s.cx, -s.cy);
          x.globalAlpha = 1 - q * .9;
          x.beginPath(); x.moveTo(...s.p[0]); x.lineTo(...s.p[1]); x.lineTo(...s.p[2]); x.closePath();
          x.save(); x.clip();
          x.fillStyle = pat; x.fillRect(s.cx - 200, s.cy - 200, 400, 400);
          const wet = 1 - cure; if (wet > 0) { x.fillStyle = `rgba(70,68,64,${.45 * wet})`; x.fillRect(s.cx - 200, s.cy - 200, 400, 400); }
          x.fillStyle = `rgba(0,0,0,${(1 - s.sh) * .6 + .02})`; x.fillRect(s.cx - 200, s.cy - 200, 400, 400);
          x.restore();
          // Risse zeigen sich beim Aushärten, beim Brechen deutlicher
          const edge = Math.max(cure * .35, q > 0 ? .7 : 0); if (edge > 0) { x.strokeStyle = `rgba(40,38,34,${edge})`; x.lineWidth = q > 0 ? 1.4 : .8; x.stroke(); x.strokeStyle = `rgba(255,255,255,${edge * .35})`; x.lineWidth = .6; x.stroke(); }
          x.restore();
          if (q > 0 && !s.puffed) { s.puffed = true; if (pp.length < 160) for (let k = 0; k < 2; k++) pp.push({ x: s.cx, y: s.cy, vx: (Math.random() - .5) * 2, vy: -Math.random(), r: 4 + Math.random() * 10, a: .35 }); }
          if (q === 0) s.puffed = false;
        }
      }
      form(open, false);
      if (fill > 0 && fill < 1) { const vr = castV.getBoundingClientRect(), cr = cv.getBoundingClientRect(); pour.style.height = Math.max(8, cr.top - vr.top + level - 86) + 'px'; } else pour.style.height = '0px';
      const st = p > .86 ? 3 : p > .46 ? 2 : p > .28 ? 1 : 0; steps.forEach((s, i) => s.classList.toggle('on', i <= st));
    }
    const pScroll = () => { const r = sc.getBoundingClientRect(), total = sc.offsetHeight - innerHeight; return clamp(-r.top / (total * .8), 0, 1); };
    function loop(now) {
      if (vis && shards.length) {
        const ps = pScroll(), r = sc.getBoundingClientRect(), pinned = r.top <= 2 && r.bottom >= innerHeight - 2;
        if (Math.abs(scrollY - lastY) > 1 || !pinned) { still = now; lastY = scrollY; }
        // Bleibt der Besucher hier stehen, gießt die Werkstatt von selbst weiter
        if (!play && !stay && !autoDone && pinned && ps < .85 && now - still > 1500) { play = { t0: now, from: ps }; autoDone = true; nudgeOff('cast'); }
        let p;
        if (play) { const d = 3400 * (1 - play.from) + 300; p = play.from + (1 - play.from) * clamp((now - play.t0) / d, 0, 1); if (p >= 1) { play = null; stay = true; } }
        else if (stay) p = 1;
        else p = ps;
        if (ps > .3) nudgeOff('cast');
        if (Math.abs(p - lastP) > .0005 || pp.length || (p > 0 && p < .28)) { draw(p, now); lastP = p; }
        pctx.clearRect(0, 0, puff.width, puff.height);
        pp = pp.filter(q => (q.a -= .005) > 0);
        const cr = cv.getBoundingClientRect(), pr = puff.getBoundingClientRect();
        for (const q of pp) { q.x += q.vx; q.y += q.vy; q.r += .35; const X = q.x + cr.left - pr.left, Y = q.y + cr.top - pr.top; const g = pctx.createRadialGradient(X, Y, 0, X, Y, q.r); g.addColorStop(0, `rgba(200,198,190,${q.a})`); g.addColorStop(1, 'rgba(200,198,190,0)'); pctx.fillStyle = g; pctx.beginPath(); pctx.arc(X, Y, q.r, 0, 6.28); pctx.fill(); }
      }
      requestAnimationFrame(loop);
    }
    const init = () => { build(); lastP = -1; };
    if (cimg.complete && cimg.naturalWidth) init(); else cimg.addEventListener('load', init, { once: true });
    addEventListener('resize', () => { init(); });
    if (RM) { shards = []; steps.forEach(s => s.classList.add('on')); } else requestAnimationFrame(loop);
    $$('[data-fg]').forEach(b => b.addEventListener('click', () => {
      nudgeOff('cast');
      $$('[data-fg]').forEach(y => { y.classList.toggle('on', y === b); y.setAttribute('aria-pressed', y === b); });
      cimg.addEventListener('load', () => { init(); if (!RM) { play = { t0: performance.now(), from: 0 }; stay = false; } }, { once: true });
      cimg.src = 'img/c/' + b.dataset.fg + '.webp';
    }));
    // Fotos vom Figurenhof: Großansicht mit allen Beton-Fotos
    const BETON = ['g_figurenhof2', 'loewe', 'brunnen3', 'brunnenfrau', 'g_figurenhof', 'ausstellung_figuren', 'adler', 'adler3', 'beton_adler2', 'hund', 'milchmann', 'pagode', 'pagode_gruen', 'beton_pagode3', 'brunnen'];
    $$('[data-fs]').forEach(b => b.addEventListener('click', () => openSet(BETON, Math.max(0, BETON.indexOf(b.dataset.fs)))));
  }

  /* ================= Saisonfinale: Keimling ================= */
  const sprout = $('[data-sprout]');
  if (sprout) {
    const stem = $('.sp-stem', sprout), lv = $$('.sp-l1,.sp-l2,.sp-l3', sprout);
    const upd = () => { const r = sprout.getBoundingClientRect(); const p = clamp((innerHeight - r.top) / (innerHeight * .7), 0, 1); stem.style.setProperty('--sd', 220 * (1 - p)); lv.forEach((l, i) => l.style.setProperty('--sl', clamp((p - .45 - i * .12) / .25, 0, 1))); };
    addEventListener('scroll', upd, { passive: true }); upd();
  }

  /* ================= Lieferkarte ================= */
  const map = $('[data-mapsvg]');
  if (map) {
    const NS = 'http://www.w3.org/2000/svg', el = (n, a = {}, p = map) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); p.appendChild(e); return e; };
    const LON0 = 6.975, LAT0 = 49.455, S = 13.8, CL = Math.cos(49.3 * Math.PI / 180) * 111.32;
    const prj = (lat, lon) => [(lon - LON0) * CL * S, (LAT0 - lat) * 111.32 * S];
    map.setAttribute('viewBox', '0 0 600 430'); const LEFT = ['Landstuhl', 'Waldmohr', 'Kirkel', 'Neunkirchen', 'Spiesen-Elversberg'];
    const hav = (a, b) => { const R = 6371, dLa = (b[0] - a[0]) * Math.PI / 180, dLo = (b[1] - a[1]) * Math.PI / 180, x = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
    const shop = G.shop || [49.3244, 7.2873], [sx, sy] = prj(...shop);
    // Landschaft
    el('rect', { width: 600, height: 430, fill: '#e9e0cd' });
    [[49.29, 7.25, 60, 30], [49.40, 7.25, 70, 40], [49.22, 7.12, 55, 34], [49.38, 7.48, 80, 44], [49.20, 7.33, 50, 30], [49.46, 7.05, 60, 36]].forEach(([la, lo, rx, ry]) => { const [x, y] = prj(la, lo); el('ellipse', { cx: x, cy: y, rx, ry, fill: '#cfdcae', opacity: .7 }); });
    const road = (pts, lbl, li) => { const d = pts.map((p, i) => { const [x, y] = prj(...p); return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }).join(' '); el('path', { d, fill: 'none', stroke: '#fff', 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }); el('path', { d, fill: 'none', stroke: '#e6b25f', 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }); const [lx, ly] = prj(...pts[li ?? Math.floor(pts.length / 2)]); const g = el('g', { transform: `translate(${lx} ${ly})` }); el('rect', { x: -13, y: -9, width: 26, height: 18, rx: 4, fill: '#2f5fb3' }, g); el('text', { x: 0, y: 4.5, 'text-anchor': 'middle', fill: '#fff', style: 'font:600 11px Familjen,sans-serif' }, g).textContent = lbl; };
    road([[49.234, 6.996], [49.262, 7.06], [49.28, 7.12], [49.297, 7.21], [49.31, 7.29], [49.33, 7.34], [49.385, 7.36], [49.41, 7.52], [49.44, 7.77]], 'A6', 1);
    road([[49.346, 7.18], [49.33, 7.25], [49.30, 7.30], [49.27, 7.33], [49.249, 7.36]], 'A8', 3);
    const ringR = 8 * S; el('circle', { cx: sx, cy: sy, r: ringR, class: 'ring' });
    const rl = el('text', { x: sx, y: sy - ringR - 6, 'text-anchor': 'middle', style: 'font:500 11px Mono,monospace', fill: '#4f7a1e' }); rl.textContent = '10 km';
    const route = el('path', { class: 'route', d: '' });
    const truck = el('g', { opacity: 0 }); el('rect', { x: -11, y: -9, width: 15, height: 10, rx: 2, fill: '#c4843f' }, truck); el('path', { d: 'M4 -6 h5 l4 4 v3 h-9z', fill: '#1d140d' }, truck); el('circle', { cx: -7, cy: 2, r: 2.6, fill: '#1d140d' }, truck); el('circle', { cx: 8, cy: 2, r: 2.6, fill: '#1d140d' }, truck);
    const towns = [];
    (G.orte || []).forEach(([n, la, lo]) => { const [x, y] = prj(la, lo); if (x < 4 || x > 596 || y < 4 || y > 426) return; const g = el('g', { class: 'town', tabindex: 0, role: 'button', 'aria-label': n }); el('circle', { cx: x, cy: y, r: 17, class: 'hit' }, g); el('circle', { cx: x, cy: y, r: 5 }, g); const lf = LEFT.includes(n); const tt = el('text', { x: lf ? x - 8 : x + 8, y: y + 4, 'text-anchor': lf ? 'end' : 'start' }, g); tt.textContent = n; g.addEventListener('click', ev => { ev.stopPropagation(); pick([la, lo], n, g); }); g.addEventListener('keydown', ev => { if (ev.key === 'Enter') pick([la, lo], n, g); }); towns.push(g); });
    const shopG = el('g', { class: 'shop' }); el('circle', { cx: sx, cy: sy, r: 13, fill: '#fff' }, shopG); el('circle', { cx: sx, cy: sy, r: 9 }, shopG); el('path', { d: `M${sx} ${sy - 5} l4 6 h-8z`, fill: '#9cc25a' }, shopG); el('rect', { x: sx + 12, y: sy + 9, width: 108, height: 24, rx: 12, fill: '#244726' }, shopG); el('path', { d: `M${sx + 8} ${sy + 6} l14 5 l-6 6z`, fill: '#244726' }, shopG); const stx = el('text', { x: sx + 66, y: sy + 26, 'text-anchor': 'middle', fill: '#fff', style: 'font:400 14px Gloock,serif' }, shopG); stx.textContent = 'Garten-Traum';
    const pin = el('g', { opacity: 0 }); el('path', { d: 'M0 0 C -9 -12 -9 -24 0 -24 C 9 -24 9 -12 0 0 Z', fill: '#ff6a1a', stroke: '#fff', 'stroke-width': 2 }, pin); el('circle', { cx: 0, cy: -16, r: 3.4, fill: '#fff' }, pin);
    // Handy: Ausschnitt um Kirkel vergrößern, damit Orte lesbar und antippbar bleiben
    const fitVB = () => map.setAttribute('viewBox', innerWidth < 640 ? '12 56 500 340' : '0 0 600 430'); fitVB(); addEventListener('resize', fitVB);
    let sel = null, an;
    const wert = $('[data-wert]'), wo = $('[data-wo]'), res = $('[data-dres]'), sub = $('[data-dsub]');
    const fmt = n => n.toLocaleString(LANG === 'pl' ? 'pl-PL' : 'de-DE');
    function calc() {
      const v = +wert.value; wo.textContent = fmt(v) + ' €';
      if (!sel) { res.textContent = tr('pick'); sub.textContent = ''; return; }
      const km = Math.max(1, Math.round(hav(shop, sel.ll) * 1.25));
      if (v < 1000) { res.textContent = tr('ask'); sub.textContent = sel.n + ' · ' + tr('km', { k: km }) + ' — ' + tr('min'); return; }
      const c = Math.max(0, km - 10);
      res.textContent = c === 0 ? tr('free') : tr('cost') + ' ' + fmt(c) + ',00 €';
      sub.textContent = sel.n + ' · ' + tr('km', { k: km });
    }
    function pick(ll, n, g) {
      sel = { ll, n }; towns.forEach(t => t.classList.toggle('on', t === g));
      const [x, y] = prj(...ll);
      if (!g) { pin.setAttribute('transform', `translate(${x} ${y})`); pin.setAttribute('opacity', 1); } else pin.setAttribute('opacity', 0);
      const mx = (sx + x) / 2, my = (sy + y) / 2 - Math.hypot(x - sx, y - sy) * .25;
      route.setAttribute('d', `M${sx} ${sy} Q ${mx} ${my} ${x} ${y}`);
      cancelAnimationFrame(an); const L = route.getTotalLength(); let t0; truck.setAttribute('opacity', 1);
      const go = ts => { if (!t0) t0 = ts; const k = clamp((ts - t0) / 1400, 0, 1), p = route.getPointAtLength(L * ease(k)), p2 = route.getPointAtLength(Math.min(L, L * ease(k) + 1)); const ang = Math.atan2(p2.y - p.y, p2.x - p.x) * 180 / Math.PI; truck.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${Math.abs(ang) > 90 ? ang + 180 : ang}) ${Math.abs(ang) > 90 ? 'scale(-1 1)' : ''}`); if (k < 1) an = requestAnimationFrame(go); };
      an = requestAnimationFrame(go); calc();
    }
    map.addEventListener('click', e => { const pt = map.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(map.getScreenCTM().inverse()); const lon = p.x / (CL * S) + LON0, lat = LAT0 - p.y / (111.32 * S); pick([lat, lon], tr('yours'), null); });
    let wertTouched = false;
    wert.addEventListener('input', () => { wertTouched = true; nudgeOff('wert'); calc(); });
    document.addEventListener('gt-lang', calc);
    const hb = towns.find(t => t.getAttribute('aria-label') === 'Homburg');
    inView(map, v => { if (v && !sel && hb) { const o = (G.orte || []).find(x => x[0] === 'Homburg'); pick([o[1], o[2]], 'Homburg', hb); } }, '-10% 0px');
    // Impuls: der Regler zählt beim ersten Sichtkontakt sichtbar hoch – unter 1.000 € „auf Anfrage“, darüber „kostenlos“
    firstView(wert, () => { if (RM || wertTouched) return; const from = 400, to = +wert.value || 1200; let t0 = null; wert.value = from; calc(); const an2 = ts => { if (wertTouched) return; if (t0 === null) t0 = ts; const k = clamp((ts - t0 - 500) / 1900, 0, 1); wert.value = Math.round(lerp(from, to, ease(k)) / 50) * 50; calc(); if (k < 1) requestAnimationFrame(an2); }; requestAnimationFrame(an2); }, '0px 0px -15% 0px');
    calc();
  }

  /* ================= Schild schwingt mit dem Scrollen ================= */
  const signs = $$('[data-visign]');
  if (signs.length && !RM) {
    let ly = scrollY, a = 0, v = 0;
    const loop = () => { const dy = clamp(scrollY - ly, -50, 50); ly = scrollY; v += -dy * .015 - a * .04; v *= .92; a += v; a = clamp(a, -6, 6); signs.forEach(s => s.style.transform = `rotate(${a.toFixed(2)}deg)`); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  /* ================= Formular ================= */
  const form = $('[data-kf]');
  function prefill(msg, chips = []) {
    const ta = $('[data-msg]'); if (ta && !ta.value.trim()) ta.value = msg; else if (ta && !ta.value.includes(msg)) ta.value += '\n' + msg;
    chips.forEach(c => { const i = $(`[data-int] input[value="${c}"]`); if (i) i.checked = true; });
    $('#kontakt').scrollIntoView({ behavior: RM ? 'auto' : 'smooth' });
  }
  window.GTprefill = prefill;
  const GA = ['gastro_saal', 'gastro_bar', 'gastro_kamin', 'gastro_raum2', 'gastro_raum1', 'vogelbach'];
  $$('[data-ga]').forEach(b => b.addEventListener('click', () => openSet(GA, Math.max(0, GA.indexOf(b.dataset.ga)))));
  const gaAll = $('[data-gaall]'); if (gaAll) gaAll.addEventListener('click', () => openSet(GA, 0));
  const gaAsk = $('[data-gaask]'); if (gaAsk) gaAsk.addEventListener('click', e => { e.preventDefault(); prefill(tr('gaMsg'), ['Gastronomie']); });
  $$('[data-deal]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); prefill(tr('dealMsg'), ['Restposten / Sonderangebote']); }));
  if (form) {
    form.addEventListener('submit', async e => {
      $('[data-next]', form).value = location.href.split('#')[0].split('?')[0] + '?gesendet=1#kontakt';
      if (window.GTP && window.GTP.hasItems()) {
        $('[data-plantext]', form).value = window.GTP.summary('pl');
        if (window.GTP.attach && window.DataTransfer) {
          e.preventDefault(); const btn = $('[data-ksend]', form); btn.disabled = true;
          try { const blob = await window.GTP.getBlob(); const dt = new DataTransfer(); dt.items.add(new File([blob], 'projekt-ogrodu.jpg', { type: 'image/jpeg' })); $('[data-planfile]', form).files = dt.files; } catch (er) {}
          HTMLFormElement.prototype.submit.call(form);
        }
      }
    });
    /* Die Anfrage-Mail liest der Inhaber – auf Polnisch. Darum kommt sie komplett polnisch an, egal in welcher Sprache
       der Kunde die Seite benutzt: Betreff mit Kundenname, oben eine polnische Erklärung (antworten, übersetzen, anrufen),
       polnische Feldnamen und Auswahl, feste Reihenfolge, leere Felder fallen weg. Ohne „formdata“ (sehr alte Browser)
       geht das Formular so, wie es im HTML steht – ebenfalls mit polnischen Feldnamen. */
    form.addEventListener('formdata', e => {
      const fd = e.formData, src = [...fd.entries()];
      const val = k => { const f = src.find(([n]) => n === k); return f ? f[1] : ''; };
      const txt = k => { const v = val(k); return typeof v === 'string' ? v.trim() : ''; };
      const de = LANG !== 'pl', name = txt('Klient'), tel = txt('Telefon'), plan = txt('Projekt');
      const file = val('attachment'), hasFile = file instanceof File && file.size > 0;
      const ints = $$('[data-int] input:checked', form).map(i => i.dataset.plv || i.value).join(', ');
      const info = ['To jest nowe zapytanie ze strony der-garten-traum.de.',
        de ? 'Klient napisał po niemiecku – żeby przetłumaczyć wiadomość, zaznacz tekst i wybierz „Przetłumacz”.' : 'Klient napisał po polsku.',
        'Żeby odpowiedzieć, kliknij „Odpowiedz” (w niemieckiej poczcie: „Antworten”) – e-mail trafi prosto do klienta' + (de ? ', najlepiej po niemiecku.' : '.'),
        tel ? `Możesz też zadzwonić: ${tel}.` : '',
        hasFile ? 'Projekt ogrodu, który klient ułożył na stronie, jest w załączniku.' : '',
        'Angielskie zdania w tym e-mailu dodaje automatycznie serwis formularza – można je pominąć.'].filter(Boolean).join(' ');
      new Set(src.map(([n]) => n)).forEach(k => fd.delete(k));
      const put = (k, v) => { if (typeof v === 'string' && v.trim()) fd.append(k, v); };
      put('_subject', `Nowe zapytanie: ${name || 'klient'} (pisze po ${de ? 'niemiecku' : 'polsku'})`);
      ['_template', '_captcha', '_next'].forEach(k => put(k, txt(k)));
      fd.append('_honey', txt('_honey'));
      put('Informacja', info); put('Język', de ? 'niemiecki' : 'polski');
      put('Klient', name); put('Telefon', tel); put('email', txt('email'));
      put('Zainteresowanie', ints); put('Wiadomość', txt('Wiadomość'));
      put('Projekt', plan ? plan + (hasFile ? ' – zdjęcie w załączniku' : '') : '');
      if (hasFile) fd.append('attachment', file, file.name);
    });
    if (/[?&]gesendet=1/.test(location.search)) { $('[data-kok]').hidden = false; setTimeout(() => toast(tr('sent')), 800); }
  }

  /* ---------------- Dock ---------------- */
  const dock = $('[data-dock]');
  if (dock) {
    const pl = $('#planer'); inView(pl, v => $$('a', dock)[1].classList.toggle('on', !v), '0px');
    // beim Gestalten im Planer und im Formular macht die Leiste Platz
    const stg = $('[data-stage]'), kf = $('[data-kf]'); let a = false, b2 = false;
    const upd = () => dock.classList.toggle('away', a || b2);
    inView(stg, v => { a = v; upd(); }, '-25% 0px'); inView(kf, v => { b2 = v; upd(); }, '-20% 0px');
  }

  setLang(startLang, true);
})();
