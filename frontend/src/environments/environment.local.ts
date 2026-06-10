// Local development — frontend hits the local SAM API server.
export const environment = {
  name: 'local',
  production: false,
  api: {
    baseUrl: 'http://localhost:3000',
  },
  cognito: {
    region: 'us-east-1',
    // sam local doesn't enforce the HttpApi authorizer, but the frontend login
    // gate still calls the real dev User Pool. Fill these in with the
    // ttb-label-verifier stack's UserPoolId / UserPoolClientId outputs.
    userPoolId: '',
    clientId: '',
  },
};
