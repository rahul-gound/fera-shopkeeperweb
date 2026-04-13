// ============================================================
// script.js — Shared Firebase config, utilities, and CRUD
// Multi-tenant SaaS: each shop is isolated by shopId (shopName slug)
// Used by signup.html, login.html, index.html, admin.html
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
const db   = firebase.firestore();
const auth = firebase.auth();

// ── 2. UTILITY FUNCTIONS ─────────────────────────────────────

/**
 * Generate a cryptographically random 4-digit OTP (1000–9999).
 * @returns {string} 4-digit OTP as a string
 */
function generateOTP() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return (1000 + (arr[0] % 9000)).toString();
}

/**
 * Open WhatsApp with a pre-filled order message.
 * @param {string} whatsappNumber  e.g. "919876543210" (digits only, no + or spaces)
 * @param {string} productName
 * @param {number} quantity
 * @param {number|string} totalPrice
 * @param {string} customerName
 * @param {string} otp
 */
function sendWhatsApp(whatsappNumber, productName, quantity, totalPrice, customerName, otp) {
  if (!whatsappNumber || !/^[0-9]{7,15}$/.test(whatsappNumber)) {
    alert("WhatsApp number is not configured for this shop. Please contact the shopkeeper.");
    return;
  }
  const message =
    `Order:\n` +
    `Product: ${productName}\n` +
    `Qty: ${quantity}\n` +
    `Total: ₹${totalPrice}\n` +
    `Customer: ${customerName}\n` +
    `OTP: ${otp}`;
  const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
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

// ── 3. AUTH FUNCTIONS ────────────────────────────────────────

/**
 * Sign up a new shopkeeper.
 * Creates a Firebase Auth user and saves their shop profile in Firestore.
 * @param {string} email
 * @param {string} password
 * @param {string} shopName  Unique slug (lowercase, no spaces)
 * @param {string} whatsappNumber  e.g. "919876543210"
 * @returns {Promise<firebase.auth.UserCredential>}
 */
async function signUpUser(email, password, shopName, whatsappNumber) {
  // Check shopName uniqueness before creating auth user
  const existing = await db.collection("shops")
    .where("shopName", "==", shopName)
    .limit(1)
    .get();
  if (!existing.empty) {
    throw new Error("shop-name-taken");
  }

  const cred = await auth.createUserWithEmailAndPassword(email, password);
  await db.collection("shops").doc(cred.user.uid).set({
    userId: cred.user.uid,
    shopName,
    whatsappNumber: whatsappNumber.trim(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return cred;
}

/**
 * Sign in an existing shopkeeper.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<firebase.auth.UserCredential>}
 */
async function loginUser(email, password) {
  return auth.signInWithEmailAndPassword(email, password);
}

/**
 * Sign out the current user.
 * @returns {Promise<void>}
 */
async function logoutUser() {
  return auth.signOut();
}

/**
 * Get the current authenticated user (or null).
 * @returns {firebase.User|null}
 */
function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Fetch a shop profile by the logged-in user's UID.
 * @param {string} uid
 * @returns {Promise<{shopName:string, whatsappNumber:string, createdAt:Timestamp}|null>}
 */
async function getShopByUserId(uid) {
  const doc = await db.collection("shops").doc(uid).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

/**
 * Fetch a shop profile by shopName slug (for the public customer page).
 * @param {string} shopName
 * @returns {Promise<{shopName:string, whatsappNumber:string}|null>}
 */
async function getShopByName(shopName) {
  const snap = await db.collection("shops")
    .where("shopName", "==", shopName)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

// ── 4. PRODUCT CRUD (shopId-scoped) ──────────────────────────

/**
 * Fetch products for a specific shop, newest first.
 * @param {string} shopId  The shopName slug
 * @returns {Promise<Array<{id:string, name:string, price:number, createdAt:Timestamp}>>}
 */
async function getProducts(shopId) {
  const snap = await db.collection("products")
    .where("shopId", "==", shopId)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Add a new product for a shop.
 * @param {string} shopId
 * @param {string} name
 * @param {number|string} price
 */
async function addProduct(shopId, name, price) {
  return db.collection("products").add({
    shopId,
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

// ── 5. ORDER CRUD (shopId-scoped) ────────────────────────────

/**
 * Save a new order for a shop.
 * @param {string} shopId
 * @param {string} productName
 * @param {number} price  Unit price
 * @param {number|string} quantity
 * @param {string} customerName
 * @param {string} otp
 * @returns {Promise<number>} totalPrice
 */
async function saveOrder(shopId, productName, price, quantity, customerName, otp) {
  const qty = parseInt(quantity, 10);
  const totalPrice = parseFloat(price) * qty;
  await db.collection("orders").add({
    shopId,
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

/**
 * Fetch recent orders for a shop.
 * @param {string} shopId
 * @param {number} [limitCount=50]
 * @returns {Promise<Array>}
 */
async function getOrders(shopId, limitCount = 50) {
  const snap = await db.collection("orders")
    .where("shopId", "==", shopId)
    .orderBy("createdAt", "desc")
    .limit(limitCount)
    .get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ── 6. EXPENSE & PROFIT (shopId-scoped) ──────────────────────

/**
 * Add a daily expense record for a shop.
 * @param {string} shopId
 * @param {number|string} amount
 * @param {string} date  e.g. "2024-05-20"
 */
async function addExpense(shopId, amount, date) {
  return db.collection("expenses").add({
    shopId,
    amount: parseFloat(amount),
    date,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Sum all order totalPrices for a shop (total revenue).
 * @param {string} shopId
 * @returns {Promise<number>}
 */
async function getTotalRevenue(shopId) {
  const snap = await db.collection("orders").where("shopId", "==", shopId).get();
  let total = 0;
  snap.forEach(doc => { total += doc.data().totalPrice || 0; });
  return total;
}

/**
 * Sum all expense amounts for a shop.
 * @param {string} shopId
 * @returns {Promise<number>}
 */
async function getTotalExpenses(shopId) {
  const snap = await db.collection("expenses").where("shopId", "==", shopId).get();
  let total = 0;
  snap.forEach(doc => { total += doc.data().amount || 0; });
  return total;
}

/**
 * Fetch recent expenses for a shop.
 * @param {string} shopId
 * @param {number} [limitCount=20]
 * @returns {Promise<Array>}
 */
async function getExpenses(shopId, limitCount = 20) {
  const snap = await db.collection("expenses")
    .where("shopId", "==", shopId)
    .orderBy("createdAt", "desc")
    .limit(limitCount)
    .get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
