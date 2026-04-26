import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Code2, FileText, Users } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const listContainer = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.06 },
  },
};

const listItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
};

const tap = { whileTap: { scale: 0.97 }, whileHover: { scale: 1.01 } };

function softIcon(bg, fg) {
  return { backgroundColor: bg, color: fg };
}

/** 关于我们详情页：按 MyZone 现代风格重做 */
function AboutProfile() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';

  return (
    <div className="h-full w-full bg-[#F9FAFB]">
      <div className="h-full overflow-y-auto px-4 pb-[calc(var(--tabbar-height)+var(--safe-bottom)+24px)] pt-6">
        <motion.div variants={listContainer} initial="hidden" animate="show">
          <motion.div variants={listItem} className="mb-5">
            <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
              {isZh ? '关于我们' : 'About us'}
            </h1>
            <p className="mt-1 text-[13px] font-medium text-slate-400">
              {isZh ? '项目介绍与相关说明' : 'Project info & documentation'}
            </p>
          </motion.div>

          <motion.section
            variants={listItem}
            className="rounded-3xl bg-white p-3 shadow-sm"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
            aria-label={isZh ? '关于我们入口' : 'About entries'}
          >
            <div className="divide-y divide-slate-100">
              <AboutRow
                to="/about/team"
                title={isZh ? '团队介绍' : 'Team'}
                sub={isZh ? '哈基米方阵' : 'Hakimi Matrix team'}
                icon={<Users className="h-5 w-5" />}
                iconStyle={softIcon('rgba(59,130,246,0.12)', 'rgb(37,99,235)')}
              />
              <AboutRow
                to="/about/editor-note"
                title={isZh ? '编者的话' : "Editor's Note"}
                sub={isZh ? 'Dorm 的故事' : 'Story behind Dorm'}
                icon={<FileText className="h-5 w-5" />}
                iconStyle={softIcon('rgba(168,85,247,0.12)', 'rgb(147,51,234)')}
              />
              <AboutRow
                to="/about/algorithm"
                title={isZh ? '评分算法说明' : 'Scoring Algorithm'}
                sub={isZh ? '如何计算菜品/商家评分' : 'How scores are calculated'}
                icon={<Code2 className="h-5 w-5" />}
                iconStyle={softIcon('rgba(234,179,8,0.14)', 'rgb(202,138,4)')}
              />
            </div>
          </motion.section>
        </motion.div>
      </div>
    </div>
  );
}

function AboutRow({ to, title, sub, icon, iconStyle }) {
  return (
    <motion.div variants={listItem}>
      <motion.div {...tap}>
        <Link to={to} className="flex items-center justify-between rounded-2xl px-2 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl" style={iconStyle} aria-hidden>
              {icon}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-slate-900">{title}</div>
              <div className="mt-0.5 truncate text-[12px] font-medium text-slate-400">{sub}</div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden />
        </Link>
      </motion.div>
    </motion.div>
  );
}

export default AboutProfile;


