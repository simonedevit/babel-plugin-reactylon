import { transform } from '@babel/core';
import ReactylonBabelPlugin, { __resetReactylonBabelPluginStateForTests } from './index.ts';

function execute(code: string): string {
    return transform(code.replace(/\s+/g, ' '), { plugins: [ReactylonBabelPlugin] })!.code!
}

beforeEach(() => {
    __resetReactylonBabelPluginStateForTests();
});

test('should transform a Reactylon component', () => {
    const input = `
        <hemisphericLight 
            name='hemispherical'
            diffuse={Color3.Red()}
            direction={new Vector3(0, 1, 0)}
            specular={Color3.Green()}
            groundColor={Color3.Blue()}
        />;
    `;
    const code = execute(input)
    expect(code).toMatchSnapshot();
});

test('should transform a Reactylon component stored in a variable', () => {
    const input = `
        const Comp = 'mesh';
        <Comp />;
    `;
    const code = execute(input)
    expect(code).toMatchSnapshot();
});

test('should transform both Reactylon components', () => {
    const input = `
        isCondition ? <pointLight /> : <directionalLight />;
    `;
    const code = execute(input)
    expect(code).toMatchSnapshot();
});

test('should transform multiple Reactylon components', () => {
    const input = `
        <>
            <standardMaterial name='material'>
                <texture url='texture-url' />
            </standardMaterial>
            <box />
            <sphere />
            <plane />
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
        </>
    `;
    const code = execute(input)
    expect(code).toMatchSnapshot();
});

test('should ignore a React component', () => {
    const input = `
        <MyComponent />;
    `;
    const code = execute(input)
    expect(code).toMatchSnapshot();
});

test('should transform Reactylon components and ignore React component', () => {
    const input = `
         <>
            <standardMaterial name='material'>
                <texture url='texture-url' />
            </standardMaterial>
            <box name='box' />
            <pointLight 
                name='point'
                position={new Vector3(0, 1, 0)}
                diffuse={Color3.Red()}
                specular={Color3.Green()}
            />
            <MyComponent name='name' key='key' age={0} />
            <directionalLight
                name='directional'
                direction={new Vector3(0, -1, 0)}
                diffuse={Color3.Red()}
                specular={Color3.Green()}
            />
        </>;
    `;
    const code = execute(input)
    expect(code).toMatchSnapshot();
});


test('should add JSX-element side effect', () => {
    const input = `
        <>
            <sound />
        </>;
    `;
    const code = execute(input)
    expect(code).toMatchSnapshot();
});

test('should add only one JSX-element side effect (no duplicates)', () => {
    const input = `
        <>
            <sound />
            <sound />
        </>;
    `;
    const code = execute(input)
    expect(code).toMatchSnapshot();
});

test('should add implicit prototype-based side effect', () => {
    const input = `
        const Component = () => {

            const scene = useScene();

            useEffect(() => {
                scene.createDefaultCameraOrLight(); 
            }, []);

            return null;
        }
        
    `;
    const code = execute(input)
    expect(code).toMatchSnapshot();
});

test('should add only one implicit prototype-based side effect (no duplicates)', () => {
    const input = `
        const Component = () => {

            const scene = useScene();

            useEffect(() => {
                scene.createDefaultCameraOrLight(); 
                scene.createDefaultCameraOrLight(); 
            }, []);

            return null;
        }
        
    `;
    const code = execute(input)
    expect(code).toMatchSnapshot();
});

test('should add both JSX-element and implicit prototype-based side effect', () => {
    const input = `
        const Component = () => {

            const scene = useScene();

            useEffect(() => {
                scene.createDefaultCameraOrLight(); 
            }, []);

            return (
                <>
                    <sound />
                </>
            );
        }
        
    `;
    const code = execute(input)
    expect(code).toMatchSnapshot();
});


test('should add constructor-based side effect', () => {
    const input = `
        const Component = () => {
            useEffect(() => {
                const shadowGenerator = new ShadowGenerator();
            }, []);
            return null;
        }
        
    `;
    const code = execute(input)
    expect(code).toMatchSnapshot();
});

