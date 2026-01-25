import { useEffect, useState } from 'react';
import apiClient from '../../services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Trophy, Loader2, Award, TrendingUp } from 'lucide-react';
import { toast } from '../Toast';
import { GiveBonusModal } from './GiveBonusModal';

interface GroupLeader {
  group_id: number;
  group_name: string;
  leader: {
    user_id: number;
    user_name: string;
    points: number;
  } | null;
}

interface WeeklyAwardsHubProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WeeklyAwardsHub({ isOpen, onClose }: WeeklyAwardsHubProps) {
  const [groupLeaders, setGroupLeaders] = useState<GroupLeader[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{ id: number; name: string } | null>(null);
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadWeeklyLeaders();
    }
  }, [isOpen]);

  const loadWeeklyLeaders = async () => {
    try {
      setIsLoading(true);
      
      // Get all teacher groups
      const groups = await apiClient.getTeacherGroups();
      
      // Fetch weekly leaderboard for each group
      const leadersPromises = groups.map(async (group: any) => {
        try {
          const leaderboard = await apiClient.getGamificationLeaderboard({
            period: 'weekly',
            group_id: group.id
          });
          
          return {
            group_id: group.id,
            group_name: group.name,
            leader: leaderboard.entries && leaderboard.entries.length > 0 
              ? {
                  user_id: leaderboard.entries[0].user_id,
                  user_name: leaderboard.entries[0].user_name,
                  points: leaderboard.entries[0].points
                }
              : null
          };
        } catch (error) {
          console.error(`Failed to load leaderboard for group ${group.id}:`, error);
          return {
            group_id: group.id,
            group_name: group.name,
            leader: null
          };
        }
      });
      
      const leaders = await Promise.all(leadersPromises);
      setGroupLeaders(leaders);
    } catch (error) {
      console.error('Failed to load weekly leaders:', error);
      toast('Failed to load weekly leaders', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAwardClick = (userId: number, userName: string) => {
    setSelectedStudent({ id: userId, name: userName });
    setIsBonusModalOpen(true);
  };

  const handleBonusSuccess = () => {
    toast('Bonus awarded successfully!', 'success');
    setIsBonusModalOpen(false);
    setSelectedStudent(null);
    loadWeeklyLeaders(); // Refresh data
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Trophy className="w-5 h-5 text-gray-700" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-900">Weekly Award Hub</DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-1">
                  Reward your top performers from this week
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-3" />
                <p className="text-sm text-gray-500">Loading weekly leaders...</p>
              </div>
            ) : groupLeaders.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No groups found</p>
                <p className="text-sm text-gray-500 mt-1">You don't have any groups assigned yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {groupLeaders.map((group) => (
                  <Card key={group.group_id} className="border border-gray-200 hover:border-gray-300 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-gray-700 mb-2">{group.group_name}</h3>
                          {group.leader ? (
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 border border-gray-200">
                                <span className="text-sm">🥇</span>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{group.leader.user_name}</p>
                                <p className="text-xs text-gray-500">{group.leader.points} points this week</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400 italic">No activity this week</p>
                          )}
                        </div>
                        
                        {group.leader && (
                          <Button
                            size="sm"
                            onClick={() => handleAwardClick(group.leader!.user_id, group.leader!.user_name)}
                            className="bg-gray-800 hover:bg-gray-900 text-white shadow-sm"
                          >
                            <Award className="w-3.5 h-3.5 mr-1.5" />
                            Award 50
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">
                <span className="font-medium">Tip:</span> Rankings reset every Monday. Award points to motivate top performers!
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedStudent && (
        <GiveBonusModal
          isOpen={isBonusModalOpen}
          onClose={() => {
            setIsBonusModalOpen(false);
            setSelectedStudent(null);
          }}
          studentId={selectedStudent.id}
          studentName={selectedStudent.name}
          defaultAmount={50}
          onSuccess={handleBonusSuccess}
        />
      )}
    </>
  );
}
