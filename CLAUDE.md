# ShopXtra — Project Brief for Claude Code

## What this project is

ShopXtra is a full-stack e-commerce website selling five categories of everyday wellness products: **electrolytes, shampoo, soaps, coffee, and cosmetics**. The brand positions these not as unrelated categories but as one daily self-care ritual (morning / midday / evening).

Target market: Pakistan (PKR pricing, COD + local payment methods), with room to scale to card payments (Stripe) later.

---

## Design system — "Soft Tea" theme

Premium, soft, pink-forward but not childish. Weight comes from a deep plum-brown used in nav/footer/text, not from the pink itself.

### Colors
```
--ivory-blush:  #FAF3F0   /* page background */
--tea-pink:     #E8B4B8   /* primary accent */
--plum:         #4A3B3A   /* nav, footer, headings, primary buttons */
--dusty-rose:   #D89A9E   /* secondary accent */
--sand:         #EFE3DA   /* neutral surfaces, cards */
--gold:         #C9A26A   /* CTA highlights, prices, luxury accent */
```

### Typography
- Display/headings: **Newsreader** or **Cormorant Garamond** (italic serif) — elegant, soft curves
- Body: **Instrument Sans** or **DM Sans** — clean and readable
- Prices/labels/mono details: **IBM Plex Mono** — keeps the softness grounded and premium, not overly sweet

### Layout principles
- Generous whitespace, soft rounded corners (not sharp/square)
- Soft gradient washes (blush → sand) rather than flat color blocks
- Pink-tinted soft shadows on hover instead of harsh black shadows
- Category color-coding: each of the 5 categories gets its own tint from the palette family (blush, rose, sand, gold, plum) for visual distinction within a cohesive system
- Signature element: a "Daily Ritual" timeline (Morning / Midday / Evening) grouping products by when they're used — Electrolytes+Coffee (morning), Shampoo+Soap (midday), Cosmetics (evening)

### Design don'ts
- No harsh pure-black shadows or borders
- No sharp 0px border-radius — this is a soft brand
- Don't let pink dominate every surface — balance with plum, sand, and ivory so it reads premium, not saccharine

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | HTML/CSS/JS + Bootstrap 5 |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Auth | JWT + bcrypt |
| Payments | Cash on Delivery (v1) → Stripe (v1.5) |
| Image storage | Local `/uploads` folder for v1 |

---

## Site map

```
/                    Home
/shop                All products (filterable by category, price, sort)
/shop/electrolytes
/shop/shampoo
/shop/soaps
/shop/coffee
/shop/cosmetics
/product/:slug       Product detail page
/cart
/checkout
/account             Login, signup, order history, addresses, wishlist
/order-confirmation
/about                Brand story
/contact
/admin               Protected: product + order management
```

---

## Database schema

```
users            id, name, email, password_hash, phone, created_at
addresses        id, user_id, line1, city, postal_code, is_default
products         id, name, slug, category, description, price, stock, images[], ingredients
product_variants id, product_id, variant_name, price_modifier, stock
orders           id, user_id, status, total, payment_method, created_at
order_items      id, order_id, product_id, variant_id, qty, price_at_purchase
reviews          id, product_id, user_id, rating, comment, created_at
```

---

## Feature scope

### v1 (build this first)
- Product browsing: category filters, price range, sort by bestseller/price/new
- Product detail page: images, variants, description, ingredients, stock status
- Cart: add/remove/update quantity, persists in session
- Checkout: guest or logged-in, address form, COD payment
- Account: signup/login, order history, saved addresses
- Search with autocomplete
- Admin: add/edit/delete products, view/update order status, basic sales overview
- Newsletter signup (email capture only, no send integration needed yet)

### v1.5 (after v1 is working end-to-end)
- Product reviews and ratings
- Discount/promo codes
- Stripe card payments
- "Ritual bundles" — cross-category bundles tied into the Morning/Midday/Evening theme
- Wishlist

---

## Folder structure

```
shopxtra/
├── client/
│   ├── index.html
│   ├── /pages
│   ├── /css
│   ├── /js
│   └── /assets
├── server/
│   ├── server.js
│   ├── /routes
│   ├── /controllers
│   ├── /models
│   └── /middleware
├── .env
└── CLAUDE.md
```

---

## Build order

Build in this sequence — don't jump ahead to later steps before earlier ones work end-to-end:

1. Backend scaffold: Express server, PostgreSQL connection, product + user models
2. Product API (CRUD) + seed sample data across all 5 categories
3. Frontend: homepage + category pages consuming the live API, using the Soft Tea palette above
4. Cart: client-side state first, then persist to DB for logged-in users
5. Auth: signup/login/JWT, protected routes
6. Checkout flow + order creation
7. Admin panel (protected by role middleware)
8. Polish: search, reviews, discount codes, bundles

---

## Working conventions

- Keep components/pages modular — don't put all logic in one file
- Every new page should be responsive down to mobile (this is a mobile-heavy market)
- Visible keyboard focus states on all interactive elements
- Respect `prefers-reduced-motion`
- Prices always shown in PKR, formatted as `Rs 1,450`
- Confirm with me before altering the color system or typography once the homepage theme is approved
