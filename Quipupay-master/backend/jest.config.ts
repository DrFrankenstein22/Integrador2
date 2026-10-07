import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }],
  },
  // @nestjs/jwt ships as ESM ("type": "module"); let ts-jest transpile it to CJS.
  transformIgnorePatterns: ['/node_modules/(?!(@nestjs/jwt)/)'],
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
};

export default config;
