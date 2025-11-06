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
      steps: tourSteps.map((step, index) => {
        // For center placement steps (like welcome screens), omit selector
        const isCenterPlacement = step.placement === 'center';
        
        const stepConfig: any = {
          icon: index === 0 ? '👋' : 
                step.title.includes('User') ? '👥' : 
                step.title.includes('Group') ? '🎓' : 
                step.title.includes('Course') ? '📚' : 
                step.title.includes('Analytics') ? '📊' : '💡',
          title: step.title,
          content: step.content,
          showControls: true,
          showSkip: true,
          pointerPadding: 10,
          pointerRadius: 8,
        };
        
        // Only add selector and side for non-centered steps
        if (!isCenterPlacement) {
          stepConfig.selector = step.target;
          stepConfig.side = step.placement || 'bottom';
        }
        
        return stepConfig;
      }),
    };
  });
}
