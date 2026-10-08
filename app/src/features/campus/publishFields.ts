/** 丙 C-05：只提供域字段与提交；公共宿主和注册点归甲。 */
import type { FormValues } from '@/components/ui/FormField';
import { validateAll } from '@/components/ui/Form';
import type { MessageKey, Translate } from '@/i18n';
import type { PublishFormDescriptor } from '@/features/publish/descriptor';
import { fieldsOf } from '@/features/publish/descriptor';
import { CONFESSION_TEMPLATES, getTemplateMaxLength } from '../../../../shared/constants/confessionTemplates';
import { getQueryClient } from '@/shared/queryClient';
import { QK } from '../../../../shared/query/queryKeys';
import { secondaryTabStore } from '@/features/navigation/secondaryTabs';
import { createConfession } from '../../../../shared/api/confessions';

const TEMPLATE_LABELS: Readonly<Record<string, MessageKey>> = {
  bigtype: 'publish.wall.bigtype',
  letter: 'publish.wall.letter',
  note: 'publish.wall.note',
};

/** 标签由当前语言注入；枚举与上限来自共享常量，不能在App复制一份。 */
export function createWallPublishDescriptor(t: Translate): PublishFormDescriptor {
  const descriptor: PublishFormDescriptor = {
    id: 'wall',
    semantic: 'create',
    sections: [{
      title: 'publish.entry.wall',
      fields: [{
        kind: 'segmented', name: 'template_key', labelKey: 'publish.wall.template', required: true,
        source: { kind: 'constants', options: CONFESSION_TEMPLATES.map(template => ({
          value: template.key, label: t(TEMPLATE_LABELS[template.key]),
        })) },
        validate: value => CONFESSION_TEMPLATES.some(template => template.key === value)
          ? undefined : 'publish.wall.invalidTemplate',
      }, {
        kind: 'textarea', name: 'content', labelKey: 'publish.wall.content', required: true,
        maxLength: values => getTemplateMaxLength(values.template_key),
        validate: (value, values) => {
          if (typeof value !== 'string') return 'form.error.required';
          return value.length > getTemplateMaxLength(values.template_key)
            ? 'publish.wall.tooLong' : undefined;
        },
      }],
    }],
    submit: async (values: FormValues) => {
      const errors = validateAll(fieldsOf(descriptor), values);
      if (Object.keys(errors).length || typeof values.content !== 'string' || typeof values.template_key !== 'string') throw { kind: 'validation', target: t('publish.wall.content') };
      const result = await createConfession({content: values.content, template_key: values.template_key});
      if (!Number.isSafeInteger(result?.id) || result.id <= 0) throw {kind: 'unknown'};
      getQueryClient().removeQueries({queryKey: QK.confessionWindow('_guest')});
      secondaryTabStore.update('campus', 'wall', {scrollOffset: 0, cursor: null});
      return {id: result.id};
    },
    routeAfterSubmit: () => '/(tabs)/campus?tab=wall',
  };
  return descriptor;
}
