import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import WelcomeScreens from './WelcomeScreens';
import OnboardingTour from './OnboardingTour';
import { storage } from '../utils/storage';

interface OnboardingManagerProps {
  children: React.ReactNode;
}

export default function OnboardingManager({ children }: OnboardingManagerProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    console.log('OnboardingManager state changed:', { showWelcome, showTour });
  }, [showWelcome, showTour]);

  useEffect(() => {
    // Проверяем, нужно ли показывать онбординг
    if (user && location.pathname === '/dashboard') {
      const hasCompletedOnboarding = storage.getItem(`onboarding_completed_${user.id}`);
      console.log('Onboarding check:', {
        userId: user.id,
        hasCompleted: hasCompletedOnboarding,
        pathname: location.pathname
      });
      
      if (!hasCompletedOnboarding) {
        // Показываем приветственные экраны
        console.log('Starting onboarding flow...');
        setShowWelcome(true);
      }
    }
  }, [user, location.pathname]);

  const handleWelcomeComplete = () => {
    console.log('Welcome screens completed, starting tour...');
    setShowWelcome(false);
    // После приветствия показываем тур с небольшой задержкой
    setTimeout(() => {
      console.log('Setting showTour to true');
      setShowTour(true);
    }, 500);
  };

  const handleTourComplete = () => {
    console.log('Tour completed!');
    setShowTour(false);
    // Сохраняем, что пользователь прошёл онбординг
    if (user) {
      storage.setItem(`onboarding_completed_${user.id}`, 'true');
      console.log('Onboarding status saved for user:', user.id);
    }
  };

  const userName = user?.full_name || user?.name || 'there';

  return (
    <>
      {showWelcome && (
        <WelcomeScreens userName={userName} onComplete={handleWelcomeComplete} />
      )}
      
      {user && showTour && (
        <OnboardingTour
          userRole={user.role}
          steps={[]}
          isOpen={showTour}
          onComplete={handleTourComplete}
        />
      )}
      
      {children}
    </>
  );
}

