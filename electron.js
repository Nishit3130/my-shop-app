// const { app, BrowserWindow, Menu, ipcMain } = require('electron');
// const path = require('path');
// const url = require('url');
// const db = require('./electron-db');

// let mainWindow;

// function createWindow() {
//   mainWindow = new BrowserWindow({
//     width: 1200,
//     height: 800,
//     webPreferences: {
//       nodeIntegration: false,    // Recommended for security
//       contextIsolation: true,   // Recommended for security
//       preload: path.join(__dirname, 'preload.js') 
//     },
//     icon: path.join(__dirname, 'src/assets/icon.png') // ACTION: Replace with your actual icon path e.g. src/assets/KSB.png
//   });

//   // Path to your Angular app's index.html
//   // This path must match the output from your 'ng build --configuration electron'
//   // Assuming your angular.json's "electron" config outputPath is "dist/my-shop-app-electron",
//   // and the builder creates a "browser" subfolder for client assets:
//   const startUrl = url.format({
//     pathname: path.join(__dirname, 'dist/my-shop-app-electron/browser/index.html'), // VERIFY THIS PATH!
//     protocol: 'file:',
//     slashes: true
//   });
  
//   console.log(`[Electron Main] Attempting to load Angular app from: ${startUrl}`);
//   mainWindow.loadURL(startUrl)
//     .then(() => {
//       console.log('[Electron Main] Angular app loaded successfully.');
//     })
//     .catch(err => {
//       console.error('[Electron Main] Failed to load Angular app:', err);
//       // Optionally, load a fallback error page or show a dialog
//       // mainWindow.loadFile(path.join(__dirname, 'error.html')); 
//     });


//   // Optional: Open DevTools for development
//   // if (!app.isPackaged) { // Check if running in packaged app or development
//   //   mainWindow.webContents.openDevTools();
//   // }

//   // Optional: Remove default application menu
//   // Menu.setApplicationMenu(null);

//   mainWindow.on('closed', () => {
//     mainWindow = null;
//   });
// }

// app.on('ready', () => {
//   db.initializeDatabase();
//   createWindow();
//   setupIpcHandlers();
// });

// app.on('window-all-closed', () => {
//   db.closeDatabase();
//   if (process.platform !== 'darwin') {
//     app.quit();
//   }
// });

// app.on('activate', () => {
//   if (mainWindow === null) {
//     createWindow();
//   }
// });

// // ============ IPC HANDLERS ============

// function setupIpcHandlers() {
//   // Generic database operations
//   ipcMain.handle('db:query', (event, sql, params) => db.query(sql, params));
//   ipcMain.handle('db:run', (event, sql, params) => db.run(sql, params));
//   ipcMain.handle('db:get', (event, sql, params) => db.get(sql, params));

//   // Customers
//   ipcMain.handle('db:customers:getAll', () => db.getAllCustomers());
//   ipcMain.handle('db:customers:get', (event, id) => db.getCustomer(id));
//   ipcMain.handle('db:customers:add', (event, customer) => db.addCustomer(customer));
//   ipcMain.handle('db:customers:update', (event, id, customer) => db.updateCustomer(id, customer));
//   ipcMain.handle('db:customers:delete', (event, id) => db.deleteCustomer(id));

//   // Products
//   ipcMain.handle('db:products:getAll', () => db.getAllProducts());
//   ipcMain.handle('db:products:get', (event, id) => db.getProduct(id));
//   ipcMain.handle('db:products:add', (event, product) => db.addProduct(product));
//   ipcMain.handle('db:products:update', (event, id, product) => db.updateProduct(id, product));
//   ipcMain.handle('db:products:delete', (event, id) => db.deleteProduct(id));

//   // Suppliers
//   ipcMain.handle('db:suppliers:getAll', () => db.getAllSuppliers());
//   ipcMain.handle('db:suppliers:get', (event, id) => db.getSupplier(id));
//   ipcMain.handle('db:suppliers:add', (event, supplier) => db.addSupplier(supplier));
//   ipcMain.handle('db:suppliers:update', (event, id, supplier) => db.updateSupplier(id, supplier));
//   ipcMain.handle('db:suppliers:delete', (event, id) => db.deleteSupplier(id));

