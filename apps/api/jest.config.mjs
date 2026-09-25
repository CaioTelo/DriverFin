const common = {
  testEnvironment: 'node',
  transform: {},
  setupFiles: ['reflect-metadata'],
};

export default {
  projects: [
    {
      ...common,
      displayName: 'unit',
      testMatch: ['<rootDir>/.test-dist/src/**/*.spec.js'],
    },
    {
      ...common,
      displayName: 'foundation',
      testMatch: ['<rootDir>/.test-dist/test/foundation/**/*.spec.js'],
    },
    {
      ...common,
      displayName: 'integration',
      testMatch: ['<rootDir>/.test-dist/test/integration/**/*.spec.js'],
    },
  ],
};
