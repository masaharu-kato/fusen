// import types definition
import { Config } from '@jest/types';

// Set options
const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  testEnvironment: 'jsdom',
  collectCoverage: true,
  errorOnDeprecated: true,
};

export default config;
