/* Der Garten-Traum – Garten-Planer: eigenes Foto, echte Freisteller, Tiefe, Sonne, Schatten, Export */
(() => {
  'use strict';
  const root = document.querySelector('[data-planner]'); if (!root) return;
  const $ = (s, r = root) => r.querySelector(s), $$ = (s, r = root) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const G = window.GT || {}, PROD = G.prod || {};
  const L = () => (window.GTL ? window.GTL() : 'de');
  const TXT = { de: { added: 'hinzugefügt', empty: 'Noch nichts im Garten – Möbel unten antippen.', inGarden: 'Im Garten:', photoOk: 'Ihr Foto ist geladen – jetzt Möbel hineinziehen.', saved: 'Bild gespeichert.', sendOk: 'Ihr Entwurf hängt jetzt an der Anfrage.', share: 'Mein Garten-Entwurf vom Garten-Traum in Kirkel', footer: 'Der Garten-Traum · Ortsstraße 69 · Kirkel-Altstadt · 0176 47161931', need: 'Stellen Sie zuerst ein Möbelstück in den Garten.', big: 'Das Foto ist sehr groß – es wird verkleinert.' },
    pl: { added: 'dodano', empty: 'W ogrodzie jeszcze nic nie ma – dotknij mebla poniżej.', inGarden: 'W ogrodzie:', photoOk: 'Zdjęcie wczytane – teraz przeciągnij meble.', saved: 'Obraz zapisany.', sendOk: 'Twój projekt jest dołączony do zapytania.', share: 'Mój projekt ogrodu z Garten-Traum w Kirkel', footer: 'Der Garten-Traum · Ortsstraße 69 · Kirkel-Altstadt · +49 176 47161931', need: 'Najpierw postaw mebel w ogrodzie.', big: 'Zdjęcie jest bardzo duże – zostanie zmniejszone.' } };
  const tx = k => (TXT[L()] || TXT.de)[k];
  const toast = m => window.GTtoast && window.GTtoast(m);

  const stage = $('[data-stage]'), cv = $('[data-cv]'), ctx = cv.getContext('2d'), tool = $('[data-tool]'), hint = $('[data-plhint]'), hzEl = $('[data-hz]'), hand = $('[data-plhand]');
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Der Hinweis bleibt sichtbar, bis der Besucher selbst etwas tut (erste echte Bedienung)
  let touched = false;
  const touch = () => { if (touched) return; touched = true; hint.classList.add('off'); if (hand) hand.classList.remove('on'); };
  const supportsFilter = typeof ctx.filter === 'string';
  const IMG = {}, SIL = {};
  function load(k) {
    if (IMG[k]) return IMG[k].p;
    const im = new Image(); im.decoding = 'async';
    const p = new Promise(res => { im.onload = () => { IMG[k].ok = true; const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height); SIL[k] = c; const a = document.createElement('canvas'); a.width = Math.max(1, im.naturalWidth >> 2); a.height = Math.max(1, im.naturalHeight >> 2); const ax = a.getContext('2d'); ax.drawImage(im, 0, 0, a.width, a.height); IMG[k].alpha = ax.getImageData(0, 0, a.width, a.height); res(im); draw(); }; im.onerror = () => res(null); });
    im.src = 'img/c/' + k + '.webp'; IMG[k] = { im, p, ok: false }; return p;
  }

  /* ---------- Zustand ---------- */
  let S = { scene: 'rasen', hz: .4, depth: true, shadows: true, sun: 15, items: [] };
  let photo = null, sel = -1, W = 0, H = 0, DPR = Math.min(2, window.devicePixelRatio || 1);
  const hist = [];
  let demo = false, seeding = false; // Beispiel-Möbel beim ersten Öffnen – verschwinden, sobald der Kunde selbst etwas hineinstellt
  const snap = () => { hist.push(JSON.stringify(S.items)); if (hist.length > 40) hist.shift(); };
  const persist = () => { if (demo || seeding) return; try { localStorage.setItem('gt-planer', JSON.stringify({ scene: S.scene === 'photo' ? 'rasen' : S.scene, hz: S.hz, depth: S.depth, shadows: S.shadows, sun: S.sun, items: demo ? [] : S.items })); } catch (e) {} };
  try { const o = JSON.parse(localStorage.getItem('gt-planer') || 'null'); if (o && Array.isArray(o.items)) { S = Object.assign(S, o); S.items = S.items.filter(it => PROD[it.k]); } } catch (e) {}
  S.items.forEach(it => load(it.k));

  /* ---------- Größe ---------- */
  function aspect() { if (S.scene === 'photo' && photo) return clamp(photo.width / photo.height, .75, 1.9); return innerWidth < 640 ? .82 : 1.8; }
  let vhMax = 0;
  const avail = () => { const cs = getComputedStyle(root); return Math.floor(root.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)); };
  function resize() {
    // Bild + Möbel-Leiste sollen zusammen auf den Bildschirm passen; Hochkant-Fotos werden schmaler statt riesig hoch
    const aw = avail(), mob = innerWidth < 640; vhMax = Math.max(vhMax, innerHeight);
    const maxH = Math.max(300, mob ? vhMax * .64 : innerHeight - 350);
    let w = aw, h = Math.round(aw / aspect());
    if (h > maxH) { h = Math.round(maxH); if (S.scene === 'photo' && photo) w = Math.min(aw, Math.round(h * aspect())); }
    W = w; H = h; stage.style.width = w < aw ? w + 'px' : '';
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cv.style.height = H + 'px';
    bgCache = null; draw();
  }

  /* ---------- Hintergrund-Szenen (prozedural) ---------- */
  let bgCache = null;
  const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(42);
  function noiseTex(n, cols, size = 160) { const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'); for (let i = 0; i < n; i++) { x.fillStyle = cols[i % cols.length]; const s = .6 + rnd() * 1.8; x.fillRect(rnd() * size, rnd() * size, s, s * (1 + rnd() * 2)); } return c; }
  const TEX = {};
  function sky(x, w, h, hz, sun) {
    const ev = clamp((sun - 17) / 4, 0, 1), mo = clamp((10 - sun) / 2, 0, 1);
    const g = x.createLinearGradient(0, 0, 0, h * hz);
    g.addColorStop(0, `rgb(${lerp(110, 70, ev) + mo * 30},${lerp(165, 80, ev)},${lerp(225, 140, ev)})`);
    g.addColorStop(1, `rgb(${lerp(225, 250, ev)},${lerp(238, 178, ev)},${lerp(245, 120, ev)})`);
    x.fillStyle = g; x.fillRect(0, 0, w, h * hz + 2);
    // Sonne
    const sx = lerp(w * .12, w * .88, clamp((sun - 8) / 13, 0, 1)), sy = h * hz * (.25 + .7 * Math.pow(Math.abs(sun - 14) / 7, 2));
    const sg = x.createRadialGradient(sx, sy, 0, sx, sy, h * .25); sg.addColorStop(0, `rgba(255,${lerp(250, 200, ev)},${lerp(220, 120, ev)},.95)`); sg.addColorStop(.12, `rgba(255,240,200,.55)`); sg.addColorStop(1, 'rgba(255,240,200,0)');
    x.fillStyle = sg; x.fillRect(0, 0, w, h * hz);
  }
  function treeline(x, w, h, hz, dark, layer = 0) {
    const y0 = h * hz, R0 = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7 + layer * 13);
    const base = layer ? [96, 128, 74] : [70, 104, 52], hi = layer ? [150, 180, 120] : [124, 160, 80], lo = layer ? [70, 96, 60] : [38, 62, 28];
    let cx = -h * .05;
    while (cx < w + h * .1) {
      const r = h * (.045 + R0() * .05) * (layer ? .8 : 1), by = y0 - h * (layer ? .045 : .01);
      x.fillStyle = 'rgb(58,40,26)'; x.fillRect(cx - r * .08, by - r * .9, r * .16, r * .9);
      for (let k = 0; k < 8; k++) {
        const a = R0() * 6.28, d = r * (.25 + R0() * .55), px = cx + Math.cos(a) * d, py = by - r * 1.25 + Math.sin(a) * d * .8, pr = r * (.45 + R0() * .35);
        const g = x.createRadialGradient(px - pr * .35, py - pr * .4, pr * .1, px, py, pr);
        g.addColorStop(0, `rgb(${hi})`); g.addColorStop(.6, `rgb(${base})`); g.addColorStop(1, `rgb(${lo})`);
        x.fillStyle = g; x.beginPath(); x.arc(px, py, pr, 0, 6.28); x.fill();
      }
      cx += r * (1.1 + R0() * .9);
    }
  }
  function hedge(x, w, h, hz) {
    const y0 = h * hz, hh = h * .06; const g = x.createLinearGradient(0, y0 - hh, 0, y0); g.addColorStop(0, '#5f8a3a'); g.addColorStop(1, '#2f4c1e');
    x.fillStyle = g; x.beginPath(); x.moveTo(0, y0);
    for (let i = 0; i <= w; i += h * .03) x.quadraticCurveTo(i + h * .015, y0 - hh - h * .012 * (1 + Math.sin(i * .07)), i + h * .03, y0 - hh);
    x.lineTo(w, y0); x.closePath(); x.fill();
    if (!TEX.leaf) TEX.leaf = noiseTex(2400, ['rgba(20,40,10,.4)', 'rgba(160,200,110,.35)', 'rgba(60,100,40,.4)'], 120);
    x.save(); x.clip(); x.fillStyle = x.createPattern(TEX.leaf, 'repeat'); x.fillRect(0, y0 - hh * 1.5, w, hh * 1.5); x.restore();
  }
  function fence(x, w, h, hz) {
    const y0 = h * hz, fh = h * .085; x.fillStyle = '#a8743d';
    for (let i = 0; i < w; i += h * .035) { x.fillRect(i, y0 - fh, h * .028, fh + 2); x.beginPath(); x.moveTo(i, y0 - fh); x.lineTo(i + h * .014, y0 - fh - h * .012); x.lineTo(i + h * .028, y0 - fh); x.fill(); }
    x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(0, y0 - fh * .7, w, fh * .1); x.fillRect(0, y0 - fh * .3, w, fh * .1);
  }
  function persp(x, w, h, hz, fn) { const vy = h * hz, vx = w / 2; fn(vx, vy); }
  function drawScene(x, w, h) {
    const hz = S.hz, sun = S.sun, y0 = h * hz;
    sky(x, w, h, hz, sun);
    if (S.scene === 'rasen') {
      treeline(x, w, h, hz, '', 1); treeline(x, w, h, hz, '', 0); fence(x, w, h, hz);
      const g = x.createLinearGradient(0, y0, 0, h); g.addColorStop(0, '#8fae55'); g.addColorStop(1, '#5f8a2e'); x.fillStyle = g; x.fillRect(0, y0, w, h - y0);
      // Mähstreifen in Perspektive
      persp(x, w, h, hz, (vx, vy) => { x.save(); x.beginPath(); x.rect(0, vy, w, h - vy); x.clip(); for (let i = -12; i < 12; i++) { if (i % 2) continue; x.fillStyle = 'rgba(255,255,255,.06)'; x.beginPath(); x.moveTo(vx + i * w * .002, vy); x.lineTo(vx + (i + 1) * w * .002, vy); x.lineTo(vx + (i + 1) * w * .22, h); x.lineTo(vx + i * w * .22, h); x.fill(); } x.restore(); });
      if (!TEX.grass) TEX.grass = noiseTex(2600, ['rgba(40,70,20,.35)', 'rgba(170,200,110,.35)', 'rgba(60,90,30,.3)']);
      x.save(); x.globalAlpha = .9; x.fillStyle = x.createPattern(TEX.grass, 'repeat'); x.fillRect(0, y0, w, h - y0); x.restore();
    } else if (S.scene === 'terrasse') {
      // Hauswand + Fenster
      x.fillStyle = '#e9dcc4'; x.fillRect(0, 0, w, y0); const wg = x.createLinearGradient(0, 0, 0, y0); wg.addColorStop(0, 'rgba(0,0,0,.1)'); wg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = wg; x.fillRect(0, 0, w, y0);
      const fw = w * .2, fh = y0 * .55; [[.18, .25], [.62, .25]].forEach(([fx, fy]) => { x.fillStyle = '#6b4a2c'; x.fillRect(w * fx - 6, y0 * fy - 6, fw + 12, fh + 12); const gg = x.createLinearGradient(0, y0 * fy, 0, y0 * fy + fh); gg.addColorStop(0, '#a9c7dc'); gg.addColorStop(1, '#5e7d92'); x.fillStyle = gg; x.fillRect(w * fx, y0 * fy, fw, fh); x.fillStyle = '#6b4a2c'; x.fillRect(w * fx + fw / 2 - 3, y0 * fy, 6, fh); x.fillRect(w * fx, y0 * fy + fh / 2 - 3, fw, 6); });
      x.fillStyle = '#cdbb9c'; x.fillRect(0, y0 - h * .02, w, h * .02);
      // Platten in Perspektive
      const g = x.createLinearGradient(0, y0, 0, h); g.addColorStop(0, '#b9ab97'); g.addColorStop(1, '#9d8f7b'); x.fillStyle = g; x.fillRect(0, y0, w, h - y0);
      persp(x, w, h, hz, (vx, vy) => { x.strokeStyle = 'rgba(70,60,50,.35)'; x.lineWidth = 1.2; for (let i = -16; i <= 16; i++) { x.beginPath(); x.moveTo(vx + i * w * .015, vy); x.lineTo(vx + i * w * .16, h); x.stroke(); } let d = 1; for (let k = 0; k < 30; k++) { const yy = vy + (h - vy) * (1 - 1 / (1 + k * .35)); x.beginPath(); x.moveTo(0, yy); x.lineTo(w, yy); x.stroke(); } });
      if (!TEX.stone) TEX.stone = noiseTex(1800, ['rgba(60,50,40,.18)', 'rgba(255,255,255,.18)']);
      x.fillStyle = x.createPattern(TEX.stone, 'repeat'); x.fillRect(0, y0, w, h - y0);
    } else {
      treeline(x, w, h, hz, '', 1); treeline(x, w, h, hz, '', 0); hedge(x, w, h, hz);
      const g = x.createLinearGradient(0, y0, 0, h); g.addColorStop(0, '#cdb68e'); g.addColorStop(1, '#b0966c'); x.fillStyle = g; x.fillRect(0, y0, w, h - y0);
      if (!TEX.kies) TEX.kies = noiseTex(5200, ['rgba(120,95,60,.55)', 'rgba(250,235,205,.6)', 'rgba(90,70,45,.45)', 'rgba(200,175,130,.6)'], 140);
      // Kies feiner zum Horizont
      for (let b = 0; b < 6; b++) { const ya = y0 + (h - y0) * (b / 6), yb = y0 + (h - y0) * ((b + 1) / 6); x.save(); x.beginPath(); x.rect(0, ya, w, yb - ya + 1); x.clip(); const sc = .35 + b * .2; x.scale(sc, sc); x.fillStyle = x.createPattern(TEX.kies, 'repeat'); x.fillRect(0, ya / sc, w / sc, (yb - ya) / sc + 2); x.restore(); }
    }
  }
  function background(w, h, dpr) {
    const key = [S.scene, S.hz, S.sun, w, h, dpr, !!photo].join();
    if (bgCache && bgCache.key === key) return bgCache.c;
    const c = document.createElement('canvas'); c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); const x = c.getContext('2d'); x.scale(dpr, dpr);
    if (S.scene === 'photo' && photo) { const r = Math.max(w / photo.width, h / photo.height), pw = photo.width * r, ph = photo.height * r; x.drawImage(photo, (w - pw) / 2, (h - ph) / 2, pw, ph); }
    else drawScene(x, w, h);
    if (dpr === DPR && w === W) bgCache = { key, c }; return c;
  }

  /* ---------- Geometrie ---------- */
  const HR = () => innerWidth < 640 ? 14 : 12; // Griff-Radius
  const handle = g => [clamp(g.x + g.w, HR() + 2, W - HR() - 2), clamp(g.y + g.h, HR() + 2, H - HR() - 2)];
  function geo(it, w = W, h = H) {
    const p = PROD[it.k]; if (!p) return null;
    const ar = p.sz[0] / p.sz[1];
    let d = 1; if (S.depth) d = clamp((it.y - S.hz) / (1 - S.hz), .06, 1.35);
    const bw = (p.w / 250) * Math.max(w, h * 1.15) * .46 * it.s * d, bh = bw / ar;
    return { x: it.x * w - bw / 2, y: it.y * h - bh, w: bw, h: bh, cx: it.x * w, by: it.y * h };
  }
  const order = () => S.items.map((it, i) => i).sort((a, b) => S.depth ? (S.items[a].y - S.items[b].y) || (S.items[a].z - S.items[b].z) : S.items[a].z - S.items[b].z);
  function hit(px, py) {
    const o = order();
    for (let j = o.length - 1; j >= 0; j--) {
      const i = o[j], it = S.items[i], g = geo(it); if (!g) continue;
      if (px < g.x || px > g.x + g.w || py < g.y || py > g.y + g.h) continue;
      const A = IMG[it.k] && IMG[it.k].alpha; if (!A) return i;
      let lx = (px - g.x) / g.w; if (it.flip) lx = 1 - lx; const ly = (py - g.y) / g.h;
      const ax = clamp(Math.floor(lx * A.width), 0, A.width - 1), ay = clamp(Math.floor(ly * A.height), 0, A.height - 1);
      if (A.data[(ay * A.width + ax) * 4 + 3] > 40) return i;
      // großzügig um die Mitte
      if (Math.abs(lx - .5) < .2 && ly > .3) return i;
    }
    return -1;
  }

  /* ---------- Zeichnen ---------- */
  const tint = {};
  function tinted(k, bri) {
    const key = k + '|' + bri; if (tint[key]) return tint[key];
    const im = IMG[k].im, c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    if (bri) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = bri > 0 ? `rgba(255,245,225,${bri / 100})` : `rgba(10,6,2,${-bri / 100})`; x.fillRect(0, 0, c.width, c.height); }
    tint[key] = c; return c;
  }
  function render(x, w, h, forExport) {
    x.drawImage(background(w, h, forExport ? 1 : DPR), 0, 0, w, h);
    const sunT = clamp((S.sun - 8) / 13, 0, 1), elev = Math.sin(sunT * Math.PI), dir = Math.cos(sunT * Math.PI); // dir: +1 morgens (Schatten nach rechts)
    const ev = clamp((S.sun - 17) / 4, 0, 1);
    for (const i of order()) {
      const it = S.items[i]; if (!IMG[it.k] || !IMG[it.k].ok) continue; const g = geo(it, w, h);
      if (S.shadows) {
        // Kontaktschatten
        x.save(); x.globalAlpha = .55; const rg = x.createRadialGradient(g.cx, g.by, 0, g.cx, g.by, g.w * .55); rg.addColorStop(0, 'rgba(20,12,5,.55)'); rg.addColorStop(1, 'rgba(20,12,5,0)'); x.fillStyle = rg; x.translate(g.cx, g.by); x.scale(1, .16); x.translate(-g.cx, -g.by); x.beginPath(); x.arc(g.cx, g.by, g.w * .55, 0, 6.28); x.fill(); x.restore();
        // Schlagschatten (Silhouette auf den Boden geklappt)
        const sil = SIL[it.k]; if (sil) {
          const len = lerp(1.1, .25, elev), skew = dir * lerp(1.6, .2, elev);
          x.save(); x.globalAlpha = lerp(.22, .34, elev) * (1 - ev * .5);
          if (supportsFilter) x.filter = `blur(${Math.max(1.5, g.w * .012)}px)`;
          x.translate(g.cx, g.by); x.transform(1, 0, -skew, -len * .45, 0, 0);
          if (it.flip) x.scale(-1, 1);
          x.drawImage(sil, -g.w / 2, -g.h, g.w, g.h); x.restore();
        }
      }
      x.save(); x.translate(g.cx, g.y); if (it.flip) x.scale(-1, 1);
      x.drawImage(tinted(it.k, Math.round(((it.bri || 0) - ev * 18) / 6) * 6), -g.w / 2, 0, g.w, g.h); x.restore();
    }
    // Abendlicht
    if (ev > 0) { x.save(); x.globalCompositeOperation = 'soft-light'; x.fillStyle = `rgba(255,140,60,${ev * .45})`; x.fillRect(0, 0, w, h); x.restore(); }
    if (!forExport && sel >= 0 && S.items[sel]) {
      const g = geo(S.items[sel], w, h); x.save(); x.strokeStyle = '#fff'; x.setLineDash([6, 5]); x.lineWidth = 1.6; x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 4; x.strokeRect(g.x, g.y, g.w, g.h); x.setLineDash([]);
      const [hx, hy] = handle(g), hr = HR(), a = hr * .42;
      x.fillStyle = '#ff6a1a'; x.beginPath(); x.arc(hx, hy, hr, 0, 6.28); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 2.5; x.stroke();
      // Doppelpfeil ↖↘ = Größe ändern
      x.shadowBlur = 0; x.lineWidth = 2; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath();
      x.moveTo(hx - a, hy - a); x.lineTo(hx + a, hy + a);
      x.moveTo(hx + a, hy + a * .1); x.lineTo(hx + a, hy + a); x.lineTo(hx + a * .1, hy + a);
      x.moveTo(hx - a, hy - a * .1); x.lineTo(hx - a, hy - a); x.lineTo(hx - a * .1, hy - a); x.stroke(); x.restore();
    }
  }
  let raf = 0;
  function draw() { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H); render(ctx, W, H, false); placeTool(); list(); }); }
  function placeTool() {
    if (sel < 0 || !S.items[sel]) { tool.hidden = true; return; }
    const g = geo(S.items[sel]); tool.hidden = false;
    const tw = tool.offsetWidth || 260, th = tool.offsetHeight || 46; tool.style.left = clamp(g.cx, tw / 2 + 6, W - tw / 2 - 6) + 'px';
    // über dem Möbel, sonst darunter, sonst oben am Bildrand – damit die Leiste das Stück nicht verdeckt
    let top = g.y - 8; if (top - th < 4) { top = g.y + g.h + 14 + th; if (top > H - 4) top = Math.max(th + 6, Math.min(g.y - 8, H - 4)); }
    tool.style.top = top + 'px';
    $('[data-bri]').value = S.items[sel].bri || 0;
  }
  function list() {
    const el = $('[data-pllist]'); if (!el) return;
    if (!S.items.length) { el.textContent = tx('empty'); return; }
    const c = {}; S.items.forEach(it => c[it.k] = (c[it.k] || 0) + 1);
    el.textContent = tx('inGarden') + ' ' + Object.entries(c).map(([k, n]) => `${n}× ${L() === 'pl' ? PROD[k].pl : PROD[k].n}`).join(' · ');
  }

  /* ---------- Bearbeiten ---------- */
  // freien Platz für ein neues Möbel suchen: möglichst wenig Überdeckung, ganz im Bild, eher vorne und mittig
  function freeSpot(k) {
    if (!W || !H || !PROD[k]) return null;
    const beton = PROD[k].cat === 'beton'; let best = null, bs = Infinity;
    for (let row = 0; row < 3; row++) for (let col = 0; col < 9; col++) {
      const cx = .1 + col * .1, cy = clamp((beton ? .82 : .9) - row * .085, S.hz + .14, .97);
      const g = geo({ k, x: cx, y: cy, s: 1 }); if (!g) continue;
      let ov = 0; S.items.forEach(o => { const h = geo(o); if (!h) return; const ix = Math.max(0, Math.min(g.x + g.w, h.x + h.w) - Math.max(g.x, h.x)), iy = Math.max(0, Math.min(g.y + g.h, h.y + h.h) - Math.max(g.y, h.y)); ov += ix * iy; });
      const out = Math.max(0, -g.x) + Math.max(0, g.x + g.w - W) + Math.max(0, -g.y);
      const sc = ov * 1.6 + out * g.h * 3 + Math.abs(cx - .5) * g.w * g.h * .35 + row * g.w * g.h * .05;
      if (sc < bs) { bs = sc; best = [cx, cy]; }
    }
    return best;
  }
  let zc = S.items.reduce((m, it) => Math.max(m, it.z || 0), 0);
  function add(k, x, y) {
    if (!PROD[k]) return; if (demo) { demo = false; S.items = []; hist.length = 0; } snap(); load(k);
    const n = S.items.length; const beton = PROD[k].cat === 'beton';
    let fx = x, fy = y; if (fx == null || fy == null) { const f = freeSpot(k); if (f) { fx = fx ?? f[0]; fy = fy ?? f[1]; } }
    const it = { k, x: fx ?? clamp(.5 + ((n % 5) - 2) * .12, .15, .85), y: fy ?? clamp((beton ? .8 : .86) - (n % 3) * .05, S.hz + .1, .97), s: 1, flip: false, bri: 0, z: ++zc };
    S.items.push(it); sel = S.items.length - 1; persist(); draw();
    return it;
  }
  const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
  // Handy: Wischen über leere Bildfläche scrollt die Seite weiter – nur wer ein Möbel (oder den Griff) berührt, verschiebt es
  cv.addEventListener('touchstart', e => {
    const t = e.touches[0], [px, py] = pt(t);
    let grab = hit(px, py) >= 0 || (e.touches.length > 1 && sel >= 0);
    if (!grab && sel >= 0) { const [hx, hy] = handle(geo(S.items[sel])); grab = Math.hypot(px - hx, py - hy) < 28; }
    if (grab && e.cancelable) e.preventDefault();
  }, { passive: false });
  const ptrs = new Map(); let act = null;
  cv.addEventListener('pointerdown', e => {
    touch(); cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, pt(e));
    if (ptrs.size === 2 && sel >= 0) { const [a, b] = [...ptrs.values()]; act = { t: 'pinch', d0: Math.hypot(a[0] - b[0], a[1] - b[1]), s0: S.items[sel].s }; return; }
    const [px, py] = pt(e);
    if (sel >= 0) { const g = geo(S.items[sel]), [hx, hy] = handle(g); if (Math.hypot(px - hx, py - hy) < (e.pointerType === 'touch' ? 28 : 22)) { snap(); act = { t: 'scale', s0: S.items[sel].s, d0: Math.hypot(px - g.cx, py - g.by) || 1, cx: g.cx, by: g.by }; return; } }
    const i = hit(px, py);
    if (i >= 0) { sel = i; snap(); demo = false; const it = S.items[i]; act = { t: 'move', dx: px - it.x * W, dy: py - it.y * H }; it.z = ++zc; }
    else { sel = -1; act = null; }
    draw();
  });
  cv.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) { const [px, py] = pt(e); let c = hit(px, py) >= 0 ? 'grab' : 'default'; if (sel >= 0) { const [hx, hy] = handle(geo(S.items[sel])); if (Math.hypot(px - hx, py - hy) < 22) c = 'nwse-resize'; } cv.style.cursor = c; return; }
    ptrs.set(e.pointerId, pt(e)); if (!act || sel < 0) return;
    const it = S.items[sel];
    if (act.t === 'pinch' && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; it.s = clamp(act.s0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / act.d0, .2, 4); }
    else if (act.t === 'move') { const [px, py] = pt(e); it.x = clamp((px - act.dx) / W, -.1, 1.1); it.y = clamp((py - act.dy) / H, S.depth ? S.hz + .02 : .05, 1.15); }
    else if (act.t === 'scale') { const [px, py] = pt(e); it.s = clamp(act.s0 * Math.hypot(px - act.cx, py - act.by) / act.d0, .2, 4); }
    draw();
  });
  const end = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2 && act && act.t === 'pinch') act = null; if (!ptrs.size) { if (act) persist(); act = null; } };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('wheel', e => { if (sel < 0) return; const [px, py] = pt(e); if (hit(px, py) !== sel) return; e.preventDefault(); const it = S.items[sel]; it.s = clamp(it.s * (e.deltaY < 0 ? 1.06 : 1 / 1.06), .2, 4); persist(); draw(); }, { passive: false });
  addEventListener('keydown', e => {
    if (!stage.contains(document.activeElement) && document.activeElement !== cv && document.activeElement !== document.body) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { undo(); e.preventDefault(); return; }
    if (sel < 0) return; const it = S.items[sel];
    if (e.key === 'Delete' || e.key === 'Backspace') { act0('del'); e.preventDefault(); }
    const mv = { ArrowLeft: [-.01, 0], ArrowRight: [.01, 0], ArrowUp: [0, -.01], ArrowDown: [0, .01] }[e.key];
    if (mv && document.activeElement === cv) { it.x += mv[0]; it.y = clamp(it.y + mv[1], S.hz + .02, 1.15); draw(); e.preventDefault(); }
  });
  cv.tabIndex = 0;
  function act0(a) {
    if (sel < 0) return; const it = S.items[sel]; snap(); demo = false;
    if (a === 'flip') it.flip = !it.flip;
    if (a === 'front') it.z = ++zc;
    if (a === 'back') it.z = Math.min(...S.items.map(x => x.z)) - 1;
    if (a === 'dup') { const c = Object.assign({}, it, { x: it.x + .06, y: Math.min(1.1, it.y + .02), z: ++zc }); S.items.push(c); sel = S.items.length - 1; }
    if (a === 'del') { S.items.splice(sel, 1); sel = -1; }
    persist(); draw();
  }
  $$('[data-act]', tool).forEach(b => b.addEventListener('click', () => { touch(); act0(b.dataset.act); }));
  const bri = $('[data-bri]'); bri.addEventListener('pointerdown', () => snap()); bri.addEventListener('input', () => { if (sel >= 0) { S.items[sel].bri = +bri.value; draw(); } }); bri.addEventListener('change', persist);
  $('label', tool).addEventListener('click', e => { if (e.target.tagName !== 'INPUT') e.currentTarget.classList.toggle('open'); });
  function undo() { if (!hist.length) return; S.items = JSON.parse(hist.pop()); sel = -1; persist(); draw(); }
  $('[data-undo]').addEventListener('click', () => { touch(); undo(); });
  $('[data-clear]').addEventListener('click', () => { touch(); if (!S.items.length) return; snap(); S.items = []; sel = -1; demo = false; persist(); draw(); });

  /* ---------- Szenen, Foto, Sonne, Optionen ---------- */
  $$('[data-scene]').forEach(b => b.addEventListener('click', () => { touch(); S.scene = b.dataset.scene; photo = null; $$('[data-scene]').forEach(x => x.classList.toggle('on', x === b)); persist(); resize(); }));
  $('[data-upload]').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return; touch();
    try {
      let bmp; try { bmp = await createImageBitmap(f, { imageOrientation: 'from-image' }); } catch (er) { bmp = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(f); }); }
      const mx = 2200, r = Math.min(1, mx / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas'); c.width = Math.round(bmp.width * r); c.height = Math.round(bmp.height * r); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      photo = c; S.scene = 'photo'; $$('[data-scene]').forEach(x => x.classList.remove('on')); resize(); toast(tx('photoOk'));
      hzEl.classList.add('on'); setTimeout(() => hzEl.classList.remove('on'), 3500);
    } catch (er) { }
    e.target.value = '';
  });
  const sunIn = $('[data-sun]'), sunOut = $('[data-sunout]');
  const sunTxt = () => { const h = Math.floor(S.sun), m = Math.round((S.sun - h) * 60); sunOut.textContent = `${h}:${String(m).padStart(2, '0')}`; };
  sunIn.value = S.sun; sunTxt();
  let sunUser = false;
  sunIn.addEventListener('input', () => { touch(); sunUser = true; S.sun = +sunIn.value; sunTxt(); bgCache = null; draw(); }); sunIn.addEventListener('change', persist);
  const dep = $('[data-depth]'), shd = $('[data-shadows]'); dep.checked = S.depth; shd.checked = S.shadows;
  dep.addEventListener('change', () => { touch(); S.depth = dep.checked; persist(); draw(); }); shd.addEventListener('change', () => { touch(); S.shadows = shd.checked; persist(); draw(); });
  // Horizont ziehen
  const setHz = () => stage.style.setProperty('--hz', (S.hz * 100) + '%'); setHz();
  let hzDrag = null;
  hzEl.addEventListener('pointerdown', e => { touch(); hzDrag = e.pointerId; hzEl.setPointerCapture(e.pointerId); hzEl.classList.add('on'); e.stopPropagation(); });
  hzEl.addEventListener('pointermove', e => { if (hzDrag !== e.pointerId) return; const r = stage.getBoundingClientRect(); S.hz = clamp((e.clientY - r.top) / r.height, .12, .75); setHz(); bgCache = null; draw(); });
  hzEl.addEventListener('pointerup', () => { hzDrag = null; hzEl.classList.remove('on'); persist(); });

  /* ---------- Ablage: antippen oder ins Bild ziehen ---------- */
  $$('.pl-cats [data-cat]').forEach(b => b.addEventListener('click', () => { trayTouched = true; $$('.pl-cats [data-cat]').forEach(x => x.classList.toggle('on', x === b)); const c = b.dataset.cat; $$('[data-add]').forEach(t => t.hidden = !(c === 'all' || t.dataset.cat === c)); trayEl.scrollLeft = 0; trayEdge(); }));
  // Möbel-Leiste: Pfeile + Auslaufkanten, einmal kurz anschieben – damit klar ist, dass es noch mehr gibt
  const trayEl = $('[data-tray]'), trayBox = $('.pl-tray'); let trayTouched = false;
  function trayEdge() { const m = trayEl.scrollWidth - trayEl.clientWidth; trayBox.classList.toggle('tr-s', trayEl.scrollLeft > 4); trayBox.classList.toggle('tr-e', trayEl.scrollLeft < m - 4); }
  trayEl.addEventListener('scroll', trayEdge, { passive: true }); addEventListener('resize', trayEdge); trayEdge();
  $$('[data-trs]').forEach(b => b.addEventListener('click', () => { trayTouched = true; trayEl.scrollBy({ left: +b.dataset.trs * Math.max(160, trayEl.clientWidth * .75), behavior: 'smooth' }); }));
  trayEl.addEventListener('pointerdown', () => { trayTouched = true; }); trayEl.addEventListener('wheel', () => { trayTouched = true; }, { passive: true });
  function trayNudge() { if (RM || trayTouched || trayEl.scrollWidth <= trayEl.clientWidth + 8) return; trayEl.scrollTo({ left: Math.min(220, trayEl.scrollWidth - trayEl.clientWidth), behavior: 'smooth' }); setTimeout(() => { if (!trayTouched) trayEl.scrollTo({ left: 0, behavior: 'smooth' }); }, 1200); }
  $$('[data-add]').forEach(t => {
    let st = null, ghost = null;
    t.addEventListener('pointerdown', e => { st = { x: e.clientX, y: e.clientY, id: e.pointerId, drag: false }; });
    t.addEventListener('pointermove', e => {
      if (!st || e.pointerId !== st.id) return; const dx = e.clientX - st.x, dy = e.clientY - st.y;
      if (!st.drag && (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 1.1 || (e.pointerType === 'mouse' && Math.hypot(dx, dy) > 8))) {
        st.drag = true; try { t.setPointerCapture(e.pointerId); } catch (er) {}
        ghost = document.createElement('img'); ghost.src = $('img', t).src; ghost.className = 'ghost'; document.body.appendChild(ghost);
      }
      if (st.drag && ghost) { ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px'; e.preventDefault(); }
    });
    const fin = e => {
      if (!st) return;
      if (st.drag) { const r = cv.getBoundingClientRect(); if (e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) { touch(); const [px, py] = pt(e); add(t.dataset.add, px / W, clamp(py / H + .06, S.hz + .05, 1.05)); } }
      if (ghost) ghost.remove(); ghost = null; t._dragged = st.drag; st = null;
    };
    t.addEventListener('pointerup', fin); t.addEventListener('pointercancel', e => { if (ghost) ghost.remove(); ghost = null; st = null; });
    t.addEventListener('click', () => { if (t._dragged) { t._dragged = false; return; } touch(); add(t.dataset.add); t.classList.remove('added'); void t.offsetWidth; t.classList.add('added'); stage.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
  });

  /* ---------- Export ---------- */
  async function compose() {
    const ew = Math.min(1800, Math.max(1200, W * 2)), eh = Math.round(ew * H / W), bar = Math.round(ew * .05);
    const c = document.createElement('canvas'); c.width = ew; c.height = eh + bar; const x = c.getContext('2d');
    render(x, ew, eh, true);
    x.fillStyle = '#1a120c'; x.fillRect(0, eh, ew, bar); x.fillStyle = '#f4ebdc'; x.font = `400 ${Math.round(bar * .42)}px Gloock, Georgia, serif`; x.textBaseline = 'middle'; x.fillText('Der Garten-Traum', bar * .45, eh + bar / 2);
    x.font = `500 ${Math.round(bar * .26)}px Familjen, sans-serif`; x.fillStyle = '#d8c6ad'; x.textAlign = 'right'; x.fillText(tx('footer').replace('Der Garten-Traum · ', ''), ew - bar * .45, eh + bar / 2);
    draw(); return c;
  }
  const blob = async () => { const c = await compose(); return new Promise(r => c.toBlob(r, 'image/jpeg', .88)); };
  $('[data-save]').addEventListener('click', async () => { if (!S.items.length) { toast(tx('need')); return; } const c = await compose(); const a = document.createElement('a'); a.download = 'mein-garten-traum.jpg'; a.href = c.toDataURL('image/jpeg', .9); document.body.appendChild(a); a.click(); a.remove(); toast(tx('saved')); });
  $('[data-share]').addEventListener('click', async () => {
    if (!S.items.length) { toast(tx('need')); return; }
    const b = await blob(), f = new File([b], 'mein-garten-traum.jpg', { type: 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title: 'Der Garten-Traum', text: tx('share') + '\n' + summary() }); } catch (e) {} }
    else { const a = document.createElement('a'); a.download = 'mein-garten-traum.jpg'; a.href = URL.createObjectURL(b); a.click(); window.open((G.wa || 'https://wa.me/4917647161931') + '?text=' + encodeURIComponent(tx('share') + ':\n' + summary()), '_blank', 'noopener'); }
  });
  function summary(lang) { const pl = (lang || L()) === 'pl', c = {}; S.items.forEach(it => c[it.k] = (c[it.k] || 0) + 1); return Object.entries(c).map(([k, n]) => `${n}× ${pl ? (PROD[k].pl || PROD[k].n) : PROD[k].n}`).join(', '); }
  const API = { add: k => { touch(); add(k); }, hasItems: () => !demo && S.items.length > 0, summary, getBlob: blob, attach: false };
  window.GTP = API;
  $('[data-plsend]').addEventListener('click', async e => {
    e.preventDefault(); if (!S.items.length) { toast(tx('need')); return; }
    const c = await compose(); const pv = document.querySelector('[data-koprev]'); if (pv) { document.querySelector('[data-koimg]').src = c.toDataURL('image/jpeg', .8); pv.hidden = false; }
    API.attach = true;
    if (window.GTprefill) window.GTprefill((L() === 'pl' ? 'Mój projekt ogrodu: ' : 'Mein Garten-Entwurf: ') + summary(), ['Gartenmöbel aus Eiche']);
    toast(tx('sendOk'));
  });
  const kd = document.querySelector('[data-kodrop]'); if (kd) kd.addEventListener('click', () => { API.attach = false; document.querySelector('[data-koprev]').hidden = true; });
  document.addEventListener('gt-lang', () => { list(); });

  const rkey = () => avail() + '|' + (innerWidth < 640 ? 0 : innerHeight);
  let rw = ''; addEventListener('resize', () => { const k = rkey(); if (k !== rw) { rw = k; resize(); } });
  const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { io.disconnect(); rw = rkey(); resize(); if (!S.items.length) { seeding = true; add('set4', .4, .86); add('adler', .78, .74); seeding = false; sel = -1; hist.length = 0; demo = true; persist(); draw(); } } }, { rootMargin: '400px' });
  io.observe(stage);
  /* ---------- Impuls beim ersten Sichtkontakt: Sonne wandert einmal, eine Hand schiebt den Tisch, die Leiste rollt an ---------- */
  function demoRun() {
    if (RM || touched) return;
    const t0 = performance.now(), s0 = S.sun, it = S.items[0], x0 = it ? it.x : 0; let done = false, demoSel = false;
    const stop = () => {
      if (done) return; done = true; hand.classList.remove('on');
      if (!sunUser && S.sun !== s0) { S.sun = s0; sunIn.value = s0; sunTxt(); bgCache = null; }
      if (it && S.items.includes(it) && !act) it.x = x0;
      if (demoSel && !act) sel = -1; draw();
      const up = $('.pl-up'); if (up && !touched) up.classList.add('pulse');
    };
    const step = now => {
      if (done) return; if (touched) { stop(); return; }
      const t = (now - t0) / 1000;
      if (t < 2.1) { S.sun = s0 + Math.sin(t / 2.1 * Math.PI) * 3.6; sunIn.value = S.sun; sunTxt(); bgCache = null; }
      else if (S.sun !== s0) { S.sun = s0; sunIn.value = s0; sunTxt(); bgCache = null; }
      if (it && S.items.includes(it) && t >= 2.3 && t < 5.6) {
        const k = (t - 2.3) / 3.3, push = clamp((k - .16) / .68, 0, 1);
        it.x = x0 + Math.sin(push * Math.PI) * .15;
        if (k > .12 && k < .9) { sel = S.items.indexOf(it); demoSel = true; } else if (demoSel) { sel = -1; demoSel = false; }
        const g = geo(it); if (g) hand.style.transform = `translate(${g.cx}px,${g.y + g.h * .5}px)`;
        hand.classList.toggle('on', k > .03 && k < .94);
      }
      if (t >= 5.8) { stop(); return; }
      draw(); requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const io2 = new IntersectionObserver(([en]) => { if (en.isIntersecting) { io2.disconnect(); setTimeout(demoRun, 700); setTimeout(trayNudge, 6600); } }, { threshold: .55 });
  io2.observe(stage);
  if (S.scene !== 'photo') $$('[data-scene]').forEach(x => x.classList.toggle('on', x.dataset.scene === S.scene)); else S.scene = 'rasen';
})();
