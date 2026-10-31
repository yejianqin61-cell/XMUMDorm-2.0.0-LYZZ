import * as React from 'react';
import { useLocalSearchParams } from 'expo-router';

import { CampusDetailScreen } from '@/features/campus/CampusScreens';
import type { TreeholeImageSaveOptions } from '@/features/campus/TreeholeImageSaveControls';
import type { TreeholeImageSaver } from '@/features/campus/treeholeImageSave';
import { useI18n } from '@/i18n';
import { createAlbumSaver, isAlbumAvailable } from '@/shared/mediaLibrary';

/**
 * 树洞/万能墙详情路由（甲）。
 *
 * 阶段A-04：图库能力在这里注入 —— 只有设备/构建真的带图库时才把 `imageSave` 交给详情屏，
 * 否则详情保持纯阅读（保存入口不出现）。保存事务只创建一次：详情与全屏预览共用同一实例，
 * 避免同一张图被重复下载/写入（丙的事务内部还会按 URL 去重）。
 */
export default function CampusRoute(): React.ReactElement {
  const { id, published, comment } = useLocalSearchParams<{
    id: string | string[];
    published?: string;
    comment?: string;
  }>();
  const { t } = useI18n();
  const [save, setSave] = React.useState<TreeholeImageSaver | null>(null);

  React.useEffect(() => {
    let alive = true;
    void isAlbumAvailable().then(available => {
      // ⚠️ 必须用 updater 形式：saver 本身是函数，直接 setSave(fn) 会被 React 当成状态更新函数调用掉
      if (alive && available) setSave(() => createAlbumSaver());
    });
    return () => {
      alive = false;
    };
  }, []);

  const imageSave = React.useMemo<TreeholeImageSaveOptions | undefined>(
    () =>
      save === null
        ? undefined
        : {
            save,
            messages: {
              save: t('screen.campus.mediaSave'),
              saving: t('screen.campus.mediaSaving'),
              saved: t('screen.campus.mediaSaved'),
              permissionDenied: t('screen.campus.mediaPermissionDenied'),
              failed: t('screen.campus.mediaSaveFailed'),
            },
          },
    [save, t]
  );

  return (
    <CampusDetailScreen
      published={published === '1'}
      postId={typeof id === 'string' ? id : ''}
      imageSave={imageSave}
      comment={typeof comment === 'string' ? comment : undefined}
    />
  );
}
