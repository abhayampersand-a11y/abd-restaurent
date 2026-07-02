/**
 * Custom Next.js server with Socket.IO for realtime push (KDS, orders, order
 * status, notifications). Run via `yarn dev` / `yarn start`.
 *
 * Socket rooms mirror the data-scope isolation:
 *   - real staff/customers -> room "real"
 *   - demo sessions        -> room "demo:<sessionId>" (from the demo cookie)
 *
 * The io instance is published on globalThis so Server Actions (compiled by
 * Next in this same process) can push events via src/lib/realtime-server.ts.
 */
import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { Server as IOServer } from "socket.io";

if (process.argv.includes("--prod")) process.env.NODE_ENV = "production";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT) || 3000;

const app = next({ dev });
const handle = app.getRequestHandler();

await app.prepare();

const httpServer = createServer((req, res) => {
  handle(req, res, parse(req.url, true));
});

const io = new IOServer(httpServer, {
  path: "/socket.io",
  cors: { origin: false },
});

// Publish for Server Actions (see src/lib/realtime-server.ts).
globalThis.__abdIO = io;

io.on("connection", (socket) => {
  const cookie = socket.handshake.headers.cookie ?? "";
  const match = cookie.match(/(?:^|;\s*)demo_session=([^;]+)/);
  const room = match ? `demo:${decodeURIComponent(match[1])}` : "real";
  socket.join(room);
});

httpServer.listen(port, () => {
  console.log(
    `> ABD Restaurant ready on http://localhost:${port} (${dev ? "dev" : "prod"}, realtime on)`,
  );
});
