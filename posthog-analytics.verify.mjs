#!/usr/bin/env node
// Offline verification for the PostHog browser analytics integration.
// Runs the real handler tests with the repo's own toolchain (Bun), in a child
// process with an empty environment, fixed synthetic configuration, no .env
// autoloading and no network use. Exits non-zero on a missing runner, missing
// tests, a failing test or zero executed assertions.
import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir, tmpdir } from 'node:os'

const root = dirname(fileURLToPath(import.meta.url))
const testFile = join(root, 'tests', 'posthog-analytics.test.ts')
const timeoutMs = 120_000
const minimumTests = 10

const syntheticEnv = {
  VITE_POSTHOG_PROJECT_TOKEN: 'synthetic_project_token_local_only',
  VITE_POSTHOG_HOST: 'https://eu.i.posthog.com',
}

function fail(message, output) {
  console.error(`offline verification failed: ${message}`)
  if (output) console.error(output.trim())
  process.exit(1)
}

if (!existsSync(testFile)) fail(`missing test file ${testFile}`)

const bun = process.env.BUN_BINARY || 'bun'
const env = {
  PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
  HOME: homedir(),
  TMPDIR: tmpdir(),
  NO_COLOR: '1',
  CI: '1',
  ...syntheticEnv,
}

let output = ''
let timedOut = false
const child = spawn(bun, ['--no-env-file', 'test', testFile], {
  cwd: root,
  env,
  shell: false,
  stdio: ['ignore', 'pipe', 'pipe'],
})

const timer = setTimeout(() => {
  timedOut = true
  child.kill('SIGKILL')
}, timeoutMs)

child.stdout.on('data', (chunk) => {
  output += chunk.toString()
  process.stdout.write(chunk)
})
child.stderr.on('data', (chunk) => {
  output += chunk.toString()
  process.stderr.write(chunk)
})

child.on('error', (error) => {
  clearTimeout(timer)
  fail(`could not start the Bun test runner (${error.message}); install Bun or set BUN_BINARY`)
})

child.on('close', (code) => {
  clearTimeout(timer)
  if (timedOut) fail(`tests exceeded ${timeoutMs / 1000}s`, output)
  if (code !== 0) fail(`tests exited with code ${code}`, output)

  const passed = /(\d+)\s+pass/.exec(output)
  const failed = /(\d+)\s+fail/.exec(output)
  if (!passed) fail('no assertion results in the test output', output)
  const passCount = Number(passed[1])
  const failCount = failed ? Number(failed[1]) : 0
  if (failCount !== 0) fail(`${failCount} test(s) failed`, output)
  if (passCount < minimumTests) fail(`expected at least ${minimumTests} passing tests, saw ${passCount}`, output)

  const assertions = /(\d+)\s+expect\(\) calls/.exec(output)
  const assertionCount = assertions ? Number(assertions[1]) : 0
  if (assertionCount === 0) fail('tests ran but asserted nothing', output)

  console.log(`\noffline verification passed: ${passCount} tests, ${assertionCount} assertions, 0 failures`)
})
