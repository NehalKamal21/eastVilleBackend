module.exports = {
    env: {
        node: true,
        es2021: true,
        jest: true,
    },
    extends: [
        'eslint:recommended',
        'prettier',
    ],
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module',
    },
    rules: {
        'indent': ['error', 4],
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
        'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
        'no-console': 'warn',
        'prefer-const': 'error',
        'no-var': 'error',
        'object-shorthand': 'error',
        'prefer-template': 'error',
        'template-curly-spacing': 'error',
        'arrow-spacing': 'error',
        'no-duplicate-imports': 'error',
        'no-useless-rename': 'error',
        'prefer-destructuring': ['error', {
            'array': false,
            'object': true
        }],
        'prefer-rest-params': 'error',
        'prefer-spread': 'error',
        'no-useless-constructor': 'error',
        'no-useless-computed-key': 'error',
        'no-useless-escape': 'error',
        'no-useless-return': 'error',
        'no-else-return': 'error',
        'no-empty-function': 'error',
        'no-extra-bind': 'error',
        'no-extra-label': 'error',
        'no-floating-decimal': 'error',
        'no-implicit-coercion': 'error',
        'no-implicit-globals': 'error',
        'no-implied-eval': 'error',
        'no-iterator': 'error',
        'no-labels': 'error',
        'no-lone-blocks': 'error',
        'no-loop-func': 'error',
        'no-multi-spaces': 'error',
        'no-multi-str': 'error',
        'no-new': 'error',
        'no-new-func': 'error',
        'no-new-wrappers': 'error',
        'no-octal': 'error',
        'no-octal-escape': 'error',
        'no-param-reassign': 'error',
        'no-proto': 'error',
        'no-redeclare': 'error',
        'no-return-assign': 'error',
        'no-script-url': 'error',
        'no-self-assign': 'error',
        'no-self-compare': 'error',
        'no-sequences': 'error',
        'no-throw-literal': 'error',
        'no-unmodified-loop-condition': 'error',
        'no-unused-expressions': 'error',
        'no-useless-call': 'error',
        'no-useless-concat': 'error',
        'no-void': 'error',
        'no-warning-comments': 'warn',
        'no-with': 'error',
        'radix': 'error',
        'vars-on-top': 'error',
        'wrap-iife': 'error',
        'yoda': 'error',
        'strict': ['error', 'global'],
        'init-declarations': 'error',
        'no-catch-shadow': 'error',
        'no-delete-var': 'error',
        'no-label-var': 'error',
        'no-restricted-globals': 'error',
        'no-shadow': 'error',
        'no-shadow-restricted-names': 'error',
        'no-undef': 'error',
        'no-undef-init': 'error',
        'no-undefined': 'error',
        'no-unused-vars': 'error',
        'no-use-before-define': 'error',
        'callback-return': 'error',
        'global-require': 'error',
        'handle-callback-err': 'error',
        'no-buffer-constructor': 'error',
        'no-mixed-requires': 'error',
        'no-new-require': 'error',
        'no-path-concat': 'error',
        'no-process-env': 'off',
        'no-process-exit': 'off',
        'no-restricted-modules': 'error',
        'no-sync': 'error',
    },
}; 