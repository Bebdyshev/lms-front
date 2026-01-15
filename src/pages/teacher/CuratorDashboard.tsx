import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, GraduationCap, BarChart3, Calendar } from 'lucide-react';
import Skeleton from '@/components/Skeleton';

export default function CuratorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Upcoming data state
  const [assignments, setAssignments] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(true);

  useEffect(() => {
    loadDashboardData();
    loadUpcomingData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data: any = await apiClient.getDashboardStats();
      setStats(data.stats || data || {});
    } catch (error) {
      console.error('Failed to load curator dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUpcomingData = async () => {
    try {
      setIsLoadingUpcoming(true);
      // Fetch assignments and events in parallel
      const [assignmentsData, eventsData] = await Promise.all([
        apiClient.getAssignments({ is_active: true }),
        apiClient.getMyEvents({ upcoming_only: true, limit: 10 })
      ]);
      
      setAssignments(assignmentsData || []);
      setEvents(eventsData || []);
    } catch (error) {
      console.error('Failed to load upcoming data:', error);
    } finally {
      setIsLoadingUpcoming(false);
    }
  };

  // Helper functions for deadlines
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'class': return 'bg-blue-100 text-blue-800';
      case 'webinar': return 'bg-purple-100 text-purple-800';
      case 'weekly_test': return 'bg-orange-100 text-orange-800';
      case 'assignment': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const firstName = user?.full_name?.split(' ')[0] || user?.name?.split(' ')[0] || 'Curator';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.full_name}! 
        </h1>
        <p className="text-gray-600 mt-1">
          Here's an overview of your groups and students
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" data-tour="dashboard-overview">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <div className="text-sm text-gray-600">Total Students</div>
                <div className="text-2xl font-bold">{stats?.total_students || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <GraduationCap className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <div className="text-sm text-gray-600">My Groups</div>
                <div className="text-2xl font-bold">{stats?.total_groups || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <div className="text-sm text-gray-600">Avg Progress</div>
                <div className="text-2xl font-bold">{stats?.avg_completion_rate || 0}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-orange-600 mr-3" />
              <div>
                <div className="text-sm text-gray-600">Upcoming Events</div>
                <div className="text-2xl font-bold">{stats?.upcoming_events || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Students Section */}
          <Card data-tour="students-section">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Your Students</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/analytics')}
                >
                  View All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Track your students' progress and provide support where needed. Access detailed
                analytics to identify students who may require additional help.
              </p>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => navigate('/analytics')}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
                <Button variant="outline" onClick={() => navigate('/chat')}>
                  <Users className="w-4 h-4 mr-2" />
                  Message Students
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Groups Section */}
          <Card data-tour="groups-section">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Manage Groups</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/calendar')}
                >
                  Schedule Meeting
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Organize and coordinate your student groups. Schedule meetings, track group
                activities, and manage group communications.
              </p>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => navigate('/calendar')}>
                  <Calendar className="w-4 h-4 mr-2" />
                  View Calendar
                </Button>
                <Button variant="outline" onClick={() => navigate('/analytics')}>
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Group Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Upcoming Deadlines */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingUpcoming ? (
                <div className="text-center py-8 text-gray-500">Loading deadlines...</div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const allDeadlines = [
                      ...assignments.map(a => ({
                        id: `assignment-${a.id}`,
                        title: a.title,
                        date: a.due_date,
                        type: 'assignment'
                      })),
                      ...events.map(e => ({
                        id: `event-${e.id}`,
                        title: e.title,
                        date: e.start_datetime,
                        type: 'event',
                        eventType: e.event_type
                      }))
                    ].filter(d => d.date)
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .slice(0, 10);

                    return allDeadlines.length > 0 ? (
                      allDeadlines.map((deadline) => (
                        <div key={deadline.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className={`p-2 rounded-md ${getEventColor(deadline.type === 'assignment' ? 'assignment' : (deadline as any).eventType)}`}>
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{deadline.title}</div>
                            <div className="text-xs text-gray-500">
                              {deadline.type === 'assignment' ? `Due ${formatDate(deadline.date)}` : formatDateTime(deadline.date)}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No upcoming deadlines
                      </div>
                    );
                  })()}
                  <Button 
                    variant="ghost" 
                    className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-sm"
                    onClick={() => navigate('/calendar')}
                  >
                    View Full Calendar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
