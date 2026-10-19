const PROTECTED_SEGMENT =
  /(<glossary-term\b[^>]*>[\s\S]*?<\/glossary-term>|```[\s\S]*?```|`[^`\n]*`|\[[^\]]*\]\([^)]*\)|<[^>]+>)/;

function wrapTerm(id, text) {
  return `<glossary-term term="${id}">${text}</glossary-term>`;
}

function linkFirstOccurrence(text, entry) {
  const segments = text.split(PROTECTED_SEGMENT);
  const segmentIndex = segments.findIndex((segment, index) => index % 2 === 0 && segment.includes(entry.match));
  if (segmentIndex < 0) return null;

  segments[segmentIndex] = segments[segmentIndex].replace(entry.match, () => wrapTerm(entry.id, entry.match));
  return segments.join('');
}

export function createGlossaryLinker(glossary) {
  const linkedIds = new Set();

  return {
    link(text) {
      let result = text;
      for (const entry of glossary) {
        if (linkedIds.has(entry.id)) continue;
        const linked = linkFirstOccurrence(result, entry);
        if (linked === null) continue;
        result = linked;
        linkedIds.add(entry.id);
      }
      return result;
    },
    getLinkedEntries() {
      return glossary.filter((entry) => linkedIds.has(entry.id));
    },
  };
}

export function toGlossaryFrontmatter(entries) {
  return entries.map(({ id, term, description, image }) => ({
    id,
    term,
    description,
    ...(image && {
      image: { url: image.url, alt: image.alt, ...(image.sourceUrl && { sourceUrl: image.sourceUrl }) },
    }),
  }));
}
