// const { contextBridge, ipcRenderer } = require('electron');

// console.log('[Preload Script] Loaded into new project.');

// contextBridge.exposeInMainWorld(
//   'electronAPI',
//   {
//     ping: () => 'pong from preload',

//     // Database API - Generic operations
//     dbQuery: (sql, params) => ipcRenderer.invoke('db:query', sql, params),
//     dbRun: (sql, params) => ipcRenderer.invoke('db:run', sql, params),
//     dbGet: (sql, params) => ipcRenderer.invoke('db:get', sql, params),
    
//     // Customers
//     getCustomers: () => ipcRenderer.invoke('db:customers:getAll'),
//     getCustomer: (id) => ipcRenderer.invoke('db:customers:get', id),
//     addCustomer: (customer) => ipcRenderer.invoke('db:customers:add', customer),
//     updateCustomer: (id, customer) => ipcRenderer.invoke('db:customers:update', id, customer),
//     deleteCustomer: (id) => ipcRenderer.invoke('db:customers:delete', id),

//     // Products
//     getProducts: () => ipcRenderer.invoke('db:products:getAll'),
//     getProduct: (id) => ipcRenderer.invoke('db:products:get', id),
//     addProduct: (product) => ipcRenderer.invoke('db:products:add', product),
//     updateProduct: (id, product) => ipcRenderer.invoke('db:products:update', id, product),
//     deleteProduct: (id) => ipcRenderer.invoke('db:products:delete', id),

//     // Suppliers
//     getSuppliers: () => ipcRenderer.invoke('db:suppliers:getAll'),
//     getSupplier: (id) => ipcRenderer.invoke('db:suppliers:get', id),
//     addSupplier: (supplier) => ipcRenderer.invoke('db:suppliers:add', supplier),
//     updateSupplier: (id, supplier) => ipcRenderer.invoke('db:suppliers:update', id, supplier),
//     deleteSupplier: (id) => ipcRenderer.invoke('db:suppliers:delete', id),

//     // Bills
//     getBills: () => ipcRenderer.invoke('db:bills:getAll'),
//     getBill: (id) => ipcRenderer.invoke('db:bills:get', id),
//     addBill: (bill) => ipcRenderer.invoke('db:bills:add', bill),
//     updateBill: (id, bill) => ipcRenderer.invoke('db:bills:update', id, bill),
//     deleteBill: (id) => ipcRenderer.invoke('db:bills:delete', id),
//     getNextBillNumber: () => ipcRenderer.invoke('db:bills:getNextNumber'),

//     // Purchases
//     getPurchases: () => ipcRenderer.invoke('db:purchases:getAll'),
//     getPurchase: (id) => ipcRenderer.invoke('db:purchases:get', id),
//     addPurchase: (purchase) => ipcRenderer.invoke('db:purchases:add', purchase),
//     updatePurchase: (id, purchase) => ipcRenderer.invoke('db:purchases:update', id, purchase),
//     deletePurchase: (id) => ipcRenderer.invoke('db:purchases:delete', id),

//     // Payments
//     getPayments: () => ipcRenderer.invoke('db:payments:getAll'),
//     getPayment: (id) => ipcRenderer.invoke('db:payments:get', id),
//     addPayment: (payment) => ipcRenderer.invoke('db:payments:add', payment),
//     deletePayment: (id) => ipcRenderer.invoke('db:payments:delete', id),
//     getPaymentsByEntity: (entityId) => ipcRenderer.invoke('db:payments:getByEntity', entityId),

//     // Transactions
//     getTransactions: () => ipcRenderer.invoke('db:transactions:getAll'),
//     getTransaction: (id) => ipcRenderer.invoke('db:transactions:get', id),
//     addTransaction: (transaction) => ipcRenderer.invoke('db:transactions:add', transaction),
//     deleteTransaction: (id) => ipcRenderer.invoke('db:transactions:delete', id),
//     getTransactionsByDateRange: (startDate, endDate) => ipcRenderer.invoke('db:transactions:getByDateRange', startDate, endDate),

//     // External Accounts
//     getExternalAccounts: () => ipcRenderer.invoke('db:external-accounts:getAll'),
//     getExternalAccount: (id) => ipcRenderer.invoke('db:external-accounts:get', id),
//     addExternalAccount: (account) => ipcRenderer.invoke('db:external-accounts:add', account),
//     updateExternalAccount: (id, account) => ipcRenderer.invoke('db:external-accounts:update', id, account),
//     deleteExternalAccount: (id) => ipcRenderer.invoke('db:external-accounts:delete', id),

//     // External Ledger Entries
//     getExternalLedgerEntries: (accountId) => ipcRenderer.invoke('db:ledger-entries:getByAccount', accountId),
//     addExternalLedgerEntry: (entry) => ipcRenderer.invoke('db:ledger-entries:add', entry),
//     deleteExternalLedgerEntry: (id) => ipcRenderer.invoke('db:ledger-entries:delete', id),

//     // Settings
//     getSetting: (key) => ipcRenderer.invoke('db:settings:get', key),
//     setSetting: (key, value) => ipcRenderer.invoke('db:settings:set', key, value),
//     getAllSettings: () => ipcRenderer.invoke('db:settings:getAll'),

//     // Reports
//     getCustomerBalance: (customerId) => ipcRenderer.invoke('db:reports:getCustomerBalance', customerId),
//     getSalesReport: (startDate, endDate) => ipcRenderer.invoke('db:reports:getSalesReport', startDate, endDate),
//     getPurchaseReport: (startDate, endDate) => ipcRenderer.invoke('db:reports:getPurchaseReport', startDate, endDate)
//   }
// );
const { contextBridge, ipcRenderer } = require('electron');

