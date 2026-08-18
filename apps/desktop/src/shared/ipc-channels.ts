export const IPC_CHANNELS = {
  appGetVersion: 'app:get-version',

  backendHealth: 'backend:health',

  deviceGetState: 'device:get-state',

  deviceActivate: 'device:activate',

  authGetState: 'auth:get-state',

  authGetEmployees: 'auth:get-employees',

  authLogin: 'auth:login',

  authLogout: 'auth:logout'
} as const
