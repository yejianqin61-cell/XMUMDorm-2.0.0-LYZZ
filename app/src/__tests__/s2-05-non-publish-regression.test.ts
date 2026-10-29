/**
 * S2-05 · 非发布表单零回归守卫（阶段1-06）—— 自动化用例
 *
 * 测什么：
 *   1. **只有发布宿主**启用 footer 提交位（源码扫描）—— 其余 7 个 `Form` 消费方不传新 prop，
 *      走的是同一条默认路径，所以"默认行为不变"由 `S2-01` 的用例 1 + 本扫描共同证明；
 *   2. 发布注册表仍是 6 条 ready（阶段1 的验收面没有悄悄缩水）。
 *
 * ⚠️ 本任务原计划还要渲染「资料编辑 / 注册」两屏逐个断言。**未采用**，原因写入提交说明：
 *    两屏都包在会话与网络消费里，渲染成本高且断言内容与 `S2-01` 用例 1（默认无 footer）重复；
 *    这里改为"生产代码里没有任何消费方传新 prop"的机械证明 + 既有套件回归（见证据清单）。
 *
 * 依据：`docs/app_stage2/task/角色甲-公共壳与消息/阶段1-06-非发布表单零回归与截图清单.md`。
 */
import * as fs from 'fs';
import * as path from 'path';

import { stripComments } from './helpers/sourceScan';
import { readyPublishIds } from '@/features/publish/descriptor';
import { PUBLISH_REGISTRY } from '@/features/publish/registry';

const SRC = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['__tests__', 'node_modules', 'fixtures', 'helpers']);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name)) out.push(path.join(dir, entry.name));
  }
  return out;
}

const PRODUCTION_FILES = walk(SRC).map((file) => ({
  relative: path.relative(SRC, file).replace(/\\/g, '/'),
  source: stripComments(fs.readFileSync(file, 'utf8')),
}));

describe('S2-05 非发布表单零回归', () => {
  it('生产代码里只有表单骨架与发布宿主提到 submitPlacement', () => {
    const mentioning = PRODUCTION_FILES.filter((file) => file.source.includes('submitPlacement')).map(
      (file) => file.relative
    );
    expect(mentioning.sort()).toEqual(['components/ui/Form.tsx', 'features/publish/PublishFormHost.tsx']);
  });

  it('只有发布宿主以 footer 模式使用提交位（1 处）', () => {
    const footers = PRODUCTION_FILES.filter((file) => file.source.includes('submitPlacement="footer"'));
    expect(footers.map((file) => file.relative)).toEqual(['features/publish/PublishFormHost.tsx']);
  });

  it('发布注册表仍是 6 条 ready，且都有描述符（阶段1 验收面未缩水）', () => {
    const ready = readyPublishIds();
    expect(ready).toHaveLength(6);
    expect(ready.sort()).toEqual(
      ['clubActivity', 'clubPost', 'confession', 'errand', 'marketplace', 'wall'].sort()
    );
    expect(PUBLISH_REGISTRY.filter((entry) => entry.status === 'ready')).toHaveLength(6);
  });

  it('发布宿主把标题来源接到注册表（顶部标题不是技术性文案）', () => {
    const host = PRODUCTION_FILES.find((file) => file.relative === 'features/publish/PublishFormHost.tsx');
    expect(host?.source).toContain('getPublishEntry');
    expect(host?.source).toContain('titleKey');
  });
});
