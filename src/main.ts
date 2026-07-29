import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';

const sharpPath = app.isPackaged
  ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'sharp')
  : 'sharp';
const icoPath = app.isPackaged
  ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'sharp-ico')
  : 'sharp-ico';

const sharp = (() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(sharpPath);
})() as typeof import('sharp');
const ico = (() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(icoPath);
})() as typeof import('sharp-ico');

if (started) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 720,
    minWidth: 700,
    minHeight: 500,
    title: 'Conversor de Imagens',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }
};

ipcMain.handle('select-images', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: 'Images',
        extensions: [
          'jpg',
          'jpeg',
          'png',
          'gif',
          'webp',
          'avif',
          'tiff',
          'bmp',
        ],
      },
    ],
  });
  return result.canceled ? [] : result.filePaths;
});

type OutputFormat = 'webp' | 'png' | 'jpeg' | 'ico' | 'svg';

ipcMain.handle('get-image-info', async (_, filePath: string) => {
  try {
    const [stat, meta] = await Promise.all([
      fs.promises.stat(filePath),
      sharp(filePath).metadata(),
    ]);
    return {
      width: meta.width ?? 0,
      height: meta.height ?? 0,
      size: stat.size,
    };
  } catch {
    return null;
  }
});

ipcMain.handle(
  'estimate-output',
  async (
    _,
    options: { filePath: string; format: OutputFormat; quality: number },
  ) => {
    const { filePath, format, quality } = options;
    try {
      if (format === 'ico') {
        const tmp = path.join(
          app.getPath('temp'),
          `conversor-estimate-${Date.now()}.ico`,
        );
        try {
          await ico.sharpsToIco([sharp(filePath)], tmp, {
            sizes: 'default',
            resizeOptions: {},
          });
          const stat = await fs.promises.stat(tmp);
          return { size: stat.size };
        } finally {
          await fs.promises.unlink(tmp).catch(() => undefined);
        }
      }

      if (format === 'svg') {
        const img = sharp(filePath);
        const { width, height } = await img.metadata();
        const w = width && width > 0 ? width : 1;
        const h = height && height > 0 ? height : 1;
        const buffer = await img.png().toBuffer();
        const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <image width="${w}" height="${h}" xlink:href="data:image/png;base64,${buffer.toString('base64')}"/>
</svg>`;
        return { size: Buffer.byteLength(svg, 'utf-8') };
      }

      let pipeline = sharp(filePath);
      if (format === 'webp') {
        pipeline = pipeline.webp({ quality });
      } else if (format === 'jpeg') {
        pipeline = pipeline.jpeg({ quality });
      } else {
        pipeline = pipeline.png({
          compressionLevel: Math.min(9, Math.round((100 - quality) / 10)),
        });
      }
      const buffer = await pipeline.toBuffer();
      return { size: buffer.length };
    } catch {
      return null;
    }
  },
);

ipcMain.handle('get-preview', async (_, filePath: string) => {
  try {
    const buffer = await fs.promises.readFile(filePath);
    const base64 = buffer.toString('base64');
    const ext = path.extname(filePath).toLowerCase();
    const mime =
      ext === '.png'
        ? 'image/png'
        : ext === '.gif'
          ? 'image/gif'
          : ext === '.webp'
            ? 'image/webp'
            : ext === '.avif'
              ? 'image/avif'
              : ext === '.tiff' || ext === '.tif'
                ? 'image/tiff'
                : 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
});

ipcMain.handle(
  'convert-images',
  async (
    event,
    options: {
      filePaths: string[];
      format: OutputFormat;
      quality: number;
      outputDir: string | null;
    },
  ) => {
    const { format, quality, outputDir } = options;
    const filePaths = (options.filePaths ?? []).filter(
      (p): p is string => typeof p === 'string' && p.length > 0,
    );
    const total = filePaths.length;
    const results: { path: string; success: boolean; error?: string }[] = [];

    const sendProgress = (current: number) => {
      event.sender.send('conversion-progress', { current, total });
    };

    for (const filePath of filePaths) {
      if (typeof filePath !== 'string' || filePath.length === 0) {
        results.push({
          path: '',
          success: false,
          error: 'Caminho inválido',
        });
        sendProgress(results.length);
        continue;
      }
      try {
        const name = path.basename(filePath, path.extname(filePath));
        const dir =
          typeof outputDir === 'string' && outputDir.length > 0
            ? outputDir
            : path.dirname(filePath);
        const outPath = path.join(dir, `${name}.${format}`);

        if (format === 'ico') {
          const sharpInstance = sharp(filePath);
          await ico.sharpsToIco([sharpInstance], outPath, {
            sizes: 'default',
            resizeOptions: {},
          });
        } else if (format === 'svg') {
          const img = sharp(filePath);
          const { width, height } = await img.metadata();
          const w = width && width > 0 ? width : 1;
          const h = height && height > 0 ? height : 1;
          const buffer = await img.png().toBuffer();
          const base64 = buffer.toString('base64');
          const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <image width="${w}" height="${h}" xlink:href="data:image/png;base64,${base64}"/>
</svg>`;
          await fs.promises.writeFile(outPath, svg, 'utf-8');
        } else {
          let pipeline = sharp(filePath);
          if (format === 'webp') {
            pipeline = pipeline.webp({ quality });
          } else if (format === 'jpeg') {
            pipeline = pipeline.jpeg({ quality });
          } else {
            pipeline = pipeline.png({
              compressionLevel: Math.min(9, Math.round((100 - quality) / 10)),
            });
          }
          await pipeline.toFile(outPath);
        }
        results.push({ path: outPath, success: true });
      } catch (err) {
        results.push({
          path: filePath,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      sendProgress(results.length);
    }

    return results;
  },
);

ipcMain.handle('choose-output-dir', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
