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

### `fetchy.environment`

```javascript
// Read a variable
const baseUrl = fetchy.environment.get("base_url");

// Write a variable
fetchy.environment.set("access_token", "my-token-value");

// Get all environment variables
const allVars = fetchy.environment.all();
```

### `fetchy.response` (Post-Script only)

```javascript
// Access response data
const data = fetchy.response.data;        // parsed JSON response body
const status = fetchy.response.status;    // HTTP status code (number)
const text = fetchy.response.statusText;  // HTTP status text
const headers = fetchy.response.headers;  // response headers object
```

### Assertions & Validation

Use standard JavaScript conditionals and `console.log` for validation:

```javascript
// Check status code
if (fetchy.response.status === 200) {
  console.log('✅ Status is 200');
} else {
  console.log('❌ Unexpected status:', fetchy.response.status);
}

// Validate response has expected fields
const data = fetchy.response.data;
if (data.id && data.name) {
  console.log('✅ Response has expected shape');
} else {
  console.log('❌ Missing expected fields');
}

// Check response time (via headers or custom logic)
const contentType = fetchy.response.headers['content-type'];
console.log('Content-Type:', contentType);
```

### `console.log`

Use standard `console.log()` to print debug output. Results appear in the **Console** tab of the response panel.

```javascript
console.log("Token:", fetchy.environment.get("api_token"));
```

---

## Common Pre-Request Script Patterns

### Generate a timestamp

```javascript
fetchy.environment.set("timestamp", new Date().toISOString());
```

### Generate a random UUID

```javascript
const uuid = crypto.randomUUID();
fetchy.environment.set("uuid", uuid);
console.log("UUID:", uuid);
```

### Chain requests — use a token from a previous response

```javascript
// In a login request's post-script:
const data = fetchy.response.data;
fetchy.environment.set("access_token", data.token);
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
