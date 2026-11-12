'use strict';
const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, globalShortcut, nativeImage, screen, powerSaveBlocker, net } = require('electron');
const path = require('path');
const fs = require('fs');

const ICON = path.join(__dirname, 'assets', 'icon.png');
const gotLock = app.requestSingleInstanceLock();      // only one Sky Clock at a time
if (!gotLock) app.quit();
app.setAppUserModelId('com.skyclock.desktop');        // needed for Windows notifications

let win = null, tray = null, quitting = false, cfg = {}, saveTimer = null;
let miniOn = false, fullBounds = null, miniSz = { w: 0, h: 0 };               // mini timer mode: the window is one card, and the full-size bounds are kept to restore
const cfgPath = () => path.join(app.getPath('userData'), 'window.json');
const loadCfg = () => { try { return JSON.parse(fs.readFileSync(cfgPath(), 'utf8')); } catch (e) { return {}; } };
const saveCfg = () => { try { fs.writeFileSync(cfgPath(), JSON.stringify(cfg)); } catch (e) {} };

const onScreen = b => b && [b.x, b.y, b.width, b.height].every(Number.isFinite) && screen.getAllDisplays().some(d => {
  const a = d.workArea;
  return b.x < a.x + a.width - 40 && b.x + b.width > a.x + 40 && b.y < a.y + a.height - 40 && b.y + b.height > a.y + 40;
});

// ---------- keyboard shortcuts (work from anywhere, even while the window is hidden) ----------
const DEFAULT_KEYS = { toggle: 'Alt+Shift+K', theme: 'Alt+Shift+B', flip: 'Alt+Shift+F', ind: 'Alt+Shift+I', mil: 'Alt+Shift+M', mini: 'Alt+Shift+T', mview: 'Alt+Shift+V', quit: 'Alt+Shift+Q' };
let shortcuts = { ...DEFAULT_KEYS };
const scOk = { toggle: false, theme: false, flip: false, ind: false, mil: false, mini: false, mview: false, quit: false };          // did Windows let us have that key combination?
const quitApp = () => { quitting = true; app.quit(); };
const toggleTheme = () => { if (win) win.webContents.send('theme:toggle'); };   // the page switches Sky <-> Black
const flipBoard = () => { if (win) win.webContents.send('flip:toggle'); };   // the page flips Time until <-> Kanban
const toggleInd = () => { if (win) win.webContents.send('ind:toggle'); };   // the page shows or hides the dots and LIVE badges
const toggleMil = () => { if (win) win.webContents.send('mil:toggle'); };   // the page switches 12-hour <-> 24-hour time
const toggleMini = () => { if (!win) return; if (!win.isVisible() || win.isMinimized()) { if (win.isMinimized()) win.restore(); win.show(); } win.focus(); win.webContents.send('mini:toggle'); };   // the page shrinks to the chosen timer, or expands back
const miniView = () => { if (win) win.webContents.send('mview:toggle'); };   // inside mini mode: Kanban card <-> Time until view
const actions = { toggle: () => toggle(), theme: toggleTheme, flip: flipBoard, ind: toggleInd, mil: toggleMil, mini: toggleMini, mview: miniView, quit: quitApp };
const MODS = ['Ctrl', 'Control', 'CommandOrControl', 'CmdOrCtrl', 'Alt', 'Option', 'AltGr', 'Shift', 'Super', 'Meta', 'Command', 'Cmd'];
const BLOCKED = ['ctrl+c', 'ctrl+v', 'ctrl+x', 'ctrl+z', 'ctrl+y', 'ctrl+a', 'ctrl+s', 'alt+f4', 'alt+tab'];
function validAccel(a) {                               // '' means "off"
  if (a === '') return true;
  if (typeof a !== 'string' || a.length > 40 || BLOCKED.includes(a.toLowerCase())) return false;
  const parts = a.split('+'), key = parts.pop();
  if (!key || parts.length < 1 || !parts.every(m => MODS.includes(m))) return false;
  return parts.some(m => m !== 'Shift');               // Shift alone would steal normal typing
}
function registerAll() {
  globalShortcut.unregisterAll();
  for (const k of Object.keys(DEFAULT_KEYS)) {
    scOk[k] = false;
    if (!shortcuts[k]) continue;
    try { scOk[k] = !!globalShortcut.register(shortcuts[k], actions[k]); } catch (e) { scOk[k] = false; }
  }
  rebuildMenu();
}
const scSnapshot = () => ({
  toggle: { accel: shortcuts.toggle, ok: scOk.toggle },
  theme: { accel: shortcuts.theme, ok: scOk.theme },
  flip: { accel: shortcuts.flip, ok: scOk.flip },
  ind: { accel: shortcuts.ind, ok: scOk.ind },
  mil: { accel: shortcuts.mil, ok: scOk.mil },
  mini: { accel: shortcuts.mini, ok: scOk.mini },
  mview: { accel: shortcuts.mview, ok: scOk.mview },
  quit: { accel: shortcuts.quit, ok: scOk.quit },
});

