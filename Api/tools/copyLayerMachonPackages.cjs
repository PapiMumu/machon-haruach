/**
 * Materialize @machonharuach/* packages as real directories in the Lambda layer.
 * Windows npm file: deps are symlinks; archiver/Lambda cannot use those reliably.
 */
const fs = require("node:fs");
const path = require("node:path");

const apiRoot = path.join(__dirname, "..");
const packagesRoot = path.join(apiRoot, "..", "Packages");
const scopeDir = path.join(apiRoot, "layer", "nodejs", "node_modules", "@machonharuach");

const packages = ["helpers", "texting", "content-providers", "apihelper"];

function shouldCopy(relativePath) {
  if (!relativePath) return true;
  const parts = relativePath.split(path.sep);
  if (parts.includes("node_modules")) return false;
  if (parts.includes(".git")) return false;
  if (parts.includes("src")) return false;
  return true;
}

if (!fs.existsSync(scopeDir)) {
  fs.mkdirSync(scopeDir, { recursive: true });
}

for (const name of packages) {
  const src = path.join(packagesRoot, name);
  const dest = path.join(scopeDir, name);

  if (!fs.existsSync(src)) {
    throw new Error(`Missing package source: ${src}. Run: cd Packages && npm run phase1:build`);
  }

  const distIndex = path.join(src, "dist", "index.js");
  if (!fs.existsSync(distIndex)) {
    throw new Error(`Missing built dist for ${name}. Run: cd Packages && npm run phase1:build`);
  }

  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }

  fs.cpSync(src, dest, {
    recursive: true,
    filter: (srcPath) => shouldCopy(path.relative(src, srcPath))
  });

  console.log(`copyLayerMachonPackages: copied ${name}`);
}