console.log('[Preload Script] Initializing bridge...');

contextBridge.exposeInMainWorld('electronAPI', {
    ping: () => 'pong from preload',

    // Database API - Generic
    dbQuery: (sql, params) => ipcRenderer.invoke('db:query', sql, params),
    dbRun: (sql, params) => ipcRenderer.invoke('db:run', sql, params),
    dbGet: (sql, params) => ipcRenderer.invoke('db:get', sql, params),
    
    // Customers
    getCustomers: () => ipcRenderer.invoke('db:customers:getAll'),
    getCustomer: (id) => ipcRenderer.invoke('db:customers:get', id),
    addCustomer: (customer) => ipcRenderer.invoke('db:customers:add', customer),
    updateCustomer: (id, customer) => ipcRenderer.invoke('db:customers:update', id, customer),
    deleteCustomer: (id) => ipcRenderer.invoke('db:customers:delete', id),

    // Products
    getProducts: () => ipcRenderer.invoke('db:products:getAll'),
    getProduct: (id) => ipcRenderer.invoke('db:products:get', id),
    addProduct: (product) => ipcRenderer.invoke('db:products:add', product),
    updateProduct: (id, product) => ipcRenderer.invoke('db:products:update', id, product),
    deleteProduct: (id) => ipcRenderer.invoke('db:products:delete', id),

    // Suppliers
    getSuppliers: () => ipcRenderer.invoke('db:suppliers:getAll'),
    getSupplier: (id) => ipcRenderer.invoke('db:suppliers:get', id),
    addSupplier: (supplier) => ipcRenderer.invoke('db:suppliers:add', supplier),
    updateSupplier: (id, supplier) => ipcRenderer.invoke('db:suppliers:update', id, supplier),
    deleteSupplier: (id) => ipcRenderer.invoke('db:suppliers:delete', id),

    // Bills
    getBills: () => ipcRenderer.invoke('db:bills:getAll'),
    getBill: (id) => ipcRenderer.invoke('db:bills:get', id),
    addBill: (bill) => ipcRenderer.invoke('db:bills:add', bill),
    updateBill: (id, bill) => ipcRenderer.invoke('db:bills:update', id, bill),
    deleteBill: (id) => ipcRenderer.invoke('db:bills:delete', id),
    getNextBillNumber: () => ipcRenderer.invoke('db:bills:getNextNumber'),

    // Purchases
    getPurchases: () => ipcRenderer.invoke('db:purchases:getAll'),
    getPurchase: (id) => ipcRenderer.invoke('db:purchases:get', id),
    addPurchase: (purchase) => ipcRenderer.invoke('db:purchases:add', purchase),
    updatePurchase: (id, purchase) => ipcRenderer.invoke('db:purchases:update', id, purchase),
    deletePurchase: (id) => ipcRenderer.invoke('db:purchases:delete', id),

    // Payments
    getPayments: () => ipcRenderer.invoke('db:payments:getAll'),
    getPayment: (id) => ipcRenderer.invoke('db:payments:get', id),
    addPayment: (payment) => ipcRenderer.invoke('db:payments:add', payment),
    deletePayment: (id) => ipcRenderer.invoke('db:payments:delete', id),
    getPaymentsByEntity: (entityId) => ipcRenderer.invoke('db:payments:getByEntity', entityId),

    // Transactions
    getTransactions: () => ipcRenderer.invoke('db:transactions:getAll'),
    getTransaction: (id) => ipcRenderer.invoke('db:transactions:get', id),
    addTransaction: (transaction) => ipcRenderer.invoke('db:transactions:add', transaction),
    deleteTransaction: (id) => ipcRenderer.invoke('db:transactions:delete', id),
    getTransactionsByDateRange: (startDate, endDate) => ipcRenderer.invoke('db:transactions:getByDateRange', startDate, endDate),

    // External Accounts
    getExternalAccounts: () => ipcRenderer.invoke('db:external-accounts:getAll'),
    getExternalAccount: (id) => ipcRenderer.invoke('db:external-accounts:get', id),
    addExternalAccount: (account) => ipcRenderer.invoke('db:external-accounts:add', account),
    updateExternalAccount: (id, account) => ipcRenderer.invoke('db:external-accounts:update', id, account),
    deleteExternalAccount: (id) => ipcRenderer.invoke('db:external-accounts:delete', id),

    // External Ledger Entries
    getExternalLedgerEntries: (accountId) => ipcRenderer.invoke('db:ledger-entries:getByAccount', accountId),
    addExternalLedgerEntry: (entry) => ipcRenderer.invoke('db:ledger-entries:add', entry),
    deleteExternalLedgerEntry: (id) => ipcRenderer.invoke('db:ledger-entries:delete', id),

    // Settings
    getSetting: (key) => ipcRenderer.invoke('db:settings:get', key),
    setSetting: (key, value) => ipcRenderer.invoke('db:settings:set', key, value),
    getAllSettings: () => ipcRenderer.invoke('db:settings:getAll'),

    // Reports
    getCustomerBalance: (customerId) => ipcRenderer.invoke('db:reports:getCustomerBalance', customerId),
    getSalesReport: (startDate, endDate) => ipcRenderer.invoke('db:reports:getSalesReport', startDate, endDate),
    getPurchaseReport: (startDate, endDate) => ipcRenderer.invoke('db:reports:getPurchaseReport', startDate, endDate)
});