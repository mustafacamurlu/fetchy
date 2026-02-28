# Performance NFR Audit — Fetchy

**Date:** March 1, 2026  
**Scope:** Full codebase performance review (Electron main process, React renderer, Zustand stores, persistence layer, HTTP client)  
**Methodology:** Static analysis of hot paths, render behavior, memory patterns, and I/O operations

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 5     |
| High     | 8     |
| Medium   | 8     |
| Low      | 5     |
| **Total**| **26**|

**Top 3 Quick Wins:**
1. Granular Zustand selectors (High — prevents unnecessary re-renders across the app)
2. Async `fs` operations in `electron/main.js` (Critical — unblocks Electron main process)
3. Eliminate triple-serialize in persistence layer (Critical — removes redundant JSON work on every state change)

---

## Critical (5)

### C-1 · Deep-clone via `JSON.parse(JSON.stringify())` on every persist

**File:** `src/store/appStore.ts` — persist `storage.setItem`  
**Impact:** Every Zustand state change triggers a full deep-clone of the entire store through `JSON.parse(JSON.stringify(state))`. For large workspaces with hundreds of requests, this creates significant GC pressure and blocks the main thread.  
**Recommendation:** Use `structuredClone()` (available in all modern Electron/Chromium) or `immer`'s `produce` to produce the serializable snapshot. Better yet, diff-patch only changed slices instead of cloning the entire tree.

---

### C-2 · 5× JSON serialization per write cycle

**File:** `src/store/persistence.ts` + `electron/main.js`  
**Impact:** A single persist cycle serializes state to JSON multiple times:
1. `JSON.stringify` inside Zustand persist middleware
2. `JSON.parse` to deep-clone
3. `JSON.stringify` again when sending over IPC
4. Electron `JSON.parse` on receive
5. `JSON.stringify` to write to disk  

This multiplied serialization is the dominant CPU cost for saves on large workspaces.  
**Recommendation:** Pass the already-serialized JSON string through IPC instead of re-parsing and re-stringifying. Collapse to a single `JSON.stringify` in the renderer and a single `fs.writeFile` in main.

---

### C-3 · Synchronous `fs` operations block Electron main process

**File:** `electron/main.js` (multiple IPC handlers)  
**Impact:** `fs.writeFileSync`, `fs.readFileSync`, `fs.existsSync`, and `fs.mkdirSync` are used throughout IPC handlers. These block the main process event loop, freezing the entire app (menus, window management, IPC) during disk I/O.  
**Recommendation:** Replace all sync fs calls with async equivalents (`fs.promises.writeFile`, `fs.promises.readFile`, etc.) and `await` them inside `ipcMain.handle` handlers.

---

### C-4 · Unbounded HTTP response buffering

**File:** `electron/main.js` — `http-request` handler  
**Impact:** The entire HTTP response body is accumulated in memory as a single string/buffer with no size limit. A multi-GB response will exhaust process memory and crash the app.  
**Recommendation:** Add a configurable `maxResponseSize` (e.g., 50 MB default). Stream the response and abort once the limit is exceeded. Provide a user-visible warning.

---

### C-5 · No `AbortController` / request cancellation

**File:** `src/utils/httpClient.ts` + `electron/main.js`  
**Impact:** Once an HTTP request is dispatched, there is no mechanism to cancel it. Long-running or hung requests occupy resources indefinitely and block the UI's "loading" state.  
**Recommendation:** Pass an `AbortSignal` from the renderer through IPC. In main, pipe it into the `https.request` / `http.request` options so the underlying socket is destroyed on cancel.

---

## High (8)

### H-1 · Zustand over-selection — 20+ fields in a single selector

**File:** `src/App.tsx`, `src/components/RequestPanel.tsx`, `src/components/Sidebar.tsx`  
**Impact:** Components destructure 15-25 fields from the store in a single `useAppStore(state => ({ ... }))` call. Zustand's shallow equality check must compare all fields on every state change, and any unrelated mutation triggers a re-render when an adjacent field's reference changes.  
**Recommendation:** Split into multiple fine-grained selectors, each selecting 1-3 related fields. Use `useShallow` from `zustand/react/shallow` for object selectors.

---

### H-2 · `formattedBody` recomputed every render

**File:** `src/components/ResponsePanel.tsx`  
**Impact:** `JSON.stringify(JSON.parse(body), null, 2)` is called inline during render to pretty-print the response body. For large JSON responses (megabytes), this blocks the render cycle.  
**Recommendation:** Memoize with `useMemo` keyed on the raw body string. Consider moving formatting to a Web Worker for bodies > 1 MB.

---

### H-3 · No list virtualization for request tree / collections