// "Start with Windows" must point at the real exe (the portable build unpacks itself to a temp folder)
const loginOpts = () => ({ path: process.env.PORTABLE_EXECUTABLE_FILE || process.execPath, args: ['--hidden'] });
const setAutostart = on => app.setLoginItemSettings({ openAtLogin: on, ...loginOpts() });

function setPin(on) {
  win.setAlwaysOnTop(on, 'floating');
  cfg.alwaysOnTop = on; saveCfg(); rebuildMenu();
  return on;
}
function toggle() {
  if (win.isVisible() && !win.isMinimized()) win.hide();
  else { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
}
function rebuildMenu() {
  if (!tray || !win) return;
  const hint = k => (shortcuts[k] ? '    ' + shortcuts[k] : '');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: (win.isVisible() ? 'Hide Sky Clock' : 'Show Sky Clock') + hint('toggle'), click: toggle },
    { label: 'Switch Sky / Black' + hint('theme'), click: toggleTheme },
    { label: 'Flip Time until / Kanban' + hint('flip'), click: flipBoard },
    { label: 'Show / hide dots & LIVE badges' + hint('ind'), click: toggleInd },
    { label: '12-hour / 24-hour time' + hint('mil'), click: toggleMil },
    { label: 'Mini timer window' + hint('mini'), click: toggleMini },
    { label: 'Mini: switch card / Time until' + hint('mview'), click: miniView },
    { label: 'Always on top', type: 'checkbox', checked: win.isAlwaysOnTop(), click: i => setPin(i.checked) },
    { label: 'Start with Windows', type: 'checkbox', checked: app.getLoginItemSettings(loginOpts()).openAtLogin, click: i => setAutostart(i.checked) },
    { type: 'separator' },
    { label: 'Quit' + hint('quit'), click: quitApp },
  ]));
}

function leaveMini() {                                 // back to the full-size window where it was
  if (!miniOn || !win) return;
  miniOn = false; win.setResizable(true); win.setMinimumSize(280, 360);
  if (fullBounds) win.setBounds(fullBounds);
  fullBounds = null;
}

