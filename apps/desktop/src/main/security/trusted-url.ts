import { is } from '@electron-toolkit/utils'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const ALLOWED_EXTERNAL_ORIGINS =
  new Set<string>()

function getPackagedRendererUrl(): URL {
  return pathToFileURL(
    join(
      __dirname,
      '../renderer/index.html'
    )
  )
}

export function isTrustedRendererUrl(
  rawUrl: string
): boolean {
  try {
    const url = new URL(rawUrl)

    if (is.dev) {
      const rendererUrl =
        process.env[
          'ELECTRON_RENDERER_URL'
        ]

      if (!rendererUrl) {
        return false
      }

      return (
        url.origin ===
        new URL(rendererUrl).origin
      )
    }

    const expected =
      getPackagedRendererUrl()

    return (
      url.protocol === 'file:' &&
      url.host === expected.host &&
      url.pathname === expected.pathname &&
      url.search === ''
    )
  } catch {
    return false
  }
}

export function isAllowedExternalUrl(
  rawUrl: string
): boolean {
  try {
    const url = new URL(rawUrl)

    return (
      url.protocol === 'https:' &&
      ALLOWED_EXTERNAL_ORIGINS.has(
        url.origin
      )
    )
  } catch {
    return false
  }
}
