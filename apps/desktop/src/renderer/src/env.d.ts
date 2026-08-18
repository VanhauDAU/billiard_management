import type {
  DesktopApi
} from '../../preload/types'

declare global {
  interface Window {
    desktopApi: DesktopApi
  }
}

export {}