import { transform } from '@babel/core';
import ReactylonBabelPlugin from './index.ts';

function execute(code: string): string {
    return transform(code.replace(/\s+/g, ' '), { plugins: [ReactylonBabelPlugin] })!.code!
}

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

test('should transform Reactylon components and ingore React component', () => {
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
