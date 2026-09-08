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

test("GET /api/greet trims surrounding whitespace", async () => {
  const { baseUrl, stop } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/api/greet?name=${encodeURIComponent("  Ada  ")}`);
    const body = await res.json();
    assert.equal(body.message, "Hello, Ada!");
  } finally {
    await stop();
  }
});

test("GET /api/greet falls back to 'world' for a whitespace-only name", async () => {
  const { baseUrl, stop } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/api/greet?name=${encodeURIComponent("   ")}`);
    const body = await res.json();
    assert.equal(body.message, "Hello, world!");
  } finally {
    await stop();
  }
});

test("GET /api/greet truncates a long name to 80 characters", async () => {
  const { baseUrl, stop } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/api/greet?name=${"A".repeat(200)}`);
    const body = await res.json();
    assert.equal(body.message, `Hello, ${"A".repeat(80)}!`);
  } finally {
    await stop();
  }
});

/**
 * Truncation must count code points, not UTF-16 code units. Slicing by code
 * unit can cut an astral character in half at the boundary and leave a lone
 * surrogate, which renders as U+FFFD.
 */
test("GET /api/greet truncation does not split a surrogate pair", async () => {
  const { baseUrl, stop } = await startTestServer();
  try {
    // 85 code points, with an emoji sitting exactly on the 80-character edge.
    const input = `${"A".repeat(79)}\u{1F44B}${"B".repeat(5)}`;
    const res = await fetch(`${baseUrl}/api/greet?name=${encodeURIComponent(input)}`);
    const body = await res.json();
    const name = body.message.slice("Hello, ".length, -1);

    assert.equal([...name].length, 80);
    assert.ok(name.endsWith("\u{1F44B}"), `expected a whole emoji at the edge, got ${JSON.stringify(name.slice(-2))}`);
    assert.doesNotMatch(name, /[\uD800-\uDBFF](?![\uDC00-\uDFFF])/, "left a lone high surrogate");
    assert.ok(!name.includes("�"), "produced a replacement character");
  } finally {
    await stop();
  }
});

test("GET /api/greet falls back to 'world' when name is not a string", async () => {
  const { baseUrl, stop } = await startTestServer();
  try {
    // Express parses these into an array and an object respectively, so the
    // handler's typeof guard is what keeps them from reaching String methods.
    for (const query of ["name[]=a&name[]=b", "name[first]=x", "name=a&name=b"]) {
      const res = await fetch(`${baseUrl}/api/greet?${query}`);
      assert.equal(res.status, 200, query);
      const body = await res.json();
      assert.equal(body.message, "Hello, world!", query);
    }
  } finally {
    await stop();
  }
});

test("GET /api/greet round-trips non-ASCII names", async () => {
  const { baseUrl, stop } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/api/greet?name=${encodeURIComponent("ნიკა 👋")}`);
    const body = await res.json();
    assert.equal(body.message, "Hello, ნიკა 👋!");
  } finally {
    await stop();
  }
});

test("serves the static assets the landing page depends on", async () => {
  const { baseUrl, stop } = await startTestServer();
  try {
    for (const [path, type] of [["/styles.css", "text/css"], ["/main.js", "application/javascript"]]) {
      const res = await fetch(`${baseUrl}${path}`);
      assert.equal(res.status, 200, path);
      assert.match(res.headers.get("content-type"), new RegExp(`^${type}`), path);
    }
  } finally {
    await stop();
  }
});

test("unknown routes respond 404", async () => {
  const { baseUrl, stop } = await startTestServer();
  try {
    for (const path of ["/nope", "/api/nope"]) {
      const res = await fetch(`${baseUrl}${path}`);
      assert.equal(res.status, 404, path);
    }
  } finally {
    await stop();
  }
});

test("does not advertise the server via X-Powered-By", async () => {
  const { baseUrl, stop } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.headers.get("x-powered-by"), null);
  } finally {
    await stop();
  }
});
