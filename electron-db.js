const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db = null;

function getDatabasePath() {
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'databases');
  
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  return path.join(dbDir, 'myshop.db');
}

function initializeDatabase() {
  const dbPath = getDatabasePath();
  db = new Database(dbPath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  createTables();
  console.log('[Database] Database initialized at:', dbPath);
  return db;
}

function createTables() {
  // Customers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      credit_limit REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Suppliers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Products table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sku TEXT UNIQUE,
      price REAL NOT NULL,
      quantity INTEGER DEFAULT 0,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Bills table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      bill_no INTEGER UNIQUE,
      customer_id TEXT NOT NULL,
      total REAL NOT NULL,
      bill_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'completed',
      items_json TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
  `);

  // Purchases table
  db.exec(`
    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      supplier_id TEXT NOT NULL,
      total REAL NOT NULL,
      purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'completed',
      items_json TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );
  `);

  // Payments table (for customer and supplier payments)
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      payment_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      method TEXT,
      reference TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Transactions table (income/expense)
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      category TEXT,
      transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      reference TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // External Accounts table (manual ledger)
  db.exec(`
    CREATE TABLE IF NOT EXISTS external_accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      balance REAL DEFAULT 0,
      account_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // External Ledger Entries
  db.exec(`
    CREATE TABLE IF NOT EXISTS external_ledger_entries (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      amount REAL NOT NULL,
      entry_type TEXT NOT NULL,
      description TEXT,
      entry_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      reference TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES external_accounts(id)
    );
  `);

  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_bills_customer ON bills(customer_id);
    CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(bill_date);
    CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
    CREATE INDEX IF NOT EXISTS idx_payments_entity ON payments(entity_id);
    CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
    CREATE INDEX IF NOT EXISTS idx_ledger_account ON external_ledger_entries(account_id);
    CREATE INDEX IF NOT EXISTS idx_ledger_date ON external_ledger_entries(entry_date);
  `);
}

function getDatabase() {
  if (!db) {
    initializeDatabase();
  }
  return db;
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('[Database] Database closed');
  }
}

// ============ GENERIC CRUD OPERATIONS ============

function query(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    const result = stmt.all(...params);
    return { success: true, data: result };
  } catch (error) {
    console.error('[Database] Query error:', error);
    return { success: false, error: error.message };
  }
}

function run(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    const result = stmt.run(...params);
    return { success: true, data: { changes: result.changes, lastInsertRowid: result.lastInsertRowid } };
  } catch (error) {
    console.error('[Database] Run error:', error);
    return { success: false, error: error.message };
  }
}

function get(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    const result = stmt.get(...params);
    return { success: true, data: result };
  } catch (error) {
    console.error('[Database] Get error:', error);
    return { success: false, error: error.message };
  }
}

// ============ TRANSACTION SUPPORT ============

function beginTransaction() {
  try {
    db.exec('BEGIN TRANSACTION');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function commit() {
  try {
    db.exec('COMMIT');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function rollback() {
  try {
    db.exec('ROLLBACK');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============ ENTITY-SPECIFIC OPERATIONS ============

// Customers
function getAllCustomers() {
  return query('SELECT * FROM customers ORDER BY created_at DESC');
}

function getCustomer(id) {
  return get('SELECT * FROM customers WHERE id = ?', [id]);
}

function addCustomer(customer) {
  return run(
    `INSERT INTO customers (id, name, phone, email, address, credit_limit, balance)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [customer.id, customer.name, customer.phone, customer.email, customer.address, customer.credit_limit, customer.balance]
  );
}

function updateCustomer(id, customer) {
  return run(
    `UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, credit_limit = ?, balance = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [customer.name, customer.phone, customer.email, customer.address, customer.credit_limit, customer.balance, id]
  );
}

function deleteCustomer(id) {
  return run('DELETE FROM customers WHERE id = ?', [id]);
}

// Products
function getAllProducts() {
  return query('SELECT * FROM products ORDER BY name');
}

function getProduct(id) {
  return get('SELECT * FROM products WHERE id = ?', [id]);
}

function addProduct(product) {
  return run(
    `INSERT INTO products (id, name, sku, price, quantity, description)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [product.id, product.name, product.sku, product.price, product.quantity, product.description]
  );
}

