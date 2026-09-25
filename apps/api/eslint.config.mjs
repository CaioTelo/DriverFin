import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.test-dist/**',
      'coverage/**',
      'src/generated/**',
      '**/*.min.js',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
);
