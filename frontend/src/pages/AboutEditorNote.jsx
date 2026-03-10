import Card from '../components/Card';
import './AboutEditorNote.css';

/** 编者的话详情页：先中文后英文，日期 2026/3/10 */
function AboutEditorNote() {
  return (
    <div className="about-editor-page">
      <Card as="div" className="about-editor-card">
        <div className="about-editor-header">
          <h2 className="about-editor-title">编者的话 Editor&apos;s Note</h2>
          <span className="about-editor-date">2026/3/10</span>
        </div>
        <div className="about-editor-section" aria-label="编者的话（中文）">
          <p className="about-editor-p">
            Dorm 最初只是一个很简单的想法：只是想做一个真正属于校园生活的社区平台，让同学们可以分享信息、交流体验，也能更方便地了解校园里的食堂和商家。
          </p>
          <p className="about-editor-p">
            这个项目从最初的一个想法，到一点点写下第一行代码，再到今天逐渐成形，经历了许多尝试与调整。Dorm 仍然只是一个刚刚起步的小项目，还有许多需要改进的地方。
          </p>
          <p className="about-editor-p">
            在这个过程中，我也得到了父母、老师、朋友和同学的建议与鼓励。正是这些帮助，让 Dorm 能够一步步向前发展。
          </p>
          <p className="about-editor-p">
            同时也要感谢一路陪伴我的 AI 工具：Cursor、ChatGPT、DeepSeek、豆包、即梦 AI。在这个新质生产力大放异彩的新时代，人工智能正在成为推动创新的重要力量。
          </p>
          <p className="about-editor-p about-editor-quote">
            绿我涓滴，会它千顷澄碧。
          </p>
          <p className="about-editor-p">
            希望 Dorm 2.0、3.0、4.0、5.0、6.0…… 能够不断成长，在未来成为一个真正有用的校园平台，为同学们的校园生活带来更多便利与连接。我们一同进步!
          </p>
          <p className="about-editor-sign">
            — 叶健钦
            <br />
            Dorm 创始人
          </p>
        </div>
        <hr className="about-editor-divider" />
        <div className="about-editor-section" aria-label="Editor's Note (English)">
          <p className="about-editor-p">
            Dorm began with a very simple idea: to build a community platform truly belonging to campus life, where
            students can share information, exchange experiences, and more easily discover the food and businesses
            around campus.
          </p>
          <p className="about-editor-p">
            From the initial idea to writing the very first line of code, and gradually shaping it into what it is
            today, this project has gone through many attempts and adjustments. Dorm is still a small project at its
            early stage, and there is much more to improve.
          </p>
          <p className="about-editor-p">
            Along the way, I have received encouragement and support from my parents, teachers, friends, and classmates.
            Their advice and kindness have helped Dorm move forward step by step.
          </p>
          <p className="about-editor-p">
            I would also like to thank the AI tools that accompanied me during this journey — Cursor, ChatGPT, DeepSeek,
            Doubao, and Jimeng AI. In this era of rapidly emerging new productive forces, artificial intelligence is
            becoming an important driving force for innovation.
          </p>
          <p className="about-editor-p about-editor-quote">
            &quot;A drop of green may one day gather into a vast, clear lake.&quot;
          </p>
          <p className="about-editor-p">
            I hope that Dorm 2.0, 3.0, 4.0, 5.0, 6.0… will continue to grow and eventually become a truly useful platform for campus life, bringing more convenience and connection to students.
          </p>
          <p className="about-editor-sign">
            — Ye Jianqin
            <br />
            Founder of Dorm
          </p>
        </div>
      </Card>
    </div>
  );
}

export default AboutEditorNote;