//   // Bills
//   ipcMain.handle('db:bills:getAll', () => db.getAllBills());
//   ipcMain.handle('db:bills:get', (event, id) => db.getBill(id));
//   ipcMain.handle('db:bills:add', (event, bill) => db.addBill(bill));
//   ipcMain.handle('db:bills:update', (event, id, bill) => db.updateBill(id, bill));
//   ipcMain.handle('db:bills:delete', (event, id) => db.deleteBill(id));
//   ipcMain.handle('db:bills:getNextNumber', () => db.getNextBillNumber());

//   // Purchases
//   ipcMain.handle('db:purchases:getAll', () => db.getAllPurchases());
//   ipcMain.handle('db:purchases:get', (event, id) => db.getPurchase(id));
//   ipcMain.handle('db:purchases:add', (event, purchase) => db.addPurchase(purchase));
//   ipcMain.handle('db:purchases:update', (event, id, purchase) => db.updatePurchase(id, purchase));
//   ipcMain.handle('db:purchases:delete', (event, id) => db.deletePurchase(id));

//   // Payments
//   ipcMain.handle('db:payments:getAll', () => db.getAllPayments());
//   ipcMain.handle('db:payments:get', (event, id) => db.getPayment(id));
//   ipcMain.handle('db:payments:add', (event, payment) => db.addPayment(payment));
//   ipcMain.handle('db:payments:delete', (event, id) => db.deletePayment(id));
//   ipcMain.handle('db:payments:getByEntity', (event, entityId) => db.getPaymentsByEntity(entityId));

//   // Transactions
//   ipcMain.handle('db:transactions:getAll', () => db.getAllTransactions());
//   ipcMain.handle('db:transactions:get', (event, id) => db.getTransaction(id));
//   ipcMain.handle('db:transactions:add', (event, transaction) => db.addTransaction(transaction));
//   ipcMain.handle('db:transactions:delete', (event, id) => db.deleteTransaction(id));
//   ipcMain.handle('db:transactions:getByDateRange', (event, startDate, endDate) => db.getTransactionsByDateRange(startDate, endDate));

//   // External Accounts
//   ipcMain.handle('db:external-accounts:getAll', () => db.getAllExternalAccounts());
//   ipcMain.handle('db:external-accounts:get', (event, id) => db.getExternalAccount(id));
//   ipcMain.handle('db:external-accounts:add', (event, account) => db.addExternalAccount(account));
//   ipcMain.handle('db:external-accounts:update', (event, id, account) => db.updateExternalAccount(id, account));
//   ipcMain.handle('db:external-accounts:delete', (event, id) => db.deleteExternalAccount(id));

//   // External Ledger Entries
//   ipcMain.handle('db:ledger-entries:getByAccount', (event, accountId) => db.getExternalLedgerEntries(accountId));
//   ipcMain.handle('db:ledger-entries:add', (event, entry) => db.addExternalLedgerEntry(entry));
//   ipcMain.handle('db:ledger-entries:delete', (event, id) => db.deleteExternalLedgerEntry(id));

//   // Settings
//   ipcMain.handle('db:settings:get', (event, key) => db.getSetting(key));
//   ipcMain.handle('db:settings:set', (event, key, value) => db.setSetting(key, value));
//   ipcMain.handle('db:settings:getAll', () => db.getAllSettings());

//   // Reports
//   ipcMain.handle('db:reports:getCustomerBalance', (event, customerId) => db.getCustomerBalance(customerId));
//   ipcMain.handle('db:reports:getSalesReport', (event, startDate, endDate) => db.getSalesReport(startDate, endDate));
//   ipcMain.handle('db:reports:getPurchaseReport', (event, startDate, endDate) => db.getPurchaseReport(startDate, endDate));
// }
// process.on('uncaughtException', (error) => {
//     console.error('CRITICAL APP CRASH:', error);
// });
// const { app, BrowserWindow, ipcMain } = require('electron');
// const path = require('path');
// const url = require('url');
// const Database = require('better-sqlite3');

// let mainWindow;
// let db;

// function initDatabase() {
//     const userDataPath = app.getPath('userData');
//     const dbPath = path.join(userDataPath, 'shop_manager.db');
//     db = new Database(dbPath);

