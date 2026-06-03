const fs = require("node:fs");
const path = require("node:path");

const srcDir = path.join(__dirname, "emailTemplates");
const layerRoot = path.join(__dirname, "..", "layer", "nodejs", "node_modules");
const templateNames = ["EmailTemplate.html", "ChurchEmailTemplate.html"];

const dstDirs = [
  path.join(layerRoot, "@machonharuach", "apihelper", "dist", "templates"),
  path.join(layerRoot, "@churchapps", "apihelper", "dist", "templates"),
];

for (const dstDir of dstDirs) {
  for (const name of templateNames) {
    const src = path.join(srcDir, name);
    const dst = path.join(dstDir, name);
    if (!fs.existsSync(src)) continue;
    fs.mkdirSync(dstDir, { recursive: true });
    fs.copyFileSync(src, dst);
  }
}
