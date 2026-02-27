---
id: environment-variables
title: Guide — Using Environment Variables
sidebar_label: Environment Variables
sidebar_position: 2
description: Learn how to use environment variables effectively in Fetchy.
---

# Guide: Using Environment Variables

Environment variables are one of the most powerful features in Fetchy. This guide shows practical patterns for using them effectively.

---

## Pattern 1 — Base URL Management

Store your API base URL in an environment variable to easily switch between Dev, Staging, and Production.

**Environments:**

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `base_url` | `http://localhost:3000` | `https://staging.api.example.com` | `https://api.example.com` |
| `api_version` | `v1` | `v1` | `v2` |

**Request URL:**
```
<<base_url>>/<<api_version>>/users
```

Switch environments in seconds using the dropdown — no request modifications needed.

---

## Pattern 2 — Authentication Tokens

Store auth tokens as variables so they can be refreshed without touching individual requests:

1. Add variable: `api_token` (mark as **Secret**)
2. In your collection auth settings:
   - Auth type: **Bearer Token**
   - Token: `<<api_token>>`
3. All requests in the collection automatically use the token

---

## Pattern 3 — Token Refresh via Script

Automatically capture tokens from login responses:

**Login request post-script (Script tab):**

```javascript
pm.test("Login successful", () => {
  pm.expect(pm.response.status).to.equal(200);
});

const json = pm.response.json();
pm.environment.set("access_token", json.access_token);
pm.environment.set("refresh_token", json.refresh_token);

console.log("Tokens stored successfully");
```

Now all subsequent requests using `<<access_token>>` automatically have the latest token.

---

## Pattern 4 — Dynamic Path Parameters

Store resource IDs you are working with:

```
Variable: user_id = 42
URL: <<base_url>>/users/<<user_id>>/orders
```

Update `user_id` once in the environment to test all user-related requests for a different user.

---

## Pattern 5 — Keeping Secrets Safe

Mark sensitive variables (API keys, passwords, tokens) as **Secret**:

- They display as `••••••` in the UI
- Their values are stored in the **secrets directory** (separate from the main workspace)
- They are never included in workspace exports

This allows you to safely share exported collections with teammates without leaking credentials.

---

## See Also

- [Environments Feature →](/docs/features/environments) — Full environments documentation
- [Scripts Guide →](./scripts) — Read and write variables from scripts
