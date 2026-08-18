import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";

/**
 * Start the app on an ephemeral port and return its base URL plus a stop fn.
 */
async function startTestServer() {
  const app = createApp();
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    stop: () => new Promise((resolve) => server.close(resolve)),
  };
}

test("GET /api/health reports ok", async () => {
  const { baseUrl, stop } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "ok");
    assert.equal(typeof body.uptimeSeconds, "number");
  } finally {
    await stop();
  }
});

test("GET /api/greet uses the provided name", async () => {
  const { baseUrl, stop } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/api/greet?name=Ada`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.message, "Hello, Ada!");
  } finally {
    await stop();
  }
});

test("GET /api/greet falls back to 'world' when name is missing", async () => {
  const { baseUrl, stop } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/api/greet`);
    const body = await res.json();
    assert.equal(body.message, "Hello, world!");
  } finally {
    await stop();
  }
});

test("serves the static landing page", async () => {
  const { baseUrl, stop } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /gvelllesa/);
  } finally {
    await stop();
  }
});
