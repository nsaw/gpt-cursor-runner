module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src-nextgen', '<rootDir>/scripts'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src-nextgen/**/*.ts',
    'scripts/**/*.ts',
    '!**/*.d.ts',
  ],
};
