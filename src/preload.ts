import { contextBridge, ipcRenderer } from 'electron';

type Format = 'webp' | 'png' | 'jpeg' | 'ico' | 'svg';

contextBridge.exposeInMainWorld('imageConverter', {
  selectImages: () => ipcRenderer.invoke('select-images'),
  getPreview: (filePath: string) => ipcRenderer.invoke('get-preview', filePath),
  getImageInfo: (filePath: string) =>
    ipcRenderer.invoke('get-image-info', filePath) as Promise<{
      width: number;
      height: number;
      size: number;
    } | null>,
  estimateOutput: (options: {
    filePath: string;
    format: Format;
    quality: number;
  }) =>
    ipcRenderer.invoke('estimate-output', options) as Promise<{
      size: number;
    } | null>,
  chooseOutputDir: () => ipcRenderer.invoke('choose-output-dir'),
  convertImages: (options: {
    filePaths: string[];
    format: Format;
    quality: number;
    outputDir: string | null;
  }) => ipcRenderer.invoke('convert-images', options),
  onConversionProgress: (callback: (data: { current: number; total: number }) => void) => {
    const handler = (_: unknown, data: { current: number; total: number }) => callback(data);
    ipcRenderer.on('conversion-progress', handler);
    return () => ipcRenderer.removeListener('conversion-progress', handler);
  },
});
