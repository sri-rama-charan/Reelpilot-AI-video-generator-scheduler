"use client";

import { motion, Variants } from "framer-motion";

interface AnimatedCaptionProps {
  text: string;
  styleConfig: {
    font: string;
    fontWeight: string;
    color: string;
    stroke: string;
    uppercase: boolean;
  };
  animationType: string;
  className?: string;
}

export function AnimatedCaption({
  text,
  styleConfig,
  animationType,
  className = "",
}: AnimatedCaptionProps) {
  // Split text into words for word-by-word animation
  const words = text.split(" ");

  // Container variants to stagger word appearances
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        repeat: Infinity,
        repeatDelay: 1, // Pause before restarting animation
      },
    },
  };

  // Define different word animation variants based on the style
  const getWordVariants = (type: string): Variants => {
    switch (type) {
      case "style-1": // Classic Bounce
        return {
          hidden: { y: 20, opacity: 0, scale: 0.9 },
          visible: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: { type: "spring", stiffness: 300, damping: 15 },
          },
        };
      case "style-2": // Hormozi Pop
        return {
          hidden: { scale: 0.5, opacity: 0 },
          visible: {
            scale: 1.1,
            opacity: 1,
            transition: { type: "spring", stiffness: 400, damping: 10 },
          },
        };
      case "style-3": // Neon Glow (Fade)
      case "style-4": // Elegant Serif
      case "style-6": // Minimalist Fade
        return {
          hidden: { opacity: 0, y: 10 },
          visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.2 },
          },
        };
      case "style-5": // Retro Pixel (Typewriter-ish pop)
        return {
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { duration: 0.05 }, // sharp appearance
          },
        };
      default:
        return {
          hidden: { opacity: 0 },
          visible: { opacity: 1 },
        };
    }
  };

  const wordVariants = getWordVariants(animationType);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`flex flex-wrap justify-center gap-x-2 gap-y-1 ${className}`}
    >
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          variants={wordVariants}
          className={`${styleConfig.font} ${styleConfig.fontWeight} ${
            styleConfig.color
          } ${styleConfig.stroke} ${
            styleConfig.uppercase ? "uppercase" : ""
          } text-2xl tracking-wide`}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
}
