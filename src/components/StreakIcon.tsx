import React, { useEffect, useState } from 'react';
import { DailyStreakInfo } from '../types';
import { getDailyStreak } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ShineBorder } from './magicui/shine-border';

const StreakIcon: React.FC = () => {
  const { user } = useAuth();
  const [streakData, setStreakData] = useState<DailyStreakInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'student') {
      loadStreakData();
    }
  }, [user]);

  const loadStreakData = async () => {
    try {
      setIsLoading(true);
      const data = await getDailyStreak();
      setStreakData(data);
    } catch (error) {
      console.error('Failed to load streak data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show for non-students
  if (!user || user.role !== 'student') {
    return null;
  }

  // Don't show while loading or if no data
  if (isLoading || !streakData) {
    return null;
  }

  const getStreakColor = () => {
    switch (streakData.streak_status) {
      case 'active':
        return 'bg-white text-orange-500';
      case 'at_risk':
        return 'bg-white text-yellow-500';
      case 'broken':
        return 'bg-white text-gray-400';
      case 'not_started':
        return 'bg-white text-gray-400';
      default:
        return 'bg-white text-gray-400';
    }
  };

  const getShineColor = () => {
    switch (streakData.streak_status) {
      case 'active':
        return ['#f97316', '#fb923c']; // orange gradient
      case 'at_risk':
        return ['#eab308', '#facc15', '#fde047']; // yellow gradient
      case 'broken':
        return ['#9ca3af', '#d1d5db', '#f3f4f6']; // gray gradient
      case 'not_started':
        return ['#d1d5db', '#e5e7eb', '#f9fafb']; // light gray gradient
      default:
        return ['#d1d5db', '#e5e7eb', '#f9fafb'];
    }
  };

  const getStreakIcon = () => {
    switch (streakData.streak_status) {
      case 'active':
        return '🔥';
      case 'at_risk':
        return '⚠️';
      case 'broken':
        return '💔';
      case 'not_started':
        return '🎯';
      default:
        return '🎯';
    }
  };

  const getTooltipText = () => {
    switch (streakData.streak_status) {
      case 'active':
        return `${streakData.daily_streak} day streak! Keep it up!`;
      case 'at_risk':
        return `${streakData.daily_streak} day streak at risk. Study today to maintain it!`;
      case 'broken':
        return 'Streak broken. Start a new one today!';
      case 'not_started':
        return 'Start your learning streak today!';
      default:
        return 'Daily learning streak';
    }
  };

  return (
    <div className="relative group">
      <div 
        className={`relative overflow-hidden w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105 ${getStreakColor()}`}
        title={getTooltipText()}
      >
        <ShineBorder
          shineColor={getShineColor()}
        />
        <span className="relative z-10 text-sm font-bold">
          {streakData.daily_streak > 0 ? streakData.daily_streak : getStreakIcon()}
        </span>
      </div>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
        {getTooltipText()}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
};

export default StreakIcon;
