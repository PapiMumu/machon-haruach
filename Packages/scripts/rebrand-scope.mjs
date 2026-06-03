/**
 * Rebrand @churchapps/* → @machonharuach/* in package sources (not node_modules).
 * Usage: node scripts/rebrand-scope.mjs [helpers|apihelper|...]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagesRoot = path.join(__dirname, "..");

const ALL_PACKAGES = ["helpers", "texting", "content-providers", "apihelper", "apphelper"];
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".md", ".html"]);

const versions = JSON.parse(
  fs.readFileSync(path.join(packagesRoot, "machonharuach-versions.json"), "utf8")
);

function shouldProcessFile(filePath) {
  if (filePath.includes(`${path.sep}node_modules${path.sep}`)) return false;
  if (filePath.endsWith("package-lock.json")) return false;
  if (filePath.endsWith("yarn.lock")) return false;
  const ext = path.extname(filePath);
  return TEXT_EXTENSIONS.has(ext);
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      walk(full, files);
    } else if (shouldProcessFile(full)) {
      files.push(full);
    }
  }
  return files;
}

function rebrandText(content) {
  return content.replace(/@churchapps\//g, "@machonharuach/");
}

function updatePackageJson(pkgDir, pkgKey) {
  const pkgPath = path.join(pkgDir, "package.json");
  if (!fs.existsSync(pkgPath)) return;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const version = versions[pkgKey];
  if (version) pkg.version = version;
  if (pkg.name?.startsWith("@churchapps/")) {
    pkg.name = pkg.name.replace("@churchapps/", "@machonharuach/");
  }
  for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
    if (!pkg[field]) continue;
    const next = {};
    for (const [dep, range] of Object.entries(pkg[field])) {
      const key = dep.startsWith("@churchapps/") ? dep.replace("@churchapps/", "@machonharuach/") : dep;
      let value = range;
      if (typeof value === "string") {
        value = value.replace(/@churchapps\//g, "@machonharuach/");
        value = value.replace(/file:\.\.\/helpers/g, "^1.2.19");
      }
      next[key] = value;
    }
    pkg[field] = next;
  }
  if (!pkg.publishConfig) pkg.publishConfig = { access: "public" };
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

function rebrandPackage(pkgKey) {
  const pkgDir = path.join(packagesRoot, pkgKey);
  if (!fs.existsSync(pkgDir)) {
    console.warn(`skip missing package dir: ${pkgKey}`);
    return;
  }
  updatePackageJson(pkgDir, pkgKey);
  const files = walk(pkgDir);
  let changed = 0;
  for (const file of files) {
    if (file.endsWith("package.json")) continue;
    const before = fs.readFileSync(file, "utf8");
    const after = rebrandText(before);
    if (after !== before) {
      fs.writeFileSync(file, after, "utf8");
      changed++;
    }
  }
  console.log(`rebrand ${pkgKey}: updated package.json, ${changed} source files`);
}

const targets = process.argv.slice(2).length ? process.argv.slice(2) : ALL_PACKAGES;
for (const pkg of targets) rebrandPackage(pkg);
