import React, { useState, useEffect } from 'react';
import { getGamificationStatus } from '../../services/api';
import './PointsDisplay.css';

interface GamificationStatus {
  activity_points: number;
  daily_streak: number;
  monthly_points: number;
  rank_this_month: number | null;
}

export const PointsDisplay: React.FC = () => {
  const [status, setStatus] = useState<GamificationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await getGamificationStatus();
        setStatus(data);
      } catch (error) {
        console.error('Failed to fetch gamification status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading || !status) {
    return null;
  }

  return (
    <div className="points-display">
      {/* Points */}
      <div className="points-item" title="Activity Points">
        <svg className="points-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <span className="points-value">{status.activity_points.toLocaleString()}</span>
      </div>

      {/* Streak */}
      {status.daily_streak > 0 && (
        <div className="points-item streak" title={`${status.daily_streak} day streak`}>
          <svg className="points-icon fire" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 23c-3.866 0-7-3.134-7-7 0-2.692 1.36-5.206 2.543-6.793C9.386 6.842 12 4 12 1c0 0 4.5 3.5 4.5 8.5 0 1.5-.5 2.5-.5 2.5s1.5-1 2-3c0 0 3 2.5 3 7 0 3.866-3.134 7-7 7z"/>
          </svg>
          <span className="points-value">{status.daily_streak}</span>
        </div>
      )}

      {/* Monthly Rank */}
      {status.rank_this_month && status.rank_this_month <= 10 && (
        <div className="points-item rank" title={`Rank #${status.rank_this_month} this month`}>
          <svg className="points-icon trophy" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 15c-3.314 0-6-2.686-6-6V3h12v6c0 3.314-2.686 6-6 6zm-8-6H2V5h2v4zm18-4h-2v4h2V5zM12 17c2.21 0 4-1.79 4-4h-8c0 2.21 1.79 4 4 4zm-2 2v2H8v2h8v-2h-2v-2h-4z"/>
          </svg>
          <span className="points-value">#{status.rank_this_month}</span>
        </div>
      )}
    </div>
  );
};

export default PointsDisplay;
