/* main.js — shell, router, login/darurat/ganti-sandi, sesi, warmup, PWA. */
'use strict';
const MENU = [
  { g: 'Tata naskah kedinasan' },
  { r: 'dasbor', l: 'Dasbor', i: 'space_dashboard' },
  { r: 'surat-masuk', l: 'Surat Masuk', i: 'move_to_inbox' },
  { r: 'surat-keluar', l: 'Surat Keluar', i: 'outbox' },
  { r: 'disposisi', l: 'Disposisi', i: 'assignment_turned_in', badge: true },
  { r: 'cari', l: 'Pencarian Arsip', i: 'manage_search' },
  { r: 'laporan', l: 'Laporan & Agenda', i: 'calendar_month', roles: ['ADMIN', 'TU', 'PIMPINAN'] },
  { g: 'Administrasi & sistem', roles: ['ADMIN', 'TU'] },
  { r: 'data-master', l: 'Data Master', i: 'database', roles: ['ADMIN', 'TU'] },
  { r: 'pengguna', l: 'Manajemen Pengguna', i: 'group', roles: ['ADMIN'] },
  { r: 'migrasi', l: 'Migrasi & Cadangan', i: 'cloud_sync', roles: ['ADMIN'] },
  { r: 'notifikasi', l: 'Notifikasi & Kontak', i: 'notifications', roles: ['ADMIN'] }
];
const PAGE = { 'dasbor': 'dasbor', 'surat-masuk': 'suratMasuk', 'surat-keluar': 'suratKeluar', 'disposisi': 'disposisi', 'cari': 'cari', 'laporan': 'laporan', 'data-master': 'dataMaster', 'pengguna': 'pengguna', 'migrasi': 'migrasi', 'notifikasi': 'notifikasi' };
const ROLE_PAGE = { laporan: ['ADMIN', 'TU', 'PIMPINAN'], 'data-master': ['ADMIN', 'TU'], pengguna: ['ADMIN'], migrasi: ['ADMIN'], notifikasi: ['ADMIN'] };
E.rt = 0; E.cur = { r: '', p: '' };
const app = () => $('#app');

/* ===== sesi ===== */
E.sesiBerakhir = msg => { if (E._out) return; E._out = true; Api.setTok(''); E.S.me = null; modal({ title: 'Sesi berakhir', size: 'sm', sticky: true, body: `<p>${esc(msg || 'Sesi Anda telah berakhir. Silakan masuk kembali.')}</p>`, buttons: [{ label: 'Masuk kembali', onClick: () => { E._out = false; location.hash = '#/login'; tampilLogin(); } }] }); };
E.wajibGanti = () => gantiSandi(true);
async function keluar() { try { await Api.call('auth.logout', {}, { quiet: true }); } catch (e) { /* abaikan */ } Api.setTok(''); Api.bust(); E.S.me = null; location.hash = '#/login'; tampilLogin(); }
function gantiSandi(wajib) {
  modal({ title: wajib ? 'Ganti sandi sementara' : 'Ganti sandi', size: 'sm', sticky: !!wajib, body: `<form id="fg" class="col" onsubmit="return false">${wajib ? `<div class="notice w">${ic('warning')}<div>Demi keamanan, ganti sandi sementara Anda sebelum melanjutkan.</div></div>` : ''}${fld('Sandi saat ini', 'lama', '', { type: 'password', req: 1, ac: 'current-password' })}${fld('Sandi baru', 'baru', '', { type: 'password', req: 1, ac: 'new-password', hint: '(min. 8 karakter, huruf + angka)' })}${fld('Ulangi sandi baru', 'ulang', '', { type: 'password', req: 1, ac: 'new-password' })}</form>`,
    buttons: [...(wajib ? [{ label: 'Keluar', cls: 'sec', onClick: () => { keluar(); } }] : [{ label: 'Batal', cls: 'sec' }]), { label: 'Simpan sandi', icon: 'check', onClick: async api => { const d = formData($('#fg', api.el)); if (!d.lama || !d.baru) { toast('Lengkapi semua kolom.', 'err'); return false; } if (d.baru !== d.ulang) { toast('Konfirmasi sandi tidak sama.', 'err'); return false; } const r = await Api.call('auth.changePassword', d, { write: true }); if (!r.success) return false; Api.setTok(r.data.token); if (r.data.boot) mulai(r.data.boot); } }] });
}

