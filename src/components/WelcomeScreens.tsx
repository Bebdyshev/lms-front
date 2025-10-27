import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface WelcomeScreensProps {
  userName: string;
  onComplete: () => void;
}

export default function WelcomeScreens({ userName, onComplete }: WelcomeScreensProps) {
  const [currentScreen, setCurrentScreen] = useState(0);

  useEffect(() => {
    if (currentScreen === 0) {
      // First screen: "Hello, {name}!" - показываем 2 секунды
      const timer = setTimeout(() => {
        setCurrentScreen(1);
      }, 2000);
      return () => clearTimeout(timer);
    } else if (currentScreen === 1) {
      // Second screen: "Welcome to the calmer education" - показываем 2.5 секунды
      const timer = setTimeout(() => {
        onComplete();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [currentScreen, onComplete]);

  const firstName = userName?.split(' ')[0] || 'there';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="text-center px-4">
        <AnimatePresence mode="wait">
          {currentScreen === 0 && (
            <motion.h1
              key="hello"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="text-6xl md:text-8xl font-light text-gray-900"
            >
              Hello,{' '}
              <span
                className="italic font-serif bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {firstName}
              </span>
              !
            </motion.h1>
          )}

          {currentScreen === 1 && (
            <motion.h1
              key="welcome"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="text-5xl md:text-7xl font-light text-gray-900"
            >
              Welcome to the{' '}
              <br />
              <span
                className="italic font-serif bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                calmer
              </span>{' '}
              education
            </motion.h1>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
