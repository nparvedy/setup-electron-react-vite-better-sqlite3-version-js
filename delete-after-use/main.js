const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./db');

function createWindow() {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // devTools: true,
      
    }
  });
  win.loadFile('index.html');
  // win.webContents.openDevTools({ mode: 'detach' });
  win.maximize();
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// Fonctions utilitaires
function recalcBalance(limit_date) {
    const { total = 0 } = db.prepare(
      'SELECT SUM(amount) AS total FROM payment WHERE sampling_date <= ?'
    ).get(limit_date);
    db.prepare('UPDATE money SET my_money = ?').run(total);
    return total;
  }

// Batch update by source
function updateBySource({ source, newAmount, startDate, endDate }) {
  const stmt = db.prepare(
    'UPDATE payment SET amount = ? WHERE source = ? AND sampling_date BETWEEN ? AND ?'
  );
  const info = stmt.run(newAmount, source, startDate, endDate);
  return info.changes;
}

// Helper to add payments with repeats up to limit_date
function addPaymentSeries(data) {
    const { source, amount, sampling_date, nbr_month, pause } = data;
    const insert = db.prepare(
      'INSERT INTO payment (source, amount, sampling_date, nbr_month, pause) VALUES (?, ?, ?, ?, ?)'
    );
    const ops = [];
    for (let i = 0; i < nbr_month; i++) {
      const date = new Date(sampling_date);
      date.setMonth(date.getMonth() + i);
      const iso = date.toISOString().slice(0,10);
        ops.push(insert.run(source, amount, iso, nbr_month, pause ? 1 : 0));
    }
    return ops;
  }

// IPC create payment with repeats
ipcMain.handle('payment:create', (event, data) => {
    const ops = addPaymentSeries(data);
    const balance = recalcBalance(db.prepare('SELECT limit_date FROM money LIMIT 1').get().limit_date);
    return { count: ops.length, balance };
  });

  // IPC delete payment
ipcMain.handle('payment:delete', (event, id) => {
    db.prepare('DELETE FROM payment WHERE id = ?').run(id);
    const balance = recalcBalance(db.prepare('SELECT limit_date FROM money LIMIT 1').get().limit_date);
    return { success: true, balance };
  });

  ipcMain.handle('payment:updateBySource', (ev, params) => {
    const changes = updateBySource(params);
    const { limit_date } = db.prepare('SELECT limit_date FROM money LIMIT 1').get();
    const balance = recalcBalance(limit_date);
    return { changes, balance };
  });

  ipcMain.handle('payment:all', () => {
    // Retourne uniquement les paiements compris entre la date limite et trois mois avant
    const { limit_date } = db.prepare('SELECT limit_date FROM money LIMIT 1').get();
    return db.prepare(
      `SELECT * FROM payment
       WHERE sampling_date <= ?
         AND sampling_date >= date(?, '-3 months')
       ORDER BY sampling_date DESC`
    ).all(limit_date, limit_date);
  });

// Mise à jour de payment
ipcMain.handle('payment:update', (event, data) => {
    db.prepare(
      'UPDATE payment SET source = ?, amount = ?, sampling_date = ?, nbr_month = ?, pause = ? WHERE id = ?'
    ).run(data.source, data.amount, data.sampling_date, data.nbr_month, data.pause ? 1 : 0, data.id);
    const { limit_date } = db.prepare('SELECT limit_date FROM money LIMIT 1').get();
    const balance = recalcBalance(limit_date);
    return { success: true, balance };
  });

// Récupérer solde
ipcMain.handle('money:get', () => {
    const row = db.prepare('SELECT my_money FROM money LIMIT 1').get();
    return row ? row.my_money : 0;
});
  
// Récupérer date limite
ipcMain.handle('money:getLimitDate', () => {
    const row = db.prepare('SELECT limit_date FROM money LIMIT 1').get();
    return row ? row.limit_date : null;
});
  
// Mettre à jour date limite (et recalculer solde)
ipcMain.handle('money:setLimitDate', (event, newDate) => {
  db.prepare('UPDATE money SET limit_date = ?').run(newDate);
  const balance = recalcBalance(newDate);
  return { success: true, balance };
});