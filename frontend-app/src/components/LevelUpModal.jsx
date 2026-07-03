import { motion, AnimatePresence } from 'framer-motion';
import { getBadgeForLevel } from '@shared/constants/levelConfig';
import './LevelUpModal.css';

export default function LevelUpModal({ open, level, isZh = true, onClose }) {
  if (!level) return null;
  const badge = getBadgeForLevel(level, isZh);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="level-up-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="level-up-card"
            initial={{ scale: 0.85, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              className="level-up-emoji"
              aria-hidden
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            >
              {badge.emoji}
            </motion.div>
            <h2 className="level-up-title">
              {isZh ? `恭喜升级 Lv${level}！` : `Level Up — Lv${level}!`}
            </h2>
            <p className="level-up-sub">
              {isZh ? `获得 ${badge.labelZh} 徽章` : `Earned ${badge.labelEn} badge`}
            </p>
            <button type="button" className="level-up-btn" onClick={onClose}>
              {isZh ? '太棒了' : 'Awesome'}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