/* ===== login ===== */
async function tampilLogin(darurat) {
  document.title = 'Masuk · E-Surat Kedinasan'; let cfg = {};
  app().innerHTML = `<div class="login"><div class="box"><div class="logos"><img src="img/logo-jatim.png" alt="Logo Provinsi Jawa Timur"><img src="img/logo-sman1.png" alt="Logo sekolah"></div><h1>E-Surat Kedinasan</h1><p class="sub">${darurat ? 'Akses darurat Administrator' : 'Masuk untuk mengelola tata naskah dinas'}</p>
  <form class="col" id="fl" onsubmit="return false">${fld(darurat ? 'Nama pengguna darurat' : 'Username', 'username', '', { req: 1, ac: 'username', attr: 'autocapitalize="none" spellcheck="false"' })}${fld('Sandi', 'password', '', { type: 'password', req: 1, ac: 'current-password' })}<button class="btn" id="go" style="justify-content:center">${ic('login')}Masuk</button>
  <div id="gw" class="${darurat ? 'hide' : ''}" style="display:grid;place-items:center"></div><div class="small muted right"><a href="${darurat ? '#/login' : '#/darurat'}">${darurat ? '← Masuk biasa' : 'Akses darurat'}</a></div></form><p class="small muted" style="text-align:center;margin-top:14px">Versi ${esc(window.ESURAT.VERSI)}</p></div></div>`;
  const kirim = async () => { const d = formData($('#fl')); if (!d.username || !d.password) return toast('Isi username dan sandi.', 'err'); const b = $('#go'); b.disabled = true; b.prepend(Object.assign(document.createElement('span'), { className: 'spin' })); const r = await Api.call(darurat ? 'auth.darurat' : 'auth.login', d); b.disabled = false; $('.spin', b) && $('.spin', b).remove(); sesiBerhasil(r); };
  $('#go').onclick = kirim; $('#fl').addEventListener('keydown', e => { if (e.key === 'Enter') kirim(); });
  if (!darurat && /^https:\/\/script\.google/.test(window.ESURAT.API_URL)) { const r = await Api.call('auth.config'); if (r.success && r.data.googleClientId) { cfg = r.data; muatGoogle(cfg.googleClientId); } }
}
function sesiBerhasil(r) {
  if (!r.success) { if (r.message) toast(r.message, 'err'); return; } Api.setTok(r.data.token); E.S.me = r.data.me;
  if (r.data.me.wajibGanti && !r.data.boot) { app().innerHTML = '<div class="login"><div class="box"><div class="skeleton"></div></div></div>'; gantiSandi(true); return; }
  mulai(r.data.boot);
}
function muatGoogle(cid) {
  const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = () => { if (!window.google || !$('#gw')) return; google.accounts.id.initialize({ client_id: cid, callback: async resp => { const r = await Api.call('auth.google', { credential: resp.credential }); sesiBerhasil(r); } }); google.accounts.id.renderButton($('#gw'), { theme: 'outline', size: 'large', text: 'signin_with', width: 320 }); }; document.head.appendChild(s);
}

