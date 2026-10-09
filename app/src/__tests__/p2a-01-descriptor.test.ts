/**
 * P2A-01 · 发布描述符契约与缺口账本 —— 自动化用例
 *
 * 测什么（接缝 S-4 纯规则，本任务不渲染）：
 *   注册表 ↔ 描述符的一致性、缺口账本的"不多不少"、四条不变量。
 *
 * 依据：`docs/app/task/phase-2/P2A-01-描述符契约与缺口账本.md`；
 *      [开发设计文档-甲 §3-JR-1](../../../../docs/app/task/phase-2/开发设计文档-甲.md)。
 */
import { zh } from '@/i18n';
import {
  assertDescriptorInvariants,
  draftFormIdFor,
  fieldsOf,
  readyPublishIds,
  resolvePublishDestination,
  type PublishFormDescriptor,
} from '@/features/publish/descriptor';
import {
  KNOWN_MISSING_DESCRIPTORS,
  PUBLISH_DESCRIPTORS,
  assertDescriptorLedger,
  getPublishDescriptor,
  missingDescriptorIds,
} from '@/features/publish/descriptors';

const DICT_KEYS = Object.keys(zh);

/** 一份合法描述符（阳性对照：不变量不许"永远抛"） */
function validDescriptor(): PublishFormDescriptor {
  return {
    id: 'confession',
    semantic: 'create',
    sections: [
      {
        title: 'publish.title',
        fields: [
          { kind: 'text', name: 'title', labelKey: 'publish.entry.confession', required: true },
        ],
      },
    ],
    submit: async () => ({ id: 7 }),
    routeAfterSubmit: (result) => `/post/${(result as { id?: number })?.id ?? ''}`,
  };
}

describe('P2A-01 发布描述符契约与缺口账本', () => {
  describe('TC-P2A-01-1A · 缺口账本与发布注册表一致', () => {
    it('实际缺的恰好是注册表里 5 条 ready（不多不少）', () => {
      expect(readyPublishIds().slice().sort()).toEqual([
        'clubActivity',
        'confession',
        'errand',
        'marketplace',
        'wall',
      ]);
      expect(missingDescriptorIds()).toEqual(['clubActivity']);
    });

    it('账本与实现一致（断言不抛）', () => {
      expect(() => assertDescriptorLedger()).not.toThrow();
    });

    it('丙交付的四类描述符已注册，剩余缺口仍被登记', () => {
      expect(Object.keys(PUBLISH_DESCRIPTORS).sort()).toEqual(['confession', 'errand', 'marketplace', 'wall']);
      expect(publish_missingEqualsLedger()).toBe(true);
    });
  });

  describe('TC-P2A-01-2A · id 必须在注册表里且必须 ready', () => {
    it('指向未注册的发布类型 → 抛', () => {
      const bad = { ...validDescriptor(), id: 'not-a-type' as never };
      expect(() => assertDescriptorInvariants([bad], DICT_KEYS)).toThrow(/未注册/);
    });

    it('指向 planned（拼车 / 问答，后端 0 表 0 端点）→ 抛', () => {
      const bad = { ...validDescriptor(), id: 'carpool' as const };
      expect(() => assertDescriptorInvariants([bad], DICT_KEYS)).toThrow(/未就绪/);
    });

    it('合法描述符通过（阳性对照）', () => {
      expect(() => assertDescriptorInvariants([validDescriptor()], DICT_KEYS)).not.toThrow();
    });
  });

  describe('TC-P2A-01-3A · 字段名唯一', () => {
    it('同一分节两个同名字段 → 抛', () => {
      const bad = validDescriptor();
      const badWithDup: PublishFormDescriptor = {
        ...bad,
        sections: [
          {
            title: 'publish.title',
            fields: [
              { kind: 'text', name: 'title', labelKey: 'publish.entry.wall' },
              { kind: 'textarea', name: 'title', labelKey: 'publish.entry.wall' },
            ],
          },
        ],
      };
      expect(() => assertDescriptorInvariants([badWithDup], DICT_KEYS)).toThrow(/重名/);
    });
  });

  describe('TC-P2A-01-4A · labelKey 必须在词条表里', () => {
    it('不存在的 labelKey → 抛；且报错里带上字段名', () => {
      const field = { kind: 'text' as const, name: 'body', labelKey: 'publish.nope' as never };
      const bad: PublishFormDescriptor = {
        ...validDescriptor(),
        sections: [{ title: 'publish.title', fields: [field] }],
      };
      expect(() => assertDescriptorInvariants([bad], DICT_KEYS)).toThrow(/body/);
    });
  });

  describe('TC-P2A-01-5A · 媒体字段与 create 去向', () => {
    it('声明的媒体字段必须存在且 neverDraft:true', () => {
      const missing = { ...validDescriptor(), mediaFields: ['images'] };
      expect(() => assertDescriptorInvariants([missing], DICT_KEYS)).toThrow(/媒体字段不存在/);

      const notDraftSafe: PublishFormDescriptor = {
        ...validDescriptor(),
        mediaFields: ['images'],
        sections: [
          {
            title: 'publish.title',
            fields: [{ kind: 'custom', name: 'images', labelKey: 'publish.entry.wall' }],
          },
        ],
      };
      expect(() => assertDescriptorInvariants([notDraftSafe], DICT_KEYS)).toThrow(/neverDraft/);

      const safe: PublishFormDescriptor = {
        ...notDraftSafe,
        sections: [
          {
            title: 'publish.title',
            fields: [
              { kind: 'custom', name: 'images', labelKey: 'publish.entry.wall', neverDraft: true },
            ],
          },
        ],
      };
      expect(() => assertDescriptorInvariants([safe], DICT_KEYS)).not.toThrow();
    });

    it('create 语义缺 routeAfterSubmit → 抛（发完要知道去哪）', () => {
      const { routeAfterSubmit: _omitted, ...withoutRoute } = validDescriptor();
      expect(() => assertDescriptorInvariants([withoutRoute], DICT_KEYS)).toThrow(/routeAfterSubmit/);
    });

    it('草稿 id 默认为 `publish:<id>`，显式给则用它', () => {
      expect(draftFormIdFor(validDescriptor())).toBe('publish:confession');
      expect(draftFormIdFor({ ...validDescriptor(), formId: 'draft-x' })).toBe('draft-x');
    });

    it('去向：结果里的 route 优先，否则走 routeAfterSubmit', () => {
      const descriptor = validDescriptor();
      expect(resolvePublishDestination(descriptor, { route: '/x' })).toBe('/x');
      expect(resolvePublishDestination(descriptor, { id: 3 })).toBe('/post/3');
      expect(resolvePublishDestination(descriptor, undefined)).toBe('/post/');
    });
  });

  describe('getPublishDescriptor', () => {
    it('未交付的 id 返回 undefined（宿主据此走"暂未开放"分支）', () => {
      expect(getPublishDescriptor('clubActivity')).toBeUndefined();
    });

    it('字段展平工具按分节顺序返回全部字段', () => {
      const descriptor = validDescriptor();
      expect(fieldsOf(descriptor).map((f) => f.name)).toEqual(['title']);
    });
  });
});

/** 账本与实现的一致性（提出来是为了让"不抛"这件事显式可见） */
function publish_missingEqualsLedger(): boolean {
  return (
    missingDescriptorIds().join(',') === [...KNOWN_MISSING_DESCRIPTORS].sort().join(',')
  );
}
