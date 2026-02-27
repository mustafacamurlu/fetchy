---
id: first-request
title: Guide — Building Your First API Request
sidebar_label: Your First Request
sidebar_position: 1
description: Step-by-step guide to building and sending your first API request in Fetchy.
---

# Guide: Building Your First API Request

This guide walks you through building a real API request using the [JSONPlaceholder](https://jsonplaceholder.typicode.com/) public test API.

---

## Goal

By the end of this guide you will have:

1. Created a collection called **"JSONPlaceholder"**
2. Added a `GET /posts` request
3. Added a `POST /posts` request with a JSON body
4. Used an environment variable for the base URL
5. Verified both responses

---

## Step 1 — Set Up an Environment

1. Press **`Ctrl+E`** to open Environments
2. Click **+ Add Environment** → name it `Demo`
3. Add a variable:
   - **Name:** `base_url`
   - **Initial Value:** `https://jsonplaceholder.typicode.com`
4. Close the modal and select **Demo** in the environment dropdown

---

## Step 2 — Create a Collection

1. Click **+ New Collection** in the sidebar
2. Name it `JSONPlaceholder`
3. Click **Create**

---

## Step 3 — Add a GET Request

1. Right-click the `JSONPlaceholder` collection → **New Request**
2. Name it `List Posts`
3. Set:
   - Method: `GET`
   - URL: `<<base_url>>/posts`
4. Press **`Ctrl+Enter`** to send
5. You should see a `200 OK` response with an array of 100 posts

---

## Step 4 — Add a POST Request

1. Right-click the collection → **New Request**
2. Name it `Create Post`
3. Set:
   - Method: `POST`
   - URL: `<<base_url>>/posts`
4. Go to **Body** tab → select **JSON**
5. Enter:
   ```json
   {
     "title": "My New Post",
     "body": "This is the content of my post.",
     "userId": 1
   }
   ```
6. Press **`Ctrl+Enter`** to send
7. You should see a `201 Created` response

---

## Step 5 — Save Both Requests

Press **`Ctrl+S`** for each request to save them to the `JSONPlaceholder` collection.

---

## Result

Your sidebar now looks like:

```
📁 JSONPlaceholder
  ├── 📄 List Posts      GET /posts
  └── 📄 Create Post     POST /posts
```

---

## Next Steps

- [Environment Variables Guide →](./environment-variables) — Advanced variable use cases
- [Scripts Guide →](./scripts) — Add assertions to your requests