function createWindow() {
  cfg = loadCfg();
  const saved = cfg.shortcuts || {};
  for (const k of Object.keys(DEFAULT_KEYS)) shortcuts[k] = typeof saved[k] === 'string' && validAccel(saved[k]) ? saved[k] : DEFAULT_KEYS[k];
  const wa = screen.getPrimaryDisplay().workArea;
  const b = onScreen(cfg.bounds) ? cfg.bounds : { width: 360, height: 760, x: wa.x + wa.width - 380, y: wa.y + 20 };
  win = new BrowserWindow({
    ...b, minWidth: 280, minHeight: 360, frame: false, backgroundColor: '#12163a', show: false,
    alwaysOnTop: !!cfg.alwaysOnTop, icon: ICON, title: 'Sky Clock',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      backgroundThrottling: false,                     // keep timers exact while the window is hidden
      autoplayPolicy: 'no-user-gesture-required',      // alarms can beep without a click
    },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', e => e.preventDefault());
  // while the window is selected: Ctrl+W hides it to the tray, Ctrl+Q quits
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown' || !input.control || input.alt || input.meta || input.shift) return;
    const key = String(input.key || '').toLowerCase();
    if (key === 'w') { e.preventDefault(); win.close(); }
    else if (key === 'q') { e.preventDefault(); quitApp(); }
    else if (key === 'b') { e.preventDefault(); toggleTheme(); }
    else if (key === 'f') { e.preventDefault(); flipBoard(); }
  });
  win.webContents.on('did-start-loading', () => leaveMini());   // a reload (e.g. after applying a sync code) starts in the normal view, so the window must be full size again
  win.loadFile(path.join(__dirname, 'index.html'));
  win.once('ready-to-show', () => { if (!process.argv.includes('--hidden')) win.show(); });

  const remember = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!win || win.isMinimized() || win.isMaximized()) return;
      if (miniOn) { const b = win.getBounds(); cfg.miniPos = { x: b.x, y: b.y }; saveCfg(); }   // the small window remembers its own spot, never overwriting the full-size bounds
      else { cfg.bounds = win.getBounds(); saveCfg(); }
    }, 400);
  };
  win.on('resize', remember); win.on('move', remember);
  win.on('show', rebuildMenu); win.on('hide', rebuildMenu);
  win.on('close', e => {                               // the X only hides it, so alarms keep working
    if (quitting) return;
    e.preventDefault(); win.hide();
    if (!cfg.toldTray && Notification.isSupported()) {
      cfg.toldTray = true; saveCfg();
      new Notification({ title: 'Sky Clock is still running', body: 'It stays in the system tray so your timers keep working. Right-click the tray icon to quit.', icon: ICON }).show();
    }
  });
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 }));
  tray.setToolTip('Sky Clock');
  tray.on('click', toggle);
  rebuildMenu();
}

