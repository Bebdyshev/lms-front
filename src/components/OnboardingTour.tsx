import { useEffect } from 'react';
import { useNextStep } from 'nextstepjs';
import { UserRole } from '../types';
import { getTourStepsForRole } from '../config/tourSteps';

interface OnboardingTourProps {
  userRole: UserRole;
  steps: any[];
  isOpen: boolean;
  onComplete: () => void;
}

export default function OnboardingTour({ userRole, isOpen, onComplete }: OnboardingTourProps) {
  const { startNextStep, closeNextStep, isNextStepVisible } = useNextStep();

  useEffect(() => {
    if (isOpen && !isNextStepVisible) {
      // Начинаем тур с именем, соответствующим роли пользователя
      const tourName = `${userRole}-onboarding`;
      console.log('Starting tour:', tourName);
      startNextStep(tourName);
    } else if (!isOpen && isNextStepVisible) {
      // Закрываем тур
      closeNextStep();
    }
  }, [isOpen, isNextStepVisible, startNextStep, closeNextStep, userRole]);

  // Слушаем завершение тура
  useEffect(() => {
    const handleTourEnd = () => {
      if (isOpen) {
        onComplete();
      }
    };

    // Добавляем глобальный слушатель для завершения тура
    window.addEventListener('nextstep:complete', handleTourEnd);
    
    return () => {
      window.removeEventListener('nextstep:complete', handleTourEnd);
    };
  }, [isOpen, onComplete]);

  // Компонент управляет туром через хуки, не рендерит UI
  return null;
}

// Экспортируем функцию для создания steps
export function createTourSteps(userRole: UserRole) {
  const tourSteps = getTourStepsForRole(userRole);

  return [
    {
      tour: 'onboarding',
      steps: tourSteps.map((step, index) => ({
        icon: index === 0 ? '👋' : step.title.includes('User') ? '👥' : step.title.includes('Group') ? '🎓' : step.title.includes('Course') ? '📚' : step.title.includes('Analytics') ? '📊' : '💡',
        title: step.title,
        content: step.content,
        selector: step.target,
        side: (step.placement === 'center' ? 'top' : step.placement) as 'top' | 'bottom' | 'left' | 'right',
        showControls: true,
        showSkip: true,
        pointerPadding: 10,
        pointerRadius: 8,
      })),
    },
  ];
}

