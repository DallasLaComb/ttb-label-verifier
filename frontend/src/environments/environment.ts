// Default (production) environment configuration.
// Replaced by environment.local.ts when running `ng serve` (local config).
export const environment = {
  name: 'production',
  production: true,
  api: {
    baseUrl: '__API_BASE_URL__', // Replaced at deploy time with the API Gateway URL
  },
};
