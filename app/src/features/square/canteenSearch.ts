export type SearchType = 'all' | 'products' | 'articles';
export type SearchRow = { kind: 'product' | 'article'; id: number; title: string; subtitle: string | null; cover: string | null; score: number | null };
export type SearchPage = { rows: readonly SearchRow[]; hasMore: { products: boolean; articles: boolean } };
export function validateSearchQuery(value: string): 'empty' | 'tooLong' | null {
  const query = value.trim();
  return !query ? 'empty' : query.length > 50 ? 'tooLong' : null;
}
export function normalizeSearchPage(raw: unknown): SearchPage | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  if (!Array.isArray(data.products) || !Array.isArray(data.articles)) return null;
  const more = data.hasMore as { products?: boolean; articles?: boolean } | null;
  const rows: SearchRow[] = [];
  for (const [kind, entries] of [['product', data.products], ['article', data.articles]] as const) {
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') continue;
      const row = entry as Record<string, unknown>;
      const title = kind === 'product' ? row.name : row.title_or_excerpt;
      if (typeof row.id !== 'number' || !Number.isSafeInteger(row.id) || row.id <= 0 || typeof title !== 'string') continue;
      const author = row.author as { name?: string } | null;
      rows.push({ kind, id: row.id, title, subtitle: kind === 'product' ? typeof row.shop_name === 'string' ? row.shop_name : null : typeof author?.name === 'string' ? author.name : null,
        cover: typeof row.cover_url === 'string' ? row.cover_url : null, score: typeof row.comprehensive_score === 'number' && Number.isFinite(row.comprehensive_score) ? row.comprehensive_score : null });
    }
  }
  return { rows, hasMore: { products: more?.products === true, articles: more?.articles === true } };
}
export function mergeSearchRows(previous: readonly SearchRow[], incoming: readonly SearchRow[]): readonly SearchRow[] {
  const entries = new Map(previous.map((row) => [`${row.kind}:${row.id}`, row]));
  for (const row of incoming) entries.set(`${row.kind}:${row.id}`, row);
  return [...entries.values()];
}
