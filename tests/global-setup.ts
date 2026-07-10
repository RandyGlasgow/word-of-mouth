import { spawn, type ChildProcess } from 'child_process'
import dotenv from 'dotenv'

/**
 * Boots the real Next.js app (admin + site + API routes) against the test
 * database so integration tests can exercise the HTTP boundary with fetch().
 * The dev server push-syncs the Payload schema into the empty test DB.
 */

const env: Record<string, string> = {}
dotenv.config({ path: './test.env', processEnv: env })

// Shell env wins over test.env so parallel workers can target their own DB/port.
const merged = { ...env, ...process.env } as Record<string, string>
const PORT = Number(new URL(merged.TEST_SERVER_URL || 'http://127.0.0.1:3210').port || 3210)
let server: ChildProcess | undefined

const waitForServer = async (url: string, timeoutMs = 120_000): Promise<void> => {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.status < 500) return
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error(`Test server did not become ready at ${url}`)
}

export const setup = async (): Promise<void> => {
  server = spawn('node', ['node_modules/next/dist/bin/next', 'dev', '-p', String(PORT)], {
    env: {
      ...merged,
      NODE_ENV: process.env.NODE_ENV,
      PORT: String(PORT),
      NODE_OPTIONS: '--no-deprecation',
    },
    stdio: ['ignore', 'inherit', 'inherit'],
    detached: true,
  })
  await waitForServer(`http://127.0.0.1:${PORT}/api/access`)
}

export const teardown = async (): Promise<void> => {
  if (server?.pid) {
    try {
      process.kill(-server.pid, 'SIGTERM')
    } catch {
      server.kill('SIGTERM')
    }
  }
}
