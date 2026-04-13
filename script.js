// ============================================================
// script.js — Shared Firebase config, utilities, and CRUD
// Used by both index.html (customer) and admin.html (shopkeeper)
// ============================================================

// ── 1. FIREBASE CONFIGURATION ────────────────────────────────
// Go to Firebase Console → Your Project → Project Settings
// → Your Apps → Web App → copy the config object below
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Guard: warn loudly if the developer forgot to replace placeholders
if (firebaseConfig.apiKey === "YOUR_API_KEY") {
  console.error(
    "[Setup required] Firebase is not configured.\n" +
    "Open script.js and replace the placeholder values with your real Firebase project config.\n" +
    "See README.md for step-by-step instructions."
  );
}

// Initialize Firebase (only once, guard against double-init)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

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
 * Format a Firestore Timestamp or JS Date into a readable string.
 * @param {firebase.firestore.Timestamp|Date|null} timestamp
 * @returns {string}
 */
function formatDate(timestamp) {
  if (!timestamp) return "N/A";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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
 * @returns {Promise<Array<{id:string, name:string, price:number, createdAt:Timestamp}>>}
 */
async function getProducts() {
  const snap = await db.collection("products").orderBy("createdAt", "desc").get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Add a new product to Firestore.
 * @param {string} name
 * @param {number|string} price
 * @returns {Promise<firebase.firestore.DocumentReference>}
 */
async function addProduct(name, price) {
  return db.collection("products").add({
    name: name.trim(),
    price: parseFloat(price),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Update an existing product by document ID.
 * @param {string} id  Firestore document ID
 * @param {string} name
 * @param {number|string} price
 */
async function updateProduct(id, name, price) {
  return db.collection("products").doc(id).update({
    name: name.trim(),
    price: parseFloat(price)
  });
}

/**
 * Delete a product by document ID.
 * @param {string} id
 */
async function deleteProduct(id) {
  return db.collection("products").doc(id).delete();
}

// ── 5. ORDER CRUD ────────────────────────────────────────────

/**
 * Save a new order to Firestore.
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
  await db.collection("orders").add({
    productName,
    price: parseFloat(price),
    quantity: qty,
    totalPrice,
    customerName: customerName.trim(),
    otp,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return totalPrice;
}

// ── 6. EXPENSE & PROFIT ──────────────────────────────────────

/**
 * Add a daily expense record.
 * @param {number|string} amount
 * @param {string} date  e.g. "2024-05-20"
 */
async function addExpense(amount, date) {
  return db.collection("expenses").add({
    amount: parseFloat(amount),
    date,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Sum all order totalPrices (total revenue).
 * @returns {Promise<number>}
 */
async function getTotalRevenue() {
  const snap = await db.collection("orders").get();
  let total = 0;
  snap.forEach(doc => { total += doc.data().totalPrice || 0; });
  return total;
}

/**
 * Sum all expense amounts.
 * @returns {Promise<number>}
 */
async function getTotalExpenses() {
  const snap = await db.collection("expenses").get();
  let total = 0;
  snap.forEach(doc => { total += doc.data().amount || 0; });
  return total;
}

// ── 7. BONUS: Auto-delete orders older than 30 days ──────────
// Uncomment and call this function from admin.html to clean up old orders.
// For production, use Firebase Cloud Functions + a scheduled trigger instead.
/*
async function deleteOldOrders() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const oldOrders = await db.collection("orders")
    .where("createdAt", "<", thirtyDaysAgo)
    .get();

  const batch = db.batch();
  oldOrders.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`Deleted ${oldOrders.size} orders older than 30 days.`);
}
*/
