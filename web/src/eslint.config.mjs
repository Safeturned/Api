import nextConfig from 'eslint-config-next';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
    ...nextConfig,
    {
        plugins: {
            '@typescript-eslint': tseslint.plugin,
            prettier: prettier,
        },
        rules: {
            ...prettierConfig.rules,
            'prettier/prettier': 'error',
            '@typescript-eslint/no-unused-vars': 'error',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-non-null-assertion': 'warn',
            '@typescript-eslint/no-this-alias': 'off',
            '@typescript-eslint/no-empty-function': 'warn',
            '@typescript-eslint/no-inferrable-types': 'off',
            'react-hooks/set-state-in-effect': 'warn',
            'import/no-anonymous-default-export': 'off',
        },
    },
];
