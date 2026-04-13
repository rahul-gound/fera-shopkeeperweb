# Fera Shopkeeper Web

A multi-tenant SaaS web app for shopkeepers built with HTML, CSS, Vanilla JavaScript, and **Appwrite** (Auth + Database).

Each shopkeeper registers an account, gets their own shop profile, and a unique public URL at:
`yourapp.web.app/index.html?shop=yourshopname`

---

## Features

| Feature | Description |
|---|---|
| 🔐 Authentication | Email/password sign-up and login (Appwrite Auth) |
| 🏪 Multi-tenant | Each shop is isolated by shopName slug |
| 📦 Product Management | Add, edit, and delete products (scoped to shop) |
| 🛒 Customer Order Page | Public product listing with order modal |
| 🔑 OTP Verification | 4-digit OTP generated per order |
| 📲 WhatsApp Integration | Order details sent via WhatsApp link |
| 📋 Orders Dashboard | View all orders in the admin panel |
| 📊 Profit Tracker | Track daily expenses and calculate net profit |
| 📱 Mobile-Friendly | Responsive design, no frameworks |

---

## File Structure

```
fera-shopkeeperweb/
├── signup.html    ← Shopkeeper registration page
├── login.html     ← Shopkeeper login page
├── index.html     ← Customer-facing product & order page (public, ?shop=slug)
├── admin.html     ← Shopkeeper admin dashboard (auth required)
├── script.js      ← Shared Appwrite config, auth, utilities, CRUD functions
├── firebase.json  ← Firebase Hosting configuration (optional)
└── README.md
```

---

## How Multi-Tenancy Works

- Each shopkeeper signs up with a unique **shop name slug** (e.g. `rahulstore`)
- All data (products, orders, expenses) is stored in Appwrite Database with a `shopId` field equal to the shop name slug
- The customer page reads `?shop=rahulstore` from the URL and loads only that shop's products
- The admin page calls `account.get()` on load and fetches the logged-in user's shop profile to scope all data

### Public shop URL format

```
https://YOUR_PROJECT_ID.web.app/index.html?shop=rahulstore
```

---

## Setup Guide

### 1. Create an Appwrite Account and Project

