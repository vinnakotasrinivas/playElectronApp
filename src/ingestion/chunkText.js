/**
 * Split text into overlapping chunks suitable for embedding + retrieval.
 */
function chunkText(text, options = {}) {
  const size = options.size ?? 800;
  const overlap = options.overlap ?? 150;
  const source = options.source || 'unknown';

  if (!text || !String(text).trim()) {
    return [];
  }

  if (overlap >= size) {
    throw new Error('CHUNK_OVERLAP must be smaller than CHUNK_SIZE');
  }

  const cleaned = String(text).replace(/\r\n/g, '\n').trim();
  const chunks = [];
  let start = 0;
  let index = 0;

  while (start < cleaned.length) {
    let end = Math.min(start + size, cleaned.length);

    // Prefer breaking on whitespace near the end of the window
    if (end < cleaned.length) {
      const slice = cleaned.slice(start, end);
      const lastSpace = slice.lastIndexOf(' ');
      if (lastSpace > size * 0.5) {
        end = start + lastSpace;
      }
    }

    const content = cleaned.slice(start, end).trim();
    if (content) {
      chunks.push({
        id: `${source}::chunk-${index}`,
        text: content,
        metadata: {
          source,
          chunkIndex: index,
          start,
          end,
          charCount: content.length,
        },
      });
      index += 1;
    }

    if (end >= cleaned.length) break;
    start = Math.max(0, end - overlap);
  }

  return chunks;
}

module.exports = { chunkText };
