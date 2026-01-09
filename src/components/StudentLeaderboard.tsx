import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { 
  Trophy, 
  Clock, 
  Zap, 
  TrendingUp,
  Users
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

  const getRankBadgeStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white border-0';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 border-0';
      case 3:
        return 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const periodLabels: Record<Period, string> = {
    all_time: 'All Time',
    this_week: 'This Week',
    this_month: 'This Month'
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-4">
            {error || 'No leaderboard data available'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Leaderboard
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            {data.total_participants}
          </Badge>
        </div>
        
        {/* Period Selector */}
        <div className="flex gap-1 mt-2">
          {(['all_time', 'this_week', 'this_month'] as Period[]).map(p => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod(p)}
              className="text-xs h-7 px-2"
            >
              {periodLabels[p]}
            </Button>
          ))}
        </div>
        
        {data.group_name && (
          <p className="text-xs text-gray-500 mt-1">{data.group_name}</p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-2">
        {/* Current User Highlight */}
        {data.current_user_entry ? (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{data.current_user_title.split(' ')[0]}</span>
                <div>
                  <span className="font-semibold text-blue-900 block">Your Rank</span>
                  <span className="text-xs text-blue-600">{data.current_user_title.split(' ').slice(1).join(' ')}</span>
                </div>
              </div>
              <div className="text-right">
                <Badge className={`text-lg px-3 py-1 ${getRankBadgeStyle(data.current_user_rank)}`}>
                  #{data.current_user_rank}
                </Badge>
                <p className="text-xs text-gray-500 mt-1">of {data.total_participants}</p>
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-white/60 rounded-lg p-3 text-center">
                <Zap className="w-5 h-5 mx-auto text-yellow-500 mb-1" />
                <p className="text-xl font-bold text-gray-900">{data.current_user_entry.steps_completed}</p>
                <p className="text-xs text-gray-500">Steps Done</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3 text-center">
                <Clock className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                <p className="text-xl font-bold text-gray-900">{formatTime(data.current_user_entry.time_spent_minutes)}</p>
                <p className="text-xs text-gray-500">Time Spent</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <Trophy className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Complete some lessons to appear on the leaderboard!</p>
          </div>
        )}

        {/* Call to Action */}
        <div className="pt-3 border-t mt-3">
          <div className="text-center">
            <p className="text-xs text-gray-500">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              Boost your ranking by completing courses & homework!
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
