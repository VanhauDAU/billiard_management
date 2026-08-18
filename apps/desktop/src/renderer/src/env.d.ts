/// <reference types="vite/client" />

import type {
  DesktopApi
} from '../../preload/types'

declare global {
  interface Window {
    desktopApi: DesktopApi
  }
}

declare module '*.png' {
  const src: string
  export default src
}

declare module '*.svg' {
  const src: string
  export default src
}

export {}