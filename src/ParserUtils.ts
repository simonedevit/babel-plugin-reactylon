import path from 'path';
import fs from 'fs';

type ExportsAndSideEffects = {
    exports: Array<string>;
    sideEffects: Array<string>;
}

type ExportsAndSideEffectsMap = {
    exports: Record<string, string>;
    sideEffects: Record<string, string>;
}

class ParserUtils {

    /**
    * It extracts exports and side effects from a file
    * @param filePath - file path to analyze
    * @returns an object containing the discovered exports and side effects
    */
    static getExportsAndSideEffects(filePath: string): ExportsAndSideEffects {
        const content = fs.readFileSync(filePath, 'utf-8');
        const exports = new Set<string>();
        const sideEffects = new Set<string>();

        // Default export
        if (/export\s+default\s+/g.test(content)) {
            exports.add('default');
        }

        // Named export
        const namedExports = content.match(/export\s+{([^}]+)}/g);
        if (namedExports) {
            namedExports.forEach(exp => {
                //@ts-ignore
                exp.replace(/export\s+{([^}]+)}/, (_, group) => {
                    group.split(',').forEach((e: string) => exports.add(e.trim()));
                });
            });
        }

        // Other export
        const individualExports = content.match(/export\s+(const|let|var|function|class)\s+([a-zA-Z0-9_]+)/g);
        if (individualExports) {
            individualExports.forEach(exp => {
                //@ts-ignore
                exp.replace(/export\s+(const|let|var|function|class)\s+([a-zA-Z0-9_]+)/, (_, __, name) => {
                    exports.add(name);
                });
            });
        }

        // Component.prototype.method
        const prototypeMatches = content.match(/(\w+)\.prototype\.(\w+)\s*=/g);
        if (prototypeMatches) {
            prototypeMatches.forEach(prototype => {
                const methodName = prototype.match(/\.prototype\.(\w+)/)![1];
                sideEffects.add(methodName);
            })
        }

        // Object.defineProperty(Class.prototype, "method", { })'
        const definePropertyMatches = content.match(/Object\.defineProperty\(\s*(\w+)\.prototype\s*,\s*["'](\w+)["']/g);
        if (definePropertyMatches) {
            definePropertyMatches.forEach(prototype => {
                const methodName = prototype.match(/Object\.defineProperty\(\s*\w+\.prototype\s*,\s*["'](\w+)["']/)![1];
                sideEffects.add(methodName);
            })
        }

        return {
            exports: Array.from(exports),
            sideEffects: Array.from(sideEffects)
        }
    }

    /**
    * It scans a directory and it creates a map of exports and side effects
    * @param dir - directory to scan
    * @param exportsMap - exports map to populate 
    * @param sideEffectsMap - side effects map to populate
    */
    static scanDirectory(dir: string, exportsMap: Record<string, string>, sideEffectsMap: Record<string, string>): void {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                this.scanDirectory(fullPath, exportsMap, sideEffectsMap);
            } else if (file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.ts')) {
                const importPath = (fullPath.replace(/\.(js|mjs|ts)$/, '')).replace(/\\/g, '/').replace(/^.*?node_modules\//, '');
                const { exports, sideEffects } = this.getExportsAndSideEffects(fullPath);
                exports.forEach(exp => {
                    exportsMap[exp] = importPath;
                });
                sideEffects.forEach(sideEffect => {
                    sideEffectsMap[sideEffect] = importPath;
                })
            }
        });
    }

    /**
    * High level function used to generate the maps of exports and side effects for a given module
    * @param moduleName - module name to analyze
    * @returns an object containing the discovered exports and side effects maps
    */

    static generateExportsAndSideEffects(moduleName: string, nodeModulesPath: string): ExportsAndSideEffectsMap {
        const modulePath = path.join(nodeModulesPath, moduleName);
        if (!fs.existsSync(modulePath)) {
            console.error(`The module "${moduleName}" doesn't exist.`);
        }
        const exportsMap: Record<string, string> = {};
        const sideEffectsMap: Record<string, string> = {};
        this.scanDirectory(modulePath, exportsMap, sideEffectsMap);
        return {
            exports: exportsMap,
            sideEffects: sideEffectsMap
        }
    }
}

export default ParserUtils;