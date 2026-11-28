// Start file for Hostinger (Node.js app) or any Node host: `npm start`. Listens on PORT (default 3000).
// Settings come from environment variables (see .env.example); a local server/.env file is read if present.
import fs from "node:fs";
import { createApp } from "./app.js";
import { defaultHandlers } from "./lib/handlers.js";

// Load server/.env for local runs (real environment variables win)
try {
  for (const line of fs.readFileSync(new URL("./.env", import.meta.url), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
} catch (_) {}

const port = Number(process.env.PORT) || 3000;
createApp(defaultHandlers()).listen(port, () => console.log(`Mind Behind Money API listening on ${port}`));
