import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest, // For describe, it, etc if needed, though Vitest has its own
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
      'no-console': 'off',
    },
  },
  {
    ignores: [
      'dist/**', 
      'node_modules/**', 
      'coverage/**', 
      '*.js', // Ignore all JS files since we are TS now
      '!eslint.config.js'
    ],
  }
);