//     // Full Schema Initialization
//     db.exec(`
//         CREATE TABLE IF NOT EXISTS customers (
//             id TEXT PRIMARY KEY, name TEXT, phone TEXT, email TEXT, address TEXT, creditBalance REAL DEFAULT 0, createdAt TEXT, updatedAt TEXT
//         );
//         CREATE TABLE IF NOT EXISTS products (
//             id TEXT PRIMARY KEY, name TEXT, price REAL, purchasePrice REAL, stock INTEGER, category TEXT, description TEXT, createdAt TEXT, updatedAt TEXT
//         );
//         CREATE TABLE IF NOT EXISTS suppliers (
//             id TEXT PRIMARY KEY, name TEXT, phone TEXT, email TEXT, address TEXT, balanceDue REAL DEFAULT 0, createdAt TEXT, updatedAt TEXT
//         );
//         CREATE TABLE IF NOT EXISTS bills (
//             id TEXT PRIMARY KEY, billNo TEXT UNIQUE, customerId TEXT, total REAL, amountPaid REAL, paymentType TEXT, documentType TEXT, items TEXT, createdAt TEXT, updatedAt TEXT
//         );
//         CREATE TABLE IF NOT EXISTS purchases (
//             id TEXT PRIMARY KEY, supplierId TEXT, total REAL, amountPaid REAL, items TEXT, createdAt TEXT, updatedAt TEXT
//         );
//         CREATE TABLE IF NOT EXISTS payments (
//             id TEXT PRIMARY KEY, entityId TEXT, amount REAL, type TEXT, date TEXT, note TEXT
//         );
//         CREATE TABLE IF NOT EXISTS transactions (
//             id TEXT PRIMARY KEY, description TEXT, amount REAL, type TEXT, category TEXT, date TEXT
//         );
//         CREATE TABLE IF NOT EXISTS external_accounts (
//             id TEXT PRIMARY KEY, name TEXT, balance REAL DEFAULT 0, type TEXT
//         );
//         CREATE TABLE IF NOT EXISTS external_ledger (
//             id TEXT PRIMARY KEY, accountId TEXT, amount REAL, type TEXT, date TEXT, description TEXT
//         );
//         CREATE TABLE IF NOT EXISTS settings (
//             key TEXT PRIMARY KEY, value TEXT
//         );
//     `);
// }

// /** * IPC HANDLERS - Mapped to your Preload Methods
//  */

// // Generic Database API
// ipcMain.handle('db:query', (event, sql, params) => db.prepare(sql).all(params));
// ipcMain.handle('db:run', (event, sql, params) => db.prepare(sql).run(params));
// ipcMain.handle('db:get', (event, sql, params) => db.prepare(sql).get(params));

// // Customers
// ipcMain.handle('db:customers:getAll', () => db.prepare('SELECT * FROM customers').all());
// ipcMain.handle('db:customers:get', (event, id) => db.prepare('SELECT * FROM customers WHERE id = ?').get(id));
// ipcMain.handle('db:customers:add', (event, c) => db.prepare('INSERT INTO customers (id, name, phone, email, address, creditBalance, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(c.id, c.name, c.phone, c.email, c.address, c.creditBalance, c.createdAt, c.updatedAt));
// ipcMain.handle('db:customers:update', (event, id, c) => db.prepare('UPDATE customers SET name=?, phone=?, email=?, address=?, creditBalance=?, updatedAt=? WHERE id=?').run(c.name, c.phone, c.email, c.address, c.creditBalance, c.updatedAt, id));
// ipcMain.handle('db:customers:delete', (event, id) => db.prepare('DELETE FROM customers WHERE id=?').run(id));

// // Products
// ipcMain.handle('db:products:getAll', () => db.prepare('SELECT * FROM products').all());
// ipcMain.handle('db:products:get', (event, id) => db.prepare('SELECT * FROM products WHERE id = ?').get(id));
// ipcMain.handle('db:products:add', (event, p) => db.prepare('INSERT INTO products (id, name, price, purchasePrice, stock, category, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(p.id, p.name, p.price, p.purchasePrice, p.stock, p.category, p.description, p.createdAt, p.updatedAt));
// ipcMain.handle('db:products:update', (event, id, p) => db.prepare('UPDATE products SET name=?, price=?, purchasePrice=?, stock=?, category=?, description=?, updatedAt=? WHERE id=?').run(p.name, p.price, p.purchasePrice, p.stock, p.category, p.description, p.updatedAt, id));
// ipcMain.handle('db:products:delete', (event, id) => db.prepare('DELETE FROM products WHERE id=?').run(id));

