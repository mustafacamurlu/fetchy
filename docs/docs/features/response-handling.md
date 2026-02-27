---
id: response-handling
title: Response Handling
sidebar_label: Response Handling
sidebar_position: 6
description: View and analyze API responses with Fetchy's response panel.
---

# Response Handling

The response panel displays everything you need to analyze API responses.

---

## Response Panel Tabs

| Tab | Contents |
|-----|---------|
| **Body** | Response body with syntax highlighting |
| **Headers** | All response headers as key-value pairs |
| **Request** | The actual request sent (with variables resolved) |
| **Console** | Script `console.log` output and test results |

---

## Response Body

- **Syntax highlighting** powered by CodeMirror 6 (JSON, XML, HTML, plain text)
- **Pretty-print** JSON automatically formatted
- **Raw view** — see the unformatted response
- **Copy to Clipboard** — copy the full response body
- Word wrap toggle for long lines

---

## Status Codes

Status codes are color-coded for quick identification:

| Range | Color | Meaning |
|-------|-------|---------|
| `1xx` | Blue | Informational |
| `2xx` | 🟢 Green | Success |
| `3xx` | 🟡 Yellow | Redirect |
| `4xx` | 🔴 Red | Client Error |
| `5xx` | 🔴 Red | Server Error |

---

## Performance Metrics

Displayed in the response panel header:

- **Response Time** — total time in milliseconds
- **Response Size** — body size in bytes/KB

---

## Panel Layout

Switch between two layouts from **Settings** or the toolbar:

- **Horizontal** — request panel on the left, response on the right (default)
- **Vertical** — request panel on top, response panel below

Panels are **resizable** — drag the divider to adjust the split.

---

## Request History

Every sent request is automatically saved to history:

- Browse history via the **History** tab in the sidebar
- Search history by URL or method
- **One-click restore** — click any history entry to open it in a new tab
- Configure the maximum number of history items retained in **Settings** (10–500)

---

## JSON Viewer

Large JSON responses are rendered with a collapsible tree view, making it easy to navigate complex structures.

---

## See Also

- [Scripts →](/docs/features/scripts) — Assertions and console output in the Console tab
- [HTTP Requests →](/docs/features/http-requests) — Configure requests
