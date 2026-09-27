import { load } from 'cheerio';

export function cleanJobDescription(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;

  let text = value;
  for (let pass = 0; pass < 2; pass += 1) {
    text = text
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<\/(?:p|div|li|h[1-6]|ul|ol)>/gi, '\n');
    const document = load(`<body>${text}</body>`);
    text = document('body').text();
  }

  return text
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim() || null;
}
