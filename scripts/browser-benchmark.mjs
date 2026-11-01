import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

const page = process.argv[2] ?? "http://127.0.0.1:5173/benchmark";

function listen() {
  const reports = [];
  const server = createServer((request, response) => {
    response.setHeader("access-control-allow-origin", "*");
    response.setHeader("access-control-allow-methods", "POST, OPTIONS");
    response.setHeader("access-control-allow-headers", "content-type");
    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }
    if (request.method !== "POST") {
      response.writeHead(404);
      response.end();
      return;
    }
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      reports.push(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      response.writeHead(204);
      response.end();
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("The report server did not bind.");
      }
      resolve({ server, reports, port: address.port });
    });
  });
}

async function once(command, args, profile) {
  const { server, reports, port } = await listen();
  const url = `${page}?report=${encodeURIComponent(`http://127.0.0.1:${port}/report`)}`;
  const child = spawn(command, [...args, url], { stdio: "ignore" });
  try {
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${command} sent no report.`));
      }, 90_000);
      const poll = setInterval(() => {
        const report = reports[0];
        if (report) {
          clearInterval(poll);
          clearTimeout(timer);
          resolve(report);
        }
      }, 250);
      child.on("exit", () => {
        if (reports.length === 0) {
          clearInterval(poll);
          clearTimeout(timer);
          reject(new Error(`${command} closed before sending a report.`));
        }
      });
    });
  } finally {
    child.kill();
    server.close();
    await new Promise((resolve) => setTimeout(resolve, 400));
    await rm(profile, { recursive: true, force: true }).catch(() => undefined);
  }
}

const chromeProfile = await mkdtemp(join(tmpdir(), "openvenue-chrome-"));
const firefoxProfile = await mkdtemp(join(tmpdir(), "openvenue-firefox-"));
await writeFile(
  join(firefoxProfile, "user.js"),
  [
    'user_pref("browser.shell.checkDefaultBrowser", false);',
    'user_pref("datareporting.policy.dataSubmissionEnabled", false);',
    'user_pref("browser.aboutwelcome.enabled", false);',
    'user_pref("toolkit.telemetry.reportingpolicy.firstRun", false);',
  ].join("\n"),
);

const chrome = await once(
  "google-chrome",
  [
    "--new-window",
    "--window-size=1280,720",
    "--no-first-run",
    "--disable-sync",
    "--use-gl=angle",
    `--user-data-dir=${chromeProfile}`,
  ],
  chromeProfile,
);
const firefox = await once(
  "firefox",
  ["--no-remote", "--width", "1280", "--height", "720", "--profile", firefoxProfile],
  firefoxProfile,
);

process.stdout.write(`${JSON.stringify({ chrome, firefox }, null, 2)}\n`);
