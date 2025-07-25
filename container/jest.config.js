module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^mfe_1/mount$': '<rootDir>/container/src/__mocks__/mfe_1_mount.js',
    '^service_mfe/mount$': '<rootDir>/container/src/__mocks__/service_mfe_mount.js',
    // aggiungi altri federated module se necessario
  },
  setupFilesAfterEnv: ['@testing-library/jest-dom/extend-expect'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};