test('should add JSX-prop and JSX-element side effect', () => {
    const input = `
        <Engine isMultipleCanvas>
            <Scene physicsOptions={{}}>
                <sound />
                <box checkCollisions showBoundingBox />
                <highlightLayer />
            </Scene>
        </Engine>        
    `;
    const code = execute(input)
    expect(code).toMatchSnapshot();
});

// Side effects every Reactylon scene relies on (see REACTYLON_SCENE_SIDE_EFFECTS in index.ts)
const STANDARD_MATERIAL_SIDE_EFFECT = 'import "@babylonjs/core/Materials/standardMaterial";';
const RAY_SIDE_EFFECT = 'import "@babylonjs/core/Culling/ray";';

test('should add scene side effects to a file with Reactylon JSX', () => {
    const input = `
        <box name='box' />;
    `;
    const code = execute(input)
    expect(code).toContain(STANDARD_MATERIAL_SIDE_EFFECT);
    expect(code).toContain(RAY_SIDE_EFFECT);
});

test('should add scene side effects to a file importing Reactylon that creates meshes imperatively', () => {
    const input = `
        import { Engine } from 'reactylon/web';
        import { Scene } from 'reactylon';
        import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
        <Engine>
            <Scene onSceneReady={(scene) => CreateBox('box', {}, scene)} />
        </Engine>;
    `;
    const code = execute(input)
    expect(code).toContain(STANDARD_MATERIAL_SIDE_EFFECT);
    expect(code).toContain(RAY_SIDE_EFFECT);
});

test('should add scene side effects when Reactylon components are aliased', () => {
    const input = `
        import { Engine as BabylonEngine } from 'reactylon/web';
        <BabylonEngine />;
    `;
    const code = execute(input)
    expect(code).toContain(STANDARD_MATERIAL_SIDE_EFFECT);
    expect(code).toContain(RAY_SIDE_EFFECT);
});

test('should add scene side effects only once', () => {
    const input = `
        <>
            <box />
            <sphere />
        </>;
    `;
    const code = execute(input)
    expect(code.split(STANDARD_MATERIAL_SIDE_EFFECT)).toHaveLength(2);
    expect(code.split(RAY_SIDE_EFFECT)).toHaveLength(2);
});

test('should not add scene side effects to a plain React file', () => {
    const input = `
        import { useState } from 'react';
        <MyComponent />;
    `;
    const code = execute(input)
    expect(code).not.toContain(STANDARD_MATERIAL_SIDE_EFFECT);
    expect(code).not.toContain(RAY_SIDE_EFFECT);
});

test('should not add scene side effects for type-only Reactylon imports', () => {
    const input = `
        import type { SceneProps } from 'reactylon';
        export const props: SceneProps = {};
    `;
    const code = transform(input, { plugins: [ReactylonBabelPlugin], parserOpts: { plugins: ['typescript'] } })!.code!
    expect(code).not.toContain(STANDARD_MATERIAL_SIDE_EFFECT);
    expect(code).not.toContain(RAY_SIDE_EFFECT);
});

const INSTANCED_MESH_SIDE_EFFECT = 'import "@babylonjs/core/Meshes/instancedMesh";';

test('should add InstancedMesh side effect for the instanceFrom prop', () => {
    const input = `
        <>
            <box name='box' />
            <box name='instanced-box' instanceFrom='box' />
        </>;
    `;
    const code = execute(input)
    expect(code).toContain(INSTANCED_MESH_SIDE_EFFECT);
});

test('should add InstancedMesh side effect for createInstance calls', () => {
    const input = `
        const instance = mesh.createInstance('instance');
    `;
    const code = execute(input)
    expect(code).toContain(INSTANCED_MESH_SIDE_EFFECT);
});

test('should add physics side effect for physicsOptions passed as an object property', () => {
    const input = `
        React.cloneElement(child, { physicsOptions: { plugin } });
    `;
    const code = execute(input)
    expect(code).toContain('import "@babylonjs/core/Physics/joinedPhysicsEngineComponent";');
    expect(code).toContain('import "@babylonjs/core/Physics/v2/physicsEngineComponent";');
});
