---
id: scripts
title: Guide — Scripting & Assertions
sidebar_label: Scripting & Assertions
sidebar_position: 4
description: Use pre and post-request scripts to automate workflows and add assertions.
---

# Guide: Scripting & Assertions

This guide covers real-world scripting patterns in Fetchy.

---

## Pattern 1 — Automated Login Flow

Run a full auth flow automatically before testing protected endpoints:

**Step 1:** Create a `Login` request with this **post-script (Script tab)**:

```javascript
const data = fetchy.response.data;

if (fetchy.response.status === 200) {
  console.log("✅ Login returned 200");
} else {
  console.log("❌ Unexpected status:", fetchy.response.status);
}

if (data.accessToken) {
  fetchy.environment.set("access_token", data.accessToken);
  console.log("✅ Access token set");
} else {
  console.log("❌ No access token in response");
}
```

**Step 2:** All subsequent requests use:
```
Authorization: Bearer <<access_token>>
```

---

## Pattern 2 — Response Shape Validation

Validate the structure of your responses:

```javascript
const data = fetchy.response.data;

if (data.id && data.name) {
  console.log("✅ Response has expected shape");
  console.log("  id:", typeof data.id, "=", data.id);
  console.log("  name:", typeof data.name, "=", data.name);
} else {
  console.log("❌ Missing expected fields — got:", Object.keys(data));
}
```

---

## Pattern 3 — Dynamic Request Modification (Pre-Script)

Add a request timestamp in the pre-request script:

```javascript
const timestamp = new Date().toISOString();
fetchy.environment.set("request_timestamp", timestamp);
console.log("Request timestamp:", timestamp);
```

Then use `<<request_timestamp>>` in your request body or headers.

---

## Pattern 4 — Chaining Requests

Create a resource in one request, then test it in the next:

**Create User (post-script):**
```javascript
if (fetchy.response.status === 201) {
  console.log("✅ User created");
} else {
  console.log("❌ Unexpected status:", fetchy.response.status);
}
const user = fetchy.response.data;
fetchy.environment.set("created_user_id", user.id);
```

**Get User (using chained variable):**
```
GET <<base_url>>/users/<<created_user_id>>
```

---

## Pattern 5 — Response Validation

```javascript
// Check content-length header
const contentLength = Number(fetchy.response.headers['content-length'] || 0);
if (contentLength < 100000) {
  console.log('✅ Response size under 100KB:', contentLength, 'bytes');
} else {
  console.log('❌ Response too large:', contentLength, 'bytes');
}

console.log('Status:', fetchy.response.status, fetchy.response.statusText);
```

---

## Viewing Script Output

After sending a request, click the **Console** tab in the response panel to see:
- All `console.log` output
- Script errors with line numbers
- Test results with ✅/❌ indicators

---

## See Also

- [Scripts Feature →](/docs/features/scripts) — Full API reference
- [Collections Guide →](./collections) — Run scripts across an entire collection
