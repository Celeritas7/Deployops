# CC Prompt — swap storage getPublicUrl → signed URLs

Paste everything below into Claude Code, in the repo root.

---

In `index.html`, the `deployops-drawings` storage bucket is being made **private**. Two call sites still use `getPublicUrl`, which will stop working. Replace them with cached signed URLs.

## Constraints

- `getPageURL(pageNum)` (line ~1813) is called **synchronously** from inside the `renderDrawing()` template string. Do **not** make it async — that would require rewriting the whole render path. Instead, pre-sign URLs before render and have `getPageURL` read from a cache.
- Signed URLs expire. The app can sit open all day, so the cache must re-sign on expiry.
- Existing cache-busting behaviour (`drawingCacheBust`) must keep working — signed URLs already carry a `?token=`, so the bust param must be appended with `&`, not `?`.
- Legacy drawings have no `source.pdf`. Signing a missing object must fail silently and fall back to the PNG, exactly as today.

## 1. Add a signing layer

Put this immediately above `function getPageURL` (~line 1813), replacing the existing `const drawingCacheBust = {};` declaration below it (move that into this block):

```js
// ── Signed storage URLs ──────────────────────────────────────
// The deployops-drawings bucket is private, so every page PNG and source PDF
// needs a short-lived signed URL. We sign a whole drawing's pages in one
// request and cache them, because renderDrawing() reads URLs synchronously.
const SIGNED_TTL = 3600;            // 1 hour
const SIGN_REFRESH_MS = 300000;     // re-sign when <5 min of life left
const signedUrls = {};              // storage path -> { url, expAt }
const drawingCacheBust = {};

function cachedSigned(path) {
  const hit = signedUrls[path];
  if (hit && hit.expAt - Date.now() > SIGN_REFRESH_MS) return hit.url;
  return null;
}

// Sign many paths in one round-trip. Missing objects come back with an error
// and are simply skipped (legacy drawings without source.pdf).
async function signPaths(paths) {
  const want = paths.filter(p => !cachedSigned(p));
  if (!want.length) return;
  const { data, error } = await sb.storage.from('deployops-drawings')
    .createSignedUrls(want, SIGNED_TTL);
  if (error) { console.warn('sign failed', error); return; }
  const expAt = Date.now() + SIGNED_TTL * 1000;
  (data || []).forEach(r => {
    if (r && r.signedUrl && !r.error) signedUrls[r.path] = { url: r.signedUrl, expAt };
  });
}

// Sign every page of a drawing plus its source PDF. Call before renderDrawing().
async function ensureDrawingUrls(drawing) {
  if (!drawing) return;
  const paths = [`${drawing.drawing_ref}/source.pdf`];
  for (let p = 1; p <= (drawing.page_count || 1); p++) {
    paths.push(`${drawing.drawing_ref}/page_${p}.png`);
  }
  await signPaths(paths);
}

// Drop cached URLs for a drawing after upload / page delete / reorder.
function invalidateDrawingUrls(ref) {
  Object.keys(signedUrls).forEach(k => { if (k.startsWith(ref + '/')) delete signedUrls[k]; });
}
```

## 2. Rewrite `getPageURL`

```js
function getPageURL(pageNum) {
  if (!currentDrawing) return '';
  const path = `${currentDrawing.drawing_ref}/page_${pageNum}.png`;
  const url = cachedSigned(path);
  if (!url) {
    // Not signed yet (or just expired) — sign in the background and re-render.
    const d = currentDrawing;
    signPaths([path]).then(() => { if (currentDrawing === d) renderDrawing(); });
    return '';
  }
  // Cache-bust after page deletion: pages shift in storage but the path stays
  // the same, so the browser would serve the stale image. Signed URLs already
  // have a query string, so append with &.
  const bust = drawingCacheBust[currentDrawing.id];
  return bust ? `${url}&v=${bust}` : url;
}
```

## 3. `selectDrawing` — pre-sign before rendering

In `selectDrawing` (~line 1398), sign before the render call:

```js
  if (currentDrawing) {
    await ensureDrawingUrls(currentDrawing);
    await loadBalloons();
  } else {
    balloons = [];
  }
  renderDrawing();
```

## 4. `loadPdfDoc` — signed URL for the source PDF

In `loadPdfDoc` (~line 2382), replace the `getPublicUrl` lines:

```js
  const path = `${drawing.drawing_ref}/source.pdf`;
  let url = cachedSigned(path);
  if (!url) { await signPaths([path]); url = cachedSigned(path); }
  if (!url) { pdfDocCache[id] = 'none'; return null; }   // legacy: no PDF stored
  const p = pdfjsLib.getDocument(url).promise;
```

## 5. Invalidate the cache after every mutation

Add `invalidateDrawingUrls(ref)` after these existing storage writes:

- after the page-PNG upload loop finishes in the upload handler (~line 1796–1800), before `loadDrawings()`
- after the delete/remove at ~line 1652–1656
- after the page-delete + shift block at ~line 3514–3523 — use the drawing's `ref`, alongside the existing `drawingCacheBust` bump

## Acceptance checks

1. Open a drawing → pages render; DevTools Network shows `/object/sign/` URLs with a `token=` param, no `/object/public/`.
2. `grep -n getPublicUrl index.html` → **no matches**.
3. Open a drawing, delete a page → remaining pages render correctly (no stale images), URL has both `token=` and `&v=`.
4. A legacy drawing with no stored PDF still shows its PNG, with no console error beyond the existing silent fallback.
5. Sign out, paste a `/object/public/deployops-drawings/...` URL → 400/404.
6. Upload a new drawing as admin → pages appear immediately.
