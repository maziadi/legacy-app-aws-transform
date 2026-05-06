module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: { lines: 70, functions: 70, branches: 70, statements: 70 }
  },
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'reports', outputName: 'junit.xml' }]
  ],
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['./tests/setup.js']
};
