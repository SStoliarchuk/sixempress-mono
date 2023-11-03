/* eslint-disable */
export default {
  displayName: 'modules-sixempress-external-sync-backend',
  preset: '../../../../../jest.preset.js',
  globals: {},
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory:
    '../../../../../coverage/apps/modules/sixempress/external-sync/backend',
};
