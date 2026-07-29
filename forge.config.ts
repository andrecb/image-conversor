import path from 'node:path';
import fs from 'node:fs';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const copyPackage = async (src: string, dest: string) => {
  await fs.promises.access(src);
  await fs.promises.cp(src, dest, { recursive: true });
};

const packageDir = (nodeModules: string, name: string) =>
  name.startsWith('@')
    ? path.join(nodeModules, ...name.split('/'))
    : path.join(nodeModules, name);

const readPackageJson = async (dir: string) => {
  const raw = await fs.promises.readFile(path.join(dir, 'package.json'), 'utf8');
  return JSON.parse(raw) as {
    dependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  };
};

const collectDependencyTree = async (
  nodeModules: string,
  roots: string[],
): Promise<string[]> => {
  const seen = new Set<string>();
  const queue = [...roots];

  while (queue.length > 0) {
    const name = queue.pop()!;
    if (seen.has(name)) continue;
    seen.add(name);

    const dir = packageDir(nodeModules, name);
    try {
      const pkg = await readPackageJson(dir);
      for (const dep of Object.keys({
        ...pkg.dependencies,
        ...pkg.optionalDependencies,
      })) {
        queue.push(dep);
      }
    } catch {
      // pacote opcional / plataforma diferente
    }
  }

  return [...seen];
};

const copyNativeModules = async (buildPath: string) => {
  const projectNodeModules = path.join(process.cwd(), 'node_modules');
  const destNodeModules = path.join(buildPath, 'node_modules');
  await fs.promises.mkdir(destNodeModules, { recursive: true });

  const packages = await collectDependencyTree(projectNodeModules, [
    'sharp',
    'sharp-ico',
  ]);

  for (const name of packages) {
    const src = packageDir(projectNodeModules, name);
    const dest = packageDir(destNodeModules, name);
    try {
      await fs.promises.mkdir(path.dirname(dest), { recursive: true });
      await copyPackage(src, dest);
    } catch {
      // optional / cross-platform packages podem não existir
    }
  }
};

const APP_DISPLAY_NAME = 'Conversor de Imagens';
const APP_EXECUTABLE_NAME = 'image-conversor';

const fixMacDisplayName = async (appPath: string) => {
  const plistPath = path.join(appPath, 'Contents', 'Info.plist');
  try {
    let plist = await fs.promises.readFile(plistPath, 'utf8');
    plist = plist.replace(
      /(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/,
      `$1${APP_DISPLAY_NAME}$2`,
    );
    plist = plist.replace(
      /(<key>CFBundleName<\/key>\s*<string>)[^<]*(<\/string>)/,
      `$1${APP_DISPLAY_NAME}$2`,
    );
    await fs.promises.writeFile(plistPath, plist);
  } catch {
    // Info.plist may not exist yet for non-mac builds
  }
};

const config: ForgeConfig = {
  packagerConfig: {
    name: APP_DISPLAY_NAME,
    executableName: APP_EXECUTABLE_NAME,
    asar: {
      unpack: '{**/node_modules/**/*,**/*.node}',
    },
    afterComplete: [
      (buildPath, _electronVersion, platform, _arch, done) => {
        (async () => {
          if (platform !== 'darwin') return;
          const appPath = buildPath.endsWith('.app')
            ? buildPath
            : path.join(buildPath, `${APP_DISPLAY_NAME}.app`);
          await fixMacDisplayName(appPath);
        })()
          .then(() => done())
          .catch((err) => done(err));
      },
    ],
  },
  rebuildConfig: {
    onlyModules: [],
  },
  hooks: {
    packageAfterCopy: async (_config, buildPath) => {
      await copyNativeModules(buildPath);
    },
  },
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin', 'linux']),
    new MakerRpm({
      options: {
        name: APP_EXECUTABLE_NAME,
        bin: APP_EXECUTABLE_NAME,
        productName: APP_DISPLAY_NAME,
      },
    }),
    new MakerDeb({
      options: {
        name: APP_EXECUTABLE_NAME,
        bin: APP_EXECUTABLE_NAME,
        productName: APP_DISPLAY_NAME,
      },
    }),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        {
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
};

export default config;
