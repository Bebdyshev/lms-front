import { useAuth } from '../contexts/AuthContext';
import { storage } from '../utils/storage';
import { Button } from './ui/button';

export default function ResetOnboardingButton() {
  const { user } = useAuth();

  const handleReset = () => {
    if (user) {
      storage.removeItem(`onboarding_completed_${user.id}`);
      console.log('Onboarding reset for user:', user.id);
      alert('Onboarding reset! Reload the page to see it again.');
      window.location.reload();
    }
  };

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={handleReset}
        variant="outline"
        size="sm"
        className="bg-yellow-100 hover:bg-yellow-200 border-yellow-400"
      >
        🔄 Reset Onboarding
      </Button>
    </div>
  );
}
