
import { types as t, NodePath } from '@babel/core';
import { declare } from "@babel/helper-plugin-utils";
import { BabylonPackages, builders, CollidingComponents, ReversedCollidingComponents } from 'reactylon';
import ParserUtils from './ParserUtils.js';

const babylonImportsSpecifiers = new Map<string, t.ImportSpecifier>();
const sideEffects: Array<t.ImportDeclaration> = [];

let lastImport: NodePath<t.ImportDeclaration> | null = null;
let initialized = false;

let coreExportsMap: Record<string, string> = {};
let coreSideEffectsMap: Record<string, string> = {};
let guiExportsMap: Record<string, string> = {};
//let guiSideEffectsMap: Record<string, string> = {};

function capitalizeFirstLetter(str: string): string {
    return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
}

type PluginOptions = {
    sideEffects?: Array<string>;
    nodeModulesPath?: string;
}

export default declare((api) => {
    api.assertVersion(7)
    return {
        manipulateOptions(_, options) {
            options.plugins.push('jsx')
        },
        pre() {
            if (!initialized) {
                const options = this.opts as PluginOptions;
                const nodeModulesPath = options.nodeModulesPath || 'node_modules';

                const coreExportsAndSideEffects = ParserUtils.generateExportsAndSideEffects('@babylonjs/core', nodeModulesPath);
                coreExportsMap = coreExportsAndSideEffects.exports;
                coreSideEffectsMap = coreExportsAndSideEffects.sideEffects;

                const guiExportsAndSideEffects = ParserUtils.generateExportsAndSideEffects('@babylonjs/gui', nodeModulesPath);
                guiExportsMap = guiExportsAndSideEffects.exports;
                //guiSideEffectsMap = guiExportsAndSideEffects.sideEffects;

                // Add explicit side effects (additional side effects declared by user)
                options?.sideEffects?.forEach((sideEffect) => {
                    sideEffects.push(t.importDeclaration([], t.stringLiteral(sideEffect)));
                });

                initialized = true;
            }
        },
        post() {
            babylonImportsSpecifiers.clear();
            lastImport = null;
        },
        visitor: {
            ImportDeclaration(importPath) {
                lastImport = importPath
            },
            JSXOpeningElement(path) {
                // Don't include non-React JSX
                // https://github.com/facebook/jsx/issues/13
                const { name, attributes } = path.node
                if (t.isJSXNamespacedName(name)) return

                // Parse identifiers (e.g. <mesh />, <animated.mesh />)
                let type = 'property' in name ? name.property.name : name.name

                const declaration = path.scope.getBinding(type)?.path.node
                if (t.isVariableDeclarator(declaration)) {
                    if (t.isStringLiteral(declaration.init)) {
                        // const Comp = 'value'
                        // <Comp />
                        type = declaration.init.value
                    } else if (t.isTemplateLiteral(declaration.init)) {
                        // const Comp = `value${var}`
                        // <Comp />
                        type = declaration.init.quasis.map((n) => n.value.cooked).join('\\w*')
                    } else if (t.isBinaryExpression(declaration.init) || t.isAssignmentExpression(declaration.init)) {
                        // const Comp = 'left' + 'right' || (left += 'right')
                        // <Comp />
                        type = [declaration.init.left, declaration.init.right]
                            .map((o) => (t.isStringLiteral(o) ? o.value : '\\w*'))
                            .join('')
                    } else if (t.isConditionalExpression(declaration.init)) {
                        // const Comp = test ? 'consequent' : 'alternate'
                        // <Comp />
                        type = [declaration.init.consequent, declaration.init.alternate]
                            .map((o) => (t.isStringLiteral(o) ? o.value : '\\w*'))
                            .join('|')
                    } else {
                        // const Comp = var
                        // <Comp />
                        type = '\\w+'
                    }
                }

                // Don't include colliding React JSX components
                if (type in ReversedCollidingComponents) return

                if (!babylonImportsSpecifiers.has(type)) {
                    const normalizedType = type in CollidingComponents ? CollidingComponents[type] : type;
                    const isBuilder = builders.includes(normalizedType);
                    const className = isBuilder ? `Create${capitalizeFirstLetter(normalizedType)}` : capitalizeFirstLetter(normalizedType);
                    if (className in coreExportsMap || className in guiExportsMap) {
                        const local = path.scope.generateUidIdentifier(className);
                        babylonImportsSpecifiers.set(type, t.importSpecifier(local, t.identifier(className)));
                    }
                }

                // Add implicit side effects (derived from static parse of JSX Reactylon code)
                const isPhysicsEngine = attributes.some(attr => t.isJSXAttribute(attr) && attr.name.name === "physicsOptions");
                if (isPhysicsEngine) {
                    sideEffects.push(t.importDeclaration([], t.stringLiteral('@babylonjs/core/Physics/physicsEngineComponent.js')));
                }
                const isBoundingBox = attributes.some(attr => t.isJSXAttribute(attr) && attr.name.name === "showBoundingBox");
                if (isBoundingBox) {
                    sideEffects.push(t.importDeclaration([], t.stringLiteral('@babylonjs/core/Rendering/boundingBoxRenderer.js')));
                }
                // add here other side effects (https://doc.babylonjs.com/setup/frameworkPackages/es6Support/#faq)
            },

            Program: {

                exit(path) {
                    if (!babylonImportsSpecifiers.size) return

                    const babylonImports: Array<[string, t.ImportDeclaration, number]> = [];

                    babylonImportsSpecifiers.forEach((importSpecifier, type) => {
                        let packageName = null;
                        const importName = (importSpecifier.imported as t.Identifier).name;
                        let importPath = '';
                        if (coreExportsMap[importName]) {
                            importPath = coreExportsMap[importName];
                            packageName = BabylonPackages.CORE;
                        } else {
                            importPath = guiExportsMap[importName];
                            packageName = BabylonPackages.GUI;
                        }
                        const importDeclaration = t.importDeclaration([importSpecifier], t.stringLiteral(importPath));
                        babylonImports.push([type, importDeclaration, packageName]);
                    })

                    const registerSpecifier = t.importSpecifier(path.scope.generateUidIdentifier('register'), t.identifier('register'));
                    const registerImportDeclaration = t.importDeclaration([registerSpecifier], t.stringLiteral('reactylon'));

                    const registerCall = t.expressionStatement(
                        t.callExpression(registerSpecifier.local, [
                            t.objectExpression(
                                babylonImports.map(([type, importDeclaration, packageName]) => {
                                    const importSpecifier = importDeclaration.specifiers[0];
                                    return t.objectProperty(
                                        t.stringLiteral(type),
                                        t.arrayExpression([
                                            importSpecifier.local,
                                            t.numericLiteral(packageName)
                                        ]),
                                        false,
                                        false
                                    );
                                })
                            ),
                        ]),
                    );

                    const babylonImportDeclarations = babylonImports.map(([, importDeclaration]) => importDeclaration);

                    // Add implicit prototype-level side effects (derived from static parse of JavaScript Babylon.js code)
                    path.traverse({
                        CallExpression(callPath) {
                            const callee = callPath.node.callee;

                            if (t.isMemberExpression(callee)) {
                                const property = callee.property;
                                if (t.isIdentifier(property)) {
                                    if (property.name in coreSideEffectsMap) {
                                        sideEffects.push(t.importDeclaration([], t.stringLiteral(coreSideEffectsMap[property.name])));
                                        // callPath.stop();
                                    }
                                }
                            }
                        }
                    });

                    // Add imports and call register
                    for (const node of [registerCall, registerImportDeclaration, ...babylonImportDeclarations, ...sideEffects]) {
                        if (lastImport) {
                            lastImport.insertAfter(node);
                        } else {
                            path.unshiftContainer('body', node);
                        }
                    }
                },

            },
        },
    }
})