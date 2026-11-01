import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./site/", import.meta.url));
const port = Number(process.env.PORT ?? 4174);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith("/")) {
    pathname += "index.html";
  }
  const relative = pathname.replace(/^\/+/, "");
  const file = join(root, relative);
  const base = root.endsWith(sep) ? root : `${root}${sep}`;
  if (file !== root && !file.startsWith(base)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const body = await readFile(file);
    const type = types[extname(file)] ?? "application/octet-stream";
    response.writeHead(200, { "content-type": type }).end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Docs at http://127.0.0.1:${port}`);
});
