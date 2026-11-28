// `npm run build` for hosts that always run a build step (e.g. Hostinger with the Vite preset, output dir `dist`).
// The API itself needs no build. If the React client sits next to this folder, build it into server/dist
// so the host has a website to serve; otherwise just finish successfully.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientDir = path.resolve(serverDir, "../client");
const outDir = path.join(serverDir, "dist");

if (!fs.existsSync(path.join(clientDir, "package.json"))) {
  console.log("API server: no build step needed (client folder not found).");
  process.exit(0);
}

const run = (cmd) => execSync(cmd, { cwd: clientDir, stdio: "inherit" });
run(fs.existsSync(path.join(clientDir, "package-lock.json")) ? "npm ci" : "npm install");
run(`npm run build -- --outDir "${outDir}" --emptyOutDir`);
console.log(`Client built into ${outDir}`);
