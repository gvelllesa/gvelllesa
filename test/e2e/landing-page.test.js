import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createApp } from "../../src/app.js";

/**
 * End-to-end coverage for public/main.js, which the HTTP-level suite cannot
 * reach: the greeting form, the health indicator and both failure paths only
 * exist once a browser has run the page's script.
 *
 * One server and one browser are shared across the file; each test opens its
 * own page so state never leaks between them.
 */
let server;
let browser;
let baseUrl;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  // Chromium refuses to start its sandbox as root, which is how some CI
  // containers run. Ordinary user accounts keep the sandbox.
  const args = process.getuid?.() === 0 ? ["--no-sandbox"] : [];
  browser = await chromium.launch({ args });
});

after(async () => {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
});

/** Open the landing page and wait for its initial health check to settle. */
async function openPage() {
  const page = await browser.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  return page;
}

test("serves the landing page under its own title", async () => {
  const page = await openPage();
  try {
    assert.equal(await page.title(), "gvelllesa · starter");
  } finally {
    await page.close();
  }
});

test("health indicator reports a healthy server on load", async () => {
  const page = await openPage();
  try {
    assert.match(await page.getAttribute("#health-dot", "class"), /\bok\b/);
    assert.match(await page.textContent("#health-text"), /^server healthy · up \d+s$/);
  } finally {
    await page.close();
  }
});

test("greeting form shows the message for a typed name", async () => {
  const page = await openPage();
  try {
    await page.fill("#name", "Nika");
    await page.click("button[type=submit]");
    await page.waitForFunction(() => document.getElementById("result").textContent.startsWith("Hello"));
    assert.equal(await page.textContent("#result"), "Hello, Nika!");
  } finally {
    await page.close();
  }
});

test("greeting form falls back to 'world' when the field is empty", async () => {
  const page = await openPage();
  try {
    await page.click("button[type=submit]");
    await page.waitForFunction(() => document.getElementById("result").textContent.startsWith("Hello"));
    assert.equal(await page.textContent("#result"), "Hello, world!");
  } finally {
    await page.close();
  }
});

test("greeting form round-trips a non-ASCII name", async () => {
  const page = await openPage();
  try {
    await page.fill("#name", "ნიკა 👋");
    await page.click("button[type=submit]");
    await page.waitForFunction(() => document.getElementById("result").textContent.startsWith("Hello"));
    assert.equal(await page.textContent("#result"), "Hello, ნიკა 👋!");
  } finally {
    await page.close();
  }
});

/**
 * The greeting is written with textContent, so markup coming back from the API
 * must land on the page as inert text. A regression to innerHTML would execute
 * the payload, which surfaces here as a dialog or a page error.
 */
test("a markup payload renders as text and never executes", async () => {
  const page = await openPage();
  const dialogs = [];
  const pageErrors = [];
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    await page.fill("#name", "<script>alert(1)</script>");
    await page.click("button[type=submit]");
    await page.waitForFunction(() => document.getElementById("result").textContent.startsWith("Hello"));

    assert.equal(await page.textContent("#result"), "Hello, <script>alert(1)</script>!");
    assert.match(await page.innerHTML("#result"), /&lt;script&gt;/);
    assert.equal(await page.locator("#result script").count(), 0, "markup became a live element");
    assert.deepEqual(dialogs, [], "the payload executed");
    assert.deepEqual(pageErrors, []);
  } finally {
    await page.close();
  }
});

test("health indicator reports an unreachable server when the check fails", async () => {
  const page = await browser.newPage();
  try {
    await page.route("**/api/health", (route) => route.abort());
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.getElementById("health-text").textContent !== "checking server…");

    assert.match(await page.getAttribute("#health-dot", "class"), /\berr\b/);
    assert.equal(await page.textContent("#health-text"), "server unreachable");
  } finally {
    await page.close();
  }
});

test("greeting form reports a failed request", async () => {
  const page = await openPage();
  try {
    await page.route("**/api/greet*", (route) => route.abort());
    await page.fill("#name", "Nika");
    await page.click("button[type=submit]");
    await page.waitForFunction(() => document.getElementById("result").textContent === "Request failed");

    assert.equal(await page.textContent("#result"), "Request failed");
  } finally {
    await page.close();
  }
});
