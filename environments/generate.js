import fs from 'fs/promises';
import fetch from 'node-fetch';
import { dirname }  from 'path';
import { fileURLToPath } from 'url';

import util from 'util';
import child_process from 'child_process';

const exec = util.promisify(child_process.exec);

process.chdir(dirname(fileURLToPath(import.meta.url)));

const environments = [
    { name: 'Chinese Garden',                 path: 'chinese_garden' },
    { name: 'Fireplace',                      path: 'fireplace' },
    { name: 'Goegap',                         path: 'goegap' },
    { name: 'Green Sanctuary',                path: 'green_sanctuary' },
    { name: 'Large Corridor',                 path: 'large_corridor'},
    { name: 'Leadenhall Market',              path: 'leadenhall_market' },
    { name: 'Lebombo',                        path: 'lebombo' },
    { name: 'Lilienstein',                    path: 'lilienstein' },
    { name: 'Music Hall 01',                  path: 'music_hall_01' },
    { name: 'Preller Drive',                  path: 'preller_drive' },
    { name: 'Quattro Canti',                  path: 'quattro_canti' },
    { name: 'Round Platform',                 path: 'round_platform' },
    { name: 'Royal Esplanade',                path: 'royal_esplanade' },
    { name: 'Studio Small 02',                path: 'studio_small_02' },
];

const resolutions = [256, 512];

const iblOptions = `-lodBias 0 -mipLevelCount 5 -targetFormat R8G8B8A8_UNORM`;

const template = await fs.readFile('./template.gltf', { encoding: 'utf-8' });

async function downloadFile(url, dest) {
    try {
        await fs.access(dest);
        console.log('File already exists', dest);
    } catch (e) {
        console.log('Downloading', url);
        await fs.writeFile(dest, await fetch(url).then(res => res.buffer()));
    }
};

async function generateReadme(name, path) {
    const dest = `./${path}/README.md`;
    console.log(`Generating ${dest}`);
    const contents = `# ${name}

The image for this texture is provided by [polyhaven](https://polyhaven.com/a/${path}).

![image info](./${path}.png)`;

    await fs.writeFile(dest, contents);
}

async function generateGLTF(path, res) {
    const dest = `./${path}/${path}_${res}.gltf`;
    console.log(`Generating ${dest}`);
    return fs.writeFile(dest, template.replaceAll('${res}', res));
}

async function generateLambertian(path, res) {
    const dest = `./${path}/diffuse_${res}.ktx2`;
    console.log(`Generating ${dest}`);
    const { stderr } = await exec(`${process.env.SAMPLER_CLI} -inputPath ./${path}/${path}.hdr -distribution Lambertian -outCubeMap ${dest} -cubeMapResolution ${res} ${iblOptions}`, { shell: true });
    if (stderr) {
        console.error(stderr);
        throw Error('Error trying to generate Lambertian KTX2');
    }

    await fs.rm('./outputLUT.png');
}

async function generateGGX(path, res) {
    const dest = `./${path}/specular_${res}.ktx2`;
    console.log(`Generating ${dest}`);
    const { stderr } = await exec(`${process.env.SAMPLER_CLI}  -inputPath ./${path}/${path}.hdr -distribution GGX -outCubeMap ${dest} -outLUT ./lut_ggx_${res}.png -cubeMapResolution ${res} ${iblOptions}`, { shell: true });
    if (stderr) {
        console.error(stderr);
        throw Error('Error trying to generate Lambertian KTX2');
    }
}

async function generateCharlie(path, res) {
    const dest = `./${path}/sheen_${res}.ktx2`;
    console.log(`Generating ${dest}`);
    const { stderr } = await exec(`${process.env.SAMPLER_CLI} -inputPath ./${path}/${path}.hdr -distribution Charlie -outCubeMap ${dest} -lodBias 0 -outLUT ./lut_charlie_${res}.png -cubeMapResolution ${res} ${iblOptions}`, { shell: true });
    if (stderr) {
        console.error(stderr);
        throw Error('Error trying to generate Lambertian KTX2');
    }
}


await Promise.all(environments.map(async ({ name, path }) => {
    await fs.mkdir(`./${path}`, { recursive: true });
    await Promise.all([
        downloadFile(`https://dl.polyhaven.com/file/ph-assets/HDRIs/hdr/2k/${path}_2k.hdr`, `./${path}/${path}.hdr`),
        downloadFile(`https://cdn.polyhaven.com/asset_img/primary/${path}.png?height=780`, `./${path}/${path}.png`),
        generateReadme(name, path),
    ]);
}));

const entries = [];
for (const res of resolutions) {
    for (const { name, path } of environments) {
        entries.push({ name, path, res });
        // We should do this sequentially to avoid overloading the GPU
        await generateLambertian(path, res);
        await generateGGX(path, res);
        await generateCharlie(path, res);
        await generateGLTF(path, res);
    }
}

console.log(`Generating ./index.js`);
const index = `function link(path, root = import.meta.url) { return new URL(path, root).toString(); }

export default [
${entries.map(({ name, path, res }) => 
`    { 
        name: '${name}', source: 'https://polyhaven.com/a/${path}', res: ${res},
        gltf: link('./${path}/${path}_${res}.gltf'),
        screenshot: link('./${path}/${path}.png'),
    },`).join('\n')}
];`;

await fs.writeFile(`./index.js`, index);







