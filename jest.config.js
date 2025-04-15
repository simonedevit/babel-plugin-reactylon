/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
    preset: "ts-jest/presets/default-esm",
    verbose: true,
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    transform: {
        "^.+.tsx?$": ["ts-jest", {
            useESM: true
        }],
    },
};