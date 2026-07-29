# Conversor de Imagens

Aplicativo desktop para converter imagens entre formatos modernos, com preview, metadados e estimativa de peso após a conversão.

Construído com **Electron**, **Vite**, **TypeScript** e **Sharp**.

---

## Sumário

- [Funcionalidades](#funcionalidades)
- [Formatos suportados](#formatos-suportados)
- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Como usar](#como-usar)
- [Desenvolvimento](#desenvolvimento)
- [Gerar o aplicativo](#gerar-o-aplicativo)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Solução de problemas](#solução-de-problemas)
- [Licença](#licença)

---

## Funcionalidades

- Seleção de **múltiplas imagens** de uma vez
- Preview da imagem selecionada
- Conversão para **WebP**, **PNG**, **JPEG**, **ICO** e **SVG**
- Controle de **qualidade** (1–100%)
- Exibição de **dimensões** (largura × altura)
- Exibição do **peso atual** do arquivo
- **Estimativa do peso** após a conversão (com base no formato e na qualidade escolhidos)
- Indicador de quanto a imagem ficará menor/maior
- Barra de progresso durante a conversão
- Escolha da pasta de destino na hora de converter

---

## Formatos suportados

### Entrada

| Extensão | Formato |
|----------|--------|
| `.jpg` / `.jpeg` | JPEG |
| `.png` | PNG |
| `.gif` | GIF |
| `.webp` | WebP |
| `.avif` | AVIF |
| `.tiff` / `.tif` | TIFF |
| `.bmp` | BMP |

### Saída

| Formato | Observação |
|--------|------------|
| **WebP** | Bom equilíbrio entre qualidade e tamanho |
| **PNG** | Sem perda perceptível; qualidade ajusta a compressão |
| **JPEG** | Ideal para fotos; qualidade influencia bastante o peso |
| **ICO** | Útil para ícones (vários tamanhos internos) |
| **SVG** | Gera SVG com a imagem embutida em PNG base64 |

---

## Requisitos

- **Node.js** 18+ (recomendado 20 ou 22)
- **npm** 9+
- macOS (Apple Silicon ou Intel), Windows e/ou Linux para builds nativos

---

## Instalação

Clone o repositório e instale as dependências:

```bash
git clone <url-do-repositorio>
cd image-conversor
npm install
```

---

## Como usar

### 1. Abrir o app

Em desenvolvimento:

```bash
npm start
```

Ou abra o app empacotado (`Conversor de Imagens.app` no macOS / instalador no Windows).

### 2. Selecionar imagens

1. Clique em **Selecionar imagens**
2. Escolha um ou mais arquivos
3. As imagens aparecem na lista à esquerda
4. Clique em um item para ver o preview

### 3. Conferir informações

No painel de preview você verá:

| Campo | Significado |
|-------|-------------|
| **Dimensões** | Largura × altura em pixels |
| **Peso atual** | Tamanho do arquivo original |
| **Após conversão** | Estimativa real com o formato/qualidade atuais |
| *(rótulo verde)* | Quanto menor/maior ficará (ex.: `72% menor`) |

Na lista também aparece um resumo rápido, por exemplo: `1920×1080 · 2.4 MB`.

### 4. Escolher formato e qualidade

1. Em **Formato**, selecione a saída desejada (WebP, PNG, JPEG, ICO ou SVG)
2. Ajuste o slider de **Qualidade** (1–100%)
3. A estimativa de peso é recalculada automaticamente

Dicas rápidas:

- **WebP ~80–90%** — boa escolha geral para web
- **JPEG ~75–85%** — fotos com bom equilíbrio
- **PNG** — quando precisar de transparência / menos perda
- **ICO** — ícones de app/site
- **SVG** — quando precisar de um container vetorial com bitmap embutido (o arquivo tende a ficar maior)

### 5. Converter

1. Clique em **Converter**
2. Escolha a pasta onde salvar os arquivos
3. Aguarde a barra de progresso
4. Os arquivos gerados usam o mesmo nome da original, com a nova extensão  
   Ex.: `foto.png` → `foto.webp`

---

## Desenvolvimento

| Comando | Descrição |
|---------|-----------|
| `npm start` | Sobe o app em modo desenvolvimento |
| `npm run lint` | Roda o ESLint |
| `npm run package` | Empacota o app sem gerar instalador/zip |
| `npm run make` | Gera o artefato para a plataforma atual |
| `npm run make:mac` | Build macOS arm64 |
| `npm run make:mac:universal` | Build macOS universal |
| `npm run make:win` | Build Windows x64 (em Windows) |
| `npm run make:linux` | Build Linux x64 (em Linux) |

Stack principal:

- Electron Forge + plugin Vite
- Sharp (processamento de imagens)
- sharp-ico (saída ICO)

---

## Gerar o aplicativo

### macOS

No Mac (Apple Silicon):

```bash
npm run make:mac
```

Universal (Intel + Apple Silicon):

```bash
npm run make:mac:universal
```

**Saídas típicas:**

| Artefato | Caminho |
|----------|---------|
| App | `out/Conversor de Imagens-darwin-arm64/Conversor de Imagens.app` |
| ZIP | `out/make/zip/darwin/arm64/Conversor de Imagens-darwin-arm64-1.0.0.zip` |

Para instalar: descompacte o ZIP (se necessário) e mova `Conversor de Imagens.app` para `/Applications`.

> Na primeira abertura, o macOS pode pedir confirmação em **Ajustes → Privacidade e Segurança**, caso o app não esteja assinado.

### Windows

O instalador **Squirrel** precisa ser gerado **em uma máquina Windows** (física, VM ou CI como GitHub Actions).

```bash
npm run make:win
```

Isso gera o build **Windows x64**.

**Saída típica:**

```text
out/make/squirrel.windows/x64/
```

> Cross-compile a partir do macOS não é confiável para o MakerSquirrel. Use Windows local ou um runner Windows na CI.

### Linux

Em uma máquina Linux (x64):

```bash
npm run make:linux
```

Gera:

| Artefato | Caminho típico |
|----------|----------------|
| `.deb` (Debian/Ubuntu) | `out/make/deb/x64/` |
| `.rpm` (Fedora/RHEL) | `out/make/rpm/x64/` |
| `.zip` (portátil) | `out/make/zip/linux/x64/` |

Dependências úteis no host:

```bash
sudo apt-get install -y fakeroot dpkg rpm
```

### GitHub Actions (todas as versões)

O repositório inclui o workflow [`.github/workflows/build.yml`](.github/workflows/build.yml), que gera:

| Artefato | Runner |
|----------|--------|
| macOS arm64 (ZIP) | `macos-14` |
| macOS universal (ZIP) | `macos-14` |
| Windows x64 (Squirrel) | `windows-latest` |
| Linux x64 (DEB + RPM + ZIP) | `ubuntu-latest` |

**Como disparar:**

1. **Manual:** Actions → **Build** → **Run workflow**
2. **Por tag:**  
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```  
   Os arquivos são anexados automaticamente ao GitHub Release da tag `v*`.

Os artefatos também ficam disponíveis no próprio run (aba **Artifacts**), com retenção de 14 dias.

> Builds de macOS sem certificado de assinatura podem exigir liberação em **Privacidade e Segurança** na primeira abertura.

---

## Estrutura do projeto

```text
image-conversor/
├── src/
│   ├── main.ts          # Processo principal (diálogos, Sharp, IPC)
│   ├── preload.ts       # Bridge segura para o renderer
│   ├── renderer.ts      # Interface e fluxo da UI
│   └── index.css        # Estilos
├── forge.config.ts      # Empacotamento Electron Forge
├── index.html
├── package.json
└── vite.*.config.ts
```

Fluxo resumido:

1. UI (`renderer`) chama APIs expostas pelo `preload`
2. `main` lê/escreve arquivos e processa com Sharp
3. Progresso e estimativas voltam via IPC

---

## Solução de problemas

### App não abre / erro de módulo (`Cannot find module ...`)

Gere novamente o pacote após `npm install`:

```bash
rm -rf out
npm run make:mac   # ou make:win no Windows
```

O empacotamento copia a árvore de dependências do Sharp (`sharp`, `sharp-ico` e transitivas) para o app.

### Estimativa demora em imagens grandes

A estimativa faz uma conversão real em memória (sem salvar o arquivo final). Imagens muito grandes podem levar alguns segundos — isso é esperado.

### Build Windows gera macOS / arm64

Confirme que está usando os scripts corrigidos:

```bash
npm run make:win
# equivale a: electron-forge make --platform=win32 --arch=x64
```

Evite o `--` solto antes das flags (`make -- --platform=...`), pois o Forge pode ignorar `platform`/`arch` e usar o host.

### Qualidade não parece afetar PNG

No PNG, o slider controla o **nível de compressão**, não uma “qualidade com perda” como no JPEG/WebP. A variação de peso costuma ser menor.

---

## Licença

MIT © André Barros
