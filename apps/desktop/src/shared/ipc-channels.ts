export const IPC_CHANNELS = {
  appGetVersion: 'app:get-version',
  backendHealth: 'backend:health',

  deviceGetState: 'device:get-state',
  deviceActivate: 'device:activate',

  authGetState: 'auth:get-state',
  authGetEmployees: 'auth:get-employees',
  authGetPermissions: 'auth:get-permissions',
  authLogin: 'auth:login',
  authLoginWithPassword: 'auth:login-password',
  authVerifyPin: 'auth:verify-pin',
  authLogout: 'auth:logout',

  staffList: 'staff:list',
  staffCreate: 'staff:create',
  staffUpdate: 'staff:update',
  staffDelete: 'staff:delete',

  tablesGetConfiguration: 'tables:get-configuration',
  tablesExecuteCommand: 'tables:execute-command'
} as const