/* Multi-Browser Build Script for Reddit Pro Plus Max S
 * Builds store-ready packages for:
 * 1. Firefox Add-ons (AMO) (.zip & .xpi)
 * 2. Chrome Web Store (.zip)
 * 3. Microsoft Edge Add-ons (.zip)
 * 4. Opera Add-ons (.zip)
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const baseManifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));

const VERSION = pkg.version || "1.0.0";
const SLUG = "reddit-pro-plus-max-s";

// Copy recursively excluding specific directories/files
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (
      entry.name === "node_modules" ||
      entry.name === "tools" ||
      entry.name === "dist" ||
      entry.name === "web-ext-artifacts" ||
      entry.name === ".git" ||
      entry.name === ".gitignore" ||
      entry.name === "package.json" ||
      entry.name === "package-lock.json" ||
      entry.name === "README.md" ||
      entry.name === "manifest.json" ||
      entry.name.startsWith("lint")
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function zipDir(dirPath, zipPath) {
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  // Windows PowerShell Compress-Archive
  const psCmd = `powershell -NoProfile -Command "Compress-Archive -Path '${dirPath}\\*' -DestinationPath '${zipPath}' -Force"`;
  execSync(psCmd, { stdio: "inherit" });
}

console.log(`\n========================================`);
console.log(`Building Reddit Pro Plus Max S v${VERSION}`);
console.log(`========================================\n`);

cleanDir(DIST);

// 1. Build Firefox package
console.log("--> [1/4] Preparing Firefox package...");
const firefoxDir = path.join(DIST, "build-firefox");
copyDir(ROOT, firefoxDir);

const firefoxManifest = JSON.parse(JSON.stringify(baseManifest));
firefoxManifest.background = { scripts: ["background.js"] };
firefoxManifest.permissions = [
  "storage",
  "unlimitedStorage",
  "activeTab",
  "tabs",
  "scripting",
  "contextMenus"
];
fs.writeFileSync(path.join(firefoxDir, "manifest.json"), JSON.stringify(firefoxManifest, null, 2));

const firefoxZip = path.join(DIST, `${SLUG}-v${VERSION}-firefox.zip`);
const firefoxXpi = path.join(DIST, `${SLUG}-v${VERSION}-firefox.xpi`);
zipDir(firefoxDir, firefoxZip);
fs.copyFileSync(firefoxZip, firefoxXpi);
console.log(`    Created: ${path.basename(firefoxZip)}`);
console.log(`    Created: ${path.basename(firefoxXpi)}`);

// 2. Build Chromium package (Chrome, Edge, Opera)
console.log("\n--> [2/4] Preparing Chromium package (Chrome, Edge, Opera)...");
const chromiumDir = path.join(DIST, "build-chromium");
copyDir(ROOT, chromiumDir);

const chromiumManifest = JSON.parse(JSON.stringify(baseManifest));
delete chromiumManifest.browser_specific_settings; // Chromium doesn't use gecko settings
chromiumManifest.background = { service_worker: "background.js" }; // Chromium requires service_worker
chromiumManifest.permissions = [
  "storage",
  "unlimitedStorage",
  "activeTab",
  "tabs",
  "scripting",
  "contextMenus"
];
fs.writeFileSync(path.join(chromiumDir, "manifest.json"), JSON.stringify(chromiumManifest, null, 2));

// Chrome package
const chromeZip = path.join(DIST, `${SLUG}-v${VERSION}-chrome.zip`);
zipDir(chromiumDir, chromeZip);
console.log(`    Created: ${path.basename(chromeZip)} (Chrome Web Store)`);

// Edge package
const edgeZip = path.join(DIST, `${SLUG}-v${VERSION}-edge.zip`);
fs.copyFileSync(chromeZip, edgeZip);
console.log(`    Created: ${path.basename(edgeZip)} (Microsoft Edge Add-ons)`);

// Opera package
const operaZip = path.join(DIST, `${SLUG}-v${VERSION}-opera.zip`);
fs.copyFileSync(chromeZip, operaZip);
console.log(`    Created: ${path.basename(operaZip)} (Opera Add-ons)`);

// Generic Chromium package
const chromiumAllZip = path.join(DIST, `${SLUG}-v${VERSION}-chromium-all.zip`);
fs.copyFileSync(chromeZip, chromiumAllZip);
console.log(`    Created: ${path.basename(chromiumAllZip)} (Universal Chromium)`);

// 3. Keep web-ext-artifacts updated as well
console.log("\n--> [3/4] Updating web-ext-artifacts for backwards compatibility...");
const webExtArtifacts = path.join(ROOT, "web-ext-artifacts");
if (!fs.existsSync(webExtArtifacts)) {
  fs.mkdirSync(webExtArtifacts, { recursive: true });
}
fs.copyFileSync(firefoxZip, path.join(webExtArtifacts, `reddit_pro_plus_max_s-${VERSION}.zip`));
fs.copyFileSync(firefoxXpi, path.join(webExtArtifacts, `reddit_pro_plus_max_s-${VERSION}.xpi`));
// Also keep generic unversioned aliases
fs.copyFileSync(firefoxZip, path.join(webExtArtifacts, `reddit_pro_plus_max_s.zip`));
fs.copyFileSync(firefoxXpi, path.join(webExtArtifacts, `reddit_pro_plus_max_s.xpi`));

// Clean up build directories
fs.rmSync(firefoxDir, { recursive: true, force: true });
fs.rmSync(chromiumDir, { recursive: true, force: true });

console.log("\n--> [4/4] Verifying generated archives in dist/:\n");
const distFiles = fs.readdirSync(DIST);
for (const file of distFiles) {
  const stat = fs.statSync(path.join(DIST, file));
  console.log(`  - ${file} (${Math.round(stat.size / 1024)} KB)`);
}

console.log("\nAll browser packages successfully built!\n");
