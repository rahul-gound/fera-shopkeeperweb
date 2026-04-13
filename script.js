// ============================================================
// script.js — Shared Appwrite config, utilities, and CRUD
// Used by both index.html (customer) and admin.html (shopkeeper)
// ============================================================

// ── 1. APPWRITE CONFIGURATION ────────────────────────────────
// Go to Appwrite Console → Your Project → Settings → copy the
// Project ID and API Endpoint below.
// Create a Database and note its Database ID.
// Create three collections: products, orders, expenses.
const APPWRITE_ENDPOINT        = "https://cloud.appwrite.io/v1"; // or your self-hosted URL
const APPWRITE_PROJECT_ID      = "YOUR_PROJECT_ID";
const APPWRITE_DATABASE_ID     = "YOUR_DATABASE_ID";
const APPWRITE_PRODUCTS_COL    = "products";
const APPWRITE_ORDERS_COL      = "orders";
const APPWRITE_EXPENSES_COL    = "expenses";

// Guard: warn loudly if the developer forgot to replace placeholders
if (APPWRITE_PROJECT_ID === "YOUR_PROJECT_ID") {
  console.error(
    "[Setup required] Appwrite is not configured.\n" +
    "Open script.js and replace the placeholder values with your real Appwrite project config.\n" +
    "See README.md for step-by-step instructions."
  );
}

// Initialize Appwrite client and services
const { Client, Databases, Account, Query, ID } = Appwrite;

const _client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

const databases = new Databases(_client);
const account   = new Account(_client);

// ── 2. SHOP CONFIGURATION ────────────────────────────────────
// Replace with your WhatsApp phone number (with country code, no + or spaces)
// Example for India: "919876543210" means +91 98765 43210
const SHOP_WHATSAPP_NUMBER = "919876543210";

// Display name shown in the customer-facing page header
const SHOP_NAME = "My Kirana Shop";

// ── 3. UTILITY FUNCTIONS ─────────────────────────────────────

/**
 * Generate a cryptographically random 4-digit OTP (1000–9999).
 * Uses crypto.getRandomValues() which is available in all modern browsers.
 * @returns {string} 4-digit OTP as a string
 */
function generateOTP() {
  // getRandomValues fills a Uint32Array with cryptographically secure random values
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  // Map to range [1000, 9999]
  return (1000 + (arr[0] % 9000)).toString();
}

/**
 * Open WhatsApp with a pre-filled order message.
 * @param {string} productName
 * @param {number} quantity
 * @param {number} totalPrice
 * @param {string} customerName
 * @param {string} otp
 */