if (gotLock) {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
  app.on('before-quit', () => { quitting = true; });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', () => {});               // stay alive in the tray

  let sleepBlock = null;                               // while an alarm or pomodoro is counting, Windows is asked not to go to sleep (the screen can still turn off)
  ipcMain.on('power:keep', (e, on) => {
    if (on && sleepBlock === null) sleepBlock = powerSaveBlocker.start('prevent-app-suspension');
    else if (!on && sleepBlock !== null) { powerSaveBlocker.stop(sleepBlock); sleepBlock = null; }
  });
  ipcMain.handle('geo:lookup', async () => {            // Electron has no GPS / Windows location service, so find the approximate spot from the internet connection
    const tries = [
      ['https://ipwho.is/', j => j && j.success !== false && j],
      ['https://ipapi.co/json/', j => j && !j.error && j],
    ];
    for (const [url, pick] of tries) {
      try {
        const r = await net.fetch(url, { signal: AbortSignal.timeout(8000) });
        const g = pick(await r.json());
        if (g && Number.isFinite(+g.latitude) && Number.isFinite(+g.longitude)) return { ok: true, lat: +g.latitude, lon: +g.longitude, city: String(g.city || '').slice(0, 60) };
      } catch (e) {}
    }
    return { ok: false };
  });
  ipcMain.on('mini:size', (e, on, w, h) => {            // the page tells us how big its card is; the window follows
    if (!win) return;
    if (!on) { leaveMini(); return; }
    if (!Number.isFinite(w) || !Number.isFinite(h)) return;
    w = Math.round(Math.max(200, Math.min(w, 900))); h = Math.round(Math.max(40, Math.min(h, 900))); miniSz = { w, h };
    if (!miniOn) {
      miniOn = true; fullBounds = win.getBounds();
      const cur = fullBounds, p = cfg.miniPos && onScreen({ x: cfg.miniPos.x, y: cfg.miniPos.y, width: w, height: h }) ? cfg.miniPos : { x: cur.x, y: cur.y };
      win.setMinimumSize(1, 1); win.setResizable(false);   // resizable first: on Windows, switching it afterwards changes the frame and would clip the card
      win.setBounds({ x: Math.round(p.x), y: Math.round(p.y), width: w, height: h });
    } else {
      const b = win.getBounds(); if (b.width !== w || b.height !== h) win.setBounds({ x: b.x, y: b.y, width: w, height: h });
    }
    win.setContentSize(w, h);                           // the page area is exactly the card
  });
  ipcMain.handle('pin:get', () => (win ? win.isAlwaysOnTop() : false));
  ipcMain.handle('pin:toggle', () => setPin(!win.isAlwaysOnTop()));
  ipcMain.on('win:reload', () => win && win.webContents.reload());   // used after a sync code is applied
  ipcMain.on('win:minimize', () => win && win.minimize());
  ipcMain.on('win:hide', () => win && win.hide());
  ipcMain.handle('win:getPos', () => (win ? win.getPosition() : [0, 0]));
  ipcMain.on('win:setPos', (e, x, y) => {
    if (!win || !Number.isFinite(x) || !Number.isFinite(y)) return;
    if (miniOn) {                                       // the small card may touch the very edge of the screen, but never leave it
      const { w, h } = miniSz, d = screen.getDisplayNearestPoint({ x: Math.round(x + w / 2), y: Math.round(y + h / 2) }).bounds;
      x = Math.max(d.x, Math.min(x, d.x + d.width - w)); y = Math.max(d.y, Math.min(y, d.y + d.height - h));
      win.setBounds({ x: Math.round(x), y: Math.round(y), width: w, height: h });   // position AND size together: setPosition alone lets the size drift on scaled Windows displays
      return;
    }
    win.setPosition(Math.round(x), Math.round(y));
  });
  const liveNotes = new Set();
  ipcMain.on('notify', (e, title, text) => {
    if (!Notification.isSupported()) return;
    const n = new Notification({ title: String(title).slice(0, 100), body: String(text).slice(0, 300), icon: ICON, timeoutType: 'never' });   // stays on screen until you close it (on Windows this adds a Close button)
    liveNotes.add(n); n.on('close', () => liveNotes.delete(n));                                                                              // keep a reference so a long-lived notification is not garbage collected
    n.on('click', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });   // click it to open the app
    n.show();
    if (win && win.isVisible() && !win.isFocused()) { win.flashFrame(true); win.once('focus', () => win.flashFrame(false)); }   // blink the taskbar button
  });

  ipcMain.handle('shortcuts:get', () => scSnapshot());
  ipcMain.on('shortcuts:pause', (e, on) => { if (on) globalShortcut.unregisterAll(); else registerAll(); });   // so recording a combo does not trigger it
  ipcMain.handle('shortcuts:set', (e, name, accel) => {
    if (!(name in DEFAULT_KEYS) || typeof accel !== 'string') return { ok: false, error: 'Unknown shortcut.' };
    if (!validAccel(accel)) return { ok: false, error: 'Use Ctrl, Alt or the Windows key together with another key (Shift alone is not enough).' };
    for (const k of Object.keys(DEFAULT_KEYS)) {
      if (k !== name && accel && shortcuts[k] && shortcuts[k].toLowerCase() === accel.toLowerCase()) return { ok: false, error: 'That combination is already used by another shortcut.' };
    }
    const prev = shortcuts[name];
    shortcuts[name] = accel; registerAll();
    if (accel && !scOk[name]) { shortcuts[name] = prev; registerAll(); return { ok: false, error: accel + ' is already used by another program or by Windows. Try different keys.' }; }
    cfg.shortcuts = { ...shortcuts }; saveCfg();
    return { ok: true, shortcuts: scSnapshot() };
  });
  ipcMain.handle('shortcuts:reset', () => { shortcuts = { ...DEFAULT_KEYS }; registerAll(); cfg.shortcuts = { ...shortcuts }; saveCfg(); return scSnapshot(); });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    createWindow();
    createTray();
    registerAll();                                     // global shortcuts: show/hide and quit, from anywhere
  });
}
