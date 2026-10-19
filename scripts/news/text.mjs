const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

export function toPlainText(html = '') {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&([a-z]+|#39);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? ' ')
    .replace(/&#?[a-z0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
