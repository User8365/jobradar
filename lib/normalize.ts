export function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeUrl(input: string): string {
  try {
    const url = new URL(input);
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
    .toLowerCase();

  return Buffer.from(content).toString('base64url');
}
