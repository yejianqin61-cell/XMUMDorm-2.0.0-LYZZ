# 06 — App Apple 风格底部 Tab 栏

**What to build:** 将 Capacitor App 底部主导航改为紧凑的单层液态玻璃栏，以共享蒙版滑动表达选中状态，同时保持现有路由、返回键和安全区行为。

**Blocked by:** None — can start immediately。

**Status:** ready-for-agent

- [ ] 四个主 Tab（广场、树洞、食堂、我的）在一屏完整展示，不增加横向滚动或 More。
- [ ] 视觉栏高度收束到约 56–60px，安全区独立叠加，最后一项内容不被遮挡。
- [ ] 整条 Tab 栏只使用一层轻量半透明/模糊材质，不为每个 Tab 套独立卡片、渐变或重阴影。
- [ ] 选中蒙版在四个 Tab 之间共享滑动，动画约 160–220ms，可被下一次点击打断。
- [ ] 选中态同时通过图标/文字层级和蒙版表达，不只依赖颜色；未选中态保持可读对比度。
- [ ] `prefers-reduced-motion: reduce` 下关闭位移/缩放动画，保留即时选中反馈。
- [ ] Android WebView 不支持 `backdrop-filter` 时仍有清晰的背景 fallback。
- [ ] 中文、英文、字体放大、屏幕阅读器、Android 手势导航和三键导航均完成回归。

