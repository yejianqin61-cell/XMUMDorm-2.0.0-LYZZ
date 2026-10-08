import { ExpFeedbackContext } from './ExpFeedbackContextState';
import {  useCallback,  useState } from 'react';
import { Toast } from './toast';
import LevelUpModal from '../components/LevelUpModal';
import { useLanguage } from './LanguageContextState';
import { useAuth } from './AuthContextState';



/** 从 API 返回值提取并处理经验反馈 */


export function ExpFeedbackProvider({ children }) {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { refreshUser } = useAuth();
  const [levelUp, setLevelUp] = useState({ open: false, level: null });

  const handleExpResponse = useCallback(
    (result, zh = isZh) => {
      const exp = result && result.__exp;
      if (!exp) return;

      if (exp.delta > 0) {
        Toast.success(zh ? `+${exp.delta} 经验` : `+${exp.delta} XP`);
      } else if (exp.delta < 0) {
        Toast.success(zh ? `${exp.delta} 经验` : `${exp.delta} XP`);
      }

      if (exp.levelUp && exp.level) {
        setLevelUp({ open: true, level: exp.level });
      }

      if (exp.delta || exp.levelUp) {
        refreshUser?.();
      }
    },
    [isZh, refreshUser]
  );

  const closeLevelUp = useCallback(() => {
    setLevelUp({ open: false, level: null });
  }, []);

  return (
    <ExpFeedbackContext.Provider value={{ handleExpResponse }}>
      {children}
      <LevelUpModal
        open={levelUp.open}
        level={levelUp.level}
        isZh={isZh}
        onClose={closeLevelUp}
      />
    </ExpFeedbackContext.Provider>
  );
}
