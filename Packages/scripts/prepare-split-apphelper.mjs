/**
 * Phase 2: create standalone publish dirs for legacy @machonharuach/apphelper-* packages
 * from a built unified @machonharuach/apphelper dist/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagesRoot = path.join(__dirname, "..");
const versions = JSON.parse(
  fs.readFileSync(path.join(packagesRoot, "machonharuach-versions.json"), "utf8")
);

const SPLIT = [
  { name: "apphelper-donations", distSubdir: "donations" },
  { name: "apphelper-forms", distSubdir: "forms" },
  { name: "apphelper-login", distSubdir: "login" },
  { name: "apphelper-markdown", distSubdir: "markdown" },
  { name: "apphelper-website", distSubdir: "website" },
];

const apphelperDist = path.join(packagesRoot, "apphelper", "dist");
const outRoot = path.join(packagesRoot, "publish");

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

if (!fs.existsSync(apphelperDist)) {
  console.error("Build apphelper first: npm run build --prefix apphelper");
  process.exit(1);
}

// Core apphelper publish package (re-exports main dist)
const coreDir = path.join(outRoot, "apphelper");
fs.mkdirSync(coreDir, { recursive: true });
copyDir(apphelperDist, path.join(coreDir, "dist"));
fs.writeFileSync(
  path.join(coreDir, "package.json"),
  `${JSON.stringify(
    {
      name: "@machonharuach/apphelper",
      version: versions.apphelper,
      type: "module",
      main: "dist/index.js",
      types: "dist/index.d.ts",
      files: ["dist"],
      publishConfig: { access: "public" },
      peerDependencies: {
        "@machonharuach/helpers": "^1.2.19",
        react: "^18.0.0 || ^19.0.0",
        "react-dom": "^18.0.0 || ^19.0.0",
      },
    },
    null,
    2
  )}\n`,
  "utf8"
);

for (const { name, distSubdir } of SPLIT) {
  const src = path.join(apphelperDist, distSubdir);
  if (!fs.existsSync(src)) {
    console.error(`Missing dist/${distSubdir} — apphelper build may have changed layout.`);
    process.exit(1);
  }
  const dir = path.join(outRoot, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  copyDir(src, path.join(dir, "dist"));
  fs.writeFileSync(
    path.join(dir, "package.json"),
    `${JSON.stringify(
      {
        name: `@machonharuach/${name}`,
        version: versions[name],
        type: "module",
        main: "dist/index.js",
        types: "dist/index.d.ts",
        files: ["dist"],
        publishConfig: { access: "public" },
        peerDependencies: {
          "@machonharuach/apphelper": `^${versions.apphelper}`,
          "@machonharuach/helpers": "^1.2.19",
          react: "^18.0.0 || ^19.0.0",
          "react-dom": "^18.0.0 || ^19.0.0",
        },
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  console.log(`prepared publish/${name} @ ${versions[name]}`);
}

console.log(`prepared publish/apphelper @ ${versions.apphelper}`);
