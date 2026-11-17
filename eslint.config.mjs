const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  localStorage: 'readonly',
  confirm: 'readonly',
  alert: 'readonly',
  structuredClone: 'readonly',
  console: 'readonly',
  URL: 'readonly',
  DOMParser: 'readonly',
  process: 'readonly'
};

const testGlobals = {
  describe: 'readonly',
  it: 'readonly',
  expect: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  beforeAll: 'readonly',
  afterAll: 'readonly',
  vi: 'readonly'
};

export default [
  { ignores: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', 'package-lock.json'] },
  {
    files: ['src/**/*.js', 'scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: browserGlobals
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'warn',
      'no-unreachable': 'error',
      'no-dupe-keys': 'error'
    }
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...browserGlobals, ...testGlobals, process: 'readonly', globalThis: 'readonly' }
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'warn'
    }
  }
];
