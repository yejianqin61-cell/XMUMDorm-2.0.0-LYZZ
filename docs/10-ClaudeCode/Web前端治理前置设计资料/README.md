# Web前端治理前置设计资料

## 1. 目的

本目录用于给后续接手 Web 前端治理的人快速建立上下文。

这里不重复复制原文档内容，只整理当前仍需继续参考的前置设计文档入口，避免出现多份文档版本漂移。

## 2. 纳入范围

仅纳入以下两类文档：

- 仍对后续 Web 前端治理有直接指导作用的设计文档
- 用于明确边界、现状、视觉语言、迁移顺序的前置说明文档

## 3. 明确排除

以下内容不放入本交接清单：

- 所有 Task 文档
- 所有 Task 拆解文档
- 已完成阶段的阶段性公报
- 已完成 Step 的详细设计文档

当前按此原则，排除：

- `docs/05-Tasks/` 下全部任务文档
- `docs/09-Deploy/Step1-Step3阶段性开发完成度公报.md`
- `docs/09-Deploy/Step1-设计Token层详细设计文档.md`
- `docs/09-Deploy/Step2-基础UI组件层详细设计文档.md`
- `docs/09-Deploy/Step3-页面模板层详细设计文档.md`
- `docs/09-Deploy/Step3-页面模板层实施级详细设计文档.md`
- `docs/09-Deploy/Step3-工作台与后台模板预留详细设计文档.md`
- `docs/09-Deploy/Step4-Web主壳Task拆解文档.md`
- `docs/09-Deploy/Step5-高频页面迁移Task拆解文档.md`
- `docs/09-Deploy/Web改版分阶段任务清单.md`

## 4. 建议必读顺序

### 第 1 组：先理解项目边界

1. [前端拆分说明](D:/.pogget/user_storage/u_a02ec0/d5cdb/XMUMDorm-2.0.0-LYZZ/docs/09-Deploy/前端拆分说明.md)
2. [Web改版开发边界说明](D:/.pogget/user_storage/u_a02ec0/d5cdb/XMUMDorm-2.0.0-LYZZ/docs/09-Deploy/Web改版开发边界说明.md)

这两份先回答两个问题：

- 为什么 Web 和 App 前端要开始分化
- 这轮 Web 治理什么能动，什么不能动

### 第 2 组：再看当前现状和视觉方向

3. [Web前端现状盘点表](D:/.pogget/user_storage/u_a02ec0/d5cdb/XMUMDorm-2.0.0-LYZZ/docs/09-Deploy/Web前端现状盘点表.md)
4. [Web前端视觉语言统一设计方案](D:/.pogget/user_storage/u_a02ec0/d5cdb/XMUMDorm-2.0.0-LYZZ/docs/09-Deploy/Web前端视觉语言统一设计方案.md)
5. [Web桌面化布局规范](D:/.pogget/user_storage/u_a02ec0/d5cdb/XMUMDorm-2.0.0-LYZZ/docs/09-Deploy/Web桌面化布局规范.md)

这三份主要回答：

- 现在前端有哪些页面、组件、结构负担
- 改版后的视觉语言应该统一成什么样
- 桌面端布局应该长成什么样

### 第 3 组：最后看迁移顺序和后续设计

6. [Web前端迁移步骤与开发顺序说明](D:/.pogget/user_storage/u_a02ec0/d5cdb/XMUMDorm-2.0.0-LYZZ/docs/09-Deploy/Web前端迁移步骤与开发顺序说明.md)
7. [Step4-Web主壳详细设计文档](D:/.pogget/user_storage/u_a02ec0/d5cdb/XMUMDorm-2.0.0-LYZZ/docs/09-Deploy/Step4-Web主壳详细设计文档.md)
8. [Step5-高频页面迁移详细设计文档](D:/.pogget/user_storage/u_a02ec0/d5cdb/XMUMDorm-2.0.0-LYZZ/docs/09-Deploy/Step5-高频页面迁移详细设计文档.md)

这三份主要回答：

- 后续 Web 治理按什么顺序推进
- 主壳层怎么搭
- 高频页面如何一批批迁移进桌面化主壳

## 5. 每份文档的作用

| 文档 | 作用 |
|------|------|
| `前端拆分说明.md` | 解释 Web 前端与 App 前端的分化背景、共享后端前提和代码边界 |
| `Web改版开发边界说明.md` | 约束这轮 Web 治理的改动边界，避免误伤 App 包装链路 |
| `Web前端现状盘点表.md` | 盘点现有页面、组件、结构现状，便于接手人快速摸清资产 |
| `Web前端视觉语言统一设计方案.md` | 明确浅色、活泼、校园风的全站视觉语言、组件复用原则与文案语气 |
| `Web桌面化布局规范.md` | 规定 Web 端桌面布局、栏位关系、响应式退化方式 |
| `Web前端迁移步骤与开发顺序说明.md` | 说明迁移分步、开发顺序、验收节奏与提问点 |
| `Step4-Web主壳详细设计文档.md` | 主站桌面壳、导航、内容容器、辅助栏的结构设计 |
| `Step5-高频页面迁移详细设计文档.md` | 高频页面接入主壳时的迁移策略与页面级落地规则 |

## 6. 交接建议

后续接手时，建议先只依据本目录中的文档建立理解，再回到代码和对应任务执行。

如果后续还要继续补交接材料，优先补这两类：

- 仍未完成阶段的设计文档
- 当前代码现状和设计文档之间的差异清单