1. Go to [cloud.appwrite.io](https://cloud.appwrite.io) and sign up (free).
2. Click **Create Project**, give it a name (e.g. `fera-shopkeeper`), and click **Create**.
3. Copy your **Project ID** from **Settings → Overview**.

### 2. Add a Web Platform

This allows your web app to make authenticated API calls from the browser.

1. In the Appwrite console, go to **Settings → Platforms**.
2. Click **Add Platform → Web**.
3. Name: `Fera Web`
4. Hostname: `localhost` (for local dev). For production, add your actual domain too.
5. Click **Create**.

### 3. Create a Database

1. Go to **Databases** in the sidebar and click **Create Database**.
2. Name it `fera-db` (or any name you like).
3. Copy the **Database ID** shown below the name.

### 4. Create Collections

Create four collections inside your database. The **Collection ID** must match exactly.

---

#### Collection: `shops`

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `userId` | String | ✅ | Appwrite user `$id` |
| `shopName` | String | ✅ | Unique shop slug |
| `whatsappNumber` | String | ✅ | Digits only |

**Permissions (Collection level)**:
- Create: `users` (any authenticated user)
- Read: `any`
- Update: `users`
- Delete: `users`

**Indexes**:
- Key: `shopName`, Type: `key`, Attributes: `shopName ASC`

---

#### Collection: `products`

| Attribute | Type | Required |
|---|---|---|
| `shopId` | String | ✅ |
| `name` | String | ✅ |
| `price` | Float | ✅ |

**Permissions (Collection level)**:
- Create: `users`
- Read: `any`
- Update: `users`
- Delete: `users`

**Indexes**:
- Key: `shopId_createdAt`, Type: `key`, Attributes: `shopId ASC`, `$createdAt DESC`

---

#### Collection: `orders`

| Attribute | Type | Required |
|---|---|---|
| `shopId` | String | ✅ |
| `productName` | String | ✅ |
| `price` | Float | ✅ |
| `quantity` | Integer | ✅ |
| `totalPrice` | Float | ✅ |
| `customerName` | String | ✅ |
| `otp` | String | ✅ |

**Permissions (Collection level)**:
- Create: `any` (customers are not logged in)
- Read: `users`
- Update: `users`
- Delete: `users`

**Indexes**:
- Key: `shopId_createdAt`, Type: `key`, Attributes: `shopId ASC`, `$createdAt DESC`

---

#### Collection: `expenses`

| Attribute | Type | Required |
|---|---|---|
| `shopId` | String | ✅ |
| `amount` | Float | ✅ |
| `date` | String | ✅ | e.g. "2024-05-20" |

**Permissions (Collection level)**:
- Create: `users`
- Read: `users`
- Update: `users`
- Delete: `users`

**Indexes**:
- Key: `shopId_createdAt`, Type: `key`, Attributes: `shopId ASC`, `$createdAt DESC`

> ⚠️ For each collection, make sure **Document Security** is **OFF** (so collection-level permissions apply to all documents).

---

### 5. Configure `script.js`

Open `script.js` and fill in your values:

```js
const APPWRITE_ENDPOINT   = "https://cloud.appwrite.io/v1"; // keep as-is for Appwrite Cloud
const APPWRITE_PROJECT_ID = "YOUR_PROJECT_ID";              // from Settings → Overview
const DATABASE_ID         = "YOUR_DATABASE_ID";             // from Databases → your DB

// Collection IDs (must match what you created above)
const COLLECTION_SHOPS    = "shops";
const COLLECTION_PRODUCTS = "products";
const COLLECTION_ORDERS   = "orders";
const COLLECTION_EXPENSES = "expenses";
```

### 6. Run Locally

Since the app is plain HTML/JS/CSS, you can open it with any static file server:

```bash
# Using the VS Code Live Server extension (recommended)
# Right-click index.html → Open with Live Server

# Or using Node.js
npx serve .

# Or using Python
python -m http.server 8000
```

Then open `http://localhost:8000/signup.html` to create your first shop.

### 7. Deploy to Firebase Hosting (optional)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Public directory: .
# Single-page app: No
firebase deploy
```

Or deploy to **Appwrite Static Hosting**, **Netlify**, **Vercel**, or any static host — just upload the files.

---

## Database Schema

| Collection | Custom Fields |
|---|---|
| `shops` | `userId`, `shopName`, `whatsappNumber` |
| `products` | `shopId`, `name`, `price` |
| `orders` | `shopId`, `productName`, `price`, `quantity`, `totalPrice`, `customerName`, `otp` |
| `expenses` | `shopId`, `amount`, `date` |

> All documents also have Appwrite built-in fields: `$id`, `$createdAt`, `$updatedAt`, `$permissions`.

---

## Pages

| URL | Description |
|---|---|
| `/signup.html` | Shopkeeper registration (create shop account) |
| `/login.html` | Shopkeeper login |
| `/admin.html` | Shopkeeper admin dashboard (auth required) |
| `/index.html?shop=yourshop` | Customer product listing and ordering page |

---

## Self-Hosted Appwrite

If you prefer to run your own Appwrite instance instead of using Appwrite Cloud:

```bash
# Install the Appwrite CLI
npm install -g appwrite-cli

# Initialize and start Appwrite (Docker required)
appwrite init
```

Then update `APPWRITE_ENDPOINT` in `script.js` to your server URL, e.g.:
```js
const APPWRITE_ENDPOINT = "https://appwrite.yourdomain.com/v1";
```

For full self-hosting instructions see [Appwrite's official documentation](https://appwrite.io/docs/advanced/self-hosting).