// // Suppliers
// ipcMain.handle('db:suppliers:getAll', () => db.prepare('SELECT * FROM suppliers').all());
// ipcMain.handle('db:suppliers:get', (event, id) => db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id));
// ipcMain.handle('db:suppliers:add', (event, s) => db.prepare('INSERT INTO suppliers (id, name, phone, email, address, balanceDue, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(s.id, s.name, s.phone, s.email, s.address, s.balanceDue, s.createdAt, s.updatedAt));
// ipcMain.handle('db:suppliers:update', (event, id, s) => db.prepare('UPDATE suppliers SET name=?, phone=?, email=?, address=?, balanceDue=?, updatedAt=? WHERE id=?').run(s.name, s.phone, s.email, s.address, s.balanceDue, s.updatedAt, id));
// ipcMain.handle('db:suppliers:delete', (event, id) => db.prepare('DELETE FROM suppliers WHERE id=?').run(id));

// // Bills
// ipcMain.handle('db:bills:getAll', () => db.prepare('SELECT * FROM bills').all());
// ipcMain.handle('db:bills:get', (event, id) => db.prepare('SELECT * FROM bills WHERE id = ?').get(id));
// ipcMain.handle('db:bills:add', (event, b) => db.prepare('INSERT INTO bills (id, billNo, customerId, total, amountPaid, paymentType, documentType, items, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(b.id, b.billNo, b.customerId, b.total, b.amountPaid, b.paymentType, b.documentType, JSON.stringify(b.items), b.createdAt, b.updatedAt));
// ipcMain.handle('db:bills:update', (event, id, b) => db.prepare('UPDATE bills SET total=?, amountPaid=?, updatedAt=? WHERE id=?').run(b.total, b.amountPaid, b.updatedAt, id));
// ipcMain.handle('db:bills:delete', (event, id) => db.prepare('DELETE FROM bills WHERE id=?').run(id));
// ipcMain.handle('db:bills:getNextNumber', () => {
//     const row = db.prepare("SELECT COUNT(*) as count FROM bills WHERE documentType = 'BILL'").get();
//     return `INV-${(row.count + 1).toString().padStart(5, '0')}`;
// });

// // Purchases
// ipcMain.handle('db:purchases:getAll', () => db.prepare('SELECT * FROM purchases').all());
// ipcMain.handle('db:purchases:get', (event, id) => db.prepare('SELECT * FROM purchases WHERE id = ?').get(id));
// ipcMain.handle('db:purchases:add', (event, p) => db.prepare('INSERT INTO purchases (id, supplierId, total, amountPaid, items, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)').run(p.id, p.supplierId, p.total, p.amountPaid, JSON.stringify(p.items), p.createdAt, p.updatedAt));
// ipcMain.handle('db:purchases:delete', (event, id) => db.prepare('DELETE FROM purchases WHERE id=?').run(id));

// // Payments
// ipcMain.handle('db:payments:getAll', () => db.prepare('SELECT * FROM payments').all());
// ipcMain.handle('db:payments:getByEntity', (event, entityId) => db.prepare('SELECT * FROM payments WHERE entityId = ?').all(entityId));
// ipcMain.handle('db:payments:add', (event, p) => db.prepare('INSERT INTO payments (id, entityId, amount, type, date, note) VALUES (?, ?, ?, ?, ?, ?)').run(p.id, p.entityId, p.amount, p.type, p.date, p.note));

// // Transactions
// ipcMain.handle('db:transactions:getAll', () => db.prepare('SELECT * FROM transactions').all());
// ipcMain.handle('db:transactions:getByDateRange', (event, start, end) => db.prepare('SELECT * FROM transactions WHERE date >= ? AND date <= ?').all(start, end));
// ipcMain.handle('db:transactions:add', (event, t) => db.prepare('INSERT INTO transactions (id, description, amount, type, category, date) VALUES (?, ?, ?, ?, ?, ?)').run(t.id, t.description, t.amount, t.type, t.category, t.date));

// // External Accounts & Ledger
// ipcMain.handle('db:external-accounts:getAll', () => db.prepare('SELECT * FROM external_accounts').all());
// ipcMain.handle('db:external-accounts:add', (event, a) => db.prepare('INSERT INTO external_accounts (id, name, balance, type) VALUES (?, ?, ?, ?)').run(a.id, a.name, a.balance, a.type));
// ipcMain.handle('db:ledger-entries:getByAccount', (event, accountId) => db.prepare('SELECT * FROM external_ledger WHERE accountId = ?').all(accountId));
// ipcMain.handle('db:ledger-entries:add', (event, e) => db.prepare('INSERT INTO external_ledger (id, accountId, amount, type, date, description) VALUES (?, ?, ?, ?, ?, ?)').run(e.id, e.accountId, e.amount, e.type, e.date, e.description));

