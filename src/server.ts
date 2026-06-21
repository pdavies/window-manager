import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { Store } from "./state.js";

const here = dirname(fileURLToPath(import.meta.url));
const PAGE_PATH = resolve(here, "..", "public", "index.html");

/** Serve the dashboard (/) and its data (/api/state) on all interfaces, for LAN access. */
export function startServer(store: Store, port: number): Server {
  const server = createServer((req, res) => {
    const url = req.url ?? "/";

    if (url === "/" || url.startsWith("/?")) {
      // Read per request so editing public/index.html doesn't need a restart.
      let html: string;
      try {
        html = readFileSync(PAGE_PATH, "utf8");
      } catch {
        res.writeHead(500, { "content-type": "text/plain" });
        res.end(`Could not read ${PAGE_PATH}`);
        return;
      }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(html);
      return;
    }

    if (url === "/api/state") {
      res.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      });
      res.end(JSON.stringify({ current: store.getCurrent(), history: store.getHistory() }));
      return;
    }

    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
  });

  server.listen(port, "0.0.0.0");
  return server;
}
