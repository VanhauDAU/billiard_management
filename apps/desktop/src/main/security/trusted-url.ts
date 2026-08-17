import { is } from '@electron-toolkit/utils'

export function isTrustedRendererUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl)

    if (is.dev) {
      const rendererUrl = process.env['ELECTRON_RENDERER_URL']

      if (!rendererUrl) {
        return false
      }

      return url.origin === new URL(rendererUrl).origin
    }

    return url.protocol === 'file:'
  } catch {
    return false
  }
}

export function isAllowedExternalUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl)

    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}
