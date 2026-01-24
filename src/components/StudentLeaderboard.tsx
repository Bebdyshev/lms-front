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

export default function StudentLeaderboard() {
  const [entries, setEntries] = useState<any[]>([]);
  const [totalParticipants, setTotalParticipants] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [scope, setScope] = useState<'all' | 'group'>('group');
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserAndGroups();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadLeaderboard();
    }
  }, [currentUser, scope, selectedGroupId]);

  const loadUserAndGroups = async () => {
    try {
      const [user, groups] = await Promise.all([
        apiClient.getCurrentUser(),
        apiClient.getMyGroups()
      ]);
      setCurrentUser(user);
      setMyGroups(groups);
      
      // Default to first group if available
      if (groups.length > 0) {
        setSelectedGroupId(groups[0].id);
      } else {
        // If no groups, force scope to 'all'
        setScope('all');
      }
    } catch (err) {
      console.error('Failed to load user info:', err);
    }
  };

  const loadLeaderboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params: any = { period: 'monthly' };
      
      // Apply group filter if in group scope
      if (scope === 'group' && selectedGroupId) {
        params.group_id = selectedGroupId;
      }
      
      const response = await apiClient.getGamificationLeaderboard(params);
      setEntries(response.entries || []);
      setTotalParticipants(response.total_participants || 0);
      
    } catch (err: any) {
      setError(err.message || 'Failed to load leaderboard');
      console.error('Leaderboard error:', err);
    } finally {
      setIsLoading(false);
    }
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
            Leaderboard
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
      <CardHeader className="pb-2 space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            Leaderboard
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 p-0.5 rounded-lg">
              <button
                onClick={() => setScope('group')}
                disabled={myGroups.length === 0}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  scope === 'group' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                } ${myGroups.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                My Group
              </button>
              <button
                onClick={() => setScope('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  scope === 'all' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All Students
              </button>
            </div>
          </div>
        </div>
        
        {/* Only show group selector if in group mode and has multiple groups */}
        {scope === 'group' && myGroups.length > 1 && (
          <div className="flex gap-2">
            <select
              value={selectedGroupId || ''}
              onChange={(e) => setSelectedGroupId(Number(e.target.value))}
              className="w-full text-sm p-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-gray-700"
            >
              {myGroups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {error ? (
          <div className="text-center py-4 text-red-500 text-sm">
            {error}
            <Button variant="link" size="sm" onClick={() => loadLeaderboard()} className="text-blue-500">Retry</Button>
          </div>
        ) : (
          <>
            {/* Current User Stats */}
            {myRankInfo ? (
          <div className="mb-4">
            <div className="flex items-end justify-between px-2 mb-2">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Your Rank</span>
                <div className="flex items-center gap-2 ">
                  <span className="text-2xl font-bold text-gray-900 tracking-tight">#{myRankInfo.rank}</span>
                  {myRankInfo.rank === 1 ? (
                    <span className="text-[16px] font-bold text-yellow-600 px-2 py-auto rounded-full">THE GOAT 🐐</span>
                  ) : myRankInfo.rank <= 3 ? (
                    <span className="text-[16px] font-bold text-orange-600 px-2 py-auto rounded-full">LEGEND 🔥</span>
                  ) : myRankInfo.rank <= 10 ? (
                    <span className="text-[16px] font-bold text-purple-600 px-2 py-auto rounded-full">RISING STAR 🌟</span>
                  ) : (
                    <span className="text-sm font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">GRINDING 💪</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Rank</span>
                <span className="text-xl font-semibold text-gray-900">
                  {myRankInfo.rank} <span className="text-gray-400 font-normal">/ {totalParticipants}</span>
                </span>
              </div>
            </div>
            
            {myRankInfo.pointsToNext > 0 ? (
              <div className="bg-gray-50 rounded-lg p-3 mt-3">
                <div className="flex justify-between text-xs font-medium mb-2">
                  <span className="text-gray-500">Next Level</span>
                  <span className="text-blue-600">{myRankInfo.pointsToNext} points needed</span>
                </div>
                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full w-2/3"></div>
                </div>
              </div>
            ) : myRankInfo.rank === 1 && (
               <div className="mt-2 text-center">
                 <p className="text-sm font-medium text-yellow-600 bg-yellow-50/50 py-2 rounded-lg">👑 Unstoppable!</p>
               </div>
            )}
          </div>
        ) : (
          <div className="text-center py-2 text-gray-500 text-sm mb-2">
            You haven't earned points in this period yet.
          </div>
        )}

          </>
        )}
      </CardContent>
    </Card>
  );
}
