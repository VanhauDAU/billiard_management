import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  cloudflareTest,
  readD1Migrations
} from '@cloudflare/vitest-pool-workers'

import { defineConfig } from 'vitest/config'

const currentDirectory = path.dirname(
  fileURLToPath(import.meta.url)
)

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrations =
        await readD1Migrations(
          path.join(
            currentDirectory,
            'migrations'
          )
        )

      return {
        wrangler: {
          configPath: './wrangler.jsonc'
        },

        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            SYSTEM_DIAGNOSTICS_TOKEN:
              'test-system-diagnostics-token-0123456789abcdef'
          }
        }
      }
    })
  ],

  test: {
    setupFiles: [
      './test/apply-migrations.ts'
    ]
  }
})
