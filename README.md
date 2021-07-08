# WebGLTF Sample Models

This repository is a mainly used to aggergate models for demonstration purposes with WebGLTF.

It contains scripts to automatically generate a model index in ESM format from the models here as well as from the [glTF-Sample-Models](https://github.com/KhronosGroup/glTF-Sample-Models) project.

### To generate model index

```
npm install
npm run generate
```

## Environments

The environments folder contains another script to generate IBL textures using the [glTF-IBL-Sampler](https://github.com/KhronosGroup/glTF-IBL-Sampler) from HDRIs provided by [polyhaven](https://polyhaven.com).

### To generate environment textures and index

#### Download and build glTF-IBL-Sampler

```
git clone https://github.com/KhronosGroup/glTF-IBL-Sampler -b libktx
cd glTF-IBL-Sampler
```

Update `.gitmodules` to use url `https://github.com/KhronosGroup/KTX-Software` and branch `-v4.0.0` for `[submodule "thirdparty/KTX-Software"]`

```
git submodule update --init --recursive
cmake -B build .
cmake --build build --config Release
```

* If you have an issue with `C:\Windows\System32\bash.exe` not being recoginized, this is due to Visual Studio being a 32 bit program while cmake finds the 64 bit version of bash.
To correct this, you can tell cmake to use git bash instead.

```
$Env:BASH_ROOT="C:/Program Files (x86)/Git/bin/"
cmake -B build .
cmake --build build --config Release
```

#### Generate KTX2 textures and index

```
$ENV:SAMPLER_CLI="<path to glTF-IBL-Sampler>\build\Release\cli.exe" npm run generate:environments
```