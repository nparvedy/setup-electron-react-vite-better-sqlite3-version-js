// db.js (module de gestion de la BDD)
import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';

// Chemin vers le fichier de la base de données dans userData
const dbPath = path.join(app.getPath('userData'), 'app.db');
const db = new Database(dbPath);

// Vérifier si la table money existe
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='money'").all();

if (tables.length > 0) {
    // Table money existe, vérifier si colonne limit_date est présente
    const cols = db.prepare("PRAGMA table_info(money)").all();
    const hasLimit = cols.some(c => c.name === 'limit_date');
    if (!hasLimit) {
      // Ajouter la colonne limit_date
      db.prepare("ALTER TABLE money ADD COLUMN limit_date DATE").run();
      // Initialiser limit_date pour les lignes existantes à aujourd'hui
      db.prepare("UPDATE money SET limit_date = date('now','localtime')").run();
    }
  } 

// Création de la table payment
db.prepare(`
  CREATE TABLE IF NOT EXISTS payment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT,
    amount DECIMAL,
    sampling_date DATE,
    nbr_month INTEGER,
    pause BOOLEAN
  )
`).run();

// Table money avec solde et date limite
db.prepare(`
    CREATE TABLE IF NOT EXISTS money (
      my_money DECIMAL,
      limit_date DATE
    )
  `).run();
  

// Initialisation : insérer une ligne si vide
const count = db.prepare('SELECT COUNT(*) AS c FROM money').get().c;
if (count === 0) {
  db.prepare(`INSERT INTO money(my_money, limit_date) VALUES (?, date('now','localtime'))`).run(0);
}

// À chaque démarrage, mettre à jour la date limite si antérieure à aujourd'hui
db.prepare(`
    UPDATE money
    SET limit_date = date('now','localtime')
    WHERE date(limit_date) < date('now','localtime')
  `).run();
  
export default db;

// ... autres handlers et logique d'application ...
