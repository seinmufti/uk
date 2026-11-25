// Local development, laid out like the real site:
//   localhost:3000       the live app (only the sections live has, e.g. Invoices)
//   localhost:3000/demo  the demo (everything), served by a second dev server on port 3001 (or the next free one)
// `npm run dev` starts both. Each keeps its own build folder so the two don't clash.
import { spawn, spawnSync } from "node:child_process"
import { createServer } from "node:net"

const LIVE_FEATURES = "all" // keep in step with NEXT_PUBLIC_UK_FEATURES on the live Vercel project

// Another app may already hold 3001: take the first free port after it
const free = (port) =>
  new Promise((ok) => {
    const s = createServer()
    s.once("error", () => ok(false))
    s.listen(port, () => s.close(() => ok(true)))
  })
let DEMO_PORT = 3001
while (!(await free(DEMO_PORT))) DEMO_PORT++
process.env.UK_DEMO_PORT = String(DEMO_PORT)

const run = (name, port, env) =>
  spawn("npx", ["next", "dev", "-p", String(port)], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...env, UK_LOCAL_SITE: name },
  })

const children = [
  run("live", 3000, { NEXT_PUBLIC_UK_FEATURES: LIVE_FEATURES, UK_DIST_DIR: ".next" }),
  run("demo", DEMO_PORT, { UK_BASE_PATH: "/demo", NEXT_PUBLIC_UK_FEATURES: "all", UK_DIST_DIR: ".next-demo", UK_DB_SCHEMA: "demo" }),
]

// Through a shell, kill() only ends the shell and leaves Next running: end the whole tree
const stop = () =>
  children.forEach((c) => (process.platform === "win32" ? spawnSync("taskkill", ["/T", "/F", "/PID", String(c.pid)], { stdio: "ignore" }) : c.kill()))
process.on("SIGINT", stop)
process.on("SIGTERM", stop)
children.forEach((c) => c.on("exit", (code) => (stop(), process.exit(code ?? 0))))
