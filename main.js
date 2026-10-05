const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

let mainWindow;
let sqliteDb;
let dbFile;

const STORES = ['settings','funds','incomeCategories','expenseCategories','bankAccounts','users',
  'receipts','payments','transfers','chittyMembers','chittyCollections','chittyPayouts','loans','offerings','festivals'];

function safeTable(name) {
  if (!STORES.includes(name)) throw new Error('Invalid store: ' + name);
  return '"' + name.replace(/"/g, '""') + '"';
}

function persistDb() {
  const data = sqliteDb.export();
  fs.writeFileSync(dbFile, Buffer.from(data));
}

function initDatabase(SQL) {
  dbFile = path.join(app.getPath('userData'), 'temple_accounts.sqlite');
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  if (fs.existsSync(dbFile)) {
    sqliteDb = new SQL.Database(new Uint8Array(fs.readFileSync(dbFile)));
  } else {
    sqliteDb = new SQL.Database();
  }
  for (const store of STORES) {
    const table = safeTable(store);
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS ${table} (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL)`);
  }
  persistDb();
}

ipcMain.handle('sqlite:init', async () => {
  if (!sqliteDb) {
    const SQL = await initSqlJs({ locateFile: file => path.join(__dirname, 'node_modules', 'sql.js', 'dist', file) });
    initDatabase(SQL);
  }
  return { ok: true, file: dbFile };
});

ipcMain.handle('sqlite:getAll', (_event, name) => {
  const table = safeTable(name);
  const result = sqliteDb.exec(`SELECT id, data FROM ${table} ORDER BY id ASC`);
  if (!result.length) return [];
  return result[0].values.map(([id, data]) => ({ ...JSON.parse(data), id }));
});

ipcMain.handle('sqlite:getOne', (_event, name, id) => {
  const table = safeTable(name);
  const stmt = sqliteDb.prepare(`SELECT id, data FROM ${table} WHERE id = ? LIMIT 1`);
  stmt.bind([Number(id)]);
  let out = null;
  if (stmt.step()) {
    const row = stmt.getAsObject();
    out = { ...JSON.parse(row.data), id: Number(row.id) };
  }
  stmt.free();
  return out;
});

ipcMain.handle('sqlite:add', (_event, name, obj) => {
  const table = safeTable(name);
  const copy = { ...obj };
  const explicitId = Number.isInteger(copy.id) && copy.id > 0 ? copy.id : null;
  delete copy.id;
  if (explicitId !== null) {
    sqliteDb.run(`INSERT INTO ${table} (id, data) VALUES (?, ?)`, [explicitId, JSON.stringify(copy)]);
  } else {
    sqliteDb.run(`INSERT INTO ${table} (data) VALUES (?)`, [JSON.stringify(copy)]);
  }
  const r = sqliteDb.exec('SELECT last_insert_rowid() AS id');
  const id = explicitId !== null ? explicitId : Number(r[0].values[0][0]);
  persistDb();
  return id;
});

ipcMain.handle('sqlite:put', (_event, name, obj) => {
  const table = safeTable(name);
  if (!obj || !Number.isInteger(Number(obj.id))) throw new Error('Record id is required');
  const id = Number(obj.id);
  const copy = { ...obj };
  delete copy.id;
  const check = sqliteDb.exec(`SELECT id FROM ${table} WHERE id = ${id} LIMIT 1`);
  if (check.length && check[0].values.length) {
    sqliteDb.run(`UPDATE ${table} SET data = ? WHERE id = ?`, [JSON.stringify(copy), id]);
  } else {
    sqliteDb.run(`INSERT INTO ${table} (id, data) VALUES (?, ?)`, [id, JSON.stringify(copy)]);
  }
  persistDb();
  return id;
});

ipcMain.handle('sqlite:delete', (_event, name, id) => {
  const table = safeTable(name);
  sqliteDb.run(`DELETE FROM ${table} WHERE id = ?`, [Number(id)]);
  persistDb();
  return true;
});

ipcMain.handle('sqlite:clear', (_event, name) => {
  const table = safeTable(name);
  sqliteDb.run(`DELETE FROM ${table}`);
  persistDb();
  return true;
});

ipcMain.handle('sqlite:backup', async () => {
  if (!sqliteDb) return false;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Backup Temple Accounts SQLite Database',
    defaultPath: 'temple_accounts_backup.sqlite',
    filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }]
  });
  if (result.canceled || !result.filePath) return false;
  fs.copyFileSync(dbFile, result.filePath);
  return true;
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
