import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Toast } from '../context/ToastContext';
import { getVisibleTags, setTagVisibility } from '@shared/api/tags';
import { getApiErrorMessage } from '../utils/apiError';
import { QK } from '../query/queryKeys';
import { X, Plus } from 'lucide-react';

function applyVisibilityToggle(data, tagId, visible) {
  if (!data) return data;
  const id = Number(tagId);
  const baseAll =
    Array.isArray(data.all) && data.all.length > 0
      ? data.all
      : [...(data.visible || []), ...(data.hidden || [])];
  const all = baseAll.map((t) =>
    Number(t.id) === id ? { ...t, visible } : t
  );
  return {
    all,
    visible: all.filter((t) => t.visible),
    hidden: all.filter((t) => !t.visible),
  };
}

export default function TreeHoleTagPanel({ open, onClose, onTagsChange }) {
  const { isLoggedIn } = useAuth();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: QK.postTagsVisible(),
    queryFn: getVisibleTags,
    enabled: open && isLoggedIn,
    staleTime: 2 * 60 * 1000,
    select: (d) => d || { all: [], visible: [], hidden: [] },
  });

  const visibleTags = data?.visible || [];
  const hiddenTags = data?.hidden || [];

  const toggleMutation = useMutation({
    mutationFn: ({ tagId, visible }) => setTagVisibility(tagId, visible),
    onMutate: async ({ tagId, visible }) => {
      await queryClient.cancelQueries({ queryKey: QK.postTagsVisible() });
      const prev = queryClient.getQueryData(QK.postTagsVisible());
      if (prev) {
        queryClient.setQueryData(QK.postTagsVisible(), applyVisibilityToggle(prev, tagId, visible));
      }
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(QK.postTagsVisible(), ctx.prev);
      Toast.error(getApiErrorMessage(err) || (isZh ? '标签更新失败' : 'Failed to update tag'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QK.postTagsVisible() });
      queryClient.invalidateQueries({ queryKey: QK.postTagsList() });
      if (typeof onTagsChange === 'function') onTagsChange();
    },
  });

  const tagDisplay = (t) => {
    const raw = isZh ? (t.name_zh || t.name_en) : (t.name_en || t.name_zh);
    return String(raw || '').replace(/^#\s*/g, '').trim();
  };

  const handleToggle = (t, currentlyVisible) => {
    if (toggleMutation.isPending) return;
    toggleMutation.mutate({ tagId: t.id, visible: !currentlyVisible });
  };

  const panel = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="tag-panel-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !toggleMutation.isPending) onClose();
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.15)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: 'max(120px, 18vh)',
          }}
        >
          <motion.div
            key="tag-panel-content"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 500, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              width: 'min(380px, 90vw)',
              maxHeight: 'min(520px, 66vh)',
              overflowY: 'auto',
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: 20,
              boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
              border: '1px solid rgba(0,0,0,0.08)',
              padding: '16px 18px',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1d1d1f' }}>
                {isZh ? '管理标签栏' : 'Manage Tags'}
              </h3>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'none', border: 'none', padding: 4, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 8, color: '#86868b',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {!isLoggedIn ? (
              <p style={{ fontSize: 13, color: '#86868b', textAlign: 'center', padding: '20px 0' }}>
                {isZh ? '请先登录' : 'Please log in first'}
              </p>
            ) : isLoading ? (
              <div className="state-loading" style={{ paddingTop: 40 }} />
            ) : (
              <>
                {/* Visible tags section */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#aeaeb2', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {isZh ? '已加入标签栏' : 'In Tag Bar'} ({visibleTags.length})
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {visibleTags.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(t, true);
                        }}
                        disabled={toggleMutation.isPending}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '5px 10px', borderRadius: 20,
                          border: '1px solid rgba(0,122,255,0.3)',
                          background: 'rgba(0,122,255,0.08)',
                          color: '#007aff',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          opacity: toggleMutation.isPending ? 0.5 : 1,
                        }}
                      >
                        {tagDisplay(t)}
                        <X size={12} />
                      </button>
                    ))}
                    {visibleTags.length === 0 && (
                      <span style={{ fontSize: 12, color: '#aeaeb2' }}>
                        {isZh ? '无，点击下方添加' : 'None, add below'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: 'rgba(60,60,67,0.12)', margin: '0 0 12px' }} />

                {/* Hidden tags section */}
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#aeaeb2', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {isZh ? '更多标签' : 'More Tags'} ({hiddenTags.length})
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {hiddenTags.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(t, false);
                        }}
                        disabled={toggleMutation.isPending}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '5px 10px', borderRadius: 20,
                          border: '1px solid rgba(0,0,0,0.1)',
                          background: 'rgba(0,0,0,0.03)',
                          color: '#86868b',
                          fontSize: 13, cursor: 'pointer',
                          opacity: toggleMutation.isPending ? 0.5 : 1,
                        }}
                      >
                        <Plus size={12} />
                        {tagDisplay(t)}
                      </button>
                    ))}
                    {hiddenTags.length === 0 && (
                      <span style={{ fontSize: 12, color: '#aeaeb2' }}>
                        {isZh ? '所有标签已在栏中' : 'All tags are in the bar'}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(panel, document.body);
}
