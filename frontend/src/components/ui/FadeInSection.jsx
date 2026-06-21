import { motion, useReducedMotion } from 'framer-motion';
import { fadeInUpVariants } from '../../utils/motion';

export default function FadeInSection({ as = 'div', className = '', delay = 0, children, ...rest }) {
  const reduceMotion = useReducedMotion();
  const MotionTag = motion[as] || motion.div;
  const variants = reduceMotion
    ? {
        hidden: { opacity: 1, y: 0 },
        visible: { opacity: 1, y: 0 },
      }
    : {
        hidden: fadeInUpVariants.hidden,
        visible: {
          ...fadeInUpVariants.visible,
          transition: {
            ...fadeInUpVariants.visible.transition,
            delay,
          },
        },
      };

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      animate="visible"
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
