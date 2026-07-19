/**
 * Finish Next standalone output for bare-metal / PM2 deploys.
 * Next does not ship custom-server.js or static assets into standalone;
 * Docker and CLI pack already copy these — this mirrors that for source deploys.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const distDir = process.env.NEXT_DIST_DIR || ".next";
const standaloneRoot = path.join(root, distDir, "standalone");

function resolveStandaloneDir(base) {
  if (fs.existsSync(path.join(base, "server.js"))) return base;
  // Next may nest under package name when tracing root is workspace
  try {
    const entries = fs.readdirSync(base, { withFileTypes: true });
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const nested = path.join(base, ent.name);
      if (fs.existsSync(path.join(nested, "server.js"))) return nested;
    }
  } catch {
    // ignore
  }
  return null;
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
  return true;
}

if (!fs.existsSync(standaloneRoot)) {
  console.error(`❌ Standalone output not found: ${standaloneRoot}`);
  console.error("   Run `npm run build` (next build) first.");
  process.exit(1);
}

const standalone = resolveStandaloneDir(standaloneRoot);
if (!standalone) {
  console.error(`❌ server.js not found under ${standaloneRoot}`);
  process.exit(1);
}

const customSrc = path.join(root, "custom-server.js");
if (!fs.existsSync(customSrc)) {
  console.error(`❌ Missing ${customSrc}`);
  process.exit(1);
}

copyFile(customSrc, path.join(standalone, "custom-server.js"));
console.log(`✅ custom-server.js → ${path.relative(root, standalone)}/`);

const staticSrc = path.join(root, distDir, "static");
const staticDest = path.join(standalone, ".next", "static");
if (copyDir(staticSrc, staticDest)) {
  console.log(`✅ ${distDir}/static → standalone/.next/static`);
} else {
  console.warn(`⚠️  ${distDir}/static missing — dashboard assets may 404`);
}

const publicSrc = path.join(root, "public");
const publicDest = path.join(standalone, "public");
if (copyDir(publicSrc, publicDest)) {
  console.log("✅ public → standalone/public");
}

// Optional runtime pieces Docker also ships (fail-open if absent)
const optionalDirs = [
  ["open-sse", "open-sse"],
  [path.join("src", "mitm"), path.join("src", "mitm")],
];
for (const [relSrc, relDest] of optionalDirs) {
  const src = path.join(root, relSrc);
  if (!fs.existsSync(src)) continue;
  copyDir(src, path.join(standalone, relDest));
  console.log(`✅ ${relSrc} → standalone/${relDest}`);
}

console.log(`\nStandalone ready: ${standalone}`);
console.log("PM2: pm2 start ecosystem.config.cjs");
