/**
 * Build and optionally publish one package under Packages/.
 * Usage:
 *   node scripts/publish-package.mjs helpers
 *   node scripts/publish-package.mjs helpers --publish
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagesRoot = path.join(__dirname, "..");

const pkgKey = process.argv[2];
const doPublish = process.argv.includes("--publish");

if (!pkgKey) {
  console.error("Usage: node scripts/publish-package.mjs <package-dir> [--publish]");
  process.exit(1);
}

const pkgDir = path.join(packagesRoot, pkgKey);
const pkgJsonPath = path.join(pkgDir, "package.json");

if (!fs.existsSync(pkgJsonPath)) {
  console.error(`Missing package.json: ${pkgJsonPath}`);
  process.exit(1);
}

function run(cmd, args) {
  console.log(`> ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { cwd: pkgDir, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
const hasBuild = Boolean(pkg.scripts?.build);
const helpersDir = path.join(packagesRoot, "helpers");
const usesHelpers =
  pkg.dependencies?.["@machonharuach/helpers"] ||
  pkg.devDependencies?.["@machonharuach/helpers"];

if (hasBuild) {
  if (usesHelpers && fs.existsSync(path.join(helpersDir, "dist"))) {
    run("npm", ["install", `file:${helpersDir}`, "--no-package-lock"]);
  } else {
    run("npm", ["install", "--no-package-lock"]);
  }
  run("npm", ["run", "build"]);
} else {
  console.log("No build script; publishing dist/ as-is.");
}

console.log(`\nBuilt ${pkg.name}@${pkg.version}`);

if (!doPublish) {
  console.log("Dry run complete. Add --publish to publish to npm.");
  process.exit(0);
}

// Restore semver helpers dep if npm install rewrote it to file:../helpers
if (pkg.dependencies?.["@machonharuach/helpers"]?.startsWith?.("file:")) {
  pkg.dependencies["@machonharuach/helpers"] = "^1.2.19";
  fs.writeFileSync(pkgJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  console.log("Restored @machonharuach/helpers to ^1.2.19 for publish");
}

run("npm", ["publish", "--access", "public"]);
console.log(`Published ${pkg.name}@${pkg.version}`);
