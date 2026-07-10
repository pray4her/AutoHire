import { spawnSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const zipPath = path.join(distDir, "ops-export-zip.zip");

await mkdir(distDir, { recursive: true });
await rm(zipPath, { force: true });

// Install first — pack.mjs itself needs archiver, and the upload zip must
// include production node_modules for the FC runtime.
const install = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["install", "--omit=dev"],
  { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
);

if (install.status !== 0) {
  process.exit(install.status ?? 1);
}

const { default: archiver } = await import("archiver");

const output = createWriteStream(zipPath);
const archive = archiver("zip", { zlib: { level: 9 } });
const done = pipeline(archive, output);

archive.file(path.join(root, "handler.mjs"), { name: "handler.mjs" });
archive.file(path.join(root, "package.json"), { name: "package.json" });
archive.directory(path.join(root, "node_modules"), "node_modules");

await archive.finalize();
await done;

console.log(`Created ${zipPath}`);
console.log("Upload this zip in FC console → 代码 → 上传代码包.");
console.log("Handler entry: handler.handler");
