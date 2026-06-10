// Default (production) environment configuration.
// Replaced by environment.local.ts when running `ng serve` (local config).
export const environment = {
  name: 'production',
  production: true,
  api: {
    baseUrl: '__API_BASE_URL__', // Replaced at deploy time with the API Gateway URL
  },
  cognito: {
    region: 'us-east-1',
    userPoolId: '__COGNITO_USER_POOL_ID__', // Replaced at deploy time
    clientId: '__COGNITO_CLIENT_ID__', // Replaced at deploy time
  },
};