function updateProduct(id, product) {
  return run(
    `UPDATE products SET name = ?, sku = ?, price = ?, quantity = ?, description = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [product.name, product.sku, product.price, product.quantity, product.description, id]
  );
}

function deleteProduct(id) {
  return run('DELETE FROM products WHERE id = ?', [id]);
}

// Suppliers
function getAllSuppliers() {
  return query('SELECT * FROM suppliers ORDER BY created_at DESC');
}

function getSupplier(id) {
  return get('SELECT * FROM suppliers WHERE id = ?', [id]);
}

function addSupplier(supplier) {
  return run(
    `INSERT INTO suppliers (id, name, phone, email, address)
     VALUES (?, ?, ?, ?, ?)`,
    [supplier.id, supplier.name, supplier.phone, supplier.email, supplier.address]
  );
}

function updateSupplier(id, supplier) {
  return run(
    `UPDATE suppliers SET name = ?, phone = ?, email = ?, address = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [supplier.name, supplier.phone, supplier.email, supplier.address, id]
  );
}

function deleteSupplier(id) {
  return run('DELETE FROM suppliers WHERE id = ?', [id]);
}

// Bills
function getAllBills() {
  return query('SELECT * FROM bills ORDER BY bill_date DESC');
}

function getBill(id) {
  return get('SELECT * FROM bills WHERE id = ?', [id]);
}

function addBill(bill) {
  return run(
    `INSERT INTO bills (id, bill_no, customer_id, total, bill_date, status, items_json, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [bill.id, bill.bill_no, bill.customer_id, bill.total, bill.bill_date, bill.status, bill.items_json, bill.notes]
  );
}

function updateBill(id, bill) {
  return run(
    `UPDATE bills SET bill_no = ?, customer_id = ?, total = ?, bill_date = ?, status = ?, items_json = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [bill.bill_no, bill.customer_id, bill.total, bill.bill_date, bill.status, bill.items_json, bill.notes, id]
  );
}

function deleteBill(id) {
  return run('DELETE FROM bills WHERE id = ?', [id]);
}

function getNextBillNumber() {
  const result = get('SELECT MAX(bill_no) as max_bill_no FROM bills', []);
  if (result.success && result.data) {
    return { success: true, data: (result.data.max_bill_no || 0) + 1 };
  }
  return { success: true, data: 1 };
}

// Purchases
function getAllPurchases() {
  return query('SELECT * FROM purchases ORDER BY purchase_date DESC');
}

function getPurchase(id) {
  return get('SELECT * FROM purchases WHERE id = ?', [id]);
}

function addPurchase(purchase) {
  return run(
    `INSERT INTO purchases (id, supplier_id, total, purchase_date, status, items_json, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [purchase.id, purchase.supplier_id, purchase.total, purchase.purchase_date, purchase.status, purchase.items_json, purchase.notes]
  );
}

function updatePurchase(id, purchase) {
  return run(
    `UPDATE purchases SET supplier_id = ?, total = ?, purchase_date = ?, status = ?, items_json = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [purchase.supplier_id, purchase.total, purchase.purchase_date, purchase.status, purchase.items_json, purchase.notes, id]
  );
}

function deletePurchase(id) {
  return run('DELETE FROM purchases WHERE id = ?', [id]);
}

// Payments
function getAllPayments() {
  return query('SELECT * FROM payments ORDER BY payment_date DESC');
}

function getPayment(id) {
  return get('SELECT * FROM payments WHERE id = ?', [id]);
}

function addPayment(payment) {
  return run(
    `INSERT INTO payments (id, payment_type, entity_id, amount, payment_date, method, reference, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [payment.id, payment.payment_type, payment.entity_id, payment.amount, payment.payment_date, payment.method, payment.reference, payment.description]
  );
}

function deletePayment(id) {
  return run('DELETE FROM payments WHERE id = ?', [id]);
}

function getPaymentsByEntity(entityId) {
  return query('SELECT * FROM payments WHERE entity_id = ? ORDER BY payment_date DESC', [entityId]);
}

// Transactions
function getAllTransactions() {
  return query('SELECT * FROM transactions ORDER BY transaction_date DESC');
}

function getTransaction(id) {
  return get('SELECT * FROM transactions WHERE id = ?', [id]);
}

function addTransaction(transaction) {
  return run(
    `INSERT INTO transactions (id, type, amount, description, category, transaction_date, reference)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [transaction.id, transaction.type, transaction.amount, transaction.description, transaction.category, transaction.transaction_date, transaction.reference]
  );
}

function deleteTransaction(id) {
  return run('DELETE FROM transactions WHERE id = ?', [id]);
}

function getTransactionsByDateRange(startDate, endDate) {
  return query(
    'SELECT * FROM transactions WHERE transaction_date BETWEEN ? AND ? ORDER BY transaction_date DESC',
    [startDate, endDate]
  );
}

