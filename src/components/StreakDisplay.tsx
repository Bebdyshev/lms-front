import React from 'react';
import { DailyStreakInfo } from '../types';

interface StreakDisplayProps {
  streakInfo: DailyStreakInfo;
  className?: string;
}

const StreakDisplay: React.FC<StreakDisplayProps> = ({ streakInfo, className = '' }) => {
  const getStreakColor = () => {
    switch (streakInfo.streak_status) {
      case 'active':
        return 'text-orange-500';
      case 'at_risk':
        return 'text-yellow-500';
      case 'broken':
        return 'text-gray-400';
      case 'not_started':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStreakIcon = () => {
    switch (streakInfo.streak_status) {
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

  const getStreakMessage = () => {
    switch (streakInfo.streak_status) {
      case 'active':
        return streakInfo.is_active_today ? 'Отличная работа!' : 'Продолжайте в том же духе!';
      case 'at_risk':
        return 'Не упустите свою серию!';
      case 'broken':
        return 'Начните новую серию!';
      case 'not_started':
        return 'Начните свою первую серию!';
      default:
        return 'Отслеживание активности';
    }
  };

  const formatLastActivity = () => {
    if (!streakInfo.last_activity_date) return 'Нет активности';
    
    const activityDate = new Date(streakInfo.last_activity_date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (activityDate.toDateString() === today.toDateString()) {
      return 'Сегодня';
    } else if (activityDate.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    } else {
      return activityDate.toLocaleDateString('ru-RU');
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Серия обучения</h3>
        <span className="text-2xl">{getStreakIcon()}</span>
      </div>
      
      <div className="flex items-center mb-3">
        <span className={`text-3xl font-bold ${getStreakColor()}`}>
          {streakInfo.daily_streak}
        </span>
        <span className="ml-2 text-gray-600">
          {streakInfo.daily_streak === 1 ? 'день' : 
           streakInfo.daily_streak < 5 ? 'дня' : 'дней'}
        </span>
      </div>
      
      <p className="text-sm text-gray-600 mb-2">
        {getStreakMessage()}
      </p>
      
      <div className="text-xs text-gray-500">
        <p>Последняя активность: {formatLastActivity()}</p>
        <p>Общее время изучения: {Math.round(streakInfo.total_study_time_minutes / 60)} ч</p>
      </div>
      
      {streakInfo.streak_status === 'at_risk' && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-xs">
          💡 Изучите что-нибудь сегодня, чтобы сохранить серию!
        </div>
      )}
    </div>
  );
};

export default StreakDisplay;
