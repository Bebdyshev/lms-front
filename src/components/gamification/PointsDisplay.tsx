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
    </div>
  );
};

export default PointsDisplay;
