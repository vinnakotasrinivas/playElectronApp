const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const config = require('../src/config');
const { loadDocument } = require('../src/ingestion/loadDocument');
const { chunkText } = require('../src/ingestion/chunkText');
const { ingestChunks, retrieve } = require('../src/rag/retrieve');
const { runAgentPipeline } = require('../src/agents/orchestrator');

function ensureDataDirs() {
  for (const dir of [config.UPLOADS_DIR, config.VECTORS_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 800,
    minHeight: 600,
    title: 'Enterprise Doc QA',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  if (process.env.ELECTRON_DEVTOOLS === '1') {
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(() => {
  ensureDataDirs();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('get-providers', async () => {
  return {
    providers: ['groq', 'gemini'],
    defaultProvider: config.DEFAULT_PROVIDER,
    hasGroqKey: Boolean(process.env.GROQ_API_KEY),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  };
});

ipcMain.handle('select-and-upload-document', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select enterprise document',
    properties: ['openFile'],
    filters: [
      {
        name: 'Documents',
        extensions: ['pdf', 'txt', 'csv', 'xlsx', 'xls'],
      },
    ],
  });

  if (result.canceled || !result.filePaths.length) {
    return { canceled: true };
  }

  const sourcePath = result.filePaths[0];
  const fileName = path.basename(sourcePath);
  const destPath = path.join(config.UPLOADS_DIR, fileName);

  fs.copyFileSync(sourcePath, destPath);

  const loaded = await loadDocument(destPath);
  const chunks = chunkText(loaded.text, {
    size: config.CHUNK_SIZE,
    overlap: config.CHUNK_OVERLAP,
    source: fileName,
  });

  const chunksPath = path.join(
    config.UPLOADS_DIR,
    `${path.parse(fileName).name}.chunks.json`
  );
  fs.writeFileSync(chunksPath, JSON.stringify(chunks, null, 2), 'utf8');

  const ingestResult = await ingestChunks(chunks);

  return {
    canceled: false,
    fileName,
    destPath,
    charCount: loaded.text.length,
    preview: loaded.text.slice(0, 400),
    chunkCount: chunks.length,
    vectorCount: ingestResult.count,
    meta: loaded.meta,
  };
});

ipcMain.handle('ask-question', async (_event, payload) => {
  const { question, provider } = payload || {};

  if (!question || !String(question).trim()) {
    return { ok: false, error: 'Question is required.' };
  }

  const selectedProvider = (provider || config.DEFAULT_PROVIDER).toLowerCase();

  try {
    const result = await runAgentPipeline({
      question: String(question).trim(),
      provider: selectedProvider,
      topK: config.TOP_K,
    });
    return { ok: true, ...result };
  } catch (err) {
    console.error('[ask-question]', err);
    return {
      ok: false,
      error: err.message || String(err),
    };
  }
});

ipcMain.handle('retrieve-preview', async (_event, payload) => {
  const { question, topK } = payload || {};
  if (!question) {
    return { ok: false, error: 'Question is required.' };
  }
  try {
    const hits = await retrieve(String(question).trim(), topK || config.TOP_K);
    return { ok: true, hits };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});
