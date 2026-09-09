// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // `any` escrito a mao nao aparece no codigo de producao, e a regra so
      // criaria atrito nos mocks de teste -- que o override abaixo ja relaxa.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      // As quatro regras abaixo estavam desligadas ou rebaixadas, o que
      // esvaziava o preset recommendedTypeChecked. Voltaram junto com o
      // `strict` do tsconfig: o `any` que sobrava vinha de
      // TransformFnParams.value, do class-transformer, e agora para nos
      // helpers de shared/dto/transforms.ts.
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-call': 'error'
    },
  },
  {
    // Codigo de teste lida por natureza com mocks e com retornos `any` do
    // Nest e do supertest. Tipar cada mock deixaria os testes mais verbosos
    // que o codigo que eles cobrem, contrariando .claude/rules/tests.md
    // ("avoid excessive mocks that make the test harder to read than the
    // production code"). As mesmas regras seguem ativas em src/.
    files: ['**/*.spec.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      // Os fakes de JwtAuthGuard escrevem em `request.user`, que o Express
      // tipa como any -- e o ponto do fake e justamente simular o payload.
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
);
