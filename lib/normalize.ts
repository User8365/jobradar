export function normalizeText(value: string): string {
  return value
    .trim()
    .replace(/\u2011|\u2012|\u2013|\u2014/g, '-')
    .replace(/[\u00A0\s]+/g, ' ')
    .replace(/\s*[-–—]\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeUrl(input: string): string {
  try {
    const url = new URL(input);
    const allowedParams = new Set<string>();
    for (const [key] of url.searchParams.entries()) {
      if (!allowedParams.has(key) && !key.startsWith('utm_')) {
        url.searchParams.delete(key);
      }
    }
    url.hash = '';
    url.searchParams.sort();
    return url.toString();
  } catch {
    return input.trim();
  }
}

export function calculateFingerprint(title: string, company: string, location: string): string {
  const content = [title, company, location]
    .map((value) => normalizeText(value || ''))
    .filter(Boolean)
    .join('|')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return Buffer.from(content).toString('base64url');
}
