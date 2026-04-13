# Fera Shopkeeper Web

A multi-tenant SaaS web app for shopkeepers built with HTML, CSS, Vanilla JavaScript, and Firebase.

Each shopkeeper registers an account, gets their own shop profile, and a unique public URL at:
`yourapp.web.app/index.html?shop=yourshopname`

---

## Features

| Feature | Description |
|---|---|
| 🔐 Authentication | Email/password sign-up and login (Firebase Auth) |
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
├── script.js      ← Shared Firebase config, auth, utilities, CRUD functions
├── firebase.json  ← Firebase Hosting configuration
└── README.md
```

---

## How Multi-Tenancy Works

- Each shopkeeper signs up with a unique **shop name slug** (e.g. `rahulstore`)
- All data (products, orders, expenses) is stored in Firestore with a `shopId` field = the shop name slug
- The customer page reads `?shop=rahulstore` from the URL and loads only that shop's products
- The admin page reads the logged-in user's shop profile from Firestore to scope all operations

### Public shop URL format

```
https://YOUR_PROJECT_ID.web.app/index.html?shop=rahulstore
```

---

## Setup Guide

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/) and click **Add project**.
2. Give your project a name and click **Create project**.

### 2. Enable Firebase Authentication

1. In the Firebase Console, go to **Build → Authentication**.
2. Click **Get started**.
3. Under **Sign-in method**, enable **Email/Password**.

### 3. Enable Firestore

1. In the Firebase Console, go to **Build → Firestore Database**.
2. Click **Create database** → choose **Start in test mode** temporarily (for initial development only).

> ⚠️ **Important**: Test mode allows unrestricted read/write access. Apply Security Rules (see below) before sharing the URL.

3. Select a region and click **Enable**.

### 4. Register a Web App

1. In the Firebase Console, go to **Project Settings** (⚙️ gear icon).
2. Under **Your apps**, click the **</>** (Web) icon.
3. Register the app. Copy the `firebaseConfig` object shown.

### 5. Configure `script.js`

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

### 6. Create Firestore Indexes

Some queries require composite indexes. Go to **Firestore → Indexes** and create:

| Collection | Fields | Order |
|---|---|---|
| `products` | `shopId` ASC, `createdAt` DESC | Composite |
| `orders` | `shopId` ASC, `createdAt` DESC | Composite |
| `expenses` | `shopId` ASC, `createdAt` DESC | Composite |

> Firebase will also automatically prompt you to create missing indexes when you first run queries — click the link in the browser console error.

### 7. Deploy to Firebase Hosting

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
| `shops` | `userId`, `shopName` (unique slug), `whatsappNumber`, `createdAt` |
| `products` | `shopId`, `name`, `price`, `createdAt` |
| `orders` | `shopId`, `productName`, `price`, `quantity`, `totalPrice`, `customerName`, `otp`, `createdAt` |
| `expenses` | `shopId`, `amount`, `date`, `createdAt` |

---

## Firestore Security Rules

Replace the default test-mode rules with these before going live:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Shops: only the owner can read/write their own shop document
    match /shops/{uid} {
      allow read: if true;  // public for shop lookup by customers
      allow write: if request.auth != null && request.auth.uid == uid;
    }

    // Products: anyone can read; only the shop owner can write
    match /products/{id} {
      allow read: if true;
      allow create: if request.auth != null
        && exists(/databases/$(database)/documents/shops/$(request.auth.uid))
        && request.resource.data.shopId ==
           get(/databases/$(database)/documents/shops/$(request.auth.uid)).data.shopName;
      allow update, delete: if request.auth != null
        && resource.data.shopId ==
           get(/databases/$(database)/documents/shops/$(request.auth.uid)).data.shopName;
    }

    // Orders: anyone can create; only the shop owner can read
    match /orders/{id} {
      allow create: if true;
      allow read: if request.auth != null
        && resource.data.shopId ==
           get(/databases/$(database)/documents/shops/$(request.auth.uid)).data.shopName;
      allow update, delete: if false;
    }

    // Expenses: only the shop owner
    match /expenses/{id} {
      allow read, write: if request.auth != null
        && (resource == null || resource.data.shopId ==
           get(/databases/$(database)/documents/shops/$(request.auth.uid)).data.shopName);
    }
  }
}
```

---

## Pages

| URL | Description |
|---|---|
| `/signup.html` | Shopkeeper registration (create shop account) |
| `/login.html` | Shopkeeper login |
| `/admin.html` | Shopkeeper admin dashboard (auth required) |
| `/index.html?shop=yourshop` | Customer product listing and ordering page |