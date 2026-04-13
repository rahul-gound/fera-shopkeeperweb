# Fera Shopkeeper Web

A simple SaaS web app for shopkeepers built with HTML, CSS, Vanilla JavaScript, and Appwrite.

---

## Features

| Feature | Description |
|---|---|
| 📦 Product Management | Add, edit, and delete products (stored in Appwrite Database) |
| 🛒 Customer Order Page | Public product listing with order modal |
| 🔑 OTP Verification | 4-digit OTP generated per order |
| 📲 WhatsApp Integration | Order details sent via WhatsApp link |
| 📊 Profit Tracker | Track daily expenses and calculate net profit |
| 🔐 Admin Authentication | Shopkeeper login/logout via Appwrite Auth |
| 📱 Mobile-Friendly | Responsive design, no frameworks |

---

## File Structure

```
fera-shopkeeperweb/
├── index.html     ← Customer-facing product & order page
├── admin.html     ← Shopkeeper admin panel (login required)
├── script.js      ← Shared Appwrite config, utilities, CRUD functions
└── README.md
```

---

## Setup Guide

### 1. Create an Appwrite Project

1. Go to [Appwrite Cloud](https://cloud.appwrite.io/) (or your self-hosted instance) and **Create a new project**.
2. Note your **Project ID** from **Settings → General**.

### 2. Create a Database

1. In your project, go to **Databases** and click **Create database**.
2. Give it a name (e.g., `shopkeeper`) and note the **Database ID**.

### 3. Create Collections

Create three collections inside the database with the following attributes:

| Collection ID | Attributes |
|---|---|
| `products` | `name` (String, required), `price` (Float, required) |
| `orders` | `productName` (String), `price` (Float), `quantity` (Integer), `totalPrice` (Float), `customerName` (String), `otp` (String) |
| `expenses` | `amount` (Float, required), `date` (String, required) |

> **Permissions (recommended):**
> - `products`: Any (read); Users (write) for admin use — or keep read-only for customers and use admin write only.
> - `orders`: Any (create); Users (read, update, delete).
> - `expenses`: Users (read, write).

### 4. Create an Admin User

1. In your Appwrite project, go to **Auth → Users** and click **Create user**.
2. Enter the shopkeeper's email and password — these are the credentials used to log in at `/admin.html`.

### 5. Configure `script.js`

Open `script.js` and replace the placeholder values:

```js
const APPWRITE_ENDPOINT        = "https://cloud.appwrite.io/v1"; // or self-hosted URL
const APPWRITE_PROJECT_ID      = "YOUR_PROJECT_ID";
const APPWRITE_DATABASE_ID     = "YOUR_DATABASE_ID";
const APPWRITE_PRODUCTS_COL    = "products";  // collection ID
const APPWRITE_ORDERS_COL      = "orders";    // collection ID
const APPWRITE_EXPENSES_COL    = "expenses";  // collection ID
```

Also update the WhatsApp number and shop name:

```js
// Phone number with country code, no + or spaces
// Example: India +91 98765 43210 → "919876543210"
const SHOP_WHATSAPP_NUMBER = "919876543210";

const SHOP_NAME = "My Kirana Shop";
```

### 6. Add Your Domain to Appwrite's Allowed Platforms

1. In the Appwrite Console, go to **Settings → Platforms**.
2. Click **Add platform → Web** and enter the domain where your site is hosted (e.g., `localhost` for local dev, `yoursite.web.app` for production).

### 7. Deploy

Host the files on any static host (GitHub Pages, Netlify, Vercel, Firebase Hosting, etc.):

```bash
# Example with a simple local server
npx serve .
```

Your app will be live at the URL provided by your host.

---

## Appwrite Collections Reference

| Collection | Fields |
|---|---|
| `products` | `name` (String), `price` (Float) — `$createdAt` auto-set by Appwrite |
| `orders` | `productName`, `price`, `quantity`, `totalPrice`, `customerName`, `otp` |
| `expenses` | `amount` (Float), `date` (String e.g. "2024-05-20") |

---

## Pages

| URL | Description |
|---|---|
| `/index.html` | Customer product listing and ordering page (public) |
| `/admin.html` | Shopkeeper admin panel — requires Appwrite login |

---

## Bonus: Auto-delete old orders

The `script.js` file contains a commented-out `deleteOldOrders()` function. For production, use an **Appwrite Function** with a scheduled CRON trigger to automatically delete orders older than 30 days.