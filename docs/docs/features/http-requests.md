---
id: http-requests
title: HTTP Requests
sidebar_label: HTTP Requests
sidebar_position: 1
description: Full guide to building and sending HTTP requests in Fetchy.
---

# HTTP Requests

Fetchy provides comprehensive support for building and sending HTTP requests.

---

## Supported Methods

All standard HTTP methods are supported:

| Method | Use Case |
|--------|---------|
| `GET` | Retrieve resources |
| `POST` | Create new resources |
| `PUT` | Replace a resource |
| `PATCH` | Partially update a resource |
| `DELETE` | Delete a resource |
| `HEAD` | Get response headers only |
| `OPTIONS` | Discover allowed methods |

---

## URL Bar

Enter the full request URL including the scheme (`https://`). You can use [environment variables](/docs/features/environments) with `<<variable_name>>` syntax:

```
<<base_url>>/api/users/<<user_id>>
```

Variables are highlighted:
- 🟢 **Green** — variable is defined in the active environment
- 🟡 **Yellow** — variable is undefined

---

## Query Parameters

Use the **Params** tab to add query parameters:

| Key | Value | Enabled |
|-----|-------|---------|
| `page` | `1` | ✅ |
| `limit` | `20` | ✅ |
| `debug` | `true` | ⬜ (disabled) |

- Toggle individual parameters on/off without deleting them
- Use **Batch Edit** to edit all params as raw text (`key=value` per line)

---

## Headers

Use the **Headers** tab to manage request headers:

- Add custom headers (`Authorization`, `Content-Type`, etc.)
- Toggle headers on/off individually
- Use **Batch Edit** for bulk entry

---

## Request Body

The **Body** tab supports multiple content types:

### JSON
Full syntax highlighting via CodeMirror 6. Paste or type JSON directly:

```json
{
  "name": "Alice",
  "email": "alice@example.com"
}
```

### Form Data (`multipart/form-data`)
Key-value pairs sent as a multipart form. Supports file uploads.

### URL Encoded (`x-www-form-urlencoded`)
Key-value pairs encoded in the URL format.

### Raw Text
Send plain text, XML, or any custom content.

### Binary
Upload a file as a binary request body.

---

## Sending Requests

- **`Ctrl+Enter`** — Send the current request
- Click the **Send** button in the URL bar

While the request is in-flight, a loading indicator is shown and you can cancel by clicking **Cancel**.

---

## Tabs

Each request opens in its own **tab**. You can have multiple requests open simultaneously:

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New request tab |
| `Ctrl+W` | Close current tab |
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+Tab` | Previous tab |
| `Ctrl+1-9` | Jump to tab by number |

---

## See Also

- [Authentication →](/docs/features/authentication)
- [Response Handling →](/docs/features/response-handling)
- [Code Generation →](/docs/features/code-generation)
