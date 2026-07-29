# Image Converter (Conversor de Imagens)

Desktop app to convert images between modern formats, with preview, metadata, and estimated file size after conversion.

Built with **Electron**, **Vite**, **TypeScript**, and **Sharp**.

---

## Table of contents

- [Features](#features)
- [Supported formats](#supported-formats)
- [Requirements](#requirements)
- [Installation](#installation)
- [How to use](#how-to-use)
- [Development](#development)
- [Building the app](#building-the-app)
- [Project structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Features

- Select **multiple images** at once
- Preview of the selected image
- Convert to **WebP**, **PNG**, **JPEG**, **ICO**, and **SVG**
- **Quality** control (1–100%)
- Shows image **dimensions** (width × height)
- Shows current **file size**
- **Estimated size** after conversion (based on selected format and quality)
- Indicator of how much smaller/larger the file will be
- Progress bar during conversion
- Choose the output folder when converting

---

## Supported formats

### Input

| Extension | Format |
|-----------|--------|
| `.jpg` / `.jpeg` | JPEG |
| `.png` | PNG |
| `.gif` | GIF |
| `.webp` | WebP |
| `.avif` | AVIF |
| `.tiff` / `.tif` | TIFF |
| `.bmp` | BMP |

### Output

| Format | Notes |
|--------|-------|
| **WebP** | Good balance between quality and size |
| **PNG** | Near-lossless; quality adjusts compression |
| **JPEG** | Ideal for photos; quality heavily affects size |
| **ICO** | Useful for icons (multiple internal sizes) |
| **SVG** | Generates an SVG with the image embedded as PNG base64 |

---

## Requirements

- **Node.js** 18+ (20 or 22 recommended)
- **npm** 9+
- macOS (Apple Silicon or Intel), Windows, and/or Linux for native builds

---

## Installation

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd image-conversor
npm install
```

---

## How to use

### 1. Open the app

In development:

```bash
npm start
```

Or open the packaged app (`Conversor de Imagens.app` on macOS / Windows installer).

### 2. Select images

1. Click **Selecionar imagens** (Select images)
2. Choose one or more files
3. Images appear in the list on the left
4. Click an item to preview it

### 3. Check image info

In the preview panel you will see:

| Field | Meaning |
|-------|---------|
| **Dimensões** | Width × height in pixels |
| **Peso atual** | Original file size |
| **Após conversão** | Real estimate with the current format/quality |
| *(green label)* | How much smaller/larger it will be (e.g. `72% menor`) |

The list also shows a quick summary, for example: `1920×1080 · 2.4 MB`.

### 4. Choose format and quality

1. Under **Formato**, select the desired output (WebP, PNG, JPEG, ICO, or SVG)
2. Adjust the **Qualidade** slider (1–100%)
3. The size estimate is recalculated automatically

Quick tips:

- **WebP ~80–90%** — solid default for the web
- **JPEG ~75–85%** — good balance for photos
- **PNG** — when you need transparency / less loss
- **ICO** — app/site icons
- **SVG** — when you need a vector container with an embedded bitmap (file tends to get larger)

### 5. Convert

1. Click **Converter**
2. Choose the folder where files should be saved
3. Wait for the progress bar
4. Output files keep the original name with the new extension  
   Example: `photo.png` → `photo.webp`

---

## Development

| Command | Description |
|---------|-------------|
| `npm start` | Start the app in development mode |
| `npm run lint` | Run ESLint |
| `npm run package` | Package the app without installer/zip |
| `npm run make` | Build artifacts for the current platform |
| `npm run make:mac` | Build macOS arm64 |
| `npm run make:win` | Build Windows x64 (on Windows) |
| `npm run make:linux` | Build Linux x64 (on Linux) |

Main stack:

- Electron Forge + Vite plugin
- Sharp (image processing)
- sharp-ico (ICO output)

---

## Building the app

### macOS

On Mac (Apple Silicon):

```bash
npm run make:mac
```

**Typical outputs:**

| Artifact | Path |
|----------|------|
| App | `out/Conversor de Imagens-darwin-arm64/Conversor de Imagens.app` |
| ZIP | `out/make/zip/darwin/arm64/Conversor de Imagens-darwin-arm64-1.0.0.zip` |

To install: unzip if needed, then move `Conversor de Imagens.app` to `/Applications`.

> On first open, macOS may ask for confirmation under **Settings → Privacy & Security** if the app is not signed.

### Windows

The **Squirrel** installer must be built **on a Windows machine** (physical, VM, or CI such as GitHub Actions).

```bash
npm run make:win
```

This produces a **Windows x64** build.

**Typical output:**

```text
out/make/squirrel.windows/x64/
```

> Cross-compiling from macOS is not reliable for MakerSquirrel. Use a local Windows machine or a Windows CI runner.

### Linux

On a Linux machine (x64):

```bash
npm run make:linux
```

Produces:

| Artifact | Typical path |
|----------|--------------|
| `.deb` (Debian/Ubuntu) | `out/make/deb/x64/` |
| `.rpm` (Fedora/RHEL) | `out/make/rpm/x64/` |
| `.zip` (portable) | `out/make/zip/linux/x64/` |

Useful host dependencies:

```bash
sudo apt-get install -y fakeroot dpkg rpm
```

### GitHub Actions (all platforms)

The repository includes [`.github/workflows/build.yml`](.github/workflows/build.yml), which builds:

| Artifact | Runner |
|----------|--------|
| macOS arm64 (ZIP) | `macos-14` |
| Windows x64 (Squirrel) | `windows-latest` |
| Linux x64 (DEB + RPM + ZIP) | `ubuntu-latest` |

**How to trigger:**

1. **Push to `main`** — builds all platforms and uploads workflow **Artifacts** (14 days)
2. **Manual:** Actions → **Build** → **Run workflow** (select `main`)
3. **Tag `v*`** — builds all platforms, then creates/updates a **GitHub Release** and attaches the binaries:
   ```bash
   git checkout main
   git pull
   git tag v1.0.0
   git push origin v1.0.0
   ```

> The Release job runs only after all build jobs finish successfully.

> Unsigned macOS builds may require allowing the app under **Privacy & Security** on first launch.

---

## Project structure

```text
image-conversor/
├── src/
│   ├── main.ts          # Main process (dialogs, Sharp, IPC)
│   ├── preload.ts       # Secure bridge to the renderer
│   ├── renderer.ts      # UI and app flow
│   └── index.css        # Styles
├── forge.config.ts      # Electron Forge packaging
├── index.html
├── package.json
└── vite.*.config.ts
```

High-level flow:

1. UI (`renderer`) calls APIs exposed by `preload`
2. `main` reads/writes files and processes them with Sharp
3. Progress and estimates return via IPC

---

## Troubleshooting

### App won’t open / module error (`Cannot find module ...`)

Rebuild after `npm install`:

```bash
rm -rf out
npm run make:mac   # or make:win on Windows / make:linux on Linux
```

Packaging copies the Sharp dependency tree (`sharp`, `sharp-ico`, and transitive deps) into the app.

### Estimate is slow on large images

The estimate runs a real in-memory conversion (without saving the final file). Very large images can take a few seconds — this is expected.

### Windows build produces macOS / arm64

Make sure you are using the corrected scripts:

```bash
npm run make:win
# equivalent to: electron-forge make --platform=win32 --arch=x64
```

Avoid a bare `--` before flags (`make -- --platform=...`), because Forge may ignore `platform`/`arch` and fall back to the host.

### Quality barely affects PNG

For PNG, the slider controls the **compression level**, not lossy “quality” like JPEG/WebP. Size differences are usually smaller.

---

## License

MIT © André Barros
