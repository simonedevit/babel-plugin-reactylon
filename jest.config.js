/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
    maxWorkers: 1,
    preset: "ts-jest/presets/default-esm",
    verbose: true,
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    transform: {
        "^.+.tsx?$": ["ts-jest", {
            useESM: true
        }],
    },
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
    },
};