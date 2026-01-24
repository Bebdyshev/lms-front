import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { 
  Trophy, 
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
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('this_month');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserAndLeaderboard();
  }, [period]);

  const loadUserAndLeaderboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load user if not loaded (for ID check)
      let user = currentUser;
      if (!user) {
        user = await apiClient.getCurrentUser();
        setCurrentUser(user);
      }
      
      // Map period to backend values
      let backendPeriod = 'monthly'; // default
      if (period === 'all_time') backendPeriod = 'all_time';
      if (period === 'this_week') backendPeriod = 'weekly';
      if (period === 'this_month') backendPeriod = 'monthly';
      
      const response = await apiClient.getGamificationLeaderboard({ period: backendPeriod as any });
      setEntries(response.entries || []);
      
    } catch (err: any) {
      setError(err.message || 'Failed to load leaderboard');
      console.error('Leaderboard error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const periodLabels: Record<Period, string> = {
    all_time: 'All Time',
    this_week: 'Weekly',
    this_month: 'Monthly'
  };

  const getUserRankInfo = () => {
    if (!currentUser || entries.length === 0) return null;
    
    const index = entries.findIndex(e => e.user_id === currentUser.id);
    if (index === -1) return null; // User not in leaderboard
    
    const entry = entries[index];
    const prevEntry = index > 0 ? entries[index - 1] : null;
    const pointsToNext = prevEntry ? (prevEntry.points - entry.points) : 0;
    
    return {
      rank: entry.rank,
      points: entry.points,
      pointsToNext: pointsToNext,
      isTop10: entry.rank <= 10
    };
  };

  const myRankInfo = getUserRankInfo();

  if (isLoading && !currentUser) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Class Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base text-xl">
            Leaderboard
          </CardTitle>
          <div className="flex gap-0.5 bg-gray-100 rounded-md p-0.5">
            {(['this_week', 'this_month', 'all_time'] as Period[]).map(p => (
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
        {/* Current User Stats */}
        {myRankInfo ? (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">Your Rank</span>
              <div className="flex items-center gap-1">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-lg font-bold text-blue-900">#{myRankInfo.rank}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-blue-700">
                <Zap className="w-4 h-4 fill-blue-500 text-blue-500" />
                <span>{myRankInfo.points} pts</span>
              </div>
              
              {myRankInfo.pointsToNext > 0 && (
                <div className="flex items-center gap-1 text-green-600 text-xs">
                  <TrendingUp className="w-3 h-3" />
                  <span>{myRankInfo.pointsToNext} to rank #{myRankInfo.rank - 1}</span>
                </div>
              )}
              {myRankInfo.rank === 1 && (
                 <span className="text-xs text-yellow-600 font-medium">Top of the class! 👑</span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-2 text-gray-500 text-sm mb-2">
            You haven't earned points in this period yet.
          </div>
        )}

        {/* Top 5 + me if not in top 5 */}
        <div className="space-y-2">
           {entries.slice(0, 5).map((entry) => (
             <div 
               key={entry.user_id} 
               className={`flex items-center justify-between p-2 rounded-md ${entry.user_id === currentUser?.id ? 'bg-yellow-50 border border-yellow-100' : 'hover:bg-gray-50'}`}
             >
               <div className="flex items-center gap-3">
                 <div className={`
                   w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                   ${entry.rank === 1 ? 'bg-yellow-100 text-yellow-700' : 
                     entry.rank === 2 ? 'bg-gray-100 text-gray-700' : 
                     entry.rank === 3 ? 'bg-orange-100 text-orange-700' : 'text-gray-500'}
                 `}>
                   {entry.rank}
                 </div>
                 <div className="flex flex-col">
                   <span className={`text-sm ${entry.user_id === currentUser?.id ? 'font-semibold' : ''}`}>
                     {entry.user_name} {entry.user_id === currentUser?.id && '(You)'}
                   </span>
                 </div>
               </div>
               <div className="font-mono text-sm font-medium text-gray-600">
                 {entry.points} pts
               </div>
             </div>
           ))}
           
           {/* If user not in top 5, show dots and user */}
           {currentUser && myRankInfo && myRankInfo.rank > 5 && (
             <>
               <div className="text-center text-gray-400 text-xs py-1">...</div>
               <div className="flex items-center justify-between p-2 rounded-md bg-yellow-50 border border-yellow-100">
                 <div className="flex items-center gap-3">
                   <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">
                     {myRankInfo.rank}
                   </div>
                   <span className="text-sm font-semibold">You</span>
                 </div>
                 <div className="font-mono text-sm font-medium text-gray-600">
                   {myRankInfo.points} pts
                 </div>
               </div>
             </>
           )}
        </div>
      </CardContent>
    </Card>
  );
}
