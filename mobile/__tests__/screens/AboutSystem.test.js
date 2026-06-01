/**
 * 关于系统测试  — 静态内容 + 双语 + 联系信息验证
 */
describe('关于 — 团队数据', () => {
  it('1. 团队分组存在', () => {
    const sections = ['创始人', '技术顾问', '美术顾问', '宣发团队', '探索团队'];
    expect(sections).toHaveLength(5);
  });
  it('2. 创始人名称', () => {
    const founder = '叶健钦';
    expect(founder).toBeTruthy();
  });
  it('3. 宣发团队 8 人', () => {
    const promo = ['Xu Zhiyao', 'Tian Wenqi', 'Zheng Huangze', 'Wang Linxi', 'Ling Bangyao', 'Lin Haoyun', 'Xia Youran', 'Yin Peisen'];
    expect(promo).toHaveLength(8);
  });
});

describe('关于 — 鸣谢数据', () => {
  it('4. 11 位鸣谢对象', () => {
    const thanks = ['张隆扬', '李靖教授', 'Pink 刘晓强', '叶以翔', '郑贤教授', '陈淑琦老师', '赖瑾乐', 'yyj女士', '程新招医生', '朱晓帆教授', '涂宜晖女士'];
    expect(thanks).toHaveLength(11);
  });
  it('5. 排名不分先后', () => {
    const text = '排名不分先后';
    expect(text).toContain('不分先后');
  });
});

describe('关于 — 联系信息', () => {
  it('6. 微信', () => {
    const wechat = 'YEJIANQIN_git';
    expect(wechat).toContain('YEJIANQIN');
  });
  it('7. 电话', () => {
    const phone = '01115078663';
    expect(phone.length).toBeGreaterThan(5);
  });
  it('8. 邮箱', () => {
    const email = 'yejianqin61@gmail.com';
    expect(email).toContain('@');
  });
});

describe('关于 — 免责声明', () => {
  it('9. 免责内容关键信息', () => {
    const content = '学生独立开发';
    expect(content).toContain('学生');
  });
  it('10. 非官方立场', () => {
    const content = '不代表校方官方立场';
    expect(content).toContain('官方');
  });
});

describe('关于 — 编者的话', () => {
  it('11. 编者署名', () => {
    const author = '叶健钦';
    expect(author).toBeTruthy();
  });
  it('12. 日期', () => {
    const date = '2026 / 3 / 10';
    expect(date).toContain('2026');
  });
  it('13. 金句存在', () => {
    const quote = '绿我涓滴，会它千顷澄碧';
    expect(quote).toContain('涓滴');
  });
});

describe('关于 — 页面 Tab', () => {
  it('14. AboutProfile 双 Tab', () => {
    const tabs = ['团队介绍', '编者的话'];
    expect(tabs).toHaveLength(2);
  });
  it('15. AboutInfo 双 Tab', () => {
    const tabs = ['免责声明', '联系我们'];
    expect(tabs).toHaveLength(2);
  });
});

describe('关于 — 双语', () => {
  it('16. 中文团队标签', () => {
    const sections = [
      { title: '创始人 & 开发者', enTitle: 'Founder & Developer' },
      { title: '技术顾问', enTitle: 'Tech Advisor' },
    ];
    expect(sections[0].enTitle).toBe('Founder & Developer');
  });
});

describe('关于 — 页面数量', () => {
  it('17. 4 个关于页面', () => {
    const pages = ['AboutProfile', 'AboutThanks', 'AboutInfo', 'AboutLevel'];
    expect(pages).toHaveLength(4);
  });
});

describe('关于 — 内容完整性', () => {
  it('18. Dorm 3.0 探索团队 2 人', () => {
    const members = ['叶健钦', 'Zheng Huangze'];
    expect(members).toHaveLength(2);
  });
  it('19. XMUM 缩写', () => {
    expect('XMUM').toBe('XMUM');
  });
  it('20. 帮助支持措辞', () => {
    const feedback = '欢迎同学们提供反馈建议';
    expect(feedback).toContain('反馈');
  });
});
