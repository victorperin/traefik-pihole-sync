export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts',
  ],
  // Run tests in sequence to avoid Docker Compose race conditions
  maxWorkers: 1,
  forceExit: true,
  detectOpenHandles: true,
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 30000, // Shorter timeout since no containers to start
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Global setup/teardown for mocked services
  globalSetup: '<rootDir>/test/integration/globalSetup.ts',
  globalTeardown: '<rootDir>/test/integration/globalTeardown.ts',
};
