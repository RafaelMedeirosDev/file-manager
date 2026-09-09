// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // O ESLint em flat config nao le o .gitignore. `vite.config.js` e
    // `vite.config.d.ts` existem no disco porque tsconfig.node.json e
    // `composite`, o que obriga o tsc a emiti-los ao lado da fonte.
    ignores: [
      'dist/**',
      'vite.config.js',
      'vite.config.d.ts',
      'eslint.config.mjs',
      'tailwind.config.cjs',
      'postcss.config.cjs',
      '**/*.tsbuildinfo',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        // Resolve sozinho o tsconfig de cada arquivo: src/** cai no
        // tsconfig.json e vite.config.ts no tsconfig.node.json.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // As duas regras que motivaram esta configuracao. exhaustive-deps entra
      // direto como error: o bug de drag-and-drop do PR #59 era exatamente um
      // dep array incompleto, e hoje o codebase esta limpo o bastante para isso.
      //
      // O preset `recommended-latest` do plugin v7 traz tambem as regras do
      // React Compiler (purity, immutability, set-state-in-effect...). Ficam
      // de fora por ora: sao outra discussao, com outro volume.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',

      // AuthContext e useSidebarContext convivem com seus providers no mesmo
      // arquivo. Separa-los so para agradar o fast refresh seria um refactor
      // sem ganho real, entao sao liberados nominalmente.
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          allowExportNames: ['AuthContext', 'useSidebarContext'],
        },
      ],

      // Espelha back-end/eslint.config.mjs para os dois workspaces nao
      // divergirem no rigor de tipos.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',

      // Passar um handler async para onClick/onSubmit e idiomatico em React;
      // a regra so faz sentido aqui para retornos que nao sejam void.
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: false },
      ],
    },
  },
);
