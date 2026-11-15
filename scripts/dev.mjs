// Local development, laid out like the real site:
//   localhost:3000       the live app (only the sections live has, e.g. Invoices)
//   localhost:3000/demo  the demo (everything), served by a second dev server on port 3001
// `npm run dev` starts both. Each keeps its own build folder so the two don't clash.
import { spawn } from "node:child_process"

const LIVE_FEATURES = "invoices" // keep in step with NEXT_PUBLIC_UK_FEATURES on the live Vercel project

const run = (name, port, env) =>
  spawn("npx", ["next", "dev", "-p", String(port)], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...env, UK_LOCAL_SITE: name },
  })

const children = [
  run("live", 3000, { NEXT_PUBLIC_UK_FEATURES: LIVE_FEATURES, UK_DIST_DIR: ".next" }),
  run("demo", 3001, { UK_BASE_PATH: "/demo", NEXT_PUBLIC_UK_FEATURES: "all", UK_DIST_DIR: ".next-demo" }),
]

const stop = () => children.forEach((c) => c.kill())
process.on("SIGINT", stop)
process.on("SIGTERM", stop)
children.forEach((c) => c.on("exit", (code) => (stop(), process.exit(code ?? 0))))
