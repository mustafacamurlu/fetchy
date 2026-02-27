---
id: workspaces
title: Workspaces
sidebar_label: Workspaces
sidebar_position: 9
description: Create and manage isolated workspaces for different projects in Fetchy.
---

# Workspaces

Workspaces let you maintain completely isolated environments for different projects, clients, or contexts.

---

## What is a Workspace?

Each workspace has:
- A unique **name**
- A **home directory** — where collections, environments, and request history are stored
- A **secrets directory** — where secret variable current values are stored separately

This means you can have completely separate sets of collections and environments for `Client A`, `Client B`, and `Personal Projects`, each in different directories on your filesystem.

---

## Creating a Workspace

1. Open **Settings** (gear icon in toolbar)
2. Go to **Workspaces**
3. Click **+ New Workspace**
4. Enter:
   - **Name** (e.g., `My SaaS Project`)
   - **Home Directory** — a folder path where workspace data will be stored
   - **Secrets Directory** — a separate folder for secret variable values
5. Click **Create**

The chosen directories will be created if they don't exist.

---

## Switching Workspaces

1. Click the **workspace dropdown** in the top toolbar, or open **Settings → Workspaces**
2. Click a different workspace name
3. The app reloads with the selected workspace's data

---

## Workspace File Structure

```
~/my-project-workspace/           ← Home directory
├── collections/
│   ├── users-api.json
│   └── payments-api.json
├── environments/
│   ├── development.json
│   └── production.json
└── history.json

~/my-project-secrets/             ← Secrets directory
└── env-secrets.json              ← Secret variable current values
```

All files are plain, human-readable JSON.

---

## Exporting & Importing Workspaces

### Export

1. Settings → Workspaces → **Export** (next to a workspace)
2. A single JSON file is created containing all collections, environments, and initial variable values

:::caution
Secret variable **Current Values** are NOT included in exports — only Initial Values. This prevents accidental credential leakage.
:::

### Import

1. Settings → Workspaces → **Import Workspace**
2. Select an exported JSON file
3. Provide a new **home directory** and **secrets directory** for this machine
4. The workspace is created and ready to use

---

## Managing Workspaces

| Action | How |
|--------|-----|
| Rename | Settings → Workspaces → edit name |
| Delete | Settings → Workspaces → **Remove** |
| Export | Settings → Workspaces → **Export** |
| Import | Settings → Workspaces → **Import Workspace** |

Removing a workspace from Fetchy does **not** delete the files on disk.

---

## See Also

- [Environments →](/docs/features/environments) — Per-workspace environments and variables
- [Import & Export →](/docs/features/import-export) — Back up entire workspaces
