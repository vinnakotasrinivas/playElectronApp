const providerEl = document.getElementById('provider');
const keyStatusEl = document.getElementById('keyStatus');
const uploadBtn = document.getElementById('uploadBtn');
const uploadStatus = document.getElementById('uploadStatus');
const uploadPreview = document.getElementById('uploadPreview');
const questionEl = document.getElementById('question');
const askBtn = document.getElementById('askBtn');
const clearBtn = document.getElementById('clearBtn');
const askStatus = document.getElementById('askStatus');
const answerEl = document.getElementById('answer');
const sourcesEl = document.getElementById('sources');
const stepsEl = document.getElementById('steps');

function showStatus(el, message, type = '') {
  el.hidden = false;
  el.className = `status${type ? ` ${type}` : ''}`;
  el.textContent = message;
}

function setBusy(busy) {
  uploadBtn.disabled = busy;
  askBtn.disabled = busy;
  providerEl.disabled = busy;
}

function renderSources(sources) {
  if (!sources || !sources.length) {
    sourcesEl.className = 'sources empty';
    sourcesEl.textContent = 'No sources yet.';
    return;
  }

  sourcesEl.className = 'sources';
  sourcesEl.innerHTML = sources
    .map(
      (s) => `
      <div class="source-card">
        <header>
          <span>[${s.index}] ${s.source || 'unknown'}</span>
          <span>score ${typeof s.score === 'number' ? s.score.toFixed(3) : '—'}</span>
        </header>
        <p>${escapeHtml(s.text)}</p>
      </div>`
    )
    .join('');
}

function renderSteps(steps) {
  if (!steps || !steps.length) {
    stepsEl.className = 'steps empty';
    stepsEl.innerHTML = '<li>Pipeline idle</li>';
    return;
  }

  stepsEl.className = 'steps';
  stepsEl.innerHTML = steps
    .map(
      (step) => `
      <li>
        <strong>${escapeHtml(step.agent)}</strong>
        <span class="badge ${escapeHtml(step.status || 'ok')}">${escapeHtml(
          step.status || 'ok'
        )}</span>
        <span>${escapeHtml(step.detail || '')}</span>
      </li>`
    )
    .join('');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function initProviders() {
  try {
    const info = await window.docQA.getProviders();
    providerEl.value = info.defaultProvider || 'groq';
    const groq = info.hasGroqKey ? 'Groq key OK' : 'Groq key missing';
    const gemini = info.hasGeminiKey ? 'Gemini key OK' : 'Gemini key missing';
    keyStatusEl.textContent = `${groq} · ${gemini}`;
  } catch (err) {
    keyStatusEl.textContent = `Could not load providers: ${err.message}`;
  }
}

uploadBtn.addEventListener('click', async () => {
  setBusy(true);
  showStatus(uploadStatus, 'Selecting and ingesting document…');
  uploadPreview.hidden = true;

  try {
    const result = await window.docQA.selectAndUploadDocument();
    if (result.canceled) {
      showStatus(uploadStatus, 'Upload canceled.');
      return;
    }

    showStatus(
      uploadStatus,
      `Ingested "${result.fileName}"\n` +
        `Characters: ${result.charCount}\n` +
        `Chunks: ${result.chunkCount}\n` +
        `Vectors in store: ${result.vectorCount}`,
      'ok'
    );

    uploadPreview.hidden = false;
    uploadPreview.textContent = result.preview || '(no preview)';
  } catch (err) {
    showStatus(uploadStatus, err.message || String(err), 'error');
  } finally {
    setBusy(false);
  }
});

askBtn.addEventListener('click', async () => {
  const question = questionEl.value.trim();
  if (!question) {
    showStatus(askStatus, 'Please enter a question.', 'error');
    return;
  }

  setBusy(true);
  showStatus(askStatus, `Asking via ${providerEl.value}…`);
  answerEl.textContent = 'Thinking…';
  renderSources([]);
  renderSteps([
    {
      agent: 'orchestrator',
      status: 'running',
      detail: 'Starting agent pipeline…',
    },
  ]);

  try {
    const result = await window.docQA.askQuestion({
      question,
      provider: providerEl.value,
    });

    if (!result.ok) {
      showStatus(askStatus, result.error || 'Request failed.', 'error');
      answerEl.textContent = result.error || 'Request failed.';
      renderSteps([]);
      return;
    }

    showStatus(
      askStatus,
      `Answered with ${result.provider}` +
        (result.validation
          ? ` · validation ${
              result.validation.supported ? 'passed' : 'adjusted'
            }`
          : ''),
      'ok'
    );
    answerEl.textContent = result.answer;
    renderSources(result.sources);
    renderSteps(result.steps);
  } catch (err) {
    showStatus(askStatus, err.message || String(err), 'error');
    answerEl.textContent = err.message || String(err);
  } finally {
    setBusy(false);
  }
});

clearBtn.addEventListener('click', () => {
  questionEl.value = '';
  askStatus.hidden = true;
  answerEl.textContent =
    'Upload a document and ask a question to see a grounded response.';
  renderSources([]);
  renderSteps([]);
});

initProviders();
