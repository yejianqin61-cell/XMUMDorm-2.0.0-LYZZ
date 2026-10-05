/**
 * P0-11 · 四把尺子接入 CI —— 自动化用例
 *
 * 验的是"门是否真的是门"：四条命令的参数与宪法 14 表逐字一致、
 * ⛔ 没有 `continue-on-error` / `|| true` 这类"假装的门"、路径过滤覆盖 `app/**`、
 * 且**不依赖 EAS secret**（否则本地与 CI 会跑成两套）。
 *
 * ⚠️ "本地干跑四把尺子"由 `npm run rulers`（在 app/ 下）承担，属执行级证据，
 *    记录在 P0-11 §8 执行记录里，不在本文件里 spawn 进程。
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const WORKFLOW = path.join(REPO_ROOT, '.github', 'workflows', 'app-rulers-and-tests.yml');
const APP_PKG = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, 'app', 'package.json'), 'utf8')
) as { scripts: Record<string, string> };

const workflowText = fs.readFileSync(WORKFLOW, 'utf8');

describe('P0-11 四把尺子接入 CI', () => {
  it('TC-P0-11-1A · 四把尺子各出现一次，且参数与宪法 14 表逐字一致', () => {
    expect(workflowText).toContain(
      'node scripts/design-debt-report.js --path app/src --fail-on-zero'
    );
    expect(workflowText).toContain(
      'node scripts/contrast-check.js --file tokens/generated/tokens.check.json --fail'
    );
    expect(workflowText).toContain('node scripts/brand-ramp.js --hue 261.2 --fail');
    expect(workflowText).toContain('node scripts/gen-tokens.js --check');

    // 各一次（不是"漏了一个也没关系"）
    for (const needle of [
      'design-debt-report.js',
      'contrast-check.js',
      'brand-ramp.js',
      'gen-tokens.js',
    ]) {
      const occurrences = workflowText.split(needle).length - 1;
      expect(`${needle}:${occurrences}`).toBe(`${needle}:1`);
    }
  });

  it('TC-P0-11-2A · ⛔ 没有"假装的门"（continue-on-error / || true / exit 0）', () => {
    expect(workflowText).not.toMatch(/continue-on-error/);
    expect(workflowText).not.toMatch(/\|\|\s*true/);
    expect(workflowText).not.toMatch(/--fail-on-zero\s*\|\|/);
  });

  it('TC-P0-11-4A · 触发路径覆盖 app/**、tokens/**、scripts/**', () => {
    for (const glob of ["'app/**'", "'tokens/**'", "'scripts/**'"]) {
      expect(workflowText).toContain(glob);
    }
    expect(workflowText).toContain('pull_request');
  });

  it('不依赖 EAS 凭据（把"能跑测试"与"能发构建"解耦）', () => {
    // 只看**实际用法**：注释里说明"刻意不用"是文档需要，不算依赖
    expect(workflowText).not.toMatch(/secrets\./);
    expect(workflowText).not.toMatch(/npx eas|eas-cli|eas build/);
  });

  it('用 npm ci（锁文件生效）而不是 npm install', () => {
    expect(workflowText).toContain('npm ci');
    expect(workflowText).not.toMatch(/npm install\b/);
  });

  it('本地与 CI 跑同一套参数：app/package.json 的 rulers 脚本逐条对齐', () => {
    expect(APP_PKG.scripts['rulers:debt']).toContain(
      'design-debt-report.js --path ./src --fail-on-zero'
    );
    expect(APP_PKG.scripts['rulers:contrast']).toContain(
      'contrast-check.js --file ../tokens/generated/tokens.check.json --fail'
    );
    expect(APP_PKG.scripts['rulers:brand']).toContain('brand-ramp.js --hue 261.2 --fail');
    expect(APP_PKG.scripts['rulers:tokens']).toContain('gen-tokens.js --check');
    expect(APP_PKG.scripts.rulers.split('&&')).toHaveLength(4);
  });
});
