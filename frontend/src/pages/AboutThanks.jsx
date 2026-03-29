import Card from '../components/Card';
import { useLanguage } from '../context/LanguageContext';
import './AboutTeam.css';

/** 特别鸣谢（静态）：致谢名单，中英结合，中文在上、英文在下；复用团队介绍卡片样式 */
const THANKS_LIST = [
  {
    zh: '厦门法拉电子股份有限公司 张隆扬先生',
    en: 'Xiamen Faratronic Co., Ltd. Mr. Zhang Longyang',
  },

  {
    zh: '厦门大学马来西亚分校 李靖教授',
    en: 'Xiamen University Malaysia Prof. Li Jing',
  },
  {
    zh: '黑马程序员 pink 刘晓强老师',
    en: 'ITheima Institute Instructor Pink Liu Xiaoqiang',
  },
  {
    zh: '四川大学 叶以翔同学',
    en: 'Sichuan University Student Ye Yixiang',
  },
  {
    zh: '中国科学院大学 郑贤教授',
    en: 'University of Chinese Academy of Sciences Prof. Zheng Xian',
  },
  {
    zh: '福建省同安一中滨海校区 陈淑琦老师',
    en: "Tong'an No.1 High School Binhai Campus of Fujian Province Ms. Chen Shuqi",
  },
  {
    zh: '河北地质大学 赖瑾乐同学',
    en: 'Hebei GEO University Student Lai Jinle',
  },
  {
    zh: '河南开封 yyj女士',
    en: 'Kaifeng, Henan Ms. yyj',
  },
  {
    zh: '同安区五显镇赖秀娇诊所 程新招医生',
    en: 'Lai Xiujiao Clinic, Wuxian Town, Tong\'an District Dr. Cheng Xinzhao',
  },
  {
    zh: '厦门大学马来西亚分校 Zhu Xiaofan教授',
    en: 'Xiamen University Malaysia Prof. Zhu Xiaofan',
  },
  {
    zh: '厦门 涂宜晖女士',
    en: 'Xiamen Ms. Tu Yihui',
  },
];

function AboutThanks() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';

  return (
    <div className="about-team-page">
      <Card as="div" className="about-team-card about-thanks-intro-card">
        <p className="about-thanks-intro">
          {isZh
            ? 'Dorm 的成长离不开许多老师、朋友与前辈的指导和支持。以下是为本项目提供过建议、鼓励或帮助的朋友，在此一并致以最诚挚的谢意。'
            : 'The growth of Dorm would not have been possible without the advice and support of many teachers, friends, and mentors. The following are friends who have provided guidance, suggestions, or encouragement to this project. We extend our sincerest thanks to them.'}
        </p>
      </Card>
      <h2 className="about-thanks-page-title">
        {isZh ? '特别鸣谢' : 'Special Thanks'}
        <span className="about-thanks-no-order">
          {isZh ? '排名不分先后' : 'In no particular order'}
        </span>
      </h2>
      <ul className="about-thanks-cards">
        {THANKS_LIST.map((item, i) => (
          <li key={i}>
            <Card as="div" className="about-team-card">
              {isZh && <p className="about-team-name">{item.zh}</p>}
              <p className="about-thanks-en">{item.en}</p>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AboutThanks;
