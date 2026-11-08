/* Version bump helper for Reddit Pro Plus Max S
 * Increases patch version (+0.0.1) across:
 * - package.json
 * - manifest.json
 * - options/options.html
 * - README.md
 * Usage:
 *   node tools/bump-version.js         (increments current patch by 1)
 *   node tools/bump-version.js 1.0.2   (sets explicitly to 1.0.2)
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const pkgPath = path.join(ROOT, "package.json");
const manifestPath = path.join(ROOT, "manifest.json");
const optionsPath = path.join(ROOT, "options", "options.html");
const readmePath = path.join(ROOT, "README.md");

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const currentVersion = pkg.version || "1.0.0";

let newVersion = process.argv[2];
if (!newVersion) {
  const parts = currentVersion.split(".").map((n) => parseInt(n, 10));
  if (parts.length === 3 && !isNaN(parts[2])) {
    parts[2] += 1;
    newVersion = parts.join(".");
  } else {
    newVersion = "1.0.1";
  }
}

console.log(`[Version Bump] ${currentVersion} -> ${newVersion}`);

// 1. package.json
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

// 2. manifest.json
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.version = newVersion;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

// 3. options.html
if (fs.existsSync(optionsPath)) {
  let optHtml = fs.readFileSync(optionsPath, "utf8");
  optHtml = optHtml.replace(/v[0-9]+\.[0-9]+\.[0-9]+/g, `v${newVersion}`);
  fs.writeFileSync(optionsPath, optHtml);
}

// 4. README.md
if (fs.existsSync(readmePath)) {
  let readme = fs.readFileSync(readmePath, "utf8");
  readme = readme.replace(/v[0-9]+\.[0-9]+\.[0-9]+/g, `v${newVersion}`);
  readme = readme.replace(new RegExp(`-v[0-9]+\\.[0-9]+\\.[0-9]+-`, "g"), `-v${newVersion}-`);
  fs.writeFileSync(readmePath, readme);
}

console.log(`[Version Bump] Files updated successfully.`);
