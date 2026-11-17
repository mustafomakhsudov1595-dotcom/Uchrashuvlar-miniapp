/* Edge rejimi: yuzni tanish brauzerda (face-api) bajariladi. app.js dan oldin yuklanadi. */
window.VM_EDGE = true;
(() => {
  const CDN = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/dist/face-api.js';
  const MODELS = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model/';
  let ready = null;
  function load() {
    return ready ??= (async () => {
      await new Promise((res, rej) => { const s = document.createElement('script'); s.src = CDN; s.onload = res; s.onerror = () => rej(new Error('AI kutubxonasi yuklanmadi (internetni tekshiring)')); document.head.append(s); });
      const n = window.faceapi.nets;
      await Promise.all([n.tinyFaceDetector, n.faceLandmark68TinyNet, n.faceRecognitionNet, n.ageGenderNet].map(x => x.loadFromUri(MODELS)));
      return window.faceapi;
    })();
  }
  const dist = (a, b) => { let s = 0; for (let i = 0; i < 128; i++) s += (a[i] - b[i]) ** 2; return Math.sqrt(s); };
  async function bitmapCanvas(file) {
    const bmp = await createImageBitmap(file); const sc = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); return c;
  }
  /** Xodim rasmlaridan yuz vektorlarini hisoblab, serverga yuboradi. Qaytaradi: {added, problems, gender, total} */
  window.edgeEnroll = async (empId, files) => {
    const fa = await load(), token = localStorage.getItem('vm_token');
    const H = { Authorization: 'Bearer ' + token, 'content-type': 'application/json' };
    const all = await (await fetch('/api/employees/descriptors', { headers: H })).json();
    const problems = [], good = [], genders = [];
    for (const f of [...files].slice(0, 10)) {
      let c; try { c = await bitmapCanvas(f); } catch { problems.push(`${f.name}: rasm o'qilmadi`); continue; }
      const res = await fa.detectAllFaces(c, new fa.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 })).withFaceLandmarks(true).withFaceDescriptors().withAgeAndGender();
      if (!res.length) { problems.push(`${f.name}: yuz topilmadi`); continue; }
      res.sort((a, b) => b.detection.box.area - a.detection.box.area);
      if (res.length > 1 && res[1].detection.box.area > 0.25 * res[0].detection.box.area) { problems.push(`${f.name}: rasmda bir nechta odam bor — faqat bitta odam bo'lgan rasm yuklang`); continue; }
      const r = res[0];
      if (r.detection.box.width < 80 || r.detection.score < 0.6) { problems.push(`${f.name}: yuz kichik yoki sifatsiz (aniq, yorug' rasm yuklang)`); continue; }
      const clash = all.filter(e => e.id !== empId).map(e => ({ n: e.name, d: Math.min(9, ...e.descriptors.map(d => dist(r.descriptor, d))) })).sort((a, b) => a.d - b.d)[0];
      if (clash && clash.d < 0.45) { problems.push(`${f.name}: bu yuz '${clash.n}' ga juda o'xshash — to'g'ri xodimga yuklayotganingizni tekshiring`); continue; }
      const own = all.find(e => e.id === empId);
      const prev = [...(own ? own.descriptors : []), ...good];
      if (prev.length && Math.min(...prev.map(d => dist(r.descriptor, d))) > 0.75) { problems.push(`${f.name}: bu yuz oldingi rasmlardagi odamga o'xshamayapti — boshqa odam bo'lishi mumkin`); continue; }
      good.push(Array.from(r.descriptor)); genders.push(r.gender === 'male' ? 'M' : 'F');
    }
    let gender = '', total = 0;
    if (good.length) {
      const g = genders.filter(x => x === 'M').length * 2 >= genders.length ? 'M' : 'F';
      const r = await fetch(`/api/employees/${empId}/descriptors`, { method: 'POST', headers: H, body: JSON.stringify({ descriptors: good, gender: g }) });
      if (!r.ok) throw new Error((await r.json()).detail || 'Saqlanmadi');
      const j = await r.json(); gender = j.gender; total = j.total;
    }
    return { added: good.length, failed: files.length - good.length, problems, gender, total };
  };
})();
