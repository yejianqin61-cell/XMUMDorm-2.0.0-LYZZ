/**
 * 二手商品编辑屏（阶段B-06，R-11 / 丁 A-3）
 *
 * 只做集成：复用二手发布**同一份字段描述符**（`buildDescriptor('marketplace')`），
 * 初始值来自详情，提交走 `updateMarketplaceItem`。⛔ 不新增图片编辑接口（丁的契约），
 * 本轮只编辑文本/价格/分类/配送/宿舍区；图片保持原样。
 */

import * as React from 'react';
import { useRouter } from 'expo-router';

import { ErrorState } from '@/components/ui/ErrorState';
import { Form, useForm, type FormLabels } from '@/components/ui/Form';
import { LoadingState } from '@/components/ui/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { useToast } from '@/components/ui/Toast';
import type { FormValues } from '@/components/ui/FormField';
import { useI18n } from '@/i18n';
import type { AppError } from '@/i18n/errors';
import { getMarketplaceItemDetail, updateMarketplaceItem } from '../../../../shared/api/marketplace';
import { buildDescriptor } from '@/features/publish/resolveDescriptor';
import { fieldsOf } from '@/features/publish/descriptor';
import { useResolvedDescriptor } from '@/features/publish/resolveDescriptor';
import { readMarketDetail, type MarketDetail } from './model';

export function MarketEditScreen({ itemId }: { itemId: string }): React.ReactElement {
  const { t } = useI18n();
  const [detail, setDetail] = React.useState<MarketDetail | null>(null);
  const [error, setError] = React.useState<AppError | null>(null);
  const base = React.useMemo(() => buildDescriptor('marketplace', t), [t]);
  const resolved = useResolvedDescriptor(base!, true);

  React.useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const raw = await getMarketplaceItemDetail(Number(itemId));
        if (active) setDetail(readMarketDetail(raw));
      } catch {
        if (active) setError({ kind: 'content' });
      }
    })();
    return () => {
      active = false;
    };
  }, [itemId]);

  if (resolved.loading || (detail === null && error === null)) {
    return (
      <Screen testID="market-edit" titleKey="screen.market.edit">
        <LoadingState variant="skeleton" />
      </Screen>
    );
  }
  if (error || detail === null || resolved.error) {
    return (
      <Screen testID="market-edit" titleKey="screen.market.edit">
        <ErrorState error={error ?? { kind: 'unknown' }} onAction={() => undefined} />
      </Screen>
    );
  }
  return <MarketEditForm detail={detail} sections={resolved.descriptor.sections} />;
}

function MarketEditForm({ detail, sections }: {
  detail: MarketDetail;
  sections: ReturnType<typeof useResolvedDescriptor>['descriptor']['sections'];
}): React.ReactElement {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const fields = React.useMemo(() => fieldsOf({ id: 'marketplace', semantic: 'update', sections } as never), [sections]);
  const initialValues: FormValues = React.useMemo(
    () => ({
      title: detail.title,
      description: detail.description,
      price: String(detail.price),
      category: detail.category ?? '',
      delivery_method: detail.deliveryMethod ?? '',
      dorm_area: detail.dormArea ?? '',
    }),
    [detail]
  );
  const form = useForm({
    formId: `market-edit-${detail.id}`,
    fields,
    initialValues,
    enableDraft: false,
    skipDraftRestore: true,
    onSubmit: async (values) => {
      await updateMarketplaceItem(detail.id, {
        title: values.title,
        description: values.description,
        price: Number(values.price),
        category: values.category,
        delivery_method: values.delivery_method,
        dorm_area: values.dorm_area,
      });
    },
  });
  const labels: FormLabels = {
    submit: t('action.save'),
    cancel: t('action.cancel'),
    errorSummaryTitle: t('form.summary.title'),
    leaveTitle: t('form.leave.title'),
    leaveBody: t('form.leave.body'),
    leaveConfirm: t('form.leave.confirm'),
    leaveCancel: t('form.leave.cancel'),
  };
  return (
    <Form
      testID="market-edit-form"
      titleKey="screen.market.edit"
      form={form}
      sections={sections}
      labels={labels}
      semantic="update"
      onCancel={() => router.back()}
      onSettled={() => {
        toast.show({ message: t('screen.market.edited'), tone: 'success' });
        router.back();
      }}
    />
  );
}