// // Settings
// ipcMain.handle('db:settings:get', (event, key) => db.prepare('SELECT value FROM settings WHERE key = ?').get(key));
// ipcMain.handle('db:settings:set', (event, key, value) => db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value));
// ipcMain.handle('db:settings:getAll', () => db.prepare('SELECT * FROM settings').all());

// // Reports
// ipcMain.handle('db:reports:getCustomerBalance', (event, id) => db.prepare('SELECT creditBalance FROM customers WHERE id = ?').get(id));
// ipcMain.handle('db:reports:getSalesReport', (event, start, end) => db.prepare("SELECT * FROM bills WHERE createdAt BETWEEN ? AND ? AND documentType = 'BILL'").all(start, end));

// function createWindow() {
//   mainWindow = new BrowserWindow({
//     width: 1200,
//     height: 800,
//     webPreferences: {
//       nodeIntegration: false,
//       contextIsolation: true,
//       preload: path.join(__dirname, 'preload.js') 
//     },
//     icon: path.join(__dirname, 'src/assets/KSB.png')
//   });

//   const startUrl = url.format({
//     pathname: path.join(__dirname, 'dist/my-shop-app-electron/browser/index.html'),
//     protocol: 'file:',
//     slashes: true
//   });
  
//   mainWindow.loadURL(startUrl).catch(err => console.error(err));

//   mainWindow.on('closed', () => {
//     mainWindow = null;
//   });
// }

// app.on('ready', () => {
//   initDatabase();
//   createWindow();
// });

// app.on('window-all-closed', () => {
//   if (process.platform !== 'darwin') {
//     if (db) db.close();
//     app.quit();
//   }
// });

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const Database = require('better-sqlite3');

// Catch errors before the app quits
process.on('uncaughtException', (error) => {
    console.error('\n!!! CRITICAL APP CRASH !!!\n', error, '\n');
});

let mainWindow;
let db;

function initDatabase() {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'shop_manager.db');
    
    console.log('Initializing SQLite Database at:', dbPath);
    db = new Database(dbPath);

    // Full Schema Initialization
    db.exec(`
        CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY, name TEXT, phone TEXT, email TEXT, address TEXT, creditBalance REAL DEFAULT 0, createdAt TEXT, updatedAt TEXT
        );
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY, name TEXT, price REAL, purchasePrice REAL, stock INTEGER, category TEXT, description TEXT, createdAt TEXT, updatedAt TEXT
        );
        CREATE TABLE IF NOT EXISTS suppliers (
            id TEXT PRIMARY KEY, name TEXT, phone TEXT, email TEXT, address TEXT, balanceDue REAL DEFAULT 0, createdAt TEXT, updatedAt TEXT
        );
        CREATE TABLE IF NOT EXISTS bills (
            id TEXT PRIMARY KEY, billNo TEXT UNIQUE, customerId TEXT, total REAL, amountPaid REAL, paymentType TEXT, documentType TEXT, items TEXT, createdAt TEXT, updatedAt TEXT
        );
        CREATE TABLE IF NOT EXISTS purchases (
            id TEXT PRIMARY KEY, supplierId TEXT, total REAL, amountPaid REAL, items TEXT, createdAt TEXT, updatedAt TEXT
        );
        CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY, entityId TEXT, amount REAL, type TEXT, date TEXT, note TEXT
        );
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY, description TEXT, amount REAL, type TEXT, category TEXT, date TEXT
        );
        CREATE TABLE IF NOT EXISTS external_accounts (
            id TEXT PRIMARY KEY, name TEXT, balance REAL DEFAULT 0, type TEXT
        );
        CREATE TABLE IF NOT EXISTS external_ledger (
            id TEXT PRIMARY KEY, accountId TEXT, amount REAL, type TEXT, date TEXT, description TEXT
        );
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY, value TEXT
        );
    `);
}

/** * IPC HANDLERS - Mapped to your Preload Methods
 */

