export const IPC_CHANNELS = {
  appGetVersion:
    'app:get-version',

  backendHealth:
    'backend:health',

  deviceGetState:
    'device:get-state',

  deviceActivate:
    'device:activate'
} as const