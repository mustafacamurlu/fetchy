---
id: collections
title: Guide — Organizing with Collections
sidebar_label: Collections & Folders
sidebar_position: 3
description: Learn how to organize API requests into collections and run them as automated test suites.
---

# Guide: Organizing with Collections

This guide shows how to structure a real-world API collection for a REST backend.

---

## Recommended Structure

Organize by **feature/module**, not by HTTP method:

```
📁 E-Commerce API
  ├── 📁 Auth
  │     ├── 📄 Register          POST /auth/register
  │     ├── 📄 Login             POST /auth/login
  │     └── 📄 Logout            POST /auth/logout
  ├── 📁 Products
  │     ├── 📄 List Products     GET /products
  │     ├── 📄 Get Product       GET /products/:id
  │     ├── 📄 Create Product    POST /products
  │     └── 📄 Delete Product    DELETE /products/:id
  └── 📁 Orders
        ├── 📄 List Orders       GET /orders
        └── 📄 Create Order      POST /orders
```

---

## Setting Collection-Level Auth

Instead of adding auth to each individual request:

1. Right-click `E-Commerce API` → **Collection Settings → Auth**
2. Set **Bearer Token**: `<<access_token>>`
3. For each request, go to the **Auth** tab and choose **Inherit**

The Login request should be set to **No Auth** since it doesn't need a token.

---

## Running the Collection as a Test Suite

Use the Collection Runner to validate your entire API:

1. Right-click the collection → **Run Collection**
2. Settings:
   - Mode: **Sequential**
   - Delay: `200ms` (to avoid rate limiting)
   - Stop on Error: **Yes**
3. Click **Run**

Each request runs in order. Add assertions in their **Script** tabs to validate responses.

---

## Collection Variables for Shared Data

After the Login request captures a token, other requests need the user ID:

**Login post-script:**
```javascript
const json = pm.response.json();
pm.environment.set("access_token", json.token);
pm.environment.set("current_user_id", json.user.id);
```

**Get Product URL:**
```
<<base_url>>/users/<<current_user_id>>/products
```

---

## Drag & Drop Tips

- **Move a request** between folders by dragging it
- **Reorder collections** in the sidebar by dragging
- Hold the drag briefly before moving to activate the drag handle

---

## See Also

- [Collection Runner →](/docs/features/collections#collection-runner)
- [Scripts Guide →](./scripts)
