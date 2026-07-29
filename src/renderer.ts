import './index.css';

type Format = 'webp' | 'png' | 'jpeg' | 'ico' | 'svg';

declare global {
  interface Window {
    imageConverter: {
      selectImages: () => Promise<string[]>;
      getPreview: (filePath: string) => Promise<string | null>;
      getImageInfo: (
        filePath: string,
      ) => Promise<{ width: number; height: number; size: number } | null>;
      estimateOutput: (options: {
        filePath: string;
        format: Format;
        quality: number;
      }) => Promise<{ size: number } | null>;
      chooseOutputDir: () => Promise<string | null>;
      convertImages: (options: {
        filePaths: string[];
        format: Format;
        quality: number;
        outputDir: string | null;
      }) => Promise<{ path: string; success: boolean; error?: string }[]>;
      onConversionProgress: (
        callback: (data: { current: number; total: number }) => void,
      ) => () => void;
    };
  }
}

interface ImageItem {
  path: string;
  name: string;
  preview: string | null;
  width: number | null;
  height: number | null;
  size: number | null;
  estimatedSize: number | null;
  estimating: boolean;
}

const state = {
  images: [] as ImageItem[],
  selectedIndex: 0,
  format: 'webp' as Format,
  quality: 85,
  converting: false,
  progress: 0,
  loadingPreviews: new Set<string>(),
};

let estimateToken = 0;
let qualityEstimateTimer: ReturnType<typeof setTimeout> | null = null;

