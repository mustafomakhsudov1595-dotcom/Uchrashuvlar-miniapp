/* Saydana — namunaviy tibbiy tasvirlar (kompyuterda yaratilgan illyustratsiyalar, haqiqiy bemor suratlari emas):
   MRT, MSKT, rentgen, UZI, exo-KG, FGDS, EKG, laboratoriya. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- shovqin ---------- */
  function hash(x, y, z) {
    var h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
  }
  function sm(t) { return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ss(a, b, x) { var t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
  function vnoise(x, y, z) {
    var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi);
    return lerp(
      lerp(lerp(hash(xi, yi, zi), hash(xi + 1, yi, zi), xf), lerp(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), xf), yf),
      lerp(lerp(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), xf), lerp(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), xf), yf), zf);
  }
  function fbm(x, y, z) { return vnoise(x, y, z) * .55 + vnoise(x * 2.1, y * 2.1, z * 2.1) * .3 + vnoise(x * 4.3, y * 4.3, z * 4.3) * .15; }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  var buf = {}; // o'lcham bo'yicha ImageData
  function image(ctx, N) { var k = N; if (!buf[k] || buf[k].ctx !== ctx) buf[k] = { ctx: ctx, d: ctx.createImageData(N, N) }; return buf[k].d; }
  function gray(d, p, v) { v = clamp01(v); d[p] = v * 236; d[p + 1] = v * 241; d[p + 2] = v * 255; d[p + 3] = 255; }

  /* ---------- MRT / MSKT: bosh miya kesimi ---------- */
  function brain(ctx, N, slice, ct) {
    var TOTAL = 24, s = (slice - 1) / (TOTAL - 1);
    var sc = .38 + .62 * Math.pow(Math.max(Math.sin(Math.PI * (.1 + .8 * s)), 0), .55);
    var vent = Math.max(0, 1 - Math.abs(s - .52) * 3.4);
    var z = slice * .33, im = image(ctx, N), d = im.data, p = 0;
    var SCALP = ct ? .36 : .62, SKULL = ct ? .96 : .07, CSF = ct ? .2 : .86;
    for (var y = 0; y < N; y++) {
      var v = (.5 - y / N) * 2;
      for (var x = 0; x < N; x++) {
        var u = (x / N - .5) * 2, val = 0;
        var ex = u / (.8 * sc), ey = (v + .02) / (.95 * sc), r = Math.sqrt(ex * ex + ey * ey);
        if (r < 1.02) {
          var rr = r > .79 ? 1 : r / .79, br;
          if (rr < 1 || r < .82) {
            var nx = u / sc * 6.4, ny = v / sc * 6.4;
            var wx = vnoise(nx + 3.1, ny + 1.7, z) - .5, wy = vnoise(nx - 2.3, ny + 5.2, z) - .5;
            var n = fbm(nx + wx * 1.5, ny + wy * 1.5, z * .8), t = Math.abs(n - .5) * 2;
            var bnd = .6 + (vnoise(nx * .7, ny * .7, z + 7) - .5) * .28, gm = ss(bnd - .06, bnd + .06, rr);
            var sulc = (1 - ss(0, .11, t)) * ss(.5, .78, rr);
            if (ct) br = (.47 + (n - .5) * .07 + gm * .025) * (1 - sulc * .3) + .09 * sulc;
            else {
              br = lerp(.33 + (n - .5) * .1, .55 + (n - .5) * .16, gm);
              br = lerp(br, .7, sulc * .8);
              if (Math.abs(ex) < .02) br = lerp(br, .26, (1 - ss(.005, .02, Math.abs(ex))) * ss(.3, .5, rr));
            }
            if (vent > .05) {
              var dx = (Math.abs(ex) - .13) / (.075 * vent + .001), dy = (ey - .04) / (.18 * vent + .001), vd = Math.sqrt(dx * dx + dy * dy);
              br = lerp(br, ct ? .2 : .9, (1 - ss(.7, 1.05, vd)) * ss(.05, .25, vent));
            }
          } else br = CSF;
          val = br;
          val = lerp(val, CSF, ss(.775, .805, r));
          val = lerp(val, SKULL, ss(.825, .855, r));
          val = lerp(val, SCALP + (hash(x >> 1, y >> 1, slice) - .5) * (ct ? 0 : .08), ss(.915, .945, r));
          val = lerp(val, 0, ss(.98, 1.0, r));
          if (val > .02) val += (hash(x, y, slice) - .5) * .05;
        }
        gray(d, p, val); p += 4;
      }
    }
    ctx.putImageData(im, 0, 0);
  }

  /* ---------- Rentgen: ko'krak qafasi ---------- */
  function xray(ctx, N) {
    var im = image(ctx, N), d = im.data, p = 0;
    for (var y = 0; y < N; y++) {
      var v = (.5 - y / N) * 2;
      for (var x = 0; x < N; x++) {
        var u = (x / N - .5) * 2, au = Math.abs(u), val = .02;
        // tana silueti (yelka va bo'yin silliq o'tadi)
        var w0 = .86 * Math.sqrt(Math.max(0, 1 - Math.pow((Math.min(v, .45) + .08) / .98, 2)));
        var wv = v < .45 ? w0 : lerp(w0, .17, ss(.45, .88, v));
        var sil = v < -.9 || v > 1 ? 0 : 1 - ss(wv * .95, wv, au);
        if (sil > 0) {
          var tissue = .3 + .05 * fbm(u * 3, v * 3, 2);
          // o'pka
          var lr = Math.sqrt(Math.pow((u + .34) / .27, 2) + Math.pow((v - .06) / .52, 2));
          var ll = Math.sqrt(Math.pow((u - .34) / .25, 2) + Math.pow((v - .08) / .5, 2));
          var lung = Math.max(1 - ss(.82, 1, lr), 1 - ss(.82, 1, ll));
          var vessels = Math.abs(fbm(u * 5 + (u > 0 ? 3 : 0), v * 5, 7) - .5) * 2;
          var lungV = .1 + .05 * (1 - ss(0, .25, vessels)) + .03 * fbm(u * 9, v * 9, 4);
          tissue = lerp(tissue, lungV, lung);
          // yurak va o'rta soya
          var hr = Math.sqrt(Math.pow((u - .13) / .24, 2) + Math.pow((v + .16) / .27, 2));
          tissue = lerp(tissue, .52, (1 - ss(.85, 1.05, hr)) * .9);
          tissue = lerp(tissue, .36, (1 - ss(.08, .13, au)) * ss(-.55, -.3, v) * (1 - ss(.55, .75, v)));
          if (v > .25 && au < .03) tissue = lerp(tissue, .1, .8); // traxeya
          // diafragma ostidagi a'zolar
          tissue = lerp(tissue, .42, ss(-.38, -.55, v));
          // umurtqa
          if (au < .045) tissue += .16 + .05 * Math.sin(v * 52) + .08 * (1 - ss(.01, .045, au));
          // qovurg'alar (yoysimon, turli oraliq)
          if (au > .09 && au < .84 && v > -.55 && v < .72) {
            var q = v + .55 * Math.pow(au, .8) + .035 * Math.sin(au * 6), per = .15, ph = ((q + 1.3) % per + per) % per, dist = Math.abs(ph - per / 2);
            var rib = (1 - ss(.007, .02, dist)) * (1 - ss(.55, .84, au)) * ss(.09, .24, au);
            tissue += rib * (.11 + .04 * fbm(u * 7, v * 7, 1));
          }
          // o'mrov suyagi
          var cq = v - (.62 - .1 * au);
          if (au > .06 && au < .8 && Math.abs(cq) < .028) tissue += .16 * (1 - ss(.01, .026, Math.abs(cq))) * (1 - ss(.6, .8, au));
          val = lerp(.02, tissue, sil);
          val += (hash(x, y, 5) - .5) * .045;
        }
        gray(d, p, val); p += 4;
      }
    }
    ctx.putImageData(im, 0, 0);
  }

  /* ---------- UZI / exo-KG: sektor tasvir ---------- */
  function sector(ctx, N, t, echo) {
    var im = image(ctx, N), d = im.data, p = 0, z = t * 1.4;
    var phase = t * 2 * Math.PI * 1.2, beat = Math.cos(phase);
    for (var y = 0; y < N; y++) {
      for (var x = 0; x < N; x++) {
        var u = (x / N - .5) * 2, vv = y / N + .04, val = 0;
        var r = Math.sqrt(u * u * .7 + vv * vv), ang = Math.atan2(u * .7, vv) * 57.3;
        if (Math.abs(ang) < 38 && r > .07 && r < .98) {
          var sp = vnoise(x * .55, y * .55, z) * .7 + hash(x, y, Math.floor(z * 3)) * .3;
          sp = Math.pow(sp, 1.5) * 1.1;
          var echoLevel = .26 + .24 * fbm(u * 2.4, vv * 2.4, 3), shape = 1;
          if (echo) {
            var s = 1 + .12 * beat, a = 1 - .12 * beat;
            var lv = Math.pow((u - .22) / (.17 * s), 2) + Math.pow((vv - .4) / (.27 * s), 2);
            var rv = Math.pow((u + .2) / (.15 * s), 2) + Math.pow((vv - .38) / (.25 * s), 2);
            var la = Math.pow((u - .2) / (.15 * a), 2) + Math.pow((vv - .73) / (.12 * a), 2);
            var ra = Math.pow((u + .2) / (.15 * a), 2) + Math.pow((vv - .73) / (.12 * a), 2);
            var chamber = Math.min(lv, rv, la, ra);
            var wall = Math.max(1 - ss(1, 1.9, Math.min(lv, rv)), 0) * 0;
            shape = lerp(.16, 1, ss(.8, 1.1, chamber));
            if (chamber > 1 && chamber < 3) echoLevel += .36 * (1 - ss(1, 3, chamber));
            if (Math.abs(u) < .014 && vv > .14 && vv < .88) echoLevel += .38;
            if (Math.abs(vv - .575 - .02 * beat) < .011 && Math.abs(u) < .4) echoLevel += .4;
            if (wall) echoLevel += wall;
          } else {
            var gb = Math.pow((u - .02) / .24, 2) + Math.pow((vv - .42) / .15, 2);
            shape = lerp(.1, 1, ss(.85, 1.1, gb));
            if (gb > 1 && gb < 1.5) echoLevel += .2;
            if (vv > .5 && Math.abs(u) < .26) echoLevel *= 1.28; // orqa kuchayish
            if (r > .82 && r < .86) echoLevel += .35 * (1 - Math.abs(r - .84) / .02);
          }
          val = (echoLevel * shape * (.35 + sp)) * Math.exp(-r * 1.1) * 1.55;
        }
        gray(d, p, val); p += 4;
      }
    }
    ctx.putImageData(im, 0, 0);
    // chizma: apeks va masshtab
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    for (var i = 1; i <= 5; i++) ctx.fillRect(N - 8, N * (.12 + i * .15), 4, 1);
  }

  /* ---------- FGDS: endoskopik ko'rinish ---------- */
  function endo(ctx, N, t) {
    var im = image(ctx, N), d = im.data, p = 0;
    for (var y = 0; y < N; y++) {
      var v = (y / N - .5) * 2;
      for (var x = 0; x < N; x++) {
        var u = (x / N - .5) * 2, r = Math.sqrt(u * u + v * v), a = Math.atan2(v, u), R = 0, G = 0, B = 0;
        if (r < .985) {
          var depth = 1 / (r + .16), zz = depth * .9 - t * 1.1;
          var ring = .5 + .5 * Math.sin(zz * 6.4 + fbm(Math.cos(a) * 2 + 4, Math.sin(a) * 2 + 4, zz * .3) * 4);
          var fold = .5 + .5 * Math.sin(a * 9 + fbm(a * 2, zz * .5, 1) * 5);
          var shade = Math.pow(ss(.03, .92, r), .62) * (.22 + .9 * (ring * .55 + fold * .45));
          var spec = Math.pow(Math.max(0, Math.sin(zz * 6.4 + 1.3)), 10) * ss(.18, .6, r) * (.5 + .8 * vnoise(a * 3, zz, 2));
          R = 240 * shade + 255 * spec * .7; G = 100 * shade + 220 * spec * .7; B = 86 * shade + 205 * spec * .6;
          var edge = 1 - ss(.9, .985, r); R *= edge; G *= edge; B *= edge;
        }
        d[p] = R > 255 ? 255 : R; d[p + 1] = G > 255 ? 255 : G; d[p + 2] = B > 255 ? 255 : B; d[p + 3] = 255; p += 4;
      }
    }
    ctx.putImageData(im, 0, 0);
  }

  /* ---------- EKG ---------- */
  function ecgWave(ph) {
    function g(c, w, a) { var x = (ph - c) / w; return a * Math.exp(-x * x); }
    return g(.12, .03, .13) + g(.265, .008, -.12) + g(.3, .0085, 1) + g(.335, .01, -.26) + g(.56, .05, .3);
  }
  function ecg(ctx, N, t) {
    ctx.fillStyle = '#0B0B10'; ctx.fillRect(0, 0, N, N);
    var step = N / 28;
    ctx.lineWidth = 1;
    for (var i = 0; i <= 28; i++) { ctx.strokeStyle = i % 5 === 0 ? 'rgba(247,13,69,.28)' : 'rgba(247,13,69,.1)'; ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, N); ctx.moveTo(0, i * step); ctx.lineTo(N, i * step); ctx.stroke(); }
    var beats = 2.6, off = (t * .55) % 1;
    function Y(x) { var ph = (((x / N) * beats - off) % 1 + 1) % 1; return N * .6 - ecgWave(ph) * N * .38; }
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.shadowColor = '#F70D45'; ctx.shadowBlur = N * .04; ctx.strokeStyle = '#ff5c85'; ctx.lineWidth = Math.max(2, N * .014);
    var head = ((t * .55 * N / beats) % N);
    ctx.beginPath(); var started = false;
    for (var x = 0; x <= N; x += 1.5) { if (x > head - 2 && x < head + N * .06) { started = false; continue; } if (!started) { ctx.moveTo(x, Y(x)); started = true; } else ctx.lineTo(x, Y(x)); }
    ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(head, Y(head), N * .014, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = (N * .06 | 0) + 'px "IBM Plex Mono",monospace'; ctx.fillText('72 BPM', N * .06, N * .12);
  }

  /* ---------- Laboratoriya ---------- */
  function lab(ctx, N, t) {
    var g = ctx.createLinearGradient(0, 0, 0, N); g.addColorStop(0, '#1b1b25'); g.addColorStop(1, '#0B0B10');
    ctx.fillStyle = g; ctx.fillRect(0, 0, N, N);
    var colors = ['#F70D45', '#FF8FA9', '#FFB020', '#d90b3c', '#ffd2dc'], tw = N * .13, gap = N * .045, x0 = (N - (5 * tw + 4 * gap)) / 2, top = N * .22, h = N * .62;
    for (var i = 0; i < 5; i++) {
      var x = x0 + i * (tw + gap), lvl = .45 + .18 * Math.sin(t * 1.3 + i * 1.4), y = top + h * (1 - lvl);
      ctx.fillStyle = colors[i]; ctx.globalAlpha = .9;
      ctx.beginPath(); ctx.moveTo(x + 2, y);
      for (var k = 0; k <= 10; k++) ctx.lineTo(x + 2 + (tw - 4) * k / 10, y + Math.sin(t * 3 + k * .9 + i) * 1.4);
      ctx.lineTo(x + tw - 2, top + h - tw / 2); ctx.arc(x + tw / 2, top + h - tw / 2, tw / 2 - 2, 0, Math.PI, false); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + h - tw / 2); ctx.arc(x + tw / 2, top + h - tw / 2, tw / 2, Math.PI, 0, true); ctx.lineTo(x + tw, top); ctx.stroke();
      ctx.fillStyle = i % 2 ? '#fff' : '#F70D45'; ctx.fillRect(x - 3, top - N * .05, tw + 6, N * .05);
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x + 4, top + 6, 3, h * .7);
    }
    var dx = x0 + 2 * (tw + gap) + tw / 2, dy = ((t * .9) % 1) * (top + h * .3 - N * .06) + N * .04;
    ctx.fillStyle = '#F70D45'; ctx.beginPath(); ctx.arc(dx, dy, N * .018, 0, 7); ctx.fill();
  }

  var KINDS = {
    mr:   { code: 'MR',  label: 'MRT',          fps: 8,  slices: true },
    ct:   { code: 'CT',  label: 'MSKT',         fps: 8,  slices: true },
    xray: { code: 'DX',  label: 'Rentgen',      fps: 0 },
    us:   { code: 'US',  label: 'UZI',          fps: 10 },
    echo: { code: 'US',  label: 'Exokardiografiya', fps: 14 },
    endo: { code: 'ES',  label: 'FGDS',         fps: 16 },
    ecg:  { code: 'ECG', label: 'EKG',          fps: 30 },
    lab:  { code: 'LAB', label: 'Laboratoriya', fps: 24 }
  };
  var SLICE_MIN = 4, SLICE_MAX = 21;
  function sliceAt(t) { var span = SLICE_MAX - SLICE_MIN, c = (t * 2.1) % (span * 2); return Math.round(SLICE_MIN + (c < span ? c : span * 2 - c)); }

  function draw(kind, ctx, N, t, opt) {
    opt = opt || {};
    switch (kind) {
      case 'mr': brain(ctx, N, opt.slice || sliceAt(t), false); break;
      case 'ct': brain(ctx, N, opt.slice || sliceAt(t + 3), true); break;
      case 'xray': xray(ctx, N); break;
      case 'us': sector(ctx, N, t, false); break;
      case 'echo': sector(ctx, N, t, true); break;
      case 'endo': endo(ctx, N, t); break;
      case 'ecg': ecg(ctx, N, t); break;
      case 'lab': lab(ctx, N, t); break;
    }
  }

  /* ---------- umumiy animatsiya sikli ---------- */
  var items = [], running = false, t0 = performance.now();
  function frame(now) {
    var t = (now - t0) / 1000, any = false;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it.visible || document.hidden) continue;
      var k = KINDS[it.kind], fps = it.fps != null ? it.fps : k.fps;
      if (!it.drawn || (!reduce && fps && now - it.last >= 1000 / fps)) {
        it.last = now; it.drawn = true; draw(it.kind, it.ctx, it.N, t, it.opt);
      }
      if (fps && !reduce) any = true;
    }
    running = false;
    if (any || items.some(function (x) { return x.visible && !x.drawn; })) schedule();
  }
  function schedule() { if (!running) { running = true; requestAnimationFrame(frame); } }
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { var it = e.target.__scan; if (it) { it.visible = e.isIntersecting; if (it.visible) schedule(); } });
  }, { threshold: .05 }) : null;

  function mount(canvas, kind, o) {
    o = o || {};
    var N = o.N || canvas.width, ctx = canvas.getContext('2d');
    if (!ctx) return null;
    canvas.width = N; canvas.height = N;
    var it = { canvas: canvas, ctx: ctx, N: N, kind: kind, opt: o.opt || {}, fps: o.fps, last: 0, drawn: false, visible: !io };
    canvas.__scan = it; items.push(it);
    if (io) io.observe(canvas);
    schedule();
    return {
      setKind: function (k) { it.kind = k; it.drawn = false; schedule(); },
      redraw: function () { it.drawn = false; schedule(); }
    };
  }

  window.Scan = { kinds: KINDS, draw: draw, mount: mount };
})();
