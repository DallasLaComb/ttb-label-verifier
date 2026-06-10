// Local development — frontend hits the local SAM API server.
export const environment = {
  name: 'local',
  production: false,
  api: {
    baseUrl: 'http://localhost:3000',
  },
};
