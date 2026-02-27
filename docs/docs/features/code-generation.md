---
id: code-generation
title: Code Generation
sidebar_label: Code Generation
sidebar_position: 8
description: Generate ready-to-use code snippets for your API requests in 8 languages.
---

# Code Generation

Fetchy can generate copy-paste ready code snippets for the current request in multiple languages and libraries.

---

## Supported Languages

| Language | Library/Tool |
|----------|-------------|
| **cURL** | Native cURL command |
| **JavaScript** | `fetch` API |
| **Python** | `requests` library |
| **Java** | `java.net.http.HttpClient` (Java 11+) |
| **C# / .NET** | `System.Net.Http.HttpClient` |
| **Go** | `net/http` package |
| **Rust** | `reqwest` crate |
| **C++** | `libcurl` |

---

## How to Generate a Snippet

1. Open a saved or unsaved request
2. Click the **`</>`** (Code) button in the request panel toolbar, or click the **arrow** next to it to select a specific language
3. The generated code is shown in a modal with syntax highlighting
4. Click **Copy** to copy to clipboard

---

## Variable Resolution

Variables are **fully resolved** before generating the snippet. If your request uses `<<base_url>>` and the active environment has `base_url = https://api.example.com`, the generated code will contain the resolved URL.

---

## Examples

### cURL

```bash
curl -X POST 'https://api.example.com/users' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbG...' \
  -d '{"name":"Alice","email":"alice@example.com"}'
```

### JavaScript (fetch)

```javascript
const response = await fetch('https://api.example.com/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbG...'
  },
  body: JSON.stringify({ name: 'Alice', email: 'alice@example.com' })
});
const data = await response.json();
```

### Python (requests)

```python
import requests

response = requests.post(
    'https://api.example.com/users',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbG...'
    },
    json={'name': 'Alice', 'email': 'alice@example.com'}
)
data = response.json()
```

### Go (net/http)

```go
package main

import (
    "bytes"
    "encoding/json"
    "net/http"
)

func main() {
    body, _ := json.Marshal(map[string]string{
        "name":  "Alice",
        "email": "alice@example.com",
    })
    req, _ := http.NewRequest("POST", "https://api.example.com/users", bytes.NewBuffer(body))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer eyJhbG...")

    client := &http.Client{}
    resp, _ := client.Do(req)
    defer resp.Body.Close()
}
```

---

## See Also

- [HTTP Requests →](/docs/features/http-requests) — Build the request to generate code from
- [Environment Variables →](/docs/features/environments) — Variables resolved in generated code