// Generic Database API
ipcMain.handle('db:query', (event, sql, params) => db.prepare(sql).all(params));
ipcMain.handle('db:run', (event, sql, params) => db.prepare(sql).run(params));
ipcMain.handle('db:get', (event, sql, params) => db.prepare(sql).get(params));

// Customers
ipcMain.handle('db:customers:getAll', () => db.prepare('SELECT * FROM customers').all());
ipcMain.handle('db:customers:get', (event, id) => db.prepare('SELECT * FROM customers WHERE id = ?').get(id));
ipcMain.handle('db:customers:add', (event, c) => db.prepare('INSERT INTO customers (id, name, phone, email, address, creditBalance, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(c.id, c.name, c.phone, c.email, c.address, c.creditBalance, c.createdAt, c.updatedAt));
ipcMain.handle('db:customers:update', (event, id, c) => db.prepare('UPDATE customers SET name=?, phone=?, email=?, address=?, creditBalance=?, updatedAt=? WHERE id=?').run(c.name, c.phone, c.email, c.address, c.creditBalance, c.updatedAt, id));
ipcMain.handle('db:customers:delete', (event, id) => db.prepare('DELETE FROM customers WHERE id=?').run(id));

// Products
ipcMain.handle('db:products:getAll', () => db.prepare('SELECT * FROM products').all());
ipcMain.handle('db:products:get', (event, id) => db.prepare('SELECT * FROM products WHERE id = ?').get(id));
ipcMain.handle('db:products:add', (event, p) => db.prepare('INSERT INTO products (id, name, price, purchasePrice, stock, category, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(p.id, p.name, p.price, p.purchasePrice, p.stock, p.category, p.description, p.createdAt, p.updatedAt));
ipcMain.handle('db:products:update', (event, id, p) => db.prepare('UPDATE products SET name=?, price=?, purchasePrice=?, stock=?, category=?, description=?, updatedAt=? WHERE id=?').run(p.name, p.price, p.purchasePrice, p.stock, p.category, p.description, p.updatedAt, id));
ipcMain.handle('db:products:delete', (event, id) => db.prepare('DELETE FROM products WHERE id=?').run(id));

// Suppliers
ipcMain.handle('db:suppliers:getAll', () => db.prepare('SELECT * FROM suppliers').all());
ipcMain.handle('db:suppliers:get', (event, id) => db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id));
ipcMain.handle('db:suppliers:add', (event, s) => db.prepare('INSERT INTO suppliers (id, name, phone, email, address, balanceDue, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(s.id, s.name, s.phone, s.email, s.address, s.balanceDue, s.createdAt, s.updatedAt));
ipcMain.handle('db:suppliers:update', (event, id, s) => db.prepare('UPDATE suppliers SET name=?, phone=?, email=?, address=?, balanceDue=?, updatedAt=? WHERE id=?').run(s.name, s.phone, s.email, s.address, s.balanceDue, s.updatedAt, id));
ipcMain.handle('db:suppliers:delete', (event, id) => db.prepare('DELETE FROM suppliers WHERE id=?').run(id));

// Bills
ipcMain.handle('db:bills:getAll', () => db.prepare('SELECT * FROM bills').all());
ipcMain.handle('db:bills:get', (event, id) => db.prepare('SELECT * FROM bills WHERE id = ?').get(id));
ipcMain.handle('db:bills:add', (event, b) => db.prepare('INSERT INTO bills (id, billNo, customerId, total, amountPaid, paymentType, documentType, items, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(b.id, b.billNo, b.customerId, b.total, b.amountPaid, b.paymentType, b.documentType, JSON.stringify(b.items), b.createdAt, b.updatedAt));
ipcMain.handle('db:bills:update', (event, id, b) => db.prepare('UPDATE bills SET total=?, amountPaid=?, updatedAt=? WHERE id=?').run(b.total, b.amountPaid, b.updatedAt, id));
ipcMain.handle('db:bills:delete', (event, id) => db.prepare('DELETE FROM bills WHERE id=?').run(id));
ipcMain.handle('db:bills:getNextNumber', () => {
    const row = db.prepare("SELECT COUNT(*) as count FROM bills WHERE documentType = 'BILL'").get();
    return `INV-${(row.count + 1).toString().padStart(5, '0')}`;
});

// Purchases
ipcMain.handle('db:purchases:getAll', () => db.prepare('SELECT * FROM purchases').all());
ipcMain.handle('db:purchases:get', (event, id) => db.prepare('SELECT * FROM purchases WHERE id = ?').get(id));
ipcMain.handle('db:purchases:add', (event, p) => db.prepare('INSERT INTO purchases (id, supplierId, total, amountPaid, items, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)').run(p.id, p.supplierId, p.total, p.amountPaid, JSON.stringify(p.items), p.createdAt, p.updatedAt));
// MISSING HANDLER ADDED: updatePurchase
ipcMain.handle('db:purchases:update', (event, id, p) => db.prepare('UPDATE purchases SET total=?, amountPaid=?, items=?, updatedAt=? WHERE id=?').run(p.total, p.amountPaid, JSON.stringify(p.items), p.updatedAt, id));
ipcMain.handle('db:purchases:delete', (event, id) => db.prepare('DELETE FROM purchases WHERE id=?').run(id));

// Payments
ipcMain.handle('db:payments:getAll', () => db.prepare('SELECT * FROM payments').all());
ipcMain.handle('db:payments:getByEntity', (event, entityId) => db.prepare('SELECT * FROM payments WHERE entityId = ?').all(entityId));
ipcMain.handle('db:payments:add', (event, p) => db.prepare('INSERT INTO payments (id, entityId, amount, type, date, note) VALUES (?, ?, ?, ?, ?, ?)').run(p.id, p.entityId, p.amount, p.type, p.date, p.note));
// MISSING HANDLER ADDED: deletePayment
ipcMain.handle('db:payments:delete', (event, id) => db.prepare('DELETE FROM payments WHERE id=?').run(id));

// Transactions
ipcMain.handle('db:transactions:getAll', () => db.prepare('SELECT * FROM transactions').all());
ipcMain.handle('db:transactions:getByDateRange', (event, start, end) => db.prepare('SELECT * FROM transactions WHERE date >= ? AND date <= ?').all(start, end));
ipcMain.handle('db:transactions:add', (event, t) => db.prepare('INSERT INTO transactions (id, description, amount, type, category, date) VALUES (?, ?, ?, ?, ?, ?)').run(t.id, t.description, t.amount, t.type, t.category, t.date));

// External Accounts & Ledger
ipcMain.handle('db:external-accounts:getAll', () => db.prepare('SELECT * FROM external_accounts').all());
ipcMain.handle('db:external-accounts:add', (event, a) => db.prepare('INSERT INTO external_accounts (id, name, balance, type) VALUES (?, ?, ?, ?)').run(a.id, a.name, a.balance, a.type));
ipcMain.handle('db:ledger-entries:getByAccount', (event, accountId) => db.prepare('SELECT * FROM external_ledger WHERE accountId = ?').all(accountId));
ipcMain.handle('db:ledger-entries:add', (event, e) => db.prepare('INSERT INTO external_ledger (id, accountId, amount, type, date, description) VALUES (?, ?, ?, ?, ?, ?)').run(e.id, e.accountId, e.amount, e.type, e.date, e.description));

// Settings
ipcMain.handle('db:settings:get', (event, key) => db.prepare('SELECT value FROM settings WHERE key = ?').get(key));
ipcMain.handle('db:settings:set', (event, key, value) => db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value));
ipcMain.handle('db:settings:getAll', () => db.prepare('SELECT * FROM settings').all());

// Reports
ipcMain.handle('db:reports:getCustomerBalance', (event, id) => db.prepare('SELECT creditBalance FROM customers WHERE id = ?').get(id));
ipcMain.handle('db:reports:getSalesReport', (event, start, end) => db.prepare("SELECT * FROM bills WHERE createdAt BETWEEN ? AND ? AND documentType = 'BILL'").all(start, end));

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js') 
    },
    icon: path.join(__dirname, 'src/assets/KSB.png')
  });

  const startUrl = url.format({
    pathname: path.join(__dirname, 'dist/my-shop-app-electron/browser/index.html'),
    protocol: 'file:',
    slashes: true
  });
  
  mainWindow.loadURL(startUrl).catch(err => {
      console.error("Failed to load Angular App:", err);
  });

  // Open Developer Tools automatically to help debug any blank screen issues
   //mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Wrap the startup in a modern Promise and Try/Catch
app.whenReady().then(() => {
    try {
        console.log('App is ready. Starting database and window...');
        initDatabase();
        createWindow();
    } catch (error) {
        console.error('\nFAILED TO STARTUP PROPERLY:\n', error);
    }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) db.close();
    app.quit();
  }
});