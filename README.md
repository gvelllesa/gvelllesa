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
| `npm test` | Run the test suite (`node --test`). |
| `npm run lint` | Syntax-check the source files. |

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
src/app.js        Express app factory (routes + static hosting)
src/server.js     Server bootstrap (binds the port)
public/           Static landing page (HTML/CSS/JS)
test/app.test.js  HTTP-level tests using node:test
```
