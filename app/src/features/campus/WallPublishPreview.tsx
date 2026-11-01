import * as React from 'react';
import type { FormValues } from '@/components/ui/FormField';
import { WallTemplateBody } from './wallTemplates';

/** Public publish host can render this module preview from its current form values. */
export function WallPublishPreview({ values }: { values: FormValues }): React.ReactElement | null {
  if (typeof values.content !== 'string' || !values.content.trim()) return null;
  return <WallTemplateBody templateKey={values.template_key} content={values.content} />;
}
