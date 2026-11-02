/* Irodamed — namunaviy tibbiy tasvirlar (kompyuterda yaratilgan illyustratsiyalar, haqiqiy bemor suratlari emas) */
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


  window.Scan = { draw: function (kind, ctx, N, t) { if (kind === 'us') sector(ctx, N, t, false); else if (kind === 'echo') sector(ctx, N, t, true); else if (kind === 'ecg') ecg(ctx, N, t); } };
})();
