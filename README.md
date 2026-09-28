# YANA — yet another note app

Fluffy notepads on a bookstand. Each notepad has its own plush cover and matching
pages; inside you write flowing text that wraps around images, and draw arrows,
shapes, doodles and stickers on a free layer on top.

- **Web / iPhone**: a PWA. Open it in Safari → Share → *Add to Home Screen*.
- **Mac**: a small native app (Tauri, ~10 MB) that updates itself.
- **Sync**: local-first. Every device keeps a full copy in IndexedDB, so writing
  never waits on the network and works offline; changes sync through Convex.

## Run it

```sh
npm install
npx convex dev          # first time: creates the Convex project, writes .env.local
npx @convex-dev/auth    # first time: sets the auth keys on the deployment
npm run dev             # http://localhost:5173
npm run tauri dev       # the Mac app, pointing at the dev server
```

Without `VITE_CONVEX_URL` the app still works, just on "this device only".
The first account created (badge in the top-right → *Create the account*) owns
the deployment; sign-ups close after that.

## Deploy the web app (for the iPhone)

1. `npx convex deploy` once to create the production deployment, then run
   `npx @convex-dev/auth --prod`.
2. Import the repo on Vercel. Add `CONVEX_DEPLOY_KEY` (Convex dashboard →
   production → Settings → Deploy key). `vercel.json` already sets the build.

## Release the Mac app

The updater checks `github.com/DuarteFaria/yana/releases/latest`. One-time setup
in the GitHub repo's *Settings → Secrets → Actions*:

- `TAURI_SIGNING_PRIVATE_KEY` — contents of `~/.tauri/yana.key` (never commit it)
- `VITE_CONVEX_URL` — your production Convex URL

Then each release is:

```sh
npm version patch        # bumps package.json (the app version follows it)
git push --follow-tags   # CI builds, signs and publishes; installed apps update
```

The app isn't notarised by Apple, so the very first install needs right-click →
Open. Updates after that are automatic.

## Shortcuts

| | |
|---|---|
| `/` | insert anything: headings, checklist, table, image, sticker, formula, arrow… |
| `⌘E` | switch Write ↔ Draw |
| `V P H E L A R O T` | draw tools: select, pen, highlighter, eraser, line, arrow, box, circle, note |
| `Ctrl+1…9` (`⌘` in the Mac app) | jump to notepad; `Ctrl+0` bookstand |
| `Ctrl+[` / `Ctrl+]` | previous / next page |
| `1…9` on the bookstand | open notepad |
| `$$x^2$$` / `$$$x^2$$$` | inline / block formula while typing |
