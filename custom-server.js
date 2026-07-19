const fs = require("fs");
const path = require("path");
const http = require("http");

// Allow starting from repo root: chdir into Next standalone so ./server.js resolves.
(function ensureStandaloneCwd() {
  const here = __dirname;
  const candidates = [
    path.join(here, "server.js"),
    path.join(here, ".next", "standalone", "server.js"),
  ];
  // Nested package-name layout under standalone
  const standaloneRoot = path.join(here, ".next", "standalone");
  if (fs.existsSync(standaloneRoot)) {
    try {
      for (const ent of fs.readdirSync(standaloneRoot, { withFileTypes: true })) {
        if (ent.isDirectory()) {
          candidates.push(path.join(standaloneRoot, ent.name, "server.js"));
        }
      }
    } catch {
      // ignore
    }
  }
  for (const serverPath of candidates) {
    if (!fs.existsSync(serverPath)) continue;
    const dir = path.dirname(serverPath);
    if (process.cwd() !== dir) {
      process.chdir(dir);
    }
    return;
  }
})();

const origCreate = http.createServer.bind(http);

// Wrap Next standalone HTTP server: derive client IP from the TCP socket
// (unspoofable) and strip client-supplied forwarding headers so downstream
// rate-limiting keys on the real peer address instead of attacker-controlled XFF.
http.createServer = (...args) => {
  const handler = args.find((a) => typeof a === "function");
  const rest = args.filter((a) => typeof a !== "function");
  if (!handler) return origCreate(...args);
  const wrapped = (req, res) => {
    const socketIp = req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "";
    const xff = req.headers["x-forwarded-for"];
    const xRealIp = req.headers["x-real-ip"];
    const viaProxy = !!(xff || xRealIp);
    const isLoopbackProxy = socketIp === "127.0.0.1" || socketIp === "::1" || socketIp === "::ffff:127.0.0.1";
    // Trust forwarding headers only when the TCP peer is a local reverse proxy.
    // Direct/public sockets remain keyed by the unspoofable peer address.
    const proxyIp = xRealIp || (xff ? String(xff).split(",")[0].trim() : "");
    const ip = isLoopbackProxy && proxyIp ? proxyIp : socketIp;
    delete req.headers["x-9r-real-ip"];
    delete req.headers["x-forwarded-for"];
    delete req.headers["x-9r-via-proxy"];
    req.headers["x-9r-real-ip"] = ip;
    if (viaProxy) req.headers["x-9r-via-proxy"] = "1";
    return handler(req, res);
  };
  return origCreate(...rest, wrapped);
};

const serverJs = path.join(process.cwd(), "server.js");
if (!fs.existsSync(serverJs)) {
  console.error("Error: server.js not found. Run `npm run build` (includes prepare-standalone) first.");
  console.error(`Looked in: ${process.cwd()}`);
  process.exit(1);
}

require(serverJs);
