import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { 
  Trophy, 
  Clock, 
  Zap, 
  Crown, 
  Medal,
  TrendingUp,
  Users,
  Flame
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

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-500">#{rank}</span>;
    }
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
        {data.current_user_entry && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 mb-3 border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{data.current_user_title.split(' ')[0]}</span>
                <span className="font-semibold text-blue-900">Your Rank</span>
              </div>
              <Badge className={getRankBadgeStyle(data.current_user_rank)}>
                #{data.current_user_rank}
              </Badge>
            </div>
            <p className="text-xs text-blue-700">{data.current_user_title}</p>
            <div className="flex gap-4 mt-2 text-xs text-blue-600">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {data.current_user_entry.steps_completed} steps
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(data.current_user_entry.time_spent_minutes)}
              </span>
            </div>
          </div>
        )}

        {/* Top Players */}
        <div className="max-h-[16rem] overflow-y-auto space-y-2 pr-1">
          {data.leaderboard.map((entry, index) => (
            <div
              key={entry.user_id}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                entry.is_current_user 
                  ? 'bg-blue-50 border border-blue-200' 
                  : index < 3 
                    ? 'bg-gray-50' 
                    : 'hover:bg-gray-50'
              }`}
            >
              {/* Rank */}
              <div className="w-8 flex justify-center">
                {getRankIcon(entry.rank)}
              </div>
              
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                index === 0 ? 'bg-yellow-100 text-yellow-700' :
                index === 1 ? 'bg-gray-200 text-gray-700' :
                index === 2 ? 'bg-amber-100 text-amber-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {entry.avatar_url ? (
                  <img 
                    src={entry.avatar_url} 
                    alt={entry.user_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  getInitials(entry.user_name)
                )}
              </div>
              
              {/* Name & Stats */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  entry.is_current_user ? 'text-blue-900' : 'text-gray-900'
                }`}>
                  {entry.user_name}
                  {entry.is_current_user && <span className="text-blue-500 ml-1">(You)</span>}
                </p>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-0.5">
                    <Zap className="w-3 h-3" />
                    {entry.steps_completed}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />
                    {formatTime(entry.time_spent_minutes)}
                  </span>
                </div>
              </div>
              
              {/* Rank indicator for top 3 */}
              {index < 3 && (
                <div className="flex items-center">
                  {index === 0 && <Flame className="w-4 h-4 text-orange-500 animate-pulse" />}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="pt-3 border-t mt-3">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-2">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              Boost your ranking by completing courses & homework!
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