**File:** `src/components/Sidebar.tsx`, `src/components/sidebar/RequestTreeItem.tsx`  
**Impact:** All request tree items are rendered in the DOM simultaneously. Workspaces with 500+ requests create thousands of DOM nodes, causing sluggish scrolling and high memory usage.  
**Recommendation:** Use `react-window` or `@tanstack/react-virtual` to virtualize the sidebar list so only visible items are mounted.

---

### H-4 · O(n) recursive tree traversal on every action

**File:** `src/store/requestTree.ts`  
**Impact:** `findRequestById`, `moveRequest`, `deleteRequest`, and similar functions walk the entire request tree recursively. With deeply nested folders and hundreds of items, these lookups add up — especially when called in rapid succession (drag-and-drop reordering).  
**Recommendation:** Maintain a flat `Map<id, node>` index alongside the tree. Update the index on mutations. Lookups become O(1).

---

### H-5 · New Web Worker created per script execution

**File:** `src/utils/httpClient.ts` — `runScriptInWorker()`  
**Impact:** Each pre-request or test script spins up a new Worker from a Blob URL, runs the script, then terminates the Worker. Worker creation has non-trivial overhead (~5-20 ms per instantiation). During collection runs with hundreds of requests, this adds up.  
**Recommendation:** Maintain a single long-lived Worker (or a pool of 2-4). Post scripts as messages and reuse the Worker across executions. Reset state between runs via a `reset` message.

---

### H-6 · `flattenRequests` not memoized

**File:** `src/store/appStore.ts`  
**Impact:** `flattenRequests()` recursively flattens the entire request tree into an array. It is called from multiple components on every render without memoization, duplicating work.  
**Recommendation:** Memoize the result with `useMemo` or a Zustand derived selector. Invalidate only when the collections array reference changes.

---

### H-7 · No concurrency limit in parallel collection runs

**File:** `src/components/RunCollectionModal.tsx` / `src/utils/httpClient.ts`  
**Impact:** When running a collection in parallel, all requests fire simultaneously. 200+ concurrent requests can exhaust Electron's socket pool and OS file descriptors, leading to timeouts and EMFILE errors.  
**Recommendation:** Implement a concurrency limiter (e.g., `p-limit` or a simple semaphore) defaulting to 5-10 concurrent requests.

---

### H-8 · `RequestPanel` `useEffect` depends on entire `collections` array

**File:** `src/components/RequestPanel.tsx`  
**Impact:** A `useEffect` that syncs the active request re-runs whenever any mutation anywhere in `collections` changes. This causes unnecessary work (and potential flicker) every time any request in any folder is modified.  
**Recommendation:** Narrow the dependency to only the active request's ID and the specific collection it belongs to.

---

## Medium (8)

### M-1 · CodeEditor re-created on theme toggle

**File:** `src/components/CodeEditor.tsx`  
**Impact:** The CodeMirror editor instance is destroyed and re-mounted on theme changes because the `key` prop or extension array changes identity. This causes a visible flicker and loses cursor position.  
**Recommendation:** Use CodeMirror's `EditorView.reconfigure` compartment to swap the theme extension in-place without remounting.

---

### M-2 · Markdown regex patterns not memoized

**File:** `src/components/AIAssistant.tsx`  
**Impact:** Regex patterns for parsing markdown in AI responses are compiled on every render. While fast individually, this is wasteful when streaming tokens cause rapid re-renders (10-30 per second).  
**Recommendation:** Move regex compilation to module scope (outside the component) or wrap in `useMemo` with empty deps.

---

### M-3 · `replaceVariables` creates N `RegExp` per call

**File:** `src/utils/helpers.ts` — `replaceVariables()`  
**Impact:** For each variable in the environment, a new `RegExp` is constructed to do a global replacement. With 50 environment variables and 10 fields per request, that's 500 RegExp instantiations per request.  
**Recommendation:** Build a single regex matching all variable patterns `{{var1}}|{{var2}}|...` and use a replace callback with a lookup map. This reduces to 1 regex per call.

---

### M-4 · Inline arrow functions in JSX create new references each render

**File:** Multiple components (`Sidebar.tsx`, `TabBar.tsx`, `RequestPanel.tsx`)  
**Impact:** `onClick={() => doThing(id)}` in mapped lists creates a new function reference per item per render, defeating `React.memo` on child components.  
**Recommendation:** Use `useCallback` for stable handlers, or pass the ID as a data attribute and read it from the event in a single handler.

---

### M-5 · Render functions defined inside component bodies

**File:** `src/components/Sidebar.tsx`, `src/components/RequestPanel.tsx`  
**Impact:** Large render-helper functions (e.g., `renderTreeItem`, `renderAuthSection`) are redefined on every render, generating fresh closures.  
**Recommendation:** Extract as standalone components or memoize with `useCallback`. Standalone components also enable React to skip re-rendering them independently.

---

### M-6 · `getCodeForLanguage` not memoized

