---
id: authentication
title: Authentication
sidebar_label: Authentication
sidebar_position: 2
description: Configure Bearer Token, Basic Auth, and API Key authentication in Fetchy.
---

# Authentication

Fetchy supports the most common authentication schemes and allows auth to be configured at the collection, folder, or individual request level.

---

## Auth Types

### Bearer Token

Sends an `Authorization: Bearer <token>` header automatically.

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Fields:**
- **Token** — paste your JWT or API token

Use the [JWT Tooltip](/docs/features/http-requests) to inspect JWT claims without leaving Fetchy.

---

### Basic Auth

Sends base64-encoded `username:password` as a Basic auth header.

```
Authorization: Basic dXNlcjpwYXNz
```

**Fields:**
- **Username**
- **Password**

---

### API Key

Send an API key either as a **header** or a **query parameter**.

**Fields:**
- **Key** — header or parameter name (e.g., `X-API-Key`)
- **Value** — the API key value
- **Add to** — `Header` or `Query Param`

---

### No Auth

Explicitly marks the request as having no authentication. Useful when a parent collection has auth configured but a specific request should bypass it.

---

## Inheritance

Auth can be set at three levels:

```
📁 Collection (Auth: Bearer Token)
  └── 📁 Folder (Auth: inherit)
        ├── 📄 Request A (Auth: inherit)    ← uses collection's Bearer Token
        ├── 📄 Request B (Auth: No Auth)    ← explicitly no auth
        └── 📄 Request C (Auth: Basic Auth) ← overrides with its own auth
```

When a request or folder is set to **Inherit**, it uses the authentication from the nearest parent that has explicit auth configured.

---

## Setting Auth on a Collection

1. Right-click a collection in the sidebar → **Collection Settings**
2. Go to the **Auth** tab
3. Choose an auth type and fill in the values
4. Child requests set to `inherit` will use this auth automatically

---

## Using Variables in Auth

Auth fields support environment variable substitution:

```
Token: <<api_token>>
```

This allows you to store sensitive tokens in environment variables rather than hardcoding them.

---

## See Also

- [Environment Variables →](/docs/features/environments) — Store credentials as variables
- [Collections →](/docs/features/collections) — Set collection-level auth
