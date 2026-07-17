# GrayNet — frontend

Next.js 14 (App Router) site with two routes:

- `/` — the informative landing page: data leakage story, full architecture
  walkthrough (one section per real module in `graynet/*.py`), the
  interactive width-multiplier / compression-ladder chart, and the full
  benchmark table.
- `/lab` — pick one or more of the 10 checkpoints, upload an MRI slice,
  and see predictions, confidence, and measured latency per model.

## Local development

```bash
npm install
npm run dev
```

Runs in **demo mode** by default — `/lab` returns clearly-labeled simulated
predictions with no backend required, so the site is fully browsable and
deployable on its own.

## Connecting the real backend

1. Deploy `../backend` (see its README) somewhere reachable — Railway,
   Fly.io, Render, etc.
2. Set the `INFERENCE_API_URL` environment variable to that service's URL
   (locally: copy `.env.example` to `.env.local` and fill it in; on Vercel:
   add it under Project Settings → Environment Variables).
3. Redeploy. `/lab` will now show `mode: "live"` results instead of the
   demo-mode banner.

## Deploying the frontend

This is a standard Next.js app — **Vercel** is the path of least
resistance:

```bash
npx vercel
```

or connect the GitHub repo in the Vercel dashboard and point it at
`frontend/` as the root directory.

## PWA

`public/manifest.json` and `public/sw.js` make the site installable
(add-to-home-screen, standalone window) and cache the app shell for
offline browsing. Live inference still requires a network connection —
the service worker is honest about this rather than faking an offline
result (see the comment in `sw.js`). A precomputed "offline demo" mode
using cached sample predictions is a reasonable next step if you want
offline visitors to see populated results; it isn't built yet.

## Structure

```
app/
  layout.tsx          fonts, metadata, PWA registration
  page.tsx            landing page
  lab/page.tsx         the lab
  api/predict/route.ts proxies to backend, falls back to demo mode
  api/models/route.ts  exposes the static model registry
components/           one file per landing-page section + shared Nav
lib/models-data.ts     real benchmark numbers + architecture stage copy,
                        sourced directly from the GreyNet repo
public/
  manifest.json, sw.js, icons/
```
