import Card from '../components/Card';
import { useLanguage } from '../context/LanguageContext';
import { EXP_RULES, getLevelRows } from '@shared/constants/levelConfig';
import './AboutAlgorithm.css';

function ExpRulesTable({ isZh }) {
  return (
    <div className="about-alg-table-wrap">
      <table className="about-alg-table">
        <thead>
          <tr>
            <th>{isZh ? '行为' : 'Action'}</th>
            <th>{isZh ? '经验' : 'XP'}</th>
            <th>{isZh ? '每日上限' : 'Daily cap'}</th>
          </tr>
        </thead>
        <tbody>
          {EXP_RULES.map((r) => (
            <tr key={r.key}>
              <td>{isZh ? r.labelZh : r.labelEn}</td>
              <td>+{r.amount}</td>
              <td>{r.dailyCap == null ? (isZh ? '无' : 'None') : r.dailyCap}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LevelTable({ isZh }) {
  const rows = getLevelRows(isZh);
  return (
    <div className="about-alg-table-wrap">
      <table className="about-alg-table">
        <thead>
          <tr>
            <th>{isZh ? '等级' : 'Level'}</th>
            <th>{isZh ? '徽章' : 'Badge'}</th>
            <th>{isZh ? '累计经验（≥）' : 'Total XP (≥)'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.level}>
              <td>Lv{r.level}</td>
              <td>
                {r.emoji} {r.name}
              </td>
              <td>{r.minExp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AboutLevelAlgorithm() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';

  return (
    <div className="about-alg-page">
      <Card as="div" className="about-alg-card">
        <h2 className="about-alg-title">{isZh ? '等级算法说明' : 'Level System'}</h2>

        {!isZh && (
          <section className="about-alg-section" aria-label="Level System">
            <p className="about-alg-p">
              The <strong>Dorm Level System</strong> rewards active and quality contributions on campus.
              Your <strong>total XP</strong> determines your level (Lv1–Lv6). XP is granted automatically
              when you log in, post, comment, like, or review canteen dishes—subject to daily caps and
              anti-abuse rules below.
            </p>

            <h4 className="about-alg-h4">1. Levels & Badges</h4>
            <p className="about-alg-p">
              New users start at <strong>Lv1</strong>. When your cumulative XP reaches the threshold, you
              level up and receive the matching badge (shown on your profile and posts).
            </p>
            <LevelTable isZh={false} />

            <h4 className="about-alg-h4">2. How to Earn XP</h4>
            <p className="about-alg-p">
              Each action grants a fixed amount of XP. <strong>Daily caps</strong> apply per action type
              (reset at midnight, UTC+8). Caps prevent farming.
            </p>
            <ExpRulesTable isZh={false} />

            <h4 className="about-alg-h4">3. Quality Canteen Reviews</h4>
            <p className="about-alg-p">
              A normal canteen review grants +10 XP. You may earn an extra <strong>+5 quality bonus</strong>{' '}
              (stacked, up to +15) if either:
            </p>
            <ul className="about-alg-ul">
              <li>Review text is at least <strong>20 characters</strong> (after trimming), or</li>
              <li>You attach at least <strong>one image</strong>.</li>
            </ul>
            <p className="about-alg-p about-alg-note">
              Example: a short “tasty” review → +10 only; a 20+ character review or one with photos → +15.
            </p>

            <h4 className="about-alg-h4">4. Popular Post Rewards (Author)</h4>
            <p className="about-alg-p">
              When your Tree Hole or Trending post reaches engagement milestones, you receive a one-time bonus
              (no daily cap):
            </p>
            <ul className="about-alg-ul">
              <li><strong>+20 XP</strong> when the post gets ≥10 likes (once per post).</li>
              <li><strong>+20 XP</strong> when the post gets ≥10 comments (once per post).</li>
            </ul>

            <h4 className="about-alg-h4">5. Anti-Abuse Rules</h4>
            <ul className="about-alg-ul">
              <li>XP is not granted for liking or commenting on <strong>your own</strong> content.</li>
              <li>Removing a like revokes the XP gained from that like (if any).</li>
              <li>Posts/comments must meet minimum length; otherwise the action succeeds but grants 0 XP.</li>
              <li>Each popular-post bonus is granted only once per post.</li>
            </ul>

            <h4 className="about-alg-h4">6. Level-Up</h4>
            <p className="about-alg-p">
              When you cross a level threshold, your level and badge update immediately. You may see an
              in-app celebration and a “+XP” toast after eligible actions.
            </p>

            <p className="about-alg-note">This document will be updated when the level rules change.</p>
          </section>
        )}

        {isZh && (
          <section className="about-alg-section" aria-label="等级算法说明">
            <p className="about-alg-p">
              <strong>Dorm 等级系统</strong>用于鼓励活跃与高质量贡献。你的<strong>累计经验</strong>
              决定等级（Lv1～Lv6）。登录、发帖、评论、点赞、食堂点评等行为会自动获得经验，并受每日上限与防刷规则约束。
            </p>

            <h4 className="about-alg-h4">一、等级与徽章</h4>
            <p className="about-alg-p">
              注册默认为 <strong>Lv1 新生</strong>。累计经验达到下表阈值时自动升级，并获得对应徽章（展示在主页、帖子与评论旁）。
            </p>
            <LevelTable isZh />

            <h4 className="about-alg-h4">二、经验获取</h4>
            <p className="about-alg-p">
              每种行为对应固定经验值；<strong>每日上限</strong>按行为类型单独计算（东八区自然日 0 点重置），防止刷经验。
            </p>
            <ExpRulesTable isZh />

            <h4 className="about-alg-h4">三、食堂优质点评</h4>
            <p className="about-alg-p">
              普通点评 +10 经验。满足以下<strong>任一</strong>条件可额外获得 <strong>+5 优质加成</strong>（与普通叠加，最高 +15）：
            </p>
            <ul className="about-alg-ul">
              <li>点评文字不少于 <strong>20 字</strong>（去空格后计字）；或</li>
              <li>上传 <strong>至少一张图片</strong>。</li>
            </ul>
            <p className="about-alg-p about-alg-note">
              例：只写「好吃」→ 仅 +10；写满 20 字或带图 → +15。
            </p>

            <h4 className="about-alg-h4">四、热门帖奖励（作者）</h4>
            <p className="about-alg-p">
              你的树洞帖或热搜帖达到互动量时，帖主可获得一次性奖励（不计入每日上限）：
            </p>
            <ul className="about-alg-ul">
              <li>点赞数首次 ≥10：<strong>+20 经验</strong>（每帖仅一次）。</li>
              <li>评论数首次 ≥10：<strong>+20 经验</strong>（每帖仅一次）。</li>
            </ul>

            <h4 className="about-alg-h4">五、防刷机制</h4>
            <ul className="about-alg-ul">
              <li>给自己的帖子点赞、评论<strong>不加经验</strong>。</li>
              <li>取消点赞会扣回该次点赞已获得的经验。</li>
              <li>发帖/评论字数不足时，操作仍可成功，但不获得经验。</li>
              <li>同一帖的热门奖励每种仅发放一次。</li>
            </ul>

            <h4 className="about-alg-h4">六、升级提示</h4>
            <p className="about-alg-p">
              经验跨越等级阈值时，等级与徽章即时更新，并可能出现升级弹窗与「+N 经验」轻提示。
            </p>

            <p className="about-alg-note">规则如有调整，以本页更新为准。</p>
          </section>
        )}
      </Card>
    </div>
  );
}

export default AboutLevelAlgorithm;
