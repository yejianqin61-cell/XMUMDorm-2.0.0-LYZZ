import Card from '../components/Card';
import { useLanguage } from '../context/LanguageContext';
import './AboutEditorNote.css';

/** 编者的话详情页：支持中/英模式切换 */
function AboutEditorNote() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';

  return (
    <div className="about-editor-page">
      <Card as="div" className="about-editor-card">
        <div className="about-editor-header">
          <h2 className="about-editor-title">
            {isZh ? '编者的话' : "Editor's Note"}
          </h2>
          <span className="about-editor-date">2026/3/10</span>
        </div>

        {isZh && (
          <>
            <div className="about-editor-section" aria-label="编者的话（中文）">
              <p className="about-editor-p">
                Dorm 源于2025年10月5日：只是想做一个真正属于校园生活的社区平台，让同学们可以分享信息、交流体验。
              </p>
              <p className="about-editor-p">
                感谢所有关心Dorm的老师、同学、朋友的建议与鼓励。正是这些帮助，让 Dorm 能够一步步向前发展。
              </p>
              <p className="about-editor-p">
                在这个新质生产力大放异彩的新时代，人工智能正在成为推动创新的重要力量。
              </p>
              <p className="about-editor-p about-editor-quote">
                绿我涓滴，会它千顷澄碧。
              </p>
              <p className="about-editor-p">
                希望 Dorm 2.0、3.0、4.0、5.0、6.0…… 能够不断成长。
              </p>
              <p className="about-editor-sign">
                — Dorm
                <br />
                XMUM Dorm
              </p>
            </div>
            <hr className="about-editor-divider" />
          </>
        )}

        {!isZh && (
          <div
            className="about-editor-section"
            aria-label="Editor's Note"
          >
            <p className="about-editor-p">
              Dorm began on October 5, 2025, with a simple wish: to build a community platform truly belonging to campus
              life, where students can share information and exchange experiences.
            </p>
            <p className="about-editor-p">
              Thank you to every teacher, classmate, and friend who has cared about Dorm, for your advice and encouragement.
              Your support has helped Dorm move forward, step by step.
            </p>
            <p className="about-editor-p">
              In this new era, where new forms of productivity are shining brightly, artificial intelligence is becoming
              an important force for innovation.
            </p>
            <p className="about-editor-p about-editor-quote">
              &quot;A drop of green may one day gather into a vast, clear lake.&quot;
            </p>
            <p className="about-editor-p">
              I hope that Dorm 2.0, 3.0, 4.0, 5.0, 6.0… will continue to grow.
            </p>
            <p className="about-editor-sign">
              — Dorm
              <br />
              XMUM Dorm
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

export default AboutEditorNote;
