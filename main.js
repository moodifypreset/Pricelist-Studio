// Price List Studio · aplikasi desktop (Electron)
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let win = null;
let splash = null;
let splashAt = 0;
let pendingOpen = [];          // file .moodify yang dibuka sebelum jendela siap
let rendererReady = false;
let forceClose = false;

const isMoodify = p => typeof p === 'string' && /\.moodify(\.json)?$/i.test(p) && fs.existsSync(p);
function sendOpen(p) {
  if (!isMoodify(p)) return;
  if (win && rendererReady) { win.webContents.send('open-path', p); if (win.isMinimized()) win.restore(); win.focus(); }
  else pendingOpen.push(p);
}

// satu aplikasi saja: klik 2x file saat aplikasi sudah terbuka → dibuka di jendela yang sama
if (!app.requestSingleInstanceLock()) { app.quit(); }
app.on('second-instance', (_e, argv) => { argv.slice(1).forEach(sendOpen); });
app.on('open-file', (e, p) => { e.preventDefault(); sendOpen(p); });   // macOS

// splash screen: tampil sampai aplikasi siap (minimal 3,3 detik supaya animasi pemuatan selesai)
function showSplash() {
  splash = new BrowserWindow({
    width: 640, height: 420, frame: false, transparent: true, resizable: false, movable: true,
    show: false, center: true, skipTaskbar: true, alwaysOnTop: true, hasShadow: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  splash.loadFile(path.join(__dirname, 'app', 'splash.html'));
  splash.once('ready-to-show', () => { splashAt = Date.now(); splash && splash.show(); });
  splash.on('closed', () => { splash = null; });
}
function revealMain() {
  const wait = splash ? Math.max(0, 3300 - (Date.now() - (splashAt || Date.now()))) : 0;
  setTimeout(() => {
    if (win) { win.maximize(); win.show(); }
    if (splash) { splash.close(); splash = null; }
  }, wait);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1180, minHeight: 700,
    title: 'Price List Studio', backgroundColor: '#f3f1ec', show: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false, spellcheck: false }
  });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.once('ready-to-show', revealMain);

  // link WhatsApp / Instagram / web dibuka di browser
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:|^mailto:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); shell.openExternal(url); } });

  // aplikasi mencegah tutup saat ada perubahan belum disimpan → tanya dulu
  win.webContents.on('will-prevent-unload', e => {
    if (forceClose) { e.preventDefault(); return; }
    const r = dialog.showMessageBoxSync(win, {
      type: 'warning', buttons: ['Kembali & simpan', 'Keluar tanpa menyimpan'], defaultId: 0, cancelId: 0,
      title: 'Perubahan belum disimpan', message: 'Ada perubahan yang belum disimpan ke file.',
      detail: 'Salinan terakhir tetap ada di Riwayat proyek, tapi sebaiknya simpan dulu (Ctrl/⌘+S).'
    });
    if (r === 1) e.preventDefault(); // preventDefault di sini = izinkan menutup
  });
  win.on('closed', () => { win = null; rendererReady = false; });
}

// ---------- IPC: file ----------
const filters = [{ name: 'Proyek Price List Studio', extensions: ['moodify'] }];
ipcMain.handle('save-project', async (_e, existingPath, suggestedName) => {
  if (existingPath && fs.existsSync(path.dirname(existingPath))) return { path: existingPath, name: path.basename(existingPath) };
  const r = await dialog.showSaveDialog(win, { title: 'Simpan proyek', defaultPath: path.join(app.getPath('documents'), suggestedName || 'proyek.moodify'), filters });
  if (r.canceled || !r.filePath) return { canceled: true };
  let p = r.filePath; if (!/\.moodify$/i.test(p)) p += '.moodify';
  return { path: p, name: path.basename(p) };
});
ipcMain.handle('write-file', async (_e, p, bytes) => {
  const tmp = p + '.tmp';
  await fs.promises.writeFile(tmp, Buffer.from(bytes));
  await fs.promises.rename(tmp, p);          // tulis aman: file lama tidak rusak bila gagal di tengah
  app.addRecentDocument(p);
  return true;
});
ipcMain.handle('read-file', async (_e, p) => new Uint8Array(await fs.promises.readFile(p)));
ipcMain.handle('exists', async (_e, p) => !!p && fs.existsSync(p));
ipcMain.handle('open-project-dialog', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Buka proyek', properties: ['openFile'], filters: [...filters, { name: 'Semua file', extensions: ['*'] }] });
  if (r.canceled || !r.filePaths[0]) return { canceled: true };
  const p = r.filePaths[0]; app.addRecentDocument(p);
  return { path: p, name: path.basename(p), bytes: new Uint8Array(await fs.promises.readFile(p)) };
});
ipcMain.handle('save-export', async (_e, name, bytes) => {
  const ext = (path.extname(name) || '.bin').slice(1);
  const r = await dialog.showSaveDialog(win, { title: 'Simpan', defaultPath: path.join(app.getPath('downloads'), name), filters: [{ name: ext.toUpperCase(), extensions: [ext] }] });
  if (r.canceled || !r.filePath) return { canceled: true };
  await fs.promises.writeFile(r.filePath, Buffer.from(bytes));
  return { path: r.filePath, name: path.basename(r.filePath) };
});
ipcMain.on('renderer-ready', () => { rendererReady = true; const list = pendingOpen; pendingOpen = []; list.forEach(sendOpen); });

// ---------- menu sistem (Copy/Paste di kolom isian, Quit, dsb.) ----------
function buildMenu() {
  const mac = process.platform === 'darwin';
  const tpl = [
    ...(mac ? [{ label: 'Price List Studio', submenu: [{ role: 'about', label: 'Tentang Price List Studio' }, { type: 'separator' }, { role: 'hide', label: 'Sembunyikan Price List Studio' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit', label: 'Keluar dari Price List Studio' }] }] : []),
    { label: 'Edit', submenu: [{ role: 'undo', label: 'Undo' }, { role: 'redo', label: 'Redo' }, { type: 'separator' }, { role: 'cut', label: 'Potong' }, { role: 'copy', label: 'Salin' }, { role: 'paste', label: 'Tempel' }, { role: 'selectAll', label: 'Pilih semua' }] },
    { label: 'Tampilan', submenu: [{ role: 'togglefullscreen', label: 'Layar penuh' }, { role: 'resetZoom', label: 'Ukuran normal' }, { role: 'zoomIn', label: 'Perbesar' }, { role: 'zoomOut', label: 'Perkecil' }, ...(app.isPackaged ? [] : [{ role: 'toggleDevTools' }])] },
    { role: 'windowMenu', label: 'Jendela' }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(tpl));
  if (!mac) Menu.setApplicationMenu(null); // Windows: pakai menu bar di dalam aplikasi
}

app.setName('Price List Studio');
app.setAboutPanelOptions({ applicationName: 'Price List Studio', applicationVersion: app.getVersion(), copyright: '© Moodifypreset' });
app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) { try { app.dock.setIcon(path.join(__dirname, 'build', 'icon.png')); } catch (e) {} }  // ikon Dock saat mode uji coba
  buildMenu();
  showSplash();
  createWindow();
  process.argv.slice(1).forEach(sendOpen); // Windows: klik 2x file saat aplikasi belum terbuka
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('before-quit', () => { /* dialog tutup tetap ditangani will-prevent-unload */ });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
