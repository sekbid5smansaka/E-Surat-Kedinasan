/* core.js — klien API (SWR, idempotensi, auto-token), helper UI, modal, toast, berkas. */
'use strict';
const E = window.E = { pages: {}, S: { me: null, ref: null, dash: null } };

/* ===== util ===== */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const tgl = iso => { if (!iso) return '—'; const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? Number(m[3]) + ' ' + BLN[Number(m[2]) - 1] + ' ' + m[1] : iso; };
const wkt = iso => { const m = String(iso || '').match(/T(\d{2}:\d{2})/); return m ? m[1] + ' WIB' : ''; };
const hariIni = () => { const d = new Date(Date.now() + (7 * 60 + new Date().getTimezoneOffset()) * 60000); return d.toISOString().slice(0, 10); };
const ic = (n, c) => `<span class="ms ${c || ''}" aria-hidden="true">${n}</span>`;
const SIFAT_L = { biasa: 'Biasa', penting: 'Penting', rahasia: 'Rahasia' };
const sifatB = s => `<span class="badge b-${esc(s)}">${s === 'rahasia' ? ic('lock', 'sm') : ''}${esc(SIFAT_L[s] || s)}</span>`;
const statusB = s => `<span class="badge b-${esc(String(s).replace(/\s+/g, '-'))}">${esc(s)}</span>`;
const inisial = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
const kb = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(16).slice(2));
const debounce = (f, ms, terikat) => { let t; const rt0 = E.rt; return (...a) => { clearTimeout(t); t = setTimeout(() => { if (terikat && E.rt !== rt0) return; f(...a); }, ms); }; };   // terikat = batal bila halaman sudah berpindah
const pdebounce = (f, ms) => debounce(f, ms, true);
const opts = (arr, sel, ph) => (ph ? `<option value="">${esc(ph)}</option>` : '') + arr.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}"${String(v) === String(sel) ? ' selected' : ''}>${esc(l)}</option>`; }).join('');
const klasOpts = (sel, ph, aktifSaja) => opts((E.S.ref ? E.S.ref.klasifikasi : []).filter(k => !aktifSaja || k.aktif || k.kode === sel).map(k => [k.kode, k.kode + ' — ' + k.nama]), sel, ph);
const pegNama = id => { const p = (E.S.ref ? E.S.ref.pegawai : []).find(x => x.id === id); return p ? p.nama : id; };
const adaPeran = (...r) => !!E.S.me && r.indexOf(E.S.me.role) !== -1;
const STAF = ['ADMIN', 'TU'];

/* ===== API ===== */
const Api = E.Api = {
  tok: sessionStorage.getItem('es_tok') || '', cache: new Map(), lastMs: 0, lastCall: Date.now(), online: true, pending: 0,
  setTok(t) { this.tok = t || ''; t ? sessionStorage.setItem('es_tok', t) : sessionStorage.removeItem('es_tok'); },
  async post(body, attempt) {
    const url = window.ESURAT.API_URL;
    if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(url)) throw new Error('URL backend belum diatur. Edit js/config.js (API_URL).');
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 50000);
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: ctl.signal, redirect: 'follow' });
      const j = await r.json(); this.online = true; return j;
    } catch (e) {
      if ((attempt || 0) < 1 && e.name !== 'AbortError') { await new Promise(r => setTimeout(r, 900)); return this.post(body, 1); }   // reqId sama → aman diulang
      this.online = false; throw new Error(e.name === 'AbortError' ? 'Server terlalu lama merespons.' : 'Tidak dapat terhubung ke server. Periksa koneksi internet.');
    } finally { clearTimeout(to); E.sync && E.sync(); }
  },
  /** Panggil aksi. Mengembalikan objek respons {success,data,message}. Tidak melempar untuk galat bisnis. */
  async call(action, data, o) {
    o = o || {}; const t0 = performance.now(), rt = E.rt; this.pending++; this.lastCall = Date.now();
    try {
      const res = await this.post({ action, data: data || {}, token: this.tok, reqId: o.write ? uuid() : undefined });
      this.lastMs = Math.round(performance.now() - t0); this.lastCall = Date.now();
      if (!o.write && !o.keep && E.rt !== rt) return { success: false, message: '', data: { code: 'STALE' } };   // halaman sudah berpindah: jangan menimpa tampilan baru
      if (res.tok) this.setTok(res.tok);
      if (!res.success && res.data && res.data.code === 'AUTH' && this.tok) { E.sesiBerakhir && E.sesiBerakhir(res.message); }
      if (!res.success && res.data && res.data.code === 'CHANGE_PASSWORD') { E.wajibGanti && E.wajibGanti(); }
      if (o.write && !res.success && !o.quiet && res.message && !(res.data && ['AUTH', 'CHANGE_PASSWORD'].includes(res.data.code))) toast(res.message, 'err');
      if (o.write && res.success) { this.bust(); if (!o.quiet && res.message) toast(res.message, 'ok'); if (action !== 'notif.drain' && E.drainSoon) E.drainSoon(); }
      return res;
    } catch (e) { toast(e.message, 'err'); return { success: false, message: e.message, data: null }; }
    finally { this.pending--; }
  },
  /** Seperti call, tetapi menampilkan toast galat dan mengembalikan data (atau null). */
  async get(action, data, o) { const r = await this.call(action, data, o); if (!r.success) { if (!(r.data && ['AUTH', 'CHANGE_PASSWORD', 'STALE'].includes(r.data.code))) toast(r.message, 'err'); return null; } return r.data; },
  /** Stale-while-revalidate: tampilkan cache seketika (jika ada), lalu perbarui senyap. */
  async swr(key, action, data, render) {
    const c = this.cache.get(key); if (c) render(c.data, true);
    const r = await this.call(action, data); if (!r.success) { if (!c && !(r.data && r.data.code === 'STALE')) render(null, false, r.message); return; }
    const s = JSON.stringify(r.data); if (!c || c.s !== s) { this.cache.set(key, { data: r.data, s }); render(r.data, false); } else if (c) { /* tidak berubah */ }
  },
  bust(prefix) { if (!prefix) this.cache.clear(); else for (const k of this.cache.keys()) if (k.startsWith(prefix)) this.cache.delete(k); }
};

