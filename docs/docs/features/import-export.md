---
id: import-export
title: Import & Export
sidebar_label: Import & Export
sidebar_position: 7
description: Import from Postman, OpenAPI, and cURL; export to Postman or back up entire workspaces.
---

# Import & Export

Fetchy supports importing from multiple formats and exporting your work for backup or sharing.

---

## Importing

Open the import dialog with **`Ctrl+I`** or click **Import** in the toolbar.

### Postman Collection (v2.1)

1. Export your collection from Postman: **⋯ → Export → Collection v2.1**
2. In Fetchy: **Import → Postman Collection**
3. Select the `.json` file
4. The collection is imported with folders, requests, headers, body, and auth

**Supported fields:**
- All HTTP methods
- Headers, query params, body (JSON, form-data, urlencoded, raw)
- Collection variables
- Pre-request and test scripts

---

### OpenAPI / Swagger

Import API specifications in OpenAPI 3.x or Swagger 2.x format (JSON or YAML):

1. **Import → OpenAPI Spec**
2. Select or paste the spec file
3. Each endpoint becomes a request, organized by tags into folders

Variables are automatically generated for path parameters (e.g., `{userId}` → `<<userId>>`).

---

### cURL

Paste a cURL command directly to create a request instantly:

1. Copy a cURL command from anywhere (browser DevTools, API docs, etc.)
2. **Import → cURL Command**
3. Paste the command — the URL, method, headers, and body are parsed automatically

**Example:**
```bash
curl -X POST https://api.example.com/users \
  -H "Authorization: Bearer my-token" \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice"}'
```

---

## Exporting

### Export a Collection

Right-click any collection → **Export** to save as a Postman v2.1-compatible JSON file. Share with team members who use Postman or Fetchy.

### Export a Workspace

Back up your entire workspace (all collections, environments, and variables) to a single JSON file:

1. **Settings → Manage Workspaces**
2. Click **Export** next to a workspace
3. Choose a save location

:::note
Secret variable **Current Values** are not included in exports. Only Initial Values are exported.
:::

### Import a Workspace

Restore a workspace on another machine:

1. **Settings → Manage Workspaces → Import Workspace**
2. Select the exported JSON file
3. Provide a new home directory and secrets directory for this machine

---

## See Also

- [OpenAPI Editor →](/docs/features/workspaces) — Edit OpenAPI specs in-app
- [Workspaces →](/docs/features/workspaces) — Manage multiple workspaces
