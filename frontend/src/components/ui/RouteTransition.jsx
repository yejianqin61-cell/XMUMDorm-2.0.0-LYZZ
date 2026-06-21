import { motion, useReducedMotion } from 'framer-motion';
import { routeTransitionVariants } from '../../utils/motion';

export default function RouteTransition({ className = '', children }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={routeTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}