function getFileName(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatSaving(original: number, estimated: number): string {
  if (original <= 0) return '';
  const ratio = ((original - estimated) / original) * 100;
  if (Math.abs(ratio) < 0.5) return 'sem mudança relevante';
  if (ratio > 0) return `${ratio.toFixed(0)}% menor`;
  return `${Math.abs(ratio).toFixed(0)}% maior`;
}

function updateMetaPanel() {
  const meta = document.getElementById('image-meta');
  if (!meta) return;
  const current = state.images[state.selectedIndex];
  if (!current) {
    meta.innerHTML = '';
    meta.classList.add('hidden');
    return;
  }

  meta.classList.remove('hidden');
  const dims =
    current.width && current.height
      ? `${current.width} × ${current.height} px`
      : '—';
  const weight = current.size != null ? formatBytes(current.size) : '—';
  let estimateLabel = 'Calculando...';
  let savingLabel = '';

  if (!current.estimating && current.estimatedSize != null && current.size != null) {
    estimateLabel = formatBytes(current.estimatedSize);
    savingLabel = formatSaving(current.size, current.estimatedSize);
  } else if (!current.estimating && current.estimatedSize == null) {
    estimateLabel = '—';
  }

  meta.innerHTML = `
    <div class="meta-item">
      <span class="meta-label">Dimensões</span>
      <span class="meta-value">${dims}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Peso atual</span>
      <span class="meta-value">${weight}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Após conversão</span>
      <span class="meta-value ${current.estimating ? 'meta-muted' : ''}">${estimateLabel}</span>
      ${savingLabel ? `<span class="meta-saving">${savingLabel}</span>` : ''}
    </div>
  `;
}

function updateListMeta(index: number) {
  const el = document.querySelector(`.list-item[data-index="${index}"] .list-item-meta`);
  const img = state.images[index];
  if (!el || !img) return;
  const parts: string[] = [];
  if (img.width && img.height) parts.push(`${img.width}×${img.height}`);
  if (img.size != null) parts.push(formatBytes(img.size));
  el.textContent = parts.join(' · ');
}

async function refreshEstimate(index = state.selectedIndex) {
  const img = state.images[index];
  if (!img) return;

  const token = ++estimateToken;
  img.estimating = true;
  img.estimatedSize = null;
  if (index === state.selectedIndex) updateMetaPanel();

  const result = await window.imageConverter.estimateOutput({
    filePath: img.path,
    format: state.format,
    quality: state.quality,
  });

  if (token !== estimateToken) return;
  const current = state.images[index];
  if (!current || current.path !== img.path) return;

  current.estimating = false;
  current.estimatedSize = result?.size ?? null;
  if (index === state.selectedIndex) updateMetaPanel();
}

function render() {
  const app = document.getElementById('app');
  if (!app) return;

  const hasImages = state.images.length > 0;
  const current = state.images[state.selectedIndex];

  app.innerHTML = `
    <div class="instructions-card">
      <p class="instructions-title">Como usar</p>
      <ol class="instructions-list">
        <li>Clique em <strong>Selecionar imagens</strong> e escolha os arquivos que deseja converter.</li>
        <li>Defina o <strong>formato</strong> de saída (WebP, PNG, JPEG, ICO ou SVG) e a <strong>qualidade</strong> no slider.</li>
        <li>Clique em <strong>Converter</strong>, escolha a pasta onde salvar os arquivos e aguarde o término.</li>
      </ol>
    </div>

    <header class="app-header">
      <h1 class="app-title">Conversor de Imagens</h1>
      <div class="actions-bar">
        <button type="button" class="btn btn-secondary" id="btn-select">
          Selecionar imagens
        </button>
        <button type="button" class="btn btn-primary" id="btn-convert" ${!hasImages ? 'disabled' : ''}>
          Converter
        </button>
      </div>
    </header>

    <div class="options-card">
      <div class="option-group">
        <label for="format">Formato</label>
        <select id="format" class="select-format">
          <option value="webp" ${state.format === 'webp' ? 'selected' : ''}>WebP</option>
          <option value="png" ${state.format === 'png' ? 'selected' : ''}>PNG</option>
          <option value="jpeg" ${state.format === 'jpeg' ? 'selected' : ''}>JPEG</option>
          <option value="ico" ${state.format === 'ico' ? 'selected' : ''}>ICO</option>
          <option value="svg" ${state.format === 'svg' ? 'selected' : ''}>SVG</option>
        </select>
      </div>
      <div class="option-group quality-slider-wrap">
        <label for="quality">Qualidade</label>
        <input type="range" id="quality" class="quality-slider" min="1" max="100" value="${state.quality}" />
        <span id="quality-value">${state.quality}%</span>
      </div>
    </div>

    <div class="content-area">
      <aside class="list-panel">
        <div class="list-panel-header">
          Imagens (${state.images.length})
        </div>
        <div class="list-panel-body" id="list-body">
          ${state.images.length === 0 ? '<p class="preview-placeholder" style="padding: 16px;">Nenhuma imagem selecionada</p>' : ''}
          ${state.images
            .map((img, i) => {
              const metaParts: string[] = [];
              if (img.width && img.height) metaParts.push(`${img.width}×${img.height}`);
              if (img.size != null) metaParts.push(formatBytes(img.size));
              return `
            <div class="list-item ${i === state.selectedIndex ? 'active' : ''}" data-index="${i}">
              <img class="list-item-thumb" src="${img.preview || ''}" alt="" onerror="this.style.background='var(--bg-hover)'" />
              <div class="list-item-text">
                <span class="list-item-name">${img.name}</span>
                <span class="list-item-meta">${metaParts.join(' · ')}</span>
              </div>
            </div>
          `;
            })
            .join('')}
        </div>
      </aside>
      <section class="preview-panel">
        <div class="preview-panel-header">Preview</div>
        <div id="image-meta" class="image-meta ${current ? '' : 'hidden'}"></div>
        <div class="preview-panel-body">
          ${
            !current
              ? '<p class="preview-placeholder">Selecione uma imagem na lista</p>'
              : current.preview
                ? `<img class="preview-img" src="${current.preview}" alt="${current.name}" />`
                : '<p class="preview-placeholder">Carregando...</p>'
          }
        </div>
      </section>
    </div>

    <div class="progress-wrap ${state.converting ? '' : 'hidden'}" id="progress-wrap">
      <div class="progress-bar">
        <div class="progress-fill" id="progress-fill" style="width: ${state.progress}%"></div>
      </div>
      <span class="progress-text" id="progress-text">${state.converting ? Math.round(state.progress) + '%' : ''}</span>
    </div>

    <div class="status-bar hidden" id="status-bar"></div>
  `;

  updateMetaPanel();

  document.getElementById('format')?.addEventListener('change', (e) => {
    state.format = (e.target as HTMLSelectElement).value as Format;
    render();
    void refreshEstimate();
  });

  document.getElementById('quality')?.addEventListener('input', (e) => {
    state.quality = Number((e.target as HTMLInputElement).value);
    const val = document.getElementById('quality-value');
    if (val) val.textContent = `${state.quality}%`;
    if (qualityEstimateTimer) clearTimeout(qualityEstimateTimer);
    qualityEstimateTimer = setTimeout(() => {
      void refreshEstimate();
    }, 250);
  });

  document.getElementById('btn-select')?.addEventListener('click', onSelectImages);
  document.getElementById('btn-convert')?.addEventListener('click', onConvert);

  document.querySelectorAll('.list-item').forEach((el) => {
    el.addEventListener('click', () => {
      const index = Number((el as HTMLElement).dataset.index);
      if (!Number.isNaN(index)) {
        state.selectedIndex = index;
        render();
        void refreshEstimate(index);
      }
    });
  });
}

async function onSelectImages() {
  const paths = await window.imageConverter.selectImages();
  if (paths.length === 0) return;

  state.images = paths.map(
    (p): ImageItem => ({
      path: p,
      name: getFileName(p),
      preview: null,
      width: null,
      height: null,
      size: null,
      estimatedSize: null,
      estimating: false,
    }),
  );
  state.selectedIndex = 0;
  render();

  state.images.forEach((img, i) => {
    if (state.loadingPreviews.has(img.path)) return;
    state.loadingPreviews.add(img.path);

    void window.imageConverter.getPreview(img.path).then((dataUrl) => {
      const item = state.images[i];
      if (item && item.path === img.path) {
        item.preview = dataUrl ?? null;
        state.loadingPreviews.delete(img.path);
        const thumb = document.querySelector(
          `.list-item[data-index="${i}"] .list-item-thumb`,
        ) as HTMLImageElement | null;
        if (thumb && dataUrl) thumb.src = dataUrl;
        else render();
      }
    });

    void window.imageConverter.getImageInfo(img.path).then((info) => {
      const item = state.images[i];
      if (!item || item.path !== img.path || !info) return;
      item.width = info.width;
      item.height = info.height;
      item.size = info.size;
      updateListMeta(i);
      if (i === state.selectedIndex) updateMetaPanel();
    });
  });

  void refreshEstimate(0);
}

async function onConvert() {
  if (state.images.length === 0) return;

  const outputDir = await window.imageConverter.chooseOutputDir();
  if (!outputDir) return;

  const statusBar = document.getElementById('status-bar');
  if (statusBar) {
    statusBar.textContent = 'Convertendo...';
    statusBar.className = 'status-bar';
    statusBar.classList.remove('hidden');
  }

  state.converting = true;
  state.progress = 0;
  render();

  const unsubscribeProgress = window.imageConverter.onConversionProgress(
    ({ current, total }) => {
      state.progress = total > 0 ? (current / total) * 100 : 0;
      const fill = document.getElementById('progress-fill');
      const text = document.getElementById('progress-text');
      if (fill) fill.style.width = state.progress + '%';
      if (text) text.textContent = Math.round(state.progress) + '%';
    },
  );

  const filePaths = state.images
    .map((i) => i.path)
    .filter((p): p is string => typeof p === 'string' && p.length > 0);

  try {
    const results = await window.imageConverter.convertImages({
      filePaths,
      format: state.format,
      quality: state.quality,
      outputDir,
    });

    state.progress = 100;
    const fillEl = document.getElementById('progress-fill');
    const textEl = document.getElementById('progress-text');
    if (fillEl) fillEl.style.width = '100%';
    if (textEl) textEl.textContent = '100%';

    const ok = results.filter((r) => r.success).length;
    const err = results.filter((r) => !r.success).length;

    if (statusBar) {
      statusBar.classList.remove('hidden');
      if (err === 0) {
        const count = ok === 1 ? '1 imagem convertida' : `${ok} imagens convertidas`;
        statusBar.textContent = `Sucesso! ${count}. Salvas em: ${outputDir}`;
        statusBar.className = 'status-bar success';
      } else {
        statusBar.textContent =
          err === results.length
            ? `Erro ao converter. ${results[0]?.error ?? 'Erro desconhecido'}`
            : `${ok} convertida(s), ${err} falha(s).`;
        statusBar.className = 'status-bar error';
      }
    }
  } catch (e) {
    if (statusBar) {
      statusBar.classList.remove('hidden');
      statusBar.textContent = `Erro ao converter. ${e instanceof Error ? e.message : String(e)}`;
      statusBar.className = 'status-bar error';
    }
  } finally {
    unsubscribeProgress();
    setTimeout(() => {
      state.converting = false;
      state.progress = 0;
      const wrap = document.getElementById('progress-wrap');
      if (wrap) wrap.classList.add('hidden');
    }, 600);
  }
}

render();
