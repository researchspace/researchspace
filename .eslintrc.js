module.exports = {
    env: {
        browser: true, // to enable globals like window that are available in the browser
        es6: true // to enable usage of es6 specific features like Maps, etc.
    },
    parser: "@typescript-eslint/parser", // Specifies the ESLint parser
    extends: [
        "eslint:recommended",
        "plugin:react/recommended", // Uses the recommended rules from @eslint-plugin-react
        "plugin:@typescript-eslint/recommended", // Uses the recommended rules from @typescript-eslint/eslint-plugin
        "prettier/@typescript-eslint", // Uses eslint-config-prettier to disable ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
    ],
    parserOptions: {
        // these two rules are needed for typed eslint rules
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.json'],

        ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
        sourceType: "module", // Allows for the use of imports
        ecmaFeatures: {
            jsx: true // Allows for the parsing of JSX
        }
    },
    rules: {
        // Place to specify ESLint rules. Can be used to overwrite rules specified from the extended configs

        // disable for now until something like https://github.com/typescript-eslint/typescript-eslint/issues/541 is fixed, it produces too much noice
        "@typescript-eslint/explicit-function-return-type": "off",

        // explicit any is sometimes OK, implicit any is not OK
        // we can re-enable this rule later when codebase is a bit more clean
        "@typescript-eslint/no-explicit-any": "off",

        // quite useless and confusing, because typescript is doing scope checks anyway
        "@typescript-eslint/no-use-before-define": "off"
    },
    settings: {
        react: {
            version: "detect" // Tells eslint-plugin-react to automatically detect the version of React to use
        }
    }
};
