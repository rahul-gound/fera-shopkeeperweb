# Fera Shopkeeper Web

A simple SaaS web app for shopkeepers built with HTML, CSS, Vanilla JavaScript, and Firebase.

---

## Features

| Feature | Description |
|---|---|
| 📦 Product Management | Add, edit, and delete products (stored in Firestore) |
| 🛒 Customer Order Page | Public product listing with order modal |
| 🔑 OTP Verification | 4-digit OTP generated per order |
| 📲 WhatsApp Integration | Order details sent via WhatsApp link |
| 📊 Profit Tracker | Track daily expenses and calculate net profit |
| 📱 Mobile-Friendly | Responsive design, no frameworks |

---

## File Structure

```
fera-shopkeeperweb/
├── index.html     ← Customer-facing product & order page
├── admin.html     ← Shopkeeper admin panel
├── script.js      ← Shared Firebase config, utilities, CRUD functions
├── firebase.json  ← Firebase Hosting configuration
└── README.md
```

---

## Setup Guide

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/) and click **Add project**.
2. Give your project a name, follow the steps, and click **Create project**.

### 2. Enable Firestore

1. In the Firebase Console, go to **Build → Firestore Database**.
2. Click **Create database** → choose **Start in test mode** temporarily (for initial development only).

> ⚠️ **Important**: Test mode allows **unrestricted read/write access to everyone**. Do **NOT** leave test mode rules in place before sharing the URL or adding any real data. Follow the Firestore Security Rules section below to restrict access immediately.

3. Select a region and click **Enable**.

### 3. Register a Web App

1. In the Firebase Console, go to **Project Settings** (⚙️ gear icon).
2. Under **Your apps**, click the **</>** (Web) icon.
3. Register the app. Copy the `firebaseConfig` object shown.

### 4. Configure `script.js`

Open `script.js` and replace the placeholder values with your Firebase config:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

Also update the WhatsApp number and shop name:

```js
// Phone number with country code, no + or spaces
// Example: India +91 98765 43210 → "919876543210"
const SHOP_WHATSAPP_NUMBER = "919876543210";

const SHOP_NAME = "My Kirana Shop";
```

### 5. Deploy to Firebase Hosting

```bash
# Install Firebase CLI globally (one-time)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize hosting (run from project root)
firebase init hosting
# → Select your project
# → Public directory: .  (just a dot)
# → Single-page app: No

# Deploy
firebase deploy
```

Your app will be live at `https://YOUR_PROJECT_ID.web.app`.

---

## Firestore Collections

| Collection | Fields |
|---|---|
| `products` | `name`, `price`, `createdAt` |
| `orders` | `productName`, `price`, `quantity`, `totalPrice`, `customerName`, `otp`, `createdAt` |
| `expenses` | `amount`, `date`, `createdAt` |

---

## Firestore Security Rules (recommended before going live)

Replace the default test-mode rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Anyone can read products and create orders
    match /products/{id} {
      allow read: if true;
      allow write: if false; // Protect writes — use admin SDK or auth
    }
    match /orders/{id} {
      allow create: if true;
      allow read, update, delete: if false;
    }
    // Expenses are private — lock down completely
    match /expenses/{id} {
      allow read, write: if false;
    }
  }
}
```

> For a fully secure setup, add **Firebase Authentication** and restrict write access to authenticated admin users.

---

## Pages

| URL | Description |
|---|---|
| `/index.html` | Customer product listing and ordering page |
| `/admin.html` | Shopkeeper admin panel (products + profit tracker) |

---

## Bonus: Auto-delete old orders

The `script.js` file contains a commented-out `deleteOldOrders()` function. For production, use a **Firebase Cloud Function** with a scheduled trigger (Pub/Sub + Cloud Scheduler) to automatically delete orders older than 30 days.