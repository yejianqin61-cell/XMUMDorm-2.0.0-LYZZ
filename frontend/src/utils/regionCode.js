/**
 * 分区 code 与 getRegions() 返回项匹配（URL 与库内 code 大小写可能不一致；AreaCard 曾用 others）
 */
export function normalizeAreaCodeParam(code) {
  const s = String(code ?? '').trim();
  if (!s) return '';
  if (/^others$/i.test(s)) return 'other';
  return s;
}

/** 在 regions 数组中按 code 查找（大小写不敏感） */
export function findRegionByCode(regions, code) {
  const list = Array.isArray(regions) ? regions : [];
  const want = normalizeAreaCodeParam(code).toLowerCase();
  if (!want) return undefined;
  return list.find((r) => String(r.code ?? '').toLowerCase() === want);
}
