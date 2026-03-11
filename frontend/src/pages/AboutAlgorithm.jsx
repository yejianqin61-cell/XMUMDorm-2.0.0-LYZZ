import Card from '../components/Card';
import { useLanguage } from '../context/LanguageContext';
import './AboutAlgorithm.css';

function AboutAlgorithm() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';

  return (
    <div className="about-alg-page">
      <Card as="div" className="about-alg-card">
        <h2 className="about-alg-title">
          {isZh ? '评分算法说明' : 'Scoring Algorithm'}
        </h2>

        {!isZh && (
          <section className="about-alg-section" aria-label="Scoring Algorithm">
            <h3 className="about-alg-h3">English</h3>
            <p className="about-alg-p">
              This document describes how <strong>dish (product) scores</strong>, <strong>shop scores</strong>, and{' '}
              <strong>rankings</strong> are computed in the Dorm Canteen system. Only <strong>top-level reviews</strong>{' '}
              (direct ratings on a product) are counted; replies to reviews are not.
            </p>

            <h4 className="about-alg-h4">1. Rating Tiers and Point Values</h4>
            <p className="about-alg-p">
              When leaving a top-level review, the user must choose one of five tiers. Each tier has a{' '}
              <strong>fixed point value</strong>:
            </p>
            <div className="about-alg-table-wrap">
              <table className="about-alg-table">
                <thead>
                  <tr>
                    <th>Tier</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Excellent</td><td>10</td></tr>
                  <tr><td>Great</td><td>7</td></tr>
                  <tr><td>Good</td><td>4</td></tr>
                  <tr><td>Ordinary</td><td>1</td></tr>
                  <tr><td>Just soso</td><td>-1</td></tr>
                </tbody>
              </table>
            </div>

            <h4 className="about-alg-h4">2. Dish Composite Score (S_dish)</h4>
            <ul className="about-alg-ul">
              <li><strong>Meaning</strong>: The composite score of a single dish (product).</li>
              <li><strong>Scope</strong>: All <strong>top-level reviews</strong> for that product (replies excluded).</li>
              <li>
                <strong>Formula</strong>:
                <ul className="about-alg-ul about-alg-ul-nested">
                  <li>Counts: n1(Excellent), n2(Great), n3(Good), n4(Ordinary), n5(Just soso).</li>
                  <li>Total: N = n1 + n2 + n3 + n4 + n5.</li>
                  <li>Sum: sum = 10·n1 + 7·n2 + 4·n3 + 1·n4 + (-1)·n5.</li>
                  <li>Score: S_dish = sum / N, rounded to 2 decimals.</li>
                </ul>
              </li>
              <li><strong>Edge case</strong>: If N = 0, S_dish is <strong>null</strong> (excluded from score-based rankings).</li>
            </ul>

            <h4 className="about-alg-h4">3. Shop Composite Score (S_shop)</h4>
            <ul className="about-alg-ul">
              <li><strong>Meaning</strong>: The composite score of a shop.</li>
              <li><strong>Scope</strong>: Only products with at least one top-level review (review_count &gt; 0).</li>
              <li>
                <strong>Formula</strong>: Weighted average by review_count:
                <div className="about-alg-formula">S_shop = Σ(S_dish × review_count) / Σ(review_count)</div>
                Rounded to 2 decimals.
              </li>
              <li><strong>Edge case</strong>: If no product has any review, S_shop is <strong>null</strong>.</li>
            </ul>

            <h4 className="about-alg-h4">4. Weekly Review Counts (for weekly rankings)</h4>
            <ul className="about-alg-ul">
              <li><strong>Shop weekly count</strong>: Top-level reviews received in the current week.</li>
              <li><strong>User weekly count</strong>: Top-level reviews posted by the user in the current week.</li>
              <li><strong>Reset</strong>: Every Monday 00:00 (UTC+8), weekly counts are reset to zero.</li>
            </ul>

            <h4 className="about-alg-h4">5. Rankings and How They Are Computed</h4>
            <div className="about-alg-table-wrap">
              <table className="about-alg-table">
                <thead>
                  <tr>
                    <th>Ranking</th>
                    <th>Sort by</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Top Dishes</td>
                    <td>S_dish descending; tie-break: earlier listing first</td>
                    <td>Top 5; no reviews ⇒ excluded</td>
                  </tr>
                  <tr>
                    <td>Busiest Shops</td>
                    <td>Shop weekly review count descending</td>
                    <td>Top 5 by weekly count</td>
                  </tr>
                  <tr>
                    <td>Top Shops</td>
                    <td>S_shop descending; tie-break: earlier creation first</td>
                    <td>Top 5; no reviews ⇒ excluded</td>
                  </tr>
                  <tr>
                    <td>Hot New Items</td>
                    <td>S_dish descending (listed within 7 days)</td>
                    <td>Listed ≤7 days (UTC+8); then by score</td>
                  </tr>
                  <tr>
                    <td>Review Stars</td>
                    <td>User weekly review count descending</td>
                    <td>Top 5 by weekly top-level review count</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4 className="about-alg-h4">6. Summary</h4>
            <ul className="about-alg-ul">
              <li>Only <strong>top-level reviews</strong> and their <strong>tier</strong> affect scores; replies do not.</li>
              <li>Dish score is a weighted average; shop score is a weighted average of dish scores by review_count.</li>
              <li>Weekly rankings use weekly counts, reset every Monday 00:00 (UTC+8).</li>
            </ul>
            <p className="about-alg-note">This document will be updated when the algorithm changes.</p>
          </section>
        )}

        {isZh && (
          <>
            <section className="about-alg-section" aria-label="中文">
              <h3 className="about-alg-h3">中文</h3>
              <p className="about-alg-p">
                本文说明食堂系统中<strong>商品综合评分</strong>、<strong>店铺综合评分</strong>及<strong>排行榜</strong>的计算方式。仅<strong>一级点评</strong>
                （直接对商品打分的那一条）参与统计，二级回复不参与。
              </p>

              <h4 className="about-alg-h4">一、点评档位与分值</h4>
              <p className="about-alg-p">用户对菜品进行一级点评时，须选择以下五档之一，每档对应一个<strong>固定分值</strong>：</p>
              <div className="about-alg-table-wrap">
                <table className="about-alg-table">
                  <thead>
                    <tr>
                      <th>档位</th>
                      <th>分值</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>夯爆了</td><td>10</td></tr>
                    <tr><td>顶级</td><td>7</td></tr>
                    <tr><td>人上人</td><td>4</td></tr>
                    <tr><td>NPC</td><td>1</td></tr>
                    <tr><td>拉完了</td><td>-1</td></tr>
                  </tbody>
                </table>
              </div>

              <h4 className="about-alg-h4">二、商品综合评分 S_dish</h4>
              <ul className="about-alg-ul">
                <li><strong>含义</strong>：单个菜品（商品）的综合评分。</li>
                <li><strong>统计范围</strong>：该商品下所有<strong>一级点评</strong>（不含二级回复）。</li>
                <li>
                  <strong>计算公式</strong>：
                  <ul className="about-alg-ul about-alg-ul-nested">
                    <li>统计数量：n1(夯爆了)、n2(顶级)、n3(人上人)、n4(NPC)、n5(拉完了)。</li>
                    <li>总点评数：N = n1 + n2 + n3 + n4 + n5。</li>
                    <li>加权总分：sum = 10·n1 + 7·n2 + 4·n3 + 1·n4 + (-1)·n5。</li>
                    <li>综合评分：S_dish = sum / N，结果保留两位小数（四舍五入）。</li>
                  </ul>
                </li>
                <li><strong>特殊情况</strong>：若 N = 0，则 S_dish 为<strong>空</strong>（不参与按评分排序的榜单）。</li>
              </ul>

              <h4 className="about-alg-h4">三、店铺综合评分 S_shop</h4>
              <ul className="about-alg-ul">
                <li><strong>含义</strong>：单个店铺的综合评分。</li>
                <li><strong>统计范围</strong>：仅统计有至少一条一级点评的商品（review_count &gt; 0）。</li>
                <li>
                  <strong>计算公式</strong>：按点评数加权的商品综合分平均值：
                  <div className="about-alg-formula">S_shop = Σ(S_dish × review_count) / Σ(review_count)</div>
                  结果保留两位小数。
                </li>
                <li><strong>特殊情况</strong>：若店铺下没有任何商品有点评，则 S_shop 为<strong>空</strong>。</li>
              </ul>

              <h4 className="about-alg-h4">四、当周点评数（周榜用）</h4>
              <ul className="about-alg-ul">
                <li><strong>店铺当周点评数</strong>：该店铺本周收到的一级点评总数。</li>
                <li><strong>用户当周点评数</strong>：该用户本周发表的一级点评总数。</li>
                <li><strong>重置规则</strong>：每周一 0:00（东八区）自动清零后重新累计。</li>
              </ul>

              <h4 className="about-alg-h4">五、排行榜与算法对应关系</h4>
              <div className="about-alg-table-wrap">
                <table className="about-alg-table">
                  <thead>
                    <tr>
                      <th>榜单</th>
                      <th>排序依据</th>
                      <th>说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>最夯单品</td>
                      <td>S_dish 降序；同分按上架时间早的在前</td>
                      <td>Top 5；零点评不参与</td>
                    </tr>
                    <tr>
                      <td>门庭若市</td>
                      <td>店铺当周点评数降序</td>
                      <td>Top 5</td>
                    </tr>
                    <tr>
                      <td>最夯商家</td>
                      <td>S_shop 降序；同分按创建时间早的在前</td>
                      <td>Top 5；零点评不参与</td>
                    </tr>
                    <tr>
                      <td>爆款新品</td>
                      <td>上架 7 天内商品按 S_dish 降序</td>
                      <td>东八区上架距今 ≤7 天</td>
                    </tr>
                    <tr>
                      <td>点评达人</td>
                      <td>用户当周点评数降序</td>
                      <td>Top 5</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h4 className="about-alg-h4">六、小结</h4>
              <ul className="about-alg-ul">
                <li>评分只与<strong>一级点评</strong>的<strong>档位</strong>有关，二级回复不参与。</li>
                <li>商品分 = 各档位分值按条数加权平均；店铺分 = 旗下商品分按点评数加权平均。</li>
                <li>周榜依赖当周点评数，每周一 0 点东八区重置。</li>
              </ul>
              <p className="about-alg-note">如有变更会同步更新此说明。</p>
            </section>
          </>
        )}
      </Card>
    </div>
  );
}

export default AboutAlgorithm;

