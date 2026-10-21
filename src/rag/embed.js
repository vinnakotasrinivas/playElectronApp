const config = require('../config');

let extractorPromise = null;

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline } = await import('@xenova/transformers');
      return pipeline('feature-extraction', config.EMBEDDING_MODEL);
    })();
  }
  return extractorPromise;
}

/**
 * Embed a single string into a normalized float vector.
 */
async function embedText(text) {
  const extractor = await getExtractor();
  const output = await extractor(text, {
    pooling: 'mean',
    normalize: true,
  });
  return Array.from(output.data);
}

/**
 * Embed many texts sequentially (safer on memory for desktop).
 */
async function embedTexts(texts, onProgress) {
  const vectors = [];
  for (let i = 0; i < texts.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const vec = await embedText(texts[i]);
    vectors.push(vec);
    if (typeof onProgress === 'function') {
      onProgress(i + 1, texts.length);
    }
  }
  return vectors;
}

module.exports = { embedText, embedTexts };
