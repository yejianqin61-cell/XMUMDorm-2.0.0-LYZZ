# App Stage 2 工程资料

本目录集中存放 App 第二阶段的需求、设计、开发任务、测试和验收资料。

## 当前目录

- [`requirements/`](requirements/)：第二阶段需求与范围说明。
- [角色丁：二手与私聊](requirements/角色丁-二手与私聊/README.md)：丁的 PRD、阶段计划与验收清单。
- [`task/`](task/)：逐阶段实施计划与任务入口。
- [`test/`](test/)：全期验收矩阵与角色验收清单。
- [`team/`](team/)：本阶段协作时使用的团队规范文档副本。
- [`task/`](task/README.md)：实施计划与任务书；[丙方任务](task/丙/README.md)的本人删除实现与自动验证已交付，设备验收未验证。
- [`evaluation/`](evaluation/README.md)：审查与验收；[丙方审查索引](evaluation/丙/README.md)包含首次开工与本人删除任务的固定提交审查。
- [`design/assets/广场首包参考-2026-10-28.jpg`](design/assets/广场首包参考-2026-10-28.jpg)：广场首包截图。

团队领导已于 2026-10-28 确认统一执行标准。开工先读[`requirements/Stage2统一口径与接口契约.md`](requirements/Stage2统一口径与接口契约.md)和[`test/Stage2验收矩阵.md`](test/Stage2验收矩阵.md)；
产品裁决以[`requirements/Stage2待裁决登记册.md`](requirements/Stage2待裁决登记册.md)为准。
实施中出现新产品选择时，先记入登记册再由团队领导裁决。

## 归档规则

后续 Stage 2 工程文件按以下目录归档；目录不存在时直接创建：

- `requirements/`：需求、范围、验收标准
- `design/`：交互、视觉和技术设计
- `task/`：拆分任务、负责人和实施计划
- `test/`：测试用例、设备验证和回归记录
- `evaluation/`：审计、验收和阶段总结
- `contracts/`：已裁决的跨模块接口契约

本目录只收录 Stage 2 资料，不复制 `docs/app` 中的历史阶段文件。已有 App 总体设计体系仍位于 [`../app/`](../app/)，需要查阅历史背景或共享设计规范时从那里进入。

## 协作入口

开始工作前请先阅读 [`team/README.md`](team/README.md)，并遵守其中的团队协作契约、Git 协作手册和数据库变更门禁。
