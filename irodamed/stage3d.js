/* Irodamed — xizmatlar bo'yicha 3D modellar (Three.js, tayyor model fayllarsiz) */
(function () {
  'use strict';
  var host = document.getElementById('stage'), cv = document.getElementById('gl');
  if (!host || !cv) return;
  var wrap = host.closest('.svc-stage');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var MODELS = {
    us:    { cap: "UZI · Doppler · Exo-EG · Elastografiya", yaw: -.5 },
    heart: { cap: "EKG · Exokardiografiya", yaw: -.12 },
    lab:   { cap: "Laboratoriya", yaw: -.32 },
    colpo: { cap: "Kolposkopiya", yaw: -.55 }
  };
  var OF = { uzi: 'us', doppler: 'us', exoeg: 'us', elasto: 'us', echo: 'heart', ecg: 'heart', lab: 'lab', kolpo: 'colpo' };
  var mode = 'us', gl3 = null;
  var capEl = document.getElementById('stCap');
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.stabs [data-m]'));
  var rows = Array.prototype.slice.call(document.querySelectorAll('.b[data-svc]'));

  function setMode(m, row) {
    if (!MODELS[m]) return;
    mode = m;
    tabs.forEach(function (b) { var on = b.dataset.m === m; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    rows.forEach(function (r) { r.classList.toggle('is-active', r === row); });
    if (capEl) capEl.textContent = MODELS[m].cap;
    if (gl3) gl3.wake();
  }
  tabs.forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.m, null); }); });
  rows.forEach(function (r) {
    var m = OF[r.dataset.svc]; if (!m) return;
    ['mouseenter', 'focus', 'click'].forEach(function (ev) { r.addEventListener(ev, function () { setMode(m, r); }); });
  });

  function noGL() { if (wrap) wrap.classList.add('nogl'); }
  var THREE = window.THREE;
  if (!THREE) { noGL(); return; }
  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { noGL(); return; }
  if (!renderer.getContext()) { noGL(); return; }
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .86;
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
  camera.position.set(0, 1.5, 14.5); camera.lookAt(0, -.2, 0);
  scene.add(new THREE.HemisphereLight(0xf4f2f0, 0xb9b4af, .62));
  var key = new THREE.DirectionalLight(0xffffff, .95); key.position.set(4, 7, 6); scene.add(key);
  var rim = new THREE.PointLight(0xD82820, 1.3, 26); rim.position.set(-6, 2, -3); scene.add(rim);
  var fill = new THREE.PointLight(0xffffff, .45, 22); fill.position.set(6, -1, 5); scene.add(fill);

  var white = new THREE.MeshStandardMaterial({ color: 0xf6f5f3, roughness: .38, metalness: .06 });
  var gray = new THREE.MeshStandardMaterial({ color: 0xc8c6c3, roughness: .5, metalness: .08 });
  var dark = new THREE.MeshStandardMaterial({ color: 0x24242a, roughness: .5, metalness: .25 });
  var redEm = new THREE.MeshStandardMaterial({ color: 0xD82820, emissive: 0xD82820, emissiveIntensity: .55, roughness: .4 });

  function rrect(w, h, r) {
    var s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  }
  function rbox(w, h, d, r, mat) {
    var b = Math.min(r * .6, d * .35);
    var geo = new THREE.ExtrudeGeometry(rrect(w - b * 2, h - b * 2, Math.max(r - b, .01)), { depth: d - b * 2, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 4, curveSegments: 20 });
    geo.center(); return new THREE.Mesh(geo, mat || white);
  }
  function cyl(rt, rb, h, mat, seg) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 40), mat || white); }
  function put(m, x, y, z) { m.position.set(x, y, z); return m; }

  /* ---------- 1. Ultratovush apparati ---------- */
  var usCv = document.createElement('canvas'); usCv.width = 256; usCv.height = 160;
  var usTmp = document.createElement('canvas'); usTmp.width = usTmp.height = 160;
  var usCtx = usCv.getContext('2d'), usTmpCtx = usTmp.getContext('2d');
  var usTex = new THREE.CanvasTexture(usCv); usTex.encoding = THREE.sRGBEncoding;
  function paintUS(t) {
    if (window.Scan) { Scan.draw('us', usTmpCtx, 160, t); usCtx.fillStyle = '#050507'; usCtx.fillRect(0, 0, 256, 160); usCtx.drawImage(usTmp, 48, 0, 160, 160); }
    else { usCtx.fillStyle = '#111'; usCtx.fillRect(0, 0, 256, 160); }
    usCtx.fillStyle = 'rgba(255,255,255,.7)'; usCtx.font = '500 9px Manrope, Arial, sans-serif'; usCtx.fillText('IRODAMED · UZI', 8, 14);
    usCtx.fillStyle = 'rgba(216,40,32,.95)'; usCtx.fillRect(8, 20, 22, 2);
    usTex.needsUpdate = true;
  }
  function makeUS() {
    var g = new THREE.Group();
    g.add(put(rbox(2.3, .22, 1.7, .1, dark), 0, -2.3, 0));
    [[-.95, -.6], [.95, -.6], [-.95, .6], [.95, .6]].forEach(function (p) { var w = cyl(.17, .17, .14, dark, 24); w.rotation.z = Math.PI / 2; g.add(put(w, p[0], -2.52, p[1])); });
    g.add(put(rbox(.6, 1.6, .6, .14, white), 0, -1.4, 0));
    g.add(put(rbox(2.3, .32, 1.45, .15, white), 0, -.52, .12));
    g.add(put(new THREE.Mesh(new THREE.BoxGeometry(1.7, .03, .8), dark), 0, -.34, .3));
    var strip = new THREE.Mesh(new THREE.BoxGeometry(1.2, .05, .02), redEm); g.add(put(strip, 0, -.52, .86));
    g.add(put(cyl(.08, .08, 1.0, gray, 24), 0, -.02, -.5));
    var mon = new THREE.Group();
    mon.add(rbox(2.5, 1.7, .18, .12, white));
    var scr = new THREE.Mesh(new THREE.PlaneGeometry(2.14, 1.34), new THREE.MeshBasicMaterial({ map: usTex }));
    scr.position.z = .1; mon.add(scr);
    mon.position.set(0, 1.0, -.4); mon.rotation.x = -.1; g.add(mon);
    var probe = new THREE.Group();
    var body = new THREE.Mesh(new THREE.CapsuleGeometry(.1, .6, 6, 16), gray); probe.add(body);
    var head = rbox(.42, .16, .24, .06, dark); head.position.y = -.5; probe.add(head);
    var lens = new THREE.Mesh(new THREE.PlaneGeometry(.34, .06), redEm); lens.rotation.x = Math.PI / 2; lens.position.y = -.585; probe.add(lens);
    probe.position.set(1.65, -.15, .45); probe.rotation.z = -.35; g.add(probe); g.userData.probe = probe;
    var curve = new THREE.CatmullRomCurve3([new THREE.Vector3(1.78, .1, .45), new THREE.Vector3(2.1, -.35, .5), new THREE.Vector3(1.7, -.75, .4), new THREE.Vector3(1.15, -.55, .3)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 30, .035, 8, false), dark));
    g.position.y = .24; return g;
  }

  /* ---------- 2. Yurak va EKG ---------- */
  var ecgCv = document.createElement('canvas'); ecgCv.width = ecgCv.height = 192;
  var ecgCtx = ecgCv.getContext('2d');
  var ecgTex = new THREE.CanvasTexture(ecgCv); ecgTex.encoding = THREE.sRGBEncoding;
  function paintECG(t) { if (window.Scan) Scan.draw('ecg', ecgCtx, 192, t); ecgTex.needsUpdate = true; }
  function makeHeart() {
    var g = new THREE.Group();
    var s = new THREE.Shape();
    s.moveTo(.5, .5); s.bezierCurveTo(.5, .5, .4, 0, 0, 0); s.bezierCurveTo(-.6, 0, -.6, .7, -.6, .7);
    s.bezierCurveTo(-.6, 1.1, -.3, 1.54, .5, 1.9); s.bezierCurveTo(1.2, 1.54, 1.6, 1.1, 1.6, .7);
    s.bezierCurveTo(1.6, .7, 1.6, 0, 1, 0); s.bezierCurveTo(.7, 0, .5, .5, .5, .5);
    var geo = new THREE.ExtrudeGeometry(s, { depth: .5, bevelEnabled: true, bevelThickness: .42, bevelSize: .34, bevelSegments: 12, curveSegments: 48 });
    geo.center();
    var mat = new THREE.MeshPhysicalMaterial({ color: 0xC8211A, roughness: .32, metalness: .05, clearcoat: 1, clearcoatRoughness: .2, emissive: 0x2a0200 });
    var heart = new THREE.Mesh(geo, mat); heart.rotation.z = Math.PI; heart.scale.setScalar(1.28); heart.position.set(-.55, .55, 0);
    g.add(heart); g.userData.heart = heart; g.userData.hmat = mat;
    var ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, .016, 12, 120), new THREE.MeshBasicMaterial({ color: 0xD82820, transparent: true, opacity: .55 }));
    ring.position.copy(heart.position); ring.rotation.x = Math.PI / 2.3; g.add(ring); g.userData.ring = ring;
    var panel = new THREE.Group();
    panel.add(rbox(2.45, 2.45, .1, .12, dark));
    var scr = new THREE.Mesh(new THREE.PlaneGeometry(2.25, 2.25), new THREE.MeshBasicMaterial({ map: ecgTex })); scr.position.z = .06; panel.add(scr);
    panel.position.set(2.15, -1.45, .9); panel.rotation.y = -.32; panel.scale.setScalar(.82); g.add(panel); g.userData.panel = panel;
    return g;
  }

  /* ---------- 3. Laboratoriya ---------- */
  function makeLab() {
    var g = new THREE.Group();
    g.add(put(rbox(3.8, .2, 1.2, .1, white), 0, -1.38, 0));
    [-1.75, 1.75].forEach(function (x) { g.add(put(rbox(.18, 1.5, 1.2, .06, white), x, -.6, 0)); });
    var top = new THREE.Shape(); var rr = rrect(3.7, 1.1, .1); top = rr;
    [-1.2, -.6, 0, .6, 1.2].forEach(function (x) { var h = new THREE.Path(); h.absarc(x, 0, .21, 0, Math.PI * 2, true); top.holes.push(h); });
    var slab = new THREE.Mesh(new THREE.ExtrudeGeometry(top, { depth: .12, bevelEnabled: false, curveSegments: 40 }), white);
    slab.rotation.x = -Math.PI / 2; slab.position.set(0, -.5, .06); g.add(slab);
    var glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .26, roughness: .05, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
    var colors = [0xD82820, 0xF07C74, 0xF2B447, 0xB61D17, 0xF5C6C2], liqs = [];
    colors.forEach(function (c, i) {
      var x = -1.2 + .6 * i, t = new THREE.Group(); t.position.x = x;
      var body = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, 1.9, 40, 1, true), glass); body.position.y = -.05; t.add(body);
      var bot = new THREE.Mesh(new THREE.SphereGeometry(.2, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), glass); bot.position.y = -1.0; t.add(bot);
      var lm = new THREE.MeshStandardMaterial({ color: c, roughness: .25, metalness: 0 });
      var lg = new THREE.Group(); lg.position.y = -1.0;
      var lc = new THREE.Mesh(new THREE.CylinderGeometry(.165, .165, 1, 32), lm); lc.position.y = .5; lg.add(lc);
      var lb = new THREE.Mesh(new THREE.SphereGeometry(.165, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lm); lg.add(lb);
      t.add(lg); liqs.push(lg);
      var cap = cyl(.225, .225, .2, i % 2 ? white : redEm, 32); cap.position.y = .98; t.add(cap);
      g.add(t);
    });
    g.userData.liqs = liqs;
    var drop = new THREE.Mesh(new THREE.SphereGeometry(.075, 16, 12), new THREE.MeshStandardMaterial({ color: 0xD82820, emissive: 0xD82820, emissiveIntensity: .5 }));
    drop.position.set(0, 2.4, 0); g.add(drop); g.userData.drop = drop;
    g.position.y = -.82; return g;
  }

  /* ---------- 4. Kolposkop ---------- */
  function makeColpo() {
    var g = new THREE.Group();
    g.add(put(cyl(1.15, 1.25, .2, dark, 48), 0, -2.35, 0));
    g.add(put(cyl(.1, .1, 3.5, white, 28), 0, -.55, 0));
    g.add(put(new THREE.Mesh(new THREE.SphereGeometry(.17, 24, 16), gray), 0, 1.2, 0));
    var arm = rbox(2.0, .17, .17, .06, white); arm.position.set(1.0, 1.2, 0); g.add(arm);
    var head = new THREE.Group(); head.position.set(2.0, .85, 0);
    head.add(put(cyl(.36, .36, .8, dark, 40), 0, 0, 0));
    head.add(put(cyl(.4, .4, .12, white, 40), 0, -.46, 0));
    var lens = new THREE.Mesh(new THREE.CircleGeometry(.3, 40), redEm); lens.rotation.x = Math.PI / 2; lens.position.y = -.53; head.add(lens);
    [-.17, .17].forEach(function (x) { var e = cyl(.085, .085, .55, white, 20); e.position.set(x, .5, .3); e.rotation.x = -.9; head.add(e); head.add(put(cyl(.1, .1, .08, dark, 20), x, .67, .5)); });
    g.add(head);
    var cone = new THREE.Mesh(new THREE.ConeGeometry(.75, 1.9, 40, 1, true), new THREE.MeshBasicMaterial({ color: 0xD82820, transparent: true, opacity: .12, side: THREE.DoubleSide, depthWrite: false }));
    cone.position.set(2.0, -.62 - .0, 0); g.add(cone); g.userData.cone = cone;
    g.add(put(rbox(3.0, .3, 1.5, .12, white), 2.0, -1.85, 0));
    g.add(put(rbox(.9, .8, .9, .1, gray), 2.0, -2.3, 0));
    g.userData.head = head; g.position.set(-.9, 0, 0); return g;
  }

  var models = { us: makeUS(), heart: makeHeart(), lab: makeLab(), colpo: makeColpo() };
  var world = new THREE.Group(); scene.add(world);
  Object.keys(models).forEach(function (k) { models[k].userData.s = k === mode ? 1 : 0; world.add(models[k]); });

  /* soya va halqa */
  var sc = document.createElement('canvas'); sc.width = sc.height = 256;
  (function () { var c = sc.getContext('2d'), gr = c.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(20,20,24,.28)'); gr.addColorStop(.6, 'rgba(20,20,24,.08)'); gr.addColorStop(1, 'rgba(20,20,24,0)'); c.fillStyle = gr; c.fillRect(0, 0, 256, 256); })();
  var floor = new THREE.Mesh(new THREE.CircleGeometry(5.2, 64), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2.47; scene.add(floor);
  var rings = new THREE.Group(); rings.position.y = -2.46; scene.add(rings);
  [[3.9, 3.915, .5], [4.8, 4.81, .25]].forEach(function (r) {
    var m = new THREE.Mesh(new THREE.RingGeometry(r[0], r[1], 128), new THREE.MeshBasicMaterial({ color: 0xD82820, transparent: true, opacity: r[2] * .6, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; rings.add(m);
  });

  function resize() {
    var w = host.clientWidth || 400, h = host.clientHeight || 400;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 520 ? 1.5 : 2));
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < .95 ? 36 : 30; camera.updateProjectionMatrix();
  }
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(function () { resize(); render(lastT); }).observe(host); else window.addEventListener('resize', function () { resize(); render(lastT); });

  var yawUser = 0, pitchUser = 0, parX = 0, parY = 0, drag = null, lastT = reduce ? 1.2 : 0, prev = 0, lastUS = -1, lastECG = -1;
  host.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY }; try { host.setPointerCapture(e.pointerId); } catch (er) {} wake(); });
  host.addEventListener('pointermove', function (e) {
    var r = host.getBoundingClientRect();
    if (drag) { yawUser += (e.clientX - drag.x) * .009; pitchUser = Math.max(-.2, Math.min(.2, pitchUser + (e.clientY - drag.y) * .004)); drag.x = e.clientX; drag.y = e.clientY; }
    else { parX = ((e.clientX - r.left) / r.width - .5) * .3; parY = ((e.clientY - r.top) / r.height - .5) * .1; }
    wake();
  });
  function endDrag() { drag = null; }
  host.addEventListener('pointerup', endDrag); host.addEventListener('pointercancel', endDrag);
  host.addEventListener('pointerleave', function () { parX = parY = 0; });

  function render(t) {
    var dt = Math.min(.05, Math.max(0, t - prev)); prev = t;
    Object.keys(models).forEach(function (k) {
      var m = models[k], u = m.userData, target = k === mode ? 1 : 0;
      u.s += (target - u.s) * Math.min(1, dt * 7 + (reduce ? 1 : 0));
      m.visible = u.s > .02; m.scale.setScalar(.001 + Math.pow(u.s, 1.4) * .999);
      if (!m.visible) return;
      if (k === 'us') {
        if (t - lastUS > .1 || lastUS < 0) { lastUS = t; paintUS(t); }
        u.probe.position.y = -.15 + Math.sin(t * 1.5) * .06; u.probe.rotation.z = -.35 + Math.sin(t * 1.1) * .08;
      } else if (k === 'heart') {
        if (t - lastECG > .04 || lastECG < 0) { lastECG = t; paintECG(t); }
        var ph = (t * 1.1) % 1, beat = Math.exp(-Math.pow((ph - .08) / .07, 2)) + .55 * Math.exp(-Math.pow((ph - .3) / .09, 2));
        u.heart.scale.setScalar(1.28 * (1 + .075 * beat)); u.hmat.emissiveIntensity = .6 + beat * 1.6;
        u.heart.rotation.y = Math.sin(t * .5) * .35; u.ring.rotation.z = t * .4; u.ring.scale.setScalar(1 + .03 * beat);
      } else if (k === 'lab') {
        u.liqs.forEach(function (lg, i) { lg.scale.y = .78 + .1 * i % 3 * .6 + .06 * Math.sin(t * 1.4 + i * 1.2); });
        var f = (t * .7) % 1; u.drop.position.y = 2.4 - f * 1.45; u.drop.visible = f < .96;
      } else if (k === 'colpo') {
        u.head.rotation.z = Math.sin(t * .8) * .06; u.cone.material.opacity = .1 + .04 * Math.sin(t * 2.2);
      }
    });
    if (!drag) yawUser *= (1 - Math.min(1, dt * .5));
    world.rotation.y = MODELS[mode].yaw + Math.sin(t * .32) * .28 + yawUser + parX;
    world.rotation.x = pitchUser + parY * .5;
    rings.rotation.y = t * .1;
    renderer.render(scene, camera);
  }

  var vis = true, running = false, t0 = performance.now();
  function loop(now) {
    running = false;
    if (!vis || document.hidden) return;
    lastT = (now - t0) / 1000; render(lastT);
    if (!reduce) { running = true; requestAnimationFrame(loop); }
  }
  function wake() { if (reduce) { lastT += .001; render(lastT); return; } if (!running && vis) { running = true; requestAnimationFrame(loop); } }
  gl3 = { wake: wake };
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) wake(); }, { threshold: .02 }).observe(host);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) wake(); });
  setMode('us', null);
  if (reduce) { for (var k = 0; k < 8; k++) render(lastT); } else wake();
})();