function sendWhatsApp(productName, quantity, totalPrice, customerName, otp) {
  const message =
    `New Order:\n` +
    `Product: ${productName}\n` +
    `Qty: ${quantity}\n` +
    `Total: ₹${totalPrice}\n` +
    `Customer: ${customerName}\n` +
    `OTP: ${otp}`;
  const url = `https://wa.me/${SHOP_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

/**
 * Format an Appwrite ISO date string or JS Date into a readable string.
 * @param {string|Date|null} timestamp
 * @returns {string}
 */
function formatDate(timestamp) {
  if (!timestamp) return "N/A";
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

/**
 * Show a small toast-style notification on screen.
 * @param {string} message
 * @param {"success"|"error"} type
 */
function showToast(message, type = "success") {
  const existing = document.getElementById("toast-msg");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "toast-msg";
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: ${type === "error" ? "#dc3545" : "#28a745"};
    color: #fff; padding: 12px 24px; border-radius: 8px;
    font-size: 14px; font-weight: 600; z-index: 9999;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    animation: fadein .3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ── 4. PRODUCT CRUD ──────────────────────────────────────────

/**
 * Fetch all products ordered by newest first.
 * @returns {Promise<Array<{id:string, name:string, price:number, createdAt:string}>>}
 */
async function getProducts() {
  const res = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    APPWRITE_PRODUCTS_COL,
    [Query.orderDesc("$createdAt")]
  );
  return res.documents.map(doc => ({
    id: doc.$id,
    name: doc.name,
    price: doc.price,
    createdAt: doc.$createdAt
  }));
}

/**
 * Add a new product to the Appwrite database.
 * @param {string} name
 * @param {number|string} price
 */
async function addProduct(name, price) {
  return databases.createDocument(
    APPWRITE_DATABASE_ID,
    APPWRITE_PRODUCTS_COL,
    ID.unique(),
    { name: name.trim(), price: parseFloat(price) }
  );
}

/**
 * Update an existing product by document ID.
 * @param {string} id  Appwrite document ID
 * @param {string} name
 * @param {number|string} price
 */
async function updateProduct(id, name, price) {
  return databases.updateDocument(
    APPWRITE_DATABASE_ID,
    APPWRITE_PRODUCTS_COL,
    id,
    { name: name.trim(), price: parseFloat(price) }
  );
}

/**
 * Delete a product by document ID.
 * @param {string} id
 */
async function deleteProduct(id) {
  return databases.deleteDocument(
    APPWRITE_DATABASE_ID,
    APPWRITE_PRODUCTS_COL,
    id
  );
}

// ── 5. ORDER CRUD ────────────────────────────────────────────

/**
 * Save a new order to the Appwrite database.
 * @param {string} productName
 * @param {number} price  Unit price
 * @param {number|string} quantity
 * @param {string} customerName
 * @param {string} otp
 * @returns {Promise<number>} totalPrice
 */
async function saveOrder(productName, price, quantity, customerName, otp) {
  const qty = parseInt(quantity, 10);
  const totalPrice = parseFloat(price) * qty;
  await databases.createDocument(
    APPWRITE_DATABASE_ID,
    APPWRITE_ORDERS_COL,
    ID.unique(),
    {
      productName,
      price: parseFloat(price),
      quantity: qty,
      totalPrice,
      customerName: customerName.trim(),
      otp
    }
  );
  return totalPrice;
}

// ── 6. EXPENSE & PROFIT ──────────────────────────────────────

/**
 * Add a daily expense record.
 * @param {number|string} amount
 * @param {string} date  e.g. "2024-05-20"
 */
async function addExpense(amount, date) {
  return databases.createDocument(
    APPWRITE_DATABASE_ID,
    APPWRITE_EXPENSES_COL,
    ID.unique(),
    { amount: parseFloat(amount), date }
  );
}

/**
 * Sum all order totalPrices (total revenue).
 * Fetches up to 500 orders; increase limit or paginate for larger datasets.
 * @returns {Promise<number>}
 */
async function getTotalRevenue() {
  const res = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    APPWRITE_ORDERS_COL,
    [Query.limit(500)]
  );
  return res.documents.reduce((total, doc) => total + (doc.totalPrice || 0), 0);
}

/**
 * Sum all expense amounts.
 * Fetches up to 500 expenses; increase limit or paginate for larger datasets.
 * @returns {Promise<number>}
 */
async function getTotalExpenses() {
  const res = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    APPWRITE_EXPENSES_COL,
    [Query.limit(500)]
  );
  return res.documents.reduce((total, doc) => total + (doc.amount || 0), 0);
}

// ── 7. BONUS: Auto-delete orders older than 30 days ──────────
// Uncomment and call this function from admin.html to clean up old orders.
// For production, use an Appwrite Function with a scheduled trigger instead.
/*
async function deleteOldOrders() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const res = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    APPWRITE_ORDERS_COL,
    [
      Query.lessThan("$createdAt", thirtyDaysAgo.toISOString()),
      Query.limit(500)
    ]
  );

  await Promise.all(
    res.documents.map(doc =>
      databases.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_ORDERS_COL, doc.$id)
    )
  );
  console.log(`Deleted ${res.documents.length} orders older than 30 days.`);
}
*/
