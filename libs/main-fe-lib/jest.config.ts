/* eslint-disable */
export default {
  displayName: 'main-fe-lib',
  preset: '../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup-tests.ts'],
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/libs/main-fe-lib',
};
