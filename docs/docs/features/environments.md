---
id: environments
title: Environments & Variables
sidebar_label: Environments & Variables
sidebar_position: 4
description: Manage multiple environments and use variable substitution in Fetchy.
---

# Environments & Variables

Environments allow you to define named variable sets and switch between them (Dev, Staging, Prod) without modifying your requests.

---

## Variable Syntax

Use double angle brackets to reference variables anywhere in your request:

```
<<variable_name>>
```

**Supported locations:**
- URL: `<<base_url>>/api/users`
- Headers: `Authorization: Bearer <<api_token>>`
- Body: `{"user": "<<username>>"}`
- Query parameters
- Auth fields

**Visual highlighting:**
- 🟢 **Green** — variable is defined in the active environment
- 🟡 **Yellow** — variable is undefined (will be sent as-is)

---

## Managing Environments

Open with `Ctrl+E` or the environment dropdown in the toolbar.

### Create an Environment

1. Click **+ Add Environment**
2. Enter a name (e.g., `Development`, `Production`)
3. Add variables

### Add Variables

Each variable has:

| Field | Description |
|-------|-------------|
| **Name** | Variable identifier, used with `<<name>>` |
| **Initial Value** | Shareable default value — exported with the workspace |
| **Current Value** | Local-only override — never exported |
| **Secret** | If checked, value is visually masked and stored in the secrets directory |

:::tip
Use **Initial Value** for non-sensitive defaults (like base URLs) and **Current Value** for personal/local overrides (like your own API key).
:::

---

## Switching Environments

Use the **environment dropdown** in the top toolbar to switch between environments. Changes take effect immediately for all subsequent requests.

---

## Secret Variables

Mark a variable as **Secret** to:
- Mask its value in the UI (shown as `••••••`)
- Store its **Current Value** in a separate **secrets directory** (configured per workspace)
- Keep secrets out of the main workspace export

This means you can export your workspace and share it without leaking credentials.

---

## Collection Variables

In addition to environment variables, each collection can have its own variables:

- Scoped to requests within that collection
- Override environment variables for collection-specific values
- Configured via **Collection Settings → Variables**

**Resolution order:** Collection variables → Environment variables

---

## Using Variables in Scripts

In pre/post-request scripts, read and write environment variables programmatically:

```javascript
// Read a variable
const token = pm.environment.get("api_token");

// Write a variable (e.g., after a login request)
const json = pm.response.json();
pm.environment.set("access_token", json.token);
```

---

## See Also

- [Scripts →](/docs/features/scripts) — Access and set variables in JavaScript
- [Workspaces →](/docs/features/workspaces) — Per-workspace environment isolation
