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
pm.test("Login returns 200", () => {
  pm.expect(pm.response.status).to.equal(200);
});

const json = pm.response.json();

if (json.accessToken) {
  pm.environment.set("access_token", json.accessToken);
  console.log("✅ Access token set");
} else {
  console.error("❌ No access token in response");
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
pm.test("Response has expected shape", () => {
  const json = pm.response.json();

  pm.expect(json).to.have.property("id");
  pm.expect(json).to.have.property("name");
  pm.expect(json.id).to.be.a("number");
  pm.expect(json.name).to.be.a("string");
  pm.expect(json.name.length).to.be.greaterThan(0);
});
```

---

## Pattern 3 — Dynamic Request Modification (Pre-Script)

Add a request timestamp in the pre-request script:

```javascript
const timestamp = new Date().toISOString();
pm.environment.set("request_timestamp", timestamp);
console.log("Request timestamp:", timestamp);
```

Then use `<<request_timestamp>>` in your request body or headers.

---

## Pattern 4 — Chaining Requests

Create a resource in one request, then test it in the next:

**Create User (post-script):**
```javascript
pm.test("User created", () => {
  pm.expect(pm.response.status).to.equal(201);
});
const user = pm.response.json();
pm.environment.set("created_user_id", user.id);
```

**Get User (using chained variable):**
```
GET <<base_url>>/users/<<created_user_id>>
```

---

## Pattern 5 — Performance Assertions

```javascript
pm.test("Response under 500ms", () => {
  pm.expect(pm.response.responseTime).to.be.below(500);
});

pm.test("Response size under 100KB", () => {
  pm.expect(pm.response.headers["content-length"]).to.be.below(100000);
});
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