/* ===== toast / modal ===== */
function toast(msg, type) {
  let w = $('.toasts'); if (!w) { w = document.createElement('div'); w.className = 'toasts'; w.setAttribute('role', 'status'); w.setAttribute('aria-live', 'polite'); document.body.appendChild(w); }
  const t = document.createElement('div'); t.className = 'toast ' + (type || ''); t.innerHTML = `${ic(type === 'err' ? 'error' : type === 'ok' ? 'check_circle' : 'info')}<div>${esc(msg)}</div>`;
  w.appendChild(t); setTimeout(() => t.remove(), type === 'err' ? 7000 : 4000);
}
function modal(o) {
  const el = document.createElement('div'); el.className = 'modal'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  el.innerHTML = `<div class="box ${o.size || ''}"><div class="mh"><h2>${esc(o.title || '')}</h2><button class="btn ghost" data-x aria-label="Tutup">${ic('close')}</button></div><div class="mbd">${o.body || ''}</div>${o.foot === false ? '' : `<div class="mf">${(o.buttons || []).map((b, i) => `<button class="btn ${b.cls || ''}" data-b="${i}">${b.icon ? ic(b.icon) : ''}${esc(b.label)}</button>`).join('')}</div>`}</div>`;
  document.body.appendChild(el); document.body.style.overflow = 'hidden';
  const api = { el, box: $('.box', el), close() { el.remove(); if (!$('.modal')) document.body.style.overflow = ''; document.removeEventListener('keydown', esc_); }, body: $('.mbd', el) };
  const esc_ = e => { if (e.key === 'Escape' && el === $$('.modal').pop()) api.close(); };
  document.addEventListener('keydown', esc_);
  el.addEventListener('mousedown', e => { if (e.target === el && !o.sticky) api.close(); });
  $('[data-x]', el).onclick = () => api.close();
  (o.buttons || []).forEach((b, i) => { const bt = $(`[data-b="${i}"]`, el); bt.onclick = async () => { if (bt.disabled) return; bt.disabled = true; const sp = document.createElement('span'); sp.className = 'spin'; bt.prepend(sp); try { const r = b.onClick ? await b.onClick(api, bt) : null; if (r !== false && b.close !== false) api.close(); } finally { if (bt.isConnected) { bt.disabled = false; sp.remove(); } } }; });
  const f = $('input,select,textarea', api.body); if (f && !o.noFocus && window.innerWidth > 767) f.focus();
  o.onOpen && o.onOpen(api); return api;
}
const konfirm = (judul, pesan, label, cls) => new Promise(res => modal({ title: judul, size: 'sm', body: `<p>${pesan}</p>`, buttons: [{ label: 'Batal', cls: 'sec', onClick: () => res(false) }, { label: label || 'Ya, lanjutkan', cls: cls || '', onClick: () => { res(true); } }] }).el.addEventListener('mousedown', e => { if (e.target.classList.contains('modal')) res(false); }));
function formData(root) {
  const o = {}; $$('[name]', root).forEach(el => { if (el.type === 'checkbox') { if (el.name.endsWith('[]')) { const k = el.name.slice(0, -2); o[k] = o[k] || []; if (el.checked) o[k].push(el.value); } else o[el.name] = el.checked; } else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; } else o[el.name] = el.value; }); return o;
}
const fld = (label, name, val, o) => { o = o || {}; const t = o.type || 'text', req = o.req ? '<span class="req">*</span>' : '', h = o.hint ? ` <span class="h">${esc(o.hint)}</span>` : '';
  const inner = t === 'select' ? `<select name="${name}"${o.req ? ' required' : ''}>${o.options || ''}</select>` : t === 'textarea' ? `<textarea name="${name}" maxlength="${o.max || 1000}" placeholder="${esc(o.ph || '')}">${esc(val || '')}</textarea>` : `<input name="${name}" type="${t}" value="${esc(val || '')}" ${o.req ? 'required' : ''} ${o.max ? `maxlength="${o.max}"` : ''} placeholder="${esc(o.ph || '')}" ${o.attr || ''} autocomplete="${o.ac || 'off'}">`;
  return `<label class="f ${o.full ? 'full' : ''}">${esc(label)}${req}${h}${inner}</label>`; };
