// Tour steps provider for NextStep.js
import { Tour } from 'nextstepjs';
import { getTourStepsForRole } from './tourSteps';
import type { UserRole } from '../types';

export function getAllTourSteps(): Tour[] {
  const roles: UserRole[] = ['student', 'teacher', 'admin', 'curator'];
  
  return roles.map(role => {
    const tourSteps = getTourStepsForRole(role);
    
    return {
      tour: `${role}-onboarding`,
      steps: tourSteps.map((step, index) => ({
        icon: index === 0 ? '👋' : 
              step.title.includes('User') ? '👥' : 
              step.title.includes('Group') ? '🎓' : 
              step.title.includes('Course') ? '📚' : 
              step.title.includes('Analytics') ? '📊' : '💡',
        title: step.title,
        content: step.content,
        selector: step.target,
        side: (step.placement === 'center' ? 'top' : step.placement) as 'top' | 'bottom' | 'left' | 'right',
        showControls: true,
        showSkip: true,
        pointerPadding: 10,
        pointerRadius: 8,
      })),
    };
  });
}
