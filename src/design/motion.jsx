// Shared Motion presets (uses the `motion` library -> motion/react).
// Every animation here degrades to an instant, non-transformed state when the
// user prefers reduced motion.
import { motion, useReducedMotion } from "motion/react";
import { ease } from "./tokens";

// ---- Variants ----
export const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export const stagger = (gap = 0.08, delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
});

// ---- Page transition (route change) ----
export const pageVariants = {
  initial: { opacity: 0, y: 10 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.28, ease: [0.65, 0, 0.35, 1] } },
};

export function PageTransition({ children, style }) {
  const reduce = useReducedMotion();
  if (reduce) return <div style={style}>{children}</div>;
  return (
    <motion.div variants={pageVariants} initial="initial" animate="enter" exit="exit" style={style}>
      {children}
    </motion.div>
  );
}

// ---- Scroll reveal ----
export function Reveal({ children, delay = 0, y = 18, once = true, style, as = "div" }) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as] || motion.div;
  if (reduce) {
    const Tag = as;
    return <Tag style={style}>{children}</Tag>;
  }
  return (
    <MotionTag
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
      style={style}
    >
      {children}
    </MotionTag>
  );
}

// ---- Stagger container + item ----
export function RevealGroup({ children, gap = 0.08, delay = 0, style, once = true }) {
  const reduce = useReducedMotion();
  if (reduce) return <div style={style}>{children}</div>;
  return (
    <motion.div
      variants={stagger(gap, delay)}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-60px" }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, style, y = 18 }) {
  const reduce = useReducedMotion();
  if (reduce) return <div style={style}>{children}</div>;
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } } }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export { ease };
