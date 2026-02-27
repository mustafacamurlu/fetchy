---
id: introduction
title: Introduction
sidebar_label: Introduction
sidebar_position: 1
description: Fetchy is a privacy-focused, self-hosted REST API client — local by design, reliable by nature.
---

# Introduction

<div className="privacy-badge">
  🔒 100% Local &nbsp;|&nbsp; ✅ No Cloud Sync &nbsp;|&nbsp; ✅ No Account Required &nbsp;|&nbsp; ✅ No Telemetry
</div>

**Fetchy** is a powerful, privacy-focused, self-hosted REST API client for developers who value data ownership and offline capabilities.

> _Local by design. Reliable by nature._

---

## Why Fetchy?

Most API clients store data in the cloud or require an account. Fetchy takes a different approach:

| Feature | Fetchy | Cloud-based tools |
|---------|--------|-------------------|
| Data storage | Your machine only | Cloud servers |
| Account required | ❌ No | ✅ Yes |
| Works offline | ✅ Yes | ⚠️ Partial |
| Telemetry / tracking | ❌ None | ✅ Yes |
| Secret variable storage | Separate local directory | Cloud |
| Cost | Free & open source | Often freemium |

---

## Core Capabilities

- 📡 **Full HTTP support** — GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- 🔐 **Authentication** — Bearer Token, Basic Auth, API Key with inheritance
- 📁 **Collections** — Nested folders, drag-and-drop, collection runner
- 🌍 **Environments** — Multiple environments, variable substitution (`<<var>>`)
- 📜 **Scripts** — Pre/post-request JavaScript with built-in snippets
- 💻 **Code generation** — 8 languages including Python, Go, Rust, C++
- 🔄 **Import/Export** — Postman, OpenAPI, cURL, workspace backup
- 🗂️ **OpenAPI Editor** — Edit specs in-app, import to collection
- 🗃️ **Workspaces** — Multiple isolated workspaces with separate secret storage
- 🎨 **9 Themes** — plus fully custom theme editor

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| UI Styling | Tailwind CSS |
| State Management | Zustand |
| Code Editor | CodeMirror 6 |
| Desktop Framework | Electron 40 |
| Build Tool | Vite |
| Drag & Drop | dnd-kit |

---

## Next Steps

- [Installation →](./installation) — Set up Fetchy from source or download the installer
- [First Request →](./first-request) — Create and send your first API request
- [Features →](/docs/features/http-requests) — Explore all capabilities in detail
