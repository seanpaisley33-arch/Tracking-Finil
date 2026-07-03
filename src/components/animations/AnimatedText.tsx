'use client';

import { motion } from 'framer-motion';

interface AnimatedTextProps {
  text: string;
  className?: string;
  type?: 'words' | 'letters';
  delay?: number;
}

export default function AnimatedText({ text, className = '', type = 'words', delay = 0 }: AnimatedTextProps) {
  const words = text.split(' ');
  const letters = text.split('');

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: type === 'words' ? 0.12 : 0.03, delayChildren: delay * i },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 12,
        stiffness: 100,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
      transition: {
        type: 'spring',
        damping: 12,
        stiffness: 100,
      },
    },
  };

  if (type === 'letters') {
    return (
      <motion.span variants={container} initial="hidden" animate="visible" className={`inline-flex flex-wrap ${className}`}>
        {letters.map((letter, index) => (
          <motion.span variants={child} key={index} className="inline-block">
            {letter === ' ' ? '\u00A0' : letter}
          </motion.span>
        ))}
      </motion.span>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="visible" className={`flex flex-wrap ${className}`}>
      {words.map((word, index) => (
        <motion.span variants={child} key={index} className="mr-2 inline-block">
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
}
