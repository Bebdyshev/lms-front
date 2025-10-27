import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import WelcomeScreens from './WelcomeScreens';
import OnboardingTour from './OnboardingTour';
import { storage } from '../utils/storage';
import apiClient from '../services/api';

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
      console.log('Onboarding check:', {
        userId: user.id,
        hasCompleted: user.onboarding_completed,
        pathname: location.pathname
      });
      
      // Проверяем статус из данных пользователя (с сервера)
      if (!user.onboarding_completed) {
        // Показываем приветственные экраны
        console.log('Starting onboarding flow...');
        setShowWelcome(true);
      } else {
        console.log('Onboarding already completed, skipping...');
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

  const handleTourComplete = async () => {
    console.log('Tour completed!');
    setShowTour(false);
    
    // Сохраняем статус на сервере
    if (user) {
      try {
        await apiClient.completeOnboarding();
        console.log('Onboarding status saved on server for user:', user.id);
        
        // Также сохраняем локально для быстрого доступа
        storage.setItem(`onboarding_completed_${user.id}`, 'true');
      } catch (error) {
        console.error('Failed to save onboarding status:', error);
        // Сохраняем хотя бы локально, если сервер недоступен
        storage.setItem(`onboarding_completed_${user.id}`, 'true');
      }
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