const wajibIsi = (root, names) => { for (const n of names) { const el = $(`[name="${n}"]`, root); if (el && !String(el.value).trim()) { el.focus(); el.style.borderColor = '#dc2626'; toast('Lengkapi kolom yang wajib diisi.', 'err'); return false; } } return true; };
const empty = (icon, t, s) => `<div class="empty">${ic(icon)}<div class="b">${esc(t)}</div>${s ? `<div class="small">${esc(s)}</div>` : ''}</div>`;
const skel = n => Array.from({ length: n || 4 }, () => '<div class="sk" style="margin:14px 20px"></div>').join('');
const salin = async t => { try { await navigator.clipboard.writeText(t); toast('Disalin ke papan klip.', 'ok'); } catch (e) { toast('Gagal menyalin. Salin manual.', 'err'); } };

/* ===== berkas ===== */
const MAKS_PX = 1700;
function bacaBerkas(file) {
  return new Promise((ok, no) => {
    const batas = (Number(E.S.ref && E.S.ref.pengaturan.MAKS_BERKAS_MB) || 5) * 1048576;
    const rd = r => { const f = new FileReader(); f.onload = () => ok({ nama: file.name, mime: file.type, b64: String(f.result).split(',')[1] }); f.onerror = () => no(new Error('Gagal membaca berkas.')); f.readAsDataURL(r); };
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) return no(new Error('Format tidak didukung. Gunakan PDF, JPG, atau PNG.'));
    if (file.type === 'application/pdf') { if (file.size > batas) return no(new Error('PDF melebihi batas ' + kb(batas) + '. Kompres dahulu.')); return rd(file); }
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(u); let w = img.width, h = img.height; const k = Math.min(1, MAKS_PX / Math.max(w, h)); w = Math.round(w * k); h = Math.round(h * k); const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h);
      c.toBlob(b => { if (!b) return no(new Error('Gagal memproses gambar.')); if (b.size > batas) return no(new Error('Gambar masih melebihi batas ' + kb(batas) + '.')); rd(new File([b], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })); }, 'image/jpeg', .82); };
    img.onerror = () => no(new Error('Gambar tidak dapat dibaca.')); img.src = u;
  });
}
function pilihBerkas(accept) { return new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept || '.pdf,.jpg,.jpeg,.png'; i.onchange = () => res(i.files[0] || null); i.click(); }); }
async function unggah(jenis, ref, file) {
  let b; try { b = await bacaBerkas(file); } catch (e) { toast(e.message, 'err'); return null; }
  const r = await Api.call('berkas.unggah', { jenis, ref_id: ref, nama: b.nama, mime: b.mime, b64: b.b64 }, { write: true }); return r.success ? r.data : null;
}
function simpanBlob(b64, nama, mime, buka) {
  const bin = atob(b64), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([a], { type: mime }));
  if (buka && mime === 'application/pdf') { const w = window.open(url, '_blank'); if (w) { setTimeout(() => URL.revokeObjectURL(url), 60000); return; } }
  const l = document.createElement('a'); l.href = url; l.download = nama; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
async function unduhBerkas(id, buka) { toast('Menyiapkan berkas…'); const d = await Api.get('berkas.unduh', { id }); if (d) simpanBlob(d.b64, d.nama, d.mime, buka !== false); }
async function cetakPdf(action, data) { toast('Menyusun PDF… (beberapa detik)'); const d = await Api.get(action, data); if (d) simpanBlob(d.b64, d.nama, d.mime, true); }
const berkasBaris = (b, bolehHapus) => `<div class="fl">${ic(b.mime === 'application/pdf' ? 'picture_as_pdf' : 'image')}<div class="nm" title="${esc(b.nama)}"><span class="b">${esc(b.jenis.replace(/_/g, ' '))}</span> · ${esc(b.nama)}<div class="small muted">${kb(b.ukuran)} · ${esc(b.oleh)} · ${tgl(b.waktu)}</div></div><button class="btn sec sm" data-unduh="${esc(b.id)}">${ic('download', 'sm')}Buka</button></div>`;

/* ===== CSV ===== */
function parseCSV(txt) {
  txt = txt.replace(/^\uFEFF/, ''); const baris = txt.split(/\r?\n/, 1)[0] || ''; const sep = (baris.match(/;/g) || []).length > (baris.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let r = [], f = '', q = false;
  for (let i = 0; i < txt.length; i++) { const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === sep) { r.push(f); f = ''; } else if (c === '\n') { r.push(f); rows.push(r); r = []; f = ''; } else if (c !== '\r') f += c; }
  if (f !== '' || r.length) { r.push(f); rows.push(r); } return rows.filter(x => x.some(v => String(v).trim() !== ''));
}
function unduhCSV(nama, rows) { const s = '\uFEFF' + rows.map(r => r.map(v => { v = String(v == null ? '' : v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',')).join('\r\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([s], { type: 'text/csv;charset=utf-8' })); a.download = nama; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
