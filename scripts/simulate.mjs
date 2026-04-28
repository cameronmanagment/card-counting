import { spawn } from 'node:child_process'
import { request } from 'node:http'
import { dirname, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const host = '127.0.0.1'
const port = process.env.PORT || '5173'
const url = `http://${host}:${port}`
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const moduleBin = (...parts) => resolve(root, 'node_modules', ...parts)

let shuttingDown = false

const runNodeBin = (entry, args) =>
  spawn(process.execPath, [entry, ...args], {
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, BROWSER: 'none' },
  })

const waitForServer = async (targetUrl, timeoutMs = 30_000) => {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    if (await canConnect(targetUrl)) {
      return
    }

    await delay(250)
  }

  throw new Error(`Timed out waiting for Vite at ${targetUrl}`)
}

const canConnect = (targetUrl) =>
  new Promise((resolve) => {
    const req = request(targetUrl, { method: 'HEAD', timeout: 1_000 }, (res) => {
      res.resume()
      resolve(true)
    })

    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
    req.end()
  })

const stop = (child) => {
  if (child && !child.killed) {
    child.kill()
  }
}

const vite = runNodeBin(moduleBin('vite', 'bin', 'vite.js'), [
  '--host',
  host,
  '--port',
  port,
])

const shutdown = (code = 0) => {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  stop(vite)
  process.exit(code)
}

process.on('SIGINT', () => shutdown(130))
process.on('SIGTERM', () => shutdown(143))

vite.once('exit', (code) => {
  if (!shuttingDown) {
    shutdown(code ?? 1)
  }
})

try {
  await waitForServer(url)
  const simulator = runNodeBin(
    moduleBin('@evenrealities', 'evenhub-simulator', 'bin', 'index.js'),
    [url],
  )

  simulator.once('exit', (code) => shutdown(code ?? 0))
} catch (error) {
  console.error(error.message)
  shutdown(1)
}
