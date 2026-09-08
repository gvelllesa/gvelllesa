# gvelllesa

A minimal Node.js + Express starter application, configured to run in a Cursor Cloud Agent environment.

## Requirements

- Node.js >= 20 (the Cloud Agent image ships with Node 22)

## Getting started

```bash
npm install        # install dependencies
npm run dev        # start the dev server with live reload on http://localhost:3000
```

Then open http://localhost:3000 and use the greeting form.

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Run the server (`src/server.js`). |
| `npm run dev` | Run the server with `node --watch` live reload. |
| `npm test` | Run the HTTP-level test suite. |
| `npm run test:e2e` | Run the browser test suite (needs a Chromium build, see below). |
| `npm run lint` | Syntax-check the source files. |

`npm test` covers the API and static hosting over HTTP and needs nothing but
Node. `npm run test:e2e` drives the landing page in a real browser, so it also
needs the Chromium build the pinned Playwright expects:

```bash
npx playwright install chromium   # once, ~150 MB
npm run test:e2e
```

CI runs both, plus `npm audit`, on every push and pull request to `main`.

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Health check: `{ "status": "ok", "uptimeSeconds": <n> }`. |
| `GET` | `/api/greet?name=<name>` | Returns `{ "message": "Hello, <name>!" }` (defaults to `world`). |

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | Port the server binds to. |
| `HOST` | `0.0.0.0` | Interface the server binds to. |

## Project layout

```
src/app.js         Express app factory (routes + static hosting)
src/server.js      Server bootstrap (binds the port)
public/            Static landing page (HTML/CSS/JS)
test/app.test.js   HTTP-level tests using node:test
test/e2e/          Browser tests for public/main.js (node:test + Playwright)
```
