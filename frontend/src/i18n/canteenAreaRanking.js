/**
 * 分区商品榜（商家列表顶栏卡片 + 完整榜单页）双语文案
 * @param {'zh'|'en'} lang
 */
export function getCanteenAreaRankingStrings(lang, fullLimit = 50) {
  const en = lang === 'en';
  if (en) {
    return {
      cardAria: (zone) => `Top foods in ${zone}`,
      cardTitle: 'Top foods',
      cardTitleAlt: '分区商品榜',
      cardRule:
        'Sorted by overall score · Newer listings break ties · Only items with reviews',
      scoreLabel: (n) => `${Number(n).toFixed(1)} pts`,
      fullListLink: `Full leaderboard (up to ${fullLimit}) →`,
      emptyRankingText:
        'No ranked items in this area yet. Rankings are generated from review scores after users post reviews.',
      emptyRankingLink: 'Open leaderboard (rules)',
      merchantsSection: 'Merchants here',
      emptyMerchantsTitle: 'No merchants yet',
      emptyMerchantsDesc: 'No merchants in this area yet. 该分区暂无商家。',
      loading: 'Loading…',
      backToArea: 'Back to area',
      backToZone: (zone) => `← Back to ${zone}`,
      pageTitle: 'Top foods',
      pageTitleAlt: '分区商品榜',
      pageDesc: `Reviewed items in this area, ranked by overall score; newer first when tied. Up to ${fullLimit} shown.`,
      emptyListTitle: 'No ranked data',
      emptyListDesc:
        'Items will appear after reviews are posted. No ranked items in this area yet. 本区产生点评后将自动上榜。',
      scoreMeta: (s) => ` · Score ${Number(s).toFixed(1)}/10`,
      footnote: `Swipe on the merchant list to preview the top 20; this page shows the full list (up to ${fullLimit}).`,
      merchantsListAria: (zone) => `Merchants in ${zone}`,
    };
  }
  return {
    cardAria: (zone) => `${zone} 分区商品榜`,
    cardTitle: '分区商品榜',
    cardTitleAlt: 'Top foods',
    cardRule: '按综合评分排序 · 同分则更晚上架在前 · 仅统计已有点评的商品',
    scoreLabel: (n) => `${Number(n).toFixed(1)} 分`,
    fullListLink: `查看完整榜单（最多 ${fullLimit} 名）→`,
    emptyRankingText: '本区暂无上榜商品。用户发表点评后，系统将按综合评分自动生成榜单。',
    emptyRankingLink: '打开榜单页（规则说明）',
    merchantsSection: '本区商家',
    emptyMerchantsTitle: '暂无商家',
    emptyMerchantsDesc: '该分区暂无商家。No merchants in this area yet.',
    loading: '加载中…',
    backToArea: '返回分区',
    backToZone: (zone) => `← 返回 ${zone}`,
    pageTitle: '分区商品榜',
    pageTitleAlt: 'Top foods',
    pageDesc: `本区域内有点评的商品按综合评分排名；同分则更晚上架在前。最多展示 ${fullLimit} 名。`,
    emptyListTitle: '暂无榜单数据',
    emptyListDesc: '本区商品产生点评后将按综合评分自动上榜。No ranked items in this area yet.',
    scoreMeta: (s) => ` · 评分 ${Number(s).toFixed(1)}/10`,
    footnote: `在分区商家列表页顶部可横向滑动预览前 20 名；本页展示完整榜单（最多 ${fullLimit} 条）。`,
    merchantsListAria: (zone) => `${zone} 商家列表`,
  };
}
