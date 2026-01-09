import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { 
  Trophy, 
  Clock, 
  Zap, 
  TrendingUp
} from 'lucide-react';
import apiClient from '../services/api';

interface LeaderboardEntry {
  rank: number;
  user_id: number;
  user_name: string;
  avatar_url: string | null;
  steps_completed: number;
  time_spent_minutes: number;
  is_current_user: boolean;
}

interface LeaderboardData {
  group_id: number | null;
  group_name: string | null;
  leaderboard: LeaderboardEntry[];
  current_user_rank: number;
  current_user_entry: LeaderboardEntry | null;
  current_user_title: string;
  total_participants: number;
  period: string;
  steps_to_next_rank: number;
}

type Period = 'all_time' | 'this_week' | 'this_month';

export default function StudentLeaderboard() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('all_time');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, [period]);

  const loadLeaderboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await apiClient.getStudentLeaderboard(period);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load leaderboard');
      console.error('Leaderboard error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const periodLabels: Record<Period, string> = {
    all_time: 'All',
    this_week: 'Week',
    this_month: 'Month'
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Your Ranking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Your Ranking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 text-sm py-2">
            {error || 'No data available'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Your Ranking
          </CardTitle>
          <div className="flex gap-0.5 bg-gray-100 rounded-md p-0.5">
            {(['all_time', 'this_week', 'this_month'] as Period[]).map(p => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPeriod(p)}
                className={`text-xs h-6 px-2 ${period === p ? '' : 'hover:bg-gray-200'}`}
              >
                {periodLabels[p]}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {data.current_user_entry ? (
          <div className="space-y-3">
            {/* Rank Display */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{data.current_user_title.split(' ')[0]}</span>
                <span className="text-sm text-gray-600">{data.current_user_title.split(' ').slice(1).join(' ')}</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold">#{data.current_user_rank}</span>
                <span className="text-sm text-gray-400 ml-1">/ {data.total_participants}</span>
              </div>
            </div>
            
            {/* Steps to next rank - prominent placement for top 10 */}
            {data.current_user_rank > 1 && data.current_user_rank <= 10 && data.steps_to_next_rank > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="text-sm text-green-700 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-semibold">{data.steps_to_next_rank}</span> steps to rank up!
                </span>
                <span className="text-xs text-green-600">→ #{data.current_user_rank - 1}</span>
              </div>
            )}
            
            {data.current_user_rank === 1 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-center">
                <span className="text-sm text-yellow-700">You're #1! Keep it up!</span>
              </div>
            )}
            
            {/* Stats Row */}
            <div className="flex gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="font-medium">{data.current_user_entry.steps_completed}</span> steps
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="font-medium">{formatTime(data.current_user_entry.time_spent_minutes)}</span>
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">Complete lessons to get ranked!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
