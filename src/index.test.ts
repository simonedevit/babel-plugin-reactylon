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