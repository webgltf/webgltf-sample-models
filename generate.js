import fs from 'fs/promises';
import fetch from 'node-fetch';
import { promisify } from 'util';
import g from 'glob';

const glob = promisify(g);

const BASE_KHRONOS_SAMPLE_URL        = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/63f026b/2.0/';
const BASE_KHRONOS_SAMPLE_SOURCE_URL = 'https://github.com/KhronosGroup/glTF-Sample-Models/tree/63f026b/2.0/';
const BASE_SAMPLE_SOURCE_URL         = 'https://github.com/webgltf/webgltf-sample-models/tree/main/';

const khronosIndex = await fetch(`${BASE_KHRONOS_SAMPLE_URL}/model-index.json`).then(res => res.json());
const khronosSamples = khronosIndex.map((model) => {
    const variants = Object.fromEntries(Object.entries(model.variants).map(([name, file]) => {
        return [name, `./${model.name}/${name}/${file}`];
    }));

    const screenshot = `./${model.name}/${model.screenshot}`;
    const source = `./${model.name}`;
    return { ...model, screenshot, source, variants };
});

async function getDirectories(path) {
    return (await fs.readdir(path, { withFileTypes: true })).filter(file => file.isDirectory())
}

const modelDirs = await getDirectories('./models');
const samples   = await Promise.all(modelDirs.map(async dir => {
    const variantDirs = await getDirectories(`./models/${dir.name}`);
    const variants = Object.fromEntries(await Promise.all(variantDirs.map(async varDir => {
        return [varDir.name, await glob(`./models/${dir.name}/${varDir.name}/*.gl*`).then(([file]) => file)];
    })));
    const screenshot = await glob(`./models/${dir.name}/screenshot.*`).then(([file]) => file);
    const source = `./models/${dir.name}`;
    return { name: dir.name, screenshot, source, variants };
}));

console.log(`Generating ./index.js`);
const index = `/** WebGLTF Sample Models **/
const BASE_KHRONOS_SAMPLE_URL        = '${BASE_KHRONOS_SAMPLE_URL}';
const BASE_KHRONOS_SAMPLE_SOURCE_URL = '${BASE_KHRONOS_SAMPLE_SOURCE_URL}';
const BASE_SAMPLE_SOURCE_URL         = '${BASE_SAMPLE_SOURCE_URL}';

function link(path, root = import.meta.url) { return new URL(path, root).toString(); }

export default [
${khronosSamples.map(({ name, screenshot, source, variants }) => 
`    { 
        name: '${name}',
        group: 'Khronos',
        screenshot: link('${screenshot}', BASE_KHRONOS_SAMPLE_URL),
        source: link('${source}', BASE_KHRONOS_SAMPLE_SOURCE_URL),
        variants: {
${Object.entries(variants).map(([name, variant]) => 
`            '${name}': link('${variant}', BASE_KHRONOS_SAMPLE_URL),`).join('\n')}
        },
    },`).join('\n')}
${samples.map(({ name, screenshot, source, variants }) => 
`    { 
        name: '${name}',
        group: 'WebGLTF',
        screenshot: link('${screenshot}'),
        source: link('${source}', BASE_SAMPLE_SOURCE_URL),
        variants: {
${Object.entries(variants).map(([name, variant]) => 
`            '${name}': link('${variant}'),`).join('\n')}
        },
    },`).join('\n')}
];`;

await fs.writeFile(`./index.js`, index);







