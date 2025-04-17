# Babel Plugin Reactylon

A Babel plugin designed to enable **tree shaking** in a Reactylon application. It statically analyzes Reactylon JSX elements and automatically manages imports and registrations of the relative Babylon.js classes, ensuring only the necessary parts of the Babylon.js library are included in the final bundle.

## Features
- Automatic detection of Babylon.js components used in JSX
- Automatic import of Babylon.js classes from `@babylonjs/core` e `@babylonjs/gui`
- Implicit side effects management (detect prototype-level side effects in Babylon.js and ensures proper runtime behaviour)
- Explicit side effects support (allows users to define custom side effects manually)
- Automatic registration (ensures that used Babylon.js classes are registered within Reactylon's internal registry)

## Configuration

To get started, install the plugin using the following command:

```bash
npm install babel-plugin-reactylon --save-dev
```

### Babel (standalone, Next.js or React Native)

Add the plugin to your Babel configuration:

```js
// babel.config.js
module.exports = {
  plugins: [
    ['babel-plugin-reactylon']
  ]
};
```

### Webpack
Add the plugin to your Webpack configuration. The following configuration demonstrates how to integrate the plugin using both `ts-loader` and `babel-loader`:

```ts
// webpack.config.js
module.exports = {
module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: true
                        }
                    },
                    {
                        loader: "babel-loader",
                        options: {
                            presets: [
                                ["@babel/preset-env"],
                                ["@babel/preset-react", { runtime: "automatic" }],
                                "@babel/preset-typescript"
                            ],
                            plugins: [
                                ['babel-plugin-reactylon']
                            ]
                        }
                    },
                ],
                exclude: '/node_modules/',
            },
        ],
    },
};
```

### Vite
```js
// vite.config.js
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-reactylon']
      }
    }),
  ],
})
```

### Additional configurations
Additionally you can manually define extra side effects (see [Babylon.js ES6 support FAQ](https://doc.babylonjs.com/setup/frameworkPackages/es6Support/#faq)) or specify a custom `node_modules` path (useful if you are working with a monorepo setup).

```js
['babel-plugin-reactylon', {
  // additional side effects (optional)
  sideEffects: [
    '@babylonjs/core/Engines/Extensions/engine.query.js'
  ]
  // node modules path (optional)
  nodeModulesPath: '../../node_modules'
}]
```

## How it works
The plugin analyzes your JSX code by scanning for Reactylon components. When a component is detected, it automatically imports the corresponding Babylon.js class and registers it with Reactylon, making it available in the rendering context. To remain consistent with Babylon.js modular architecture, the plugin selects the *deepest available class* implementation by recursively scanning the directory tree. This approach ensures that the most specific and optimized module is used, preventing unwanted side effects that could compromise tree shaking.

### Example

#### Input

```jsx
<>
    <standardMaterial name='material'>
        <texture url='texture-url' />
    </standardMaterial>
    <box />
    <sphere />
    <text3D />
    <standardMaterial name='material-1' />
    <standardMaterial name='material-2' />
    <pointLight 
        name='point'
        position={new Vector3(0, 1, 0)}
        diffuse={Color3.Red()}
        specular={Color3.Green()}
    />
    <directionalLight
        name='directional'
        direction={new Vector3(0, -1, 0)}
        diffuse={Color3.Red()}
        specular={Color3.Green()}
    />
</>;
```
#### Output
```js
import { DirectionalLight as _DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { PointLight as _PointLight } from "@babylonjs/core/Lights/pointLight";
import { CreateText as _CreateText } from "@babylonjs/core/Meshes/Builders/textBuilder";
import { CreateSphere as _CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { CreateBox as _CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { Texture as _Texture } from "@babylonjs/core/Materials/Textures/texture";
import { StandardMaterial as _StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { register as _register } from "reactylon";
_register({
  "standardMaterial": [_StandardMaterial, 0],
  "texture": [_Texture, 0],
  "box": [_CreateBox, 0],
  "sphere": [_CreateSphere, 0],
  "text3D": [_CreateText, 0],
  "pointLight": [_PointLight, 0],
  "directionalLight": [_DirectionalLight, 0]
});
<>
    <standardMaterial name='material'>
        <texture url='texture-url' />
    </standardMaterial>
    <box /> 
    <sphere /> 
    <text3D /> 
    <standardMaterial name='material-1' />
    <standardMaterial name='material-2' /> 
    <pointLight name='point' position={new Vector3(0, 1, 0)} diffuse={Color3.Red()} specular={Color3.Green()} /> 
    <directionalLight name='directional' direction={new Vector3(0, -1, 0)} diffuse={Color3.Red()} specular={Color3.Green()} />
</>;
```

## Acknowledgements
This project is highly inspired by [React Three Babel](https://github.com/pmndrs/react-three-babel).
Special thanks to the authors for their work, which served as a foundation and reference for this implementation.