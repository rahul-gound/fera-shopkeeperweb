// ============================================================
// script.js — Appwrite config, utilities, and CRUD functions
// Multi-tenant SaaS: each shop is isolated by shopId (shopName slug)
// Used by signup.html, login.html, index.html, admin.html
// ============================================================

// ── 1. APPWRITE CONFIGURATION ────────────────────────────────
// Replace these values with your own Appwrite project settings.
// See README.md for step-by-step setup instructions.
const APPWRITE_ENDPOINT   = "https://cloud.appwrite.io/v1"; // Appwrite Cloud endpoint
const APPWRITE_PROJECT_ID = "YOUR_PROJECT_ID";              // Project ID from Appwrite console
const DATABASE_ID         = "YOUR_DATABASE_ID";             // Database ID from Appwrite console

// Collection IDs — must match exactly what you created in the Appwrite console
const COLLECTION_SHOPS    = "shops";
const COLLECTION_PRODUCTS = "products";
const COLLECTION_ORDERS   = "orders";
const COLLECTION_EXPENSES = "expenses";

// Warn if the developer forgot to replace placeholder values
if (APPWRITE_PROJECT_ID === "YOUR_PROJECT_ID") {
  console.error(
    "[Setup required] Appwrite is not configured.\n" +
    "Open script.js and replace the placeholder values.\n" +
    "See README.md for step-by-step instructions."
  );
}

// ── 2. INITIALIZE APPWRITE SDK ───────────────────────────────
// The Appwrite SDK is loaded via CDN (see <script> tag in each HTML file).
// After loading, it exposes a global `Appwrite` object we destructure here.
const { Client, Account, Databases, ID, Query } = Appwrite;

// Create and configure the shared Appwrite client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)   // API endpoint
  .setProject(APPWRITE_PROJECT_ID); // Project ID

// Initialize the two services used across all pages
const account   = new Account(client);   // Authentication
const databases = new Databases(client); // Database CRUD

// ── 3. UTILITY FUNCTIONS ─────────────────────────────────────

/**
 * Generate a cryptographically random 4-digit OTP (1000–9999).
 * @returns {string} 4-digit OTP string
 */
function generateOTP() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return (1000 + (arr[0] % 9000)).toString();
}

/**
 * Open WhatsApp with a pre-filled order message.
 * @param {string} whatsappNumber  Digits only, e.g. "919876543210" (no + or spaces)
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
 * Format an ISO date string (Appwrite's built-in $createdAt field) into a
 * readable local date. Appwrite stores timestamps as ISO 8601 strings.
 * @param {string|null} isoString  e.g. "2024-05-20T12:00:00.000+00:00"
 * @returns {string}
 */
function formatDate(isoString) {
  if (!isoString) return "N/A";
  return new Date(isoString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

/**
 * Show a toast notification at the bottom of the screen.
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

// ── 4. AUTH FUNCTIONS ────────────────────────────────────────

/**
 * Sign up a new shopkeeper.
 * 1. Checks shopName uniqueness in the database.
 * 2. Creates an Appwrite Auth account.
 * 3. Creates a session (logs the user in).
 * 4. Saves the shop profile document in the database.
 *
 * @param {string} email
 * @param {string} password
 * @param {string} shopName  Unique slug, e.g. "rahulstore"
 * @param {string} whatsappNumber  Digits only, e.g. "919876543210"
 * @returns {Promise<object>} Appwrite user object
 */
async function signUpUser(email, password, shopName, whatsappNumber) {
  // Check if the shopName slug is already taken
  const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_SHOPS, [
    Query.equal("shopName", shopName),
    Query.limit(1)
  ]);
  if (existing.total > 0) {
    throw new Error("shop-name-taken");
  }

  // Create the Appwrite Auth account (user.$id is the unique user identifier)
  const user = await account.create(ID.unique(), email, password, shopName);

  // Log the user in immediately so subsequent database writes are authenticated
  await account.createEmailPasswordSession(email, password);

  // Save the shop profile; use user.$id as the document ID for easy lookup later
  await databases.createDocument(DATABASE_ID, COLLECTION_SHOPS, user.$id, {
    userId: user.$id,
    shopName,
    whatsappNumber: whatsappNumber.trim()
  });

  return user;
}

/**
 * Sign in a shopkeeper with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} Appwrite session object
 */
async function loginUser(email, password) {
  return account.createEmailPasswordSession(email, password);
}

/**
 * Sign out the current user by deleting their active session.
 * @returns {Promise<void>}
 */
async function logoutUser() {
  return account.deleteSession("current");
}

/**
 * Get the currently logged-in user.
 * Throws an AppwriteException (code 401) if no session exists.
 * @returns {Promise<object>} Appwrite user object
 */
async function getCurrentUser() {
  return account.get();
}

/**
 * Fetch a shop profile document by user ID.
 * Document ID equals user.$id (set during signUpUser).
 * @param {string} uid  Appwrite user.$id
 * @returns {Promise<object|null>}
 */
async function getShopByUserId(uid) {
  try {
    return await databases.getDocument(DATABASE_ID, COLLECTION_SHOPS, uid);
  } catch {
    return null;
  }
}

/**
 * Fetch a shop profile document by shopName slug (used on the public page).
 * @param {string} shopName
 * @returns {Promise<object|null>}
 */
async function getShopByName(shopName) {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTION_SHOPS, [
    Query.equal("shopName", shopName),
    Query.limit(1)
  ]);
  return result.total > 0 ? result.documents[0] : null;
}

// ── 5. PRODUCT CRUD (shopId-scoped) ──────────────────────────

/**
 * Fetch all products for a shop, newest first.
 * Uses Appwrite's built-in $createdAt field for ordering.
 * @param {string} shopId  The shop's unique shopName slug
 * @returns {Promise<object[]>}
 */
async function getProducts(shopId) {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTION_PRODUCTS, [
    Query.equal("shopId", shopId),
    Query.orderDesc("$createdAt")
  ]);
  return result.documents;
}

/**
 * Add a new product for a shop.
 * @param {string} shopId
 * @param {string} name
 * @param {number|string} price
 * @returns {Promise<object>}
 */
async function addProduct(shopId, name, price) {
  return databases.createDocument(DATABASE_ID, COLLECTION_PRODUCTS, ID.unique(), {
    shopId,
    name: name.trim(),
    price: parseFloat(price)
  });
}

/**
 * Update an existing product document.
 * @param {string} id  Appwrite document $id
 * @param {string} name
 * @param {number|string} price
 * @returns {Promise<object>}
 */
async function updateProduct(id, name, price) {
  return databases.updateDocument(DATABASE_ID, COLLECTION_PRODUCTS, id, {
    name: name.trim(),
    price: parseFloat(price)
  });
}

/**
 * Delete a product document.
 * @param {string} id  Appwrite document $id
 * @returns {Promise<void>}
 */
async function deleteProduct(id) {
  return databases.deleteDocument(DATABASE_ID, COLLECTION_PRODUCTS, id);
}

// ── 6. ORDER CRUD (shopId-scoped) ────────────────────────────

/**
 * Save a new customer order for a shop.
 * @param {string} shopId
 * @param {string} productName
 * @param {number} price  Unit price
 * @param {number|string} quantity
 * @param {string} customerName
 * @param {string} otp
 * @returns {Promise<number>} totalPrice
 */
async function saveOrder(shopId, productName, price, quantity, customerName, otp) {
  const qty        = parseInt(quantity, 10);
  const totalPrice = parseFloat(price) * qty;
  await databases.createDocument(DATABASE_ID, COLLECTION_ORDERS, ID.unique(), {
    shopId,
    productName,
    price: parseFloat(price),
    quantity: qty,
    totalPrice,
    customerName: customerName.trim(),
    otp
  });
  return totalPrice;
}

/**
 * Fetch recent orders for a shop, newest first.
 * @param {string} shopId
 * @param {number} [limitCount=50]
 * @returns {Promise<object[]>}
 */
async function getOrders(shopId, limitCount = 50) {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ORDERS, [
    Query.equal("shopId", shopId),
    Query.orderDesc("$createdAt"),
    Query.limit(limitCount)
  ]);
  return result.documents;
}

// ── 7. EXPENSE & PROFIT (shopId-scoped) ──────────────────────

/**
 * Record a daily expense for a shop.
 * @param {string} shopId
 * @param {number|string} amount
 * @param {string} date  e.g. "2024-05-20"
 * @returns {Promise<object>}
 */
async function addExpense(shopId, amount, date) {
  return databases.createDocument(DATABASE_ID, COLLECTION_EXPENSES, ID.unique(), {
    shopId,
    amount: parseFloat(amount),
    date
  });
}

/**
 * Calculate total revenue for a shop (sum of all order totalPrices).
 * Appwrite's max listDocuments limit is 5000 per request.
 * @param {string} shopId
 * @returns {Promise<number>}
 */
async function getTotalRevenue(shopId) {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ORDERS, [
    Query.equal("shopId", shopId),
    Query.limit(5000)
  ]);
  return result.documents.reduce((sum, doc) => sum + (doc.totalPrice || 0), 0);
}

/**
 * Calculate total expenses for a shop.
 * @param {string} shopId
 * @returns {Promise<number>}
 */
async function getTotalExpenses(shopId) {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTION_EXPENSES, [
    Query.equal("shopId", shopId),
    Query.limit(5000)
  ]);
  return result.documents.reduce((sum, doc) => sum + (doc.amount || 0), 0);
}

/**
 * Fetch recent expense records for a shop.
 * @param {string} shopId
 * @param {number} [limitCount=20]
 * @returns {Promise<object[]>}
 */
async function getExpenses(shopId, limitCount = 20) {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTION_EXPENSES, [
    Query.equal("shopId", shopId),
    Query.orderDesc("$createdAt"),
    Query.limit(limitCount)
  ]);
  return result.documents;
}