**File:** `src/utils/codeGenerator.ts`  
**Impact:** Code generation for the "Code" tab rebuilds the full snippet string from scratch every time the component renders, even if the request hasn't changed.  
**Recommendation:** Memoize at the call site with `useMemo` keyed on the request data and selected language.

---

### M-7 · JSONViewer recursive render function re-created each render

**File:** `src/components/JSONViewer.tsx`  
**Impact:** The recursive `renderNode` function inside `JSONViewer` captures state via closure and is re-created on every render, preventing subtree memoization.  
**Recommendation:** Extract `renderNode` into a memoized child component that accepts value, path, and expanded set as props.

---

### M-8 · `window.location.reload()` on workspace switch

**File:** `src/store/workspacesStore.ts`  
**Impact:** Switching workspaces does a full page reload, discarding all in-memory state, cached data, and open editor state. This is technically correct but heavy-handed — users who frequently switch workspaces pay a multi-second penalty each time.  
**Recommendation:** Reset stores programmatically and re-initialize from disk without a full reload. This preserves Electron's renderer process warm caches.

---

## Low (5)

### L-1 · `setTimeout` without cleanup in `useEffect`

**File:** `src/components/Confetti.tsx`, `src/components/WelcomeScreen.tsx`  
**Impact:** `setTimeout` calls inside `useEffect` don't return a cleanup function. If the component unmounts before the timer fires, the callback runs against stale or unmounted state, potentially triggering a React warning or no-op state update.  
**Recommendation:** Return `() => clearTimeout(timer)` from the `useEffect`.

---

### L-2 · 15 `useState` booleans for modal visibility

**File:** `src/App.tsx`  
**Impact:** 15 separate `useState` hooks manage modal open/close state. Each setter triggers a React re-render of `App` (and all children not memoized). Opening one modal re-renders the entire app.  
**Recommendation:** Consolidate into a single `useReducer` or a `modalStore` Zustand slice with an `activeModal: string | null` pattern.

---

### L-3 · `flatVisibleRequests` recalculated without memoization

**File:** `src/components/Sidebar.tsx`  
**Impact:** `flatVisibleRequests` is derived from the request tree on every render to support keyboard navigation. While typically fast, it duplicates work already done by the tree rendering.  
**Recommendation:** Memoize with `useMemo` keyed on collections + expanded folder set.

---

### L-4 · Git polling without repository existence check

**File:** `src/components/GitSettingsTab.tsx`  
**Impact:** The git status polling interval (default 3s) fires IPC calls even when no git repository is initialized for the workspace. Each call goes through IPC, attempts `git status`, catches the error, and discards it — wasted cycles.  
**Recommendation:** Check for `.git` directory existence once on mount and skip polling if absent. Re-check when user initializes a repo.

---

### L-5 · Unnecessary shallow-clone in store actions

**File:** `src/store/appStore.ts`  
**Impact:** Some actions spread `{ ...state }` before passing to `immer`'s `produce`. Since `immer` already creates a draft proxy, the shallow clone is redundant and allocates an extra object on every action.  
**Recommendation:** Remove the spread — pass the state directly to `produce`.

---

## Appendix: Recommended Priority Order

Fixes are ordered by **impact × effort** ratio (best ROI first):

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 1 | H-1 Granular selectors | Low | High |
| 2 | C-3 Async fs operations | Medium | Critical |
| 3 | C-2 Eliminate triple-serialize | Medium | Critical |
| 4 | H-2 Memoize formattedBody | Low | High |
| 5 | C-1 Replace JSON deep-clone | Low | Critical |
| 6 | H-6 Memoize flattenRequests | Low | High |
| 7 | M-3 Single regex for replaceVariables | Low | Medium |
| 8 | C-5 AbortController for requests | Medium | Critical |
| 9 | H-4 Flat Map index for tree | Medium | High |
| 10 | H-5 Worker pool instead of per-script | Medium | High |
| 11 | H-3 Virtualize sidebar list | Medium | High |
| 12 | C-4 Bounded response buffer | Medium | Critical |
| 13 | L-2 Consolidate modal state | Low | Low |
| 14 | H-8 Narrow useEffect deps | Low | High |
| 15 | H-7 Concurrency limiter | Low | High |
| 16 | M-1 CodeEditor theme swap | Medium | Medium |
| 17 | M-8 Workspace switch without reload | High | Medium |
| 18 | M-2 Module-scope regex | Low | Medium |
| 19 | M-4 Stable callback refs | Low | Medium |
| 20 | M-5 Extract render functions | Medium | Medium |
| 21 | M-6 Memoize code generator | Low | Medium |
| 22 | M-7 JSONViewer child component | Medium | Medium |
| 23 | L-1 Cleanup timeouts | Low | Low |
| 24 | L-3 Memoize flatVisibleRequests | Low | Low |
| 25 | L-4 Skip git polling without repo | Low | Low |
| 26 | L-5 Remove redundant spread | Low | Low |
