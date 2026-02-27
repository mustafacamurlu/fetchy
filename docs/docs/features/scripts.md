---
id: scripts
title: Pre & Post-Request Scripts
sidebar_label: Scripts
sidebar_position: 5
description: Run JavaScript before and after requests to dynamically modify data or write assertions.
---

# Pre & Post-Request Scripts

Fetchy supports JavaScript scripting before and after each request, giving you programmatic control over request data and response validation.

---

## Script Tabs

Each request has two script tabs:

| Tab | When it runs | Purpose |
|-----|-------------|---------|
| **Pre-Script** | Before the request is sent | Modify request data, set variables, compute values |
| **Script** (Post) | After the response is received | Assertions, extract data, set variables from response |

---

## Script API Reference

### `pm.environment`

```javascript
// Read a variable
const baseUrl = pm.environment.get("base_url");

// Write a variable
pm.environment.set("access_token", "my-token-value");
```

### `pm.request`

```javascript
// Access request details
const method = pm.request.method;        // "GET", "POST", etc.
const url = pm.request.url;              // Full URL string
const headers = pm.request.headers;     // Headers object
const body = pm.request.body;           // Request body
```

### `pm.response`

```javascript
// Access response data
const status = pm.response.status;      // 200
const time = pm.response.responseTime;  // milliseconds
const body = pm.response.text();        // response as string
const json = pm.response.json();        // parsed JSON object
const headers = pm.response.headers;   // response headers
```

### `pm.test` — Assertions

```javascript
pm.test("Status is 200", () => {
  pm.expect(pm.response.status).to.equal(200);
});

pm.test("Response has user id", () => {
  const json = pm.response.json();
  pm.expect(json).to.have.property("id");
});

pm.test("Response time < 500ms", () => {
  pm.expect(pm.response.responseTime).to.be.below(500);
});
```

### `console.log`

Use standard `console.log()` to print debug output. Results appear in the **Console** tab of the response panel.

```javascript
console.log("Token:", pm.environment.get("api_token"));
```

---

## Common Pre-Request Script Patterns

### Generate a timestamp

```javascript
pm.environment.set("timestamp", new Date().toISOString());
```

### Compute an HMAC signature

```javascript
const secret = pm.environment.get("api_secret");
const payload = pm.request.body;
// ... compute signature and add to header
```

### Chain requests — use a token from a previous response

```javascript
// In a login request's post-script:
const json = pm.response.json();
pm.environment.set("access_token", json.token);
```

Then in subsequent requests, add:
```
Authorization: Bearer <<access_token>>
```

---

## Script Snippets

Click the **Snippets** panel (visible next to the script editor) to insert common patterns:

- Status code check
- Response time check
- JSON body parsing
- Set environment variable from response
- Log response body

---

## Script Console

After sending a request, switch to the **Console** tab in the response panel to see:
- `console.log` output
- Script errors with stack traces
- Test results (pass/fail)

---

## See Also

- [Environment Variables →](/docs/features/environments) — Variables used in scripts
- [Collections →](/docs/features/collections) — Run scripts across entire collections
