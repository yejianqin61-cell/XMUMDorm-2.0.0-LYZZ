import { useRef } from 'react';
import { PageHead } from './parts.jsx';

/**
 * 设置与数据：本地存储状态、备份导出 / 导入、重置进度。
 *
 * 备份文件只含学习进度：导出时剔除 sync 段（同步码 / 地址 / 密钥），
 * 分享备份不会带出任何设备配置。
 */
export default function SettingsView({ t, storageOk, lastSaveAt, onExport, onImport, onReset }) {
  const fileRef = useRef(null);

  return (
    <div>
      <PageHead title={t('set_title')} sub={t('set_sub')} />

      <section className="malay-set-section">
        <h3 className="font-semibold">{t('set_local')}</h3>
        <p className="my-2 text-sm">
          <b>{t('set_storage')}</b>：
          <span className={storageOk ? 'malay-ok' : 'malay-bad'}>
            {storageOk ? t('set_storage_ok') : t('set_storage_bad')}
          </span>
        </p>
        <p className="my-2 text-sm">
          <b>{t('set_last_save')}</b>：
          {lastSaveAt ? new Date(lastSaveAt).toLocaleString() : t('set_never')}
        </p>
        <p className="my-3 text-sm opacity-70">{t('set_local_note')}</p>
        <p className="my-3 text-sm opacity-70">{t('campus_note')}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="malay-btn-secondary" onClick={onExport}>{t('set_export')}</button>
          <button type="button" className="malay-btn-secondary" onClick={() => fileRef.current && fileRef.current.click()}>
            {t('set_import')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files && event.target.files[0];
              if (file) onImport(file);
              event.target.value = '';
            }}
          />
        </div>
      </section>

      <section className="malay-set-section">
        <h3 className="font-semibold">{t('set_danger')}</h3>
        <p className="my-3 text-sm opacity-70">{t('set_danger_note')}</p>
        <button type="button" className="malay-btn-secondary malay-btn-red" onClick={onReset}>
          {t('reset_progress')}
        </button>
      </section>

      <p className="mt-4 text-xs opacity-60">{t('campus_sync_note')}</p>
    </div>
  );
}