// External Accounts
function getAllExternalAccounts() {
  return query('SELECT * FROM external_accounts ORDER BY created_at DESC');
}

function getExternalAccount(id) {
  return get('SELECT * FROM external_accounts WHERE id = ?', [id]);
}

function addExternalAccount(account) {
  return run(
    `INSERT INTO external_accounts (id, name, balance, account_type)
     VALUES (?, ?, ?, ?)`,
    [account.id, account.name, account.balance, account.account_type]
  );
}

function updateExternalAccount(id, account) {
  return run(
    `UPDATE external_accounts SET name = ?, balance = ?, account_type = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [account.name, account.balance, account.account_type, id]
  );
}

function deleteExternalAccount(id) {
  return run('DELETE FROM external_accounts WHERE id = ?', [id]);
}

// External Ledger Entries
function getExternalLedgerEntries(accountId) {
  return query(
    'SELECT * FROM external_ledger_entries WHERE account_id = ? ORDER BY entry_date DESC',
    [accountId]
  );
}

function addExternalLedgerEntry(entry) {
  return run(
    `INSERT INTO external_ledger_entries (id, account_id, amount, entry_type, description, entry_date, reference)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [entry.id, entry.account_id, entry.amount, entry.entry_type, entry.description, entry.entry_date, entry.reference]
  );
}

function deleteExternalLedgerEntry(id) {
  return run('DELETE FROM external_ledger_entries WHERE id = ?', [id]);
}

// Settings
function getSetting(key) {
  return get('SELECT value FROM settings WHERE key = ?', [key]);
}

function setSetting(key, value) {
  return run(
    `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
    [key, value]
  );
}

function getAllSettings() {
  return query('SELECT * FROM settings');
}

// ============ REPORTING QUERIES ============

function getCustomerBalance(customerId) {
  return get(
    `SELECT 
      SUM(CASE WHEN b.customer_id = ? THEN b.total ELSE 0 END) as total_billed,
      SUM(CASE WHEN p.entity_id = ? AND p.payment_type = 'customer' THEN p.amount ELSE 0 END) as total_paid
    FROM bills b
    FULL OUTER JOIN payments p ON p.entity_id = ?`,
    [customerId, customerId, customerId]
  );
}

function getSalesReport(startDate, endDate) {
  return query(
    `SELECT 
      DATE(bill_date) as date,
      COUNT(*) as bill_count,
      SUM(total) as total_sales
    FROM bills
    WHERE bill_date BETWEEN ? AND ?
    GROUP BY DATE(bill_date)
    ORDER BY bill_date DESC`,
    [startDate, endDate]
  );
}

function getPurchaseReport(startDate, endDate) {
  return query(
    `SELECT 
      DATE(purchase_date) as date,
      COUNT(*) as purchase_count,
      SUM(total) as total_purchases
    FROM purchases
    WHERE purchase_date BETWEEN ? AND ?
    GROUP BY DATE(purchase_date)
    ORDER BY purchase_date DESC`,
    [startDate, endDate]
  );
}

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase,
  query,
  run,
  get,
  beginTransaction,
  commit,
  rollback,
  getDatabasePath,

  // Customers
  getAllCustomers,
  getCustomer,
  addCustomer,
  updateCustomer,
  deleteCustomer,

  // Products
  getAllProducts,
  getProduct,
  addProduct,
  updateProduct,
  deleteProduct,

  // Suppliers
  getAllSuppliers,
  getSupplier,
  addSupplier,
  updateSupplier,
  deleteSupplier,

  // Bills
  getAllBills,
  getBill,
  addBill,
  updateBill,
  deleteBill,
  getNextBillNumber,

  // Purchases
  getAllPurchases,
  getPurchase,
  addPurchase,
  updatePurchase,
  deletePurchase,

  // Payments
  getAllPayments,
  getPayment,
  addPayment,
  deletePayment,
  getPaymentsByEntity,

  // Transactions
  getAllTransactions,
  getTransaction,
  addTransaction,
  deleteTransaction,
  getTransactionsByDateRange,

  // External Accounts
  getAllExternalAccounts,
  getExternalAccount,
  addExternalAccount,
  updateExternalAccount,
  deleteExternalAccount,

  // External Ledger
  getExternalLedgerEntries,
  addExternalLedgerEntry,
  deleteExternalLedgerEntry,

  // Settings
  getSetting,
  setSetting,
  getAllSettings,

  // Reporting
  getCustomerBalance,
  getSalesReport,
  getPurchaseReport
};
