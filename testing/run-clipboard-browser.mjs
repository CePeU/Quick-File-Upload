import { spawn } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

// Use an isolated headless profile and DevTools to await native codec work.
// A virtual-time dump can finish before the browser's image decoder completes.
let browserExecutable = process.argv[2] ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
let profileDirectory = await mkdtemp(join(tmpdir(), "qfu-clipboard-browser-"));
let testUrl = pathToFileURL(fileURLToPath(new URL("./clipboard-browser.html", import.meta.url))).href;
let browserProcess = spawn(browserExecutable, ["--headless", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--allow-file-access-from-files", `--user-data-dir=${profileDirectory}`, "--remote-debugging-port=0", testUrl], { windowsHide: true, stdio: "ignore" });
let debugSocket;
try {
  let debugPort;
  let pageTarget;
  for (let attemptIndex = 0; attemptIndex < 150; attemptIndex++) {
    try {
      debugPort = (await readFile(join(profileDirectory, "DevToolsActivePort"), "utf8")).split("\n")[0];
      let pageTargets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
      pageTarget = pageTargets.find(targetEntry => targetEntry.type === "page" && targetEntry.url === testUrl);
      if (pageTarget !== undefined) break;
    } catch { /* Browser startup is asynchronous. */ }
    await new Promise(resolveTick => setTimeout(resolveTick, 100));
  }
  if (pageTarget === undefined) throw new Error("Browser test page did not start");
  debugSocket = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolveOpen, rejectOpen) => { debugSocket.onopen = resolveOpen; debugSocket.onerror = rejectOpen; });
  let responsePromise = new Promise((resolveResponse, rejectResponse) => {
    let timeoutHandle = setTimeout(() => rejectResponse(new Error("Browser test timed out")), 20000);
    debugSocket.onmessage = socketEvent => {
      let responseData = JSON.parse(socketEvent.data);
      if (responseData.id === 1) { clearTimeout(timeoutHandle); resolveResponse(responseData); }
    };
  });
  debugSocket.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { awaitPromise: true, returnByValue: true,
    expression: `new Promise(resolve => {
      let attempts = 0;
      let timer = setInterval(() => {
        if (document.body.dataset.result || attempts++ > 500) {
          clearInterval(timer);
          resolve({ result: document.body.dataset.result, text: document.body.innerText });
        }
      }, 20);
    })` } }));
  let responseData = await responsePromise;
  let testResult = responseData.result?.result?.value;
  console.log(JSON.stringify(testResult));
  if (testResult?.result !== "passed") throw new Error("Browser image conversion smoke test failed");
} finally {
  if (debugSocket?.readyState === WebSocket.OPEN) {
    debugSocket.send(JSON.stringify({ id: 2, method: "Browser.close" }));
    debugSocket.close();
  } else browserProcess.kill();
}