/* ===== shell ===== */
function mulai(boot) {
  E.S.me = boot.me; E.S.ref = boot.ref; E.S.dash = boot.dash; E._out = false; E.tahun = null; E.mulaiIdle();
  const me = boot.me, inst = boot.ref.pengaturan;
  const nav = MENU.filter(m => !m.roles || m.roles.includes(me.role)).map(m => m.g ? `<div class="grp">${esc(m.g)}</div>` : `<a class="nv" href="#/${m.r}" data-r="${m.r}">${ic(m.i)}<span>${esc(m.l)}</span>${m.badge && boot.dash.tugas ? `<span class="bdg" id="bdg">${boot.dash.tugas}</span>` : ''}</a>`).join('');
  app().innerHTML = `<aside class="side" id="side" aria-label="Navigasi utama"><div class="brand"><img src="img/logo-sman1.png" alt=""><div><b>E-SURAT</b><span>${esc(inst.NAMA_INSTANSI || '')}</span></div></div><nav>${nav}</nav><div class="foot"><div class="eng" id="eng"><span>● SERVER</span><span id="ms">—</span></div><button class="out" id="out">${ic('logout')}Keluar sistem</button></div></aside><div class="scrim" id="scrim"></div>
  <div class="main"><header class="top"><button class="burger" id="bg" aria-label="Menu">${ic('menu', 'lg')}</button><img src="img/logo-jatim.png" alt="" style="height:34px"><div class="crumb"><span class="t" id="ct">E-Surat</span><span class="s" id="cs"></span></div><div class="sp"></div><div class="sync" id="sy"><span class="dot"></span><span>Terhubung</span></div><button class="who" id="who" aria-haspopup="true"><span><div class="n">${esc(me.nama)}</div><div class="j">${esc(me.jabatan || me.role)}</div></span><span class="av">${esc(inisial(me.nama))}</span></button></header><main class="page" id="pg" tabindex="-1"></main></div>`;
  $('#out').onclick = keluar; $('#bg').onclick = () => { $('#side').classList.add('open'); $('#scrim').classList.add('open'); }; $('#scrim').onclick = tutupSide;
  $('#who').onclick = e => { e.stopPropagation(); const ada = $('.menu'); if (ada) return ada.remove(); const m = document.createElement('div'); m.className = 'menu'; m.innerHTML = `<div style="padding:8px 10px"><div class="b">${esc(me.nama)}</div><div class="small muted">${esc(me.role)}${me.darurat ? ' · akses darurat' : ''}</div></div><button data-a="pw" ${me.darurat ? 'disabled' : ''}>${ic('key')}Ganti sandi</button>${E.pwa ? `<button data-a="pwa">${ic('install_mobile')}Pasang aplikasi</button>` : ''}<button data-a="out">${ic('logout')}Keluar</button>`; document.body.appendChild(m); m.onclick = ev => { const a = ev.target.closest('button'); if (!a) return; m.remove(); if (a.dataset.a === 'pw') gantiSandi(false); if (a.dataset.a === 'out') keluar(); if (a.dataset.a === 'pwa') { E.pwa.prompt(); E.pwa = null; } }; };
  document.addEventListener('click', () => { const m = $('.menu'); if (m) m.remove(); });
  if (!location.hash || /^#\/(login|darurat)/.test(location.hash)) location.hash = '#/dasbor'; else rute();
  E.sync(); Api.call('notif.drain', {}, { quiet: true });
}
const tutupSide = () => { const s = $('#side'); if (s) { s.classList.remove('open'); $('#scrim').classList.remove('open'); } };
E.sync = () => { const ms = $('#ms'), e = $('#eng'), sy = $('#sy'); if (ms) ms.textContent = Api.pending ? '…' : Api.lastMs + ' ms'; if (e) e.classList.toggle('off', !Api.online); if (sy) sy.innerHTML = `<span class="dot ${Api.online ? '' : 'off'}"></span><span>${Api.online ? 'Terhubung' : 'Terputus'}</span>`; };

/* ===== router ===== */
function parse() { const m = location.hash.replace(/^#\//, '').split('/'); return { r: m[0] || 'dasbor', p: m.slice(1).join('/') }; }
async function rute() {
  if (!E.S.me) return; const { r, p } = parse();
  if (r === 'login' || r === 'darurat') { location.hash = '#/dasbor'; return; }
  const kunci = PAGE[r], izin = ROLE_PAGE[r];
  const halaman = kunci && (!izin || izin.includes(E.S.me.role)) ? E.pages[kunci] : E.pages.dasbor, rr = kunci && (!izin || izin.includes(E.S.me.role)) ? r : 'dasbor';
  E.cur = { r: rr, p }; const my = ++E.rt; tutupSide();
  $$('.side a.nv').forEach(a => a.classList.toggle('on', a.dataset.r === rr));
  $('#ct').textContent = halaman.t; $('#cs').textContent = (E.S.ref.pengaturan.NAMA_INSTANSI || '') + ' · ' + (typeof halaman.s === 'function' ? halaman.s() : '');
  document.title = halaman.t + ' · E-Surat Kedinasan';
  const pg = $('#pg'); pg.innerHTML = '<div class="card pad">' + skel(4) + '</div>';
  try { await halaman.render(pg, p); } catch (e) { console.error(e); if (my === E.rt) pg.innerHTML = empty('error', 'Terjadi galat saat menampilkan halaman', e.message); }
  if (my === E.rt) { window.scrollTo(0, 0); pg.focus({ preventScroll: true }); }
}
E.reload = force => { if (E.S.me) { const y = window.scrollY; rute().then(() => force && window.scrollTo(0, y)); refreshBadge(); } };
async function refreshBadge() { const d = await Api.get('auth.me', {}, { keep: true }); if (d) { E.S.dash = d.dash; E.S.ref = d.ref; const b = $('#bdg'), a = $('a[data-r=disposisi]'); if (a) { if (d.dash.tugas) { if (b) b.textContent = d.dash.tugas; else a.insertAdjacentHTML('beforeend', `<span class="bdg" id="bdg">${d.dash.tugas}</span>`); } else if (b) b.remove(); } } }
window.addEventListener('hashchange', () => { if (E.S.me) rute(); else { const r = parse().r; if (r === 'darurat') tampilLogin(true); else if (r === 'login' || !Api.tok) tampilLogin(); } });
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (g && !e.target.closest('button,a')) { go(g.dataset.go); return; }
  const u = e.target.closest('[data-unduh]'); if (u) { unduhBerkas(u.dataset.unduh); return; }
  const d = e.target.closest('[data-dp]'); if (d && E.cur.r !== 'disposisi') E.bukaDisposisiById(d.dataset.dp);
});

/* ===== sesi idle, warmup, notifikasi, PWA ===== */
E.mulaiIdle = () => {
  if (E._idle) return; let last = Date.now(), ping = Date.now(); E._idle = true;
  const aktif = () => { last = Date.now(); if (E.S.me && Date.now() - Api.lastCall > 15 * 60000 && Date.now() - ping > 5 * 60000) { ping = Date.now(); Api.call('sesi.ping', {}, { quiet: true, keep: true }); } };
  ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'].forEach(ev => window.addEventListener(ev, aktif, { passive: true }));
  setInterval(() => { if (!E.S.me) return; const batas = (Number(E.S.ref.pengaturan.SESI_MENIT) || 60) * 60000, sisa = batas - (Date.now() - last); if (sisa <= 0) { E.sesiBerakhir('Sesi berakhir karena tidak aktif.'); } else if (sisa < 120000 && !E._warn) { E._warn = true; toast('Sesi akan berakhir dalam 2 menit karena tidak aktif.', 'err'); setTimeout(() => E._warn = false, 130000); } }, 20000);
};
E.drainSoon = debounce(() => Api.call('notif.drain', {}, { quiet: true, keep: true }), 2500);
function warm() { const u = window.ESURAT.API_URL; if (/^https:\/\/script\.google/.test(u)) fetch(u + '?w=tick', { mode: 'no-cors' }).catch(() => {}); }
setInterval(() => { if (!document.hidden) warm(); }, 4 * 60000);
window.addEventListener('online', E.sync); window.addEventListener('offline', () => { Api.online = false; E.sync(); });
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); E.pwa = e; });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

/* ===== start ===== */
(async function init() {
  warm();
  if (!/^https:\/\/script\.google/.test(window.ESURAT.API_URL)) { app().innerHTML = `<div class="login"><div class="box"><h1>Konfigurasi belum lengkap</h1><p class="sub">Buka <span class="mono">js/config.js</span> dan isi <b>API_URL</b> dengan URL aplikasi web Apps Script (berakhiran <span class="mono">/exec</span>), lalu unggah ulang ke GitHub.</p></div></div>`; return; }
  const h = parse().r;
  if (Api.tok && h !== 'darurat') { app().innerHTML = '<div class="login"><div class="box"><div class="sk" style="height:20px"></div><div class="sk mt" style="height:20px"></div></div></div>'; const r = await Api.call('auth.me', {}, { keep: true }); if (r.success) { E.S.me = r.data.me; mulai(r.data); return; } Api.setTok(''); }
  tampilLogin(h === 'darurat');
})();
