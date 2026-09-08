import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Build the Express application.
 *
 * Split out from the server bootstrap so tests can import the app and issue
 * requests without binding a network port.
 */
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json());

  const startedAt = new Date();

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      uptimeSeconds: Math.round((Date.now() - startedAt.getTime()) / 1000),
    });
  });

  app.get("/api/greet", (req, res) => {
    const rawName = typeof req.query.name === "string" ? req.query.name : "";
    // Slice by code point rather than UTF-16 code unit: a plain slice(0, 80)
    // can cut an astral character (emoji, rarer scripts) in half and leave a
    // lone surrogate behind, which renders as U+FFFD.
    const name = [...rawName.trim()].slice(0, 80).join("") || "world";
    res.json({ message: `Hello, ${name}!` });
  });

  app.use(express.static(join(__dirname, "..", "public")));

  return app;
}
