# NeuGlow Store

40Hz Brain-Care Lamp ecommerce store — built with Express + MongoDB.

## Security Model

> **No `.env` file. No secrets in git. Ever.**
>
> All sensitive configuration (Stripe keys, SMTP password, JWT secret) is stored **inside MongoDB** in a `storeconfigs` collection.  
> The only file excluded from git is `mongo-uri.json` — a tiny JSON file you create manually on each server.

## Project Structure

```
neuglow/
├── server.js               # Express entry point
├── package.json
├── .gitignore              # ignores mongo-uri.json + node_modules
├── mongo-uri.json          # ← YOU CREATE THIS (gitignored)
│
├── config/
│   └── db.js               # MongoDB connection + config loader
│
├── models/
│   ├── StoreConfig.js      # Stores Stripe/SMTP/JWT in MongoDB
│   ├── Product.js          # Products + stock
│   ├── Order.js            # Orders
│   └── User.js             # Customers + admins
│
├── routes/
│   ├── auth.js             # Login, register, /me
│   ├── products.js         # Public product listing
│   ├── orders.js           # Place orders, order history
│   ├── admin.js            # Admin CRUD (protected)
│   └── configRoute.js      # Config save/load from DB
│
├── middleware/
│   ├── auth.js             # JWT verification
│   └── adminOnly.js        # Admin role guard
│
├── css/
│   └── style.css           # Shared design system
│
├── js/
│   └── api.js              # Frontend API client + Cart helpers
│
├── index.html              # Store homepage
├── cart.html               # Shopping cart
├── checkout.html           # 3-step checkout
├── account.html            # Login / register / order history
├── admin.html              # Admin panel (admin only)
└── setup.html              # First-time setup wizard
```

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Create `mongo-uri.json` (never committed to git)
```json
{ "uri": "mongodb+srv://username:password@cluster.mongodb.net/neuglow" }
```

### 3. Start the server
```bash
npm start
# or for development with auto-reload:
npm run dev
```

### 4. First-time setup
Visit `http://localhost:3000/setup` to:
- Create the first admin account
- Enter Stripe API keys → saved to MongoDB
- Enter SMTP credentials → saved to MongoDB
- Configure store settings

### 5. Add products
Log in as admin → go to `http://localhost:3000/admin` → Products tab → Add Product

## Admin Panel Features

- **Dashboard** — Revenue, orders, customers, low stock alerts
- **Products** — Add / edit / delete products with badge, pricing, images, stock
- **Inventory** — Quick stock management with low-stock warnings
- **Orders** — View all orders, update status & tracking numbers
- **Users** — View customers, promote/demote admin roles
- **Config** — Update Stripe keys, SMTP, JWT, store settings — all saved to DB

## API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/products
GET    /api/products/:id

POST   /api/orders
GET    /api/orders/mine

GET    /api/admin/stats
GET    /api/admin/products
POST   /api/admin/products
PUT    /api/admin/products/:id
DELETE /api/admin/products/:id
PATCH  /api/admin/products/:id/stock
GET    /api/admin/orders
PUT    /api/admin/orders/:id
GET    /api/admin/users
PUT    /api/admin/users/:id/role

GET    /api/config        (admin only)
POST   /api/config        (admin only)
POST   /api/config/test-connection
POST   /api/config/setup  (first-time only)
```

## Deployment (Git-safe)

```bash
# On your server:
git clone https://github.com/you/neuglow-store
cd neuglow-store
npm install

# Create the only secret file:
echo '{"uri":"mongodb+srv://..."}' > mongo-uri.json

npm start
```

No secrets in git. No `.env` files to manage. Stripe keys rotate? Just visit `/admin` → Config.
