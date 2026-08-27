import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SplashScreen = ({ onComplete }) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Stage 0: Initial dark green background
    // Stage 1 (0.5s): Circle expands from center revealing cream background
    const t1 = setTimeout(() => setStage(1), 500);
    
    // Stage 2 (1.2s): Logo appears with 3D scale
    const t2 = setTimeout(() => setStage(2), 1200);
    
    // Stage 3 (3.5s): Fade out
    const t3 = setTimeout(() => setStage(3), 3500);
    
    // Stage 4 (4.2s): Complete
    const t4 = setTimeout(() => {
      onComplete();
    }, 4200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  // Letter stagger animation for text
  const textContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.5 }
    }
  };

  const letter = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", damping: 12, stiffness: 200 } }
  };

  return (
    <AnimatePresence>
      {stage < 3 && (
        <motion.div 
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-primary-green-dark"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          {/* Expansive Circle Reveal */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: stage >= 1 ? 40 : 0 }}
            transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
            className="absolute w-32 h-32 bg-bg-cream rounded-full"
          />

          <div className="relative z-10 flex flex-col items-center justify-center">
            {/* 3D Logo Reveal */}
            <AnimatePresence>
              {stage >= 2 && (
                <motion.div
                  initial={{ scale: 0.5, rotateX: 90, opacity: 0, y: 50 }}
                  animate={{ scale: 1, rotateX: 0, opacity: 1, y: 0 }}
                  transition={{ type: "spring", damping: 15, stiffness: 100, duration: 1 }}
                  style={{ perspective: 1000 }}
                  className="mb-8"
                >
                  {/* Subtle glowing effect */}
                  <div className="absolute inset-0 bg-primary-green blur-3xl opacity-30 rounded-full scale-150"></div>
                  
                  <div className="bg-white p-4 rounded-full shadow-2xl relative">
                    <img 
                      src="/logo.jpg" 
                      alt="Origen Canino" 
                      className="w-48 md:w-56 h-48 md:h-56 object-cover rounded-full"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Staggered Text */}
            <AnimatePresence>
              {stage >= 2 && (
                <motion.div
                  variants={textContainer}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-col items-center"
                >
                  <div className="flex overflow-hidden">
                    {"Origen Canino".split('').map((char, index) => (
                      <motion.span 
                        key={index} 
                        variants={letter}
                        className={`font-script text-4xl md:text-6xl ${char === ' ' ? 'w-4' : ''} text-primary-green-dark`}
                      >
                        {char}
                      </motion.span>
                    ))}
                  </div>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.5, duration: 0.8 }}
                    className="mt-4 flex items-center gap-4"
                  >
                    <div className="h-px w-12 bg-primary-green opacity-50"></div>
                    <span className="font-sans text-xs tracking-[0.3em] font-bold text-secondary-brown uppercase">
                      Nutrición Evolutiva
                    </span>
                    <div className="h-px w-12 bg-primary-green opacity-50"></div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
