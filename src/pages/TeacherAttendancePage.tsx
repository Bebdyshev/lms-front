import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Save,
  Search,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import apiClient from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Group, Event, EventStudent } from '../types';

export default function TeacherAttendancePage() {
  const navigate = useNavigate();
  const { } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [students, setStudents] = useState<EventStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Status mapping
  const statusColors: Record<string, string> = {
    attended: 'bg-green-100 text-green-700 border-green-200',
    missed: 'bg-red-100 text-red-700 border-red-200',
    late: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    registered: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const fetchedGroups = await apiClient.getTeacherGroups();
      setGroups(fetchedGroups || []);
      
      if (fetchedGroups && fetchedGroups.length > 0) {
        setSelectedGroupId(fetchedGroups[0].id.toString());
        loadEvents(fetchedGroups[0].id.toString());
      }
    } catch (err) {
      console.error('Failed to load groups:', err);
      toast.error('Failed to load your groups');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async (groupId: string) => {
    try {
      setLoading(true);
      // Fetch recent and upcoming events for this group
      // We'll use getCalendarEvents for the current month as a simple source
      const now = new Date();
      const eventsData = await apiClient.getCalendarEvents(now.getFullYear(), now.getMonth() + 1);
      
      // Filter for this group and "class" type
      const groupEvents = eventsData.filter(e => 
        (e.group_ids?.includes(parseInt(groupId)) || e.groups?.includes(groups.find(g => g.id.toString() === groupId)?.name || '')) &&
        e.event_type === 'class'
      );
      
      // Sort by date (descending)
      groupEvents.sort((a, b) => new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime());
      
      setEvents(groupEvents);
      if (groupEvents.length > 0) {
        setSelectedEventId(groupEvents[0].id.toString());
        loadParticipants(groupEvents[0].id.toString(), groupId);
      } else {
        setSelectedEventId('');
        setStudents([]);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
      toast.error('Failed to load group events');
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async (eventId: string, groupId: string) => {
    try {
      setLoading(true);
      const data = await apiClient.getEventParticipants(parseInt(eventId), parseInt(groupId));
      setStudents(data);
    } catch (err) {
      console.error('Failed to load students:', err);
      toast.error('Failed to load student list');
    } finally {
      setLoading(false);
    }
  };

  const handleGroupChange = (value: string) => {
    setSelectedGroupId(value);
    loadEvents(value);
  };

  const handleEventChange = (value: string) => {
    setSelectedEventId(value);
    loadParticipants(value, selectedGroupId);
  };

  const updateStudentStatus = (studentId: number, status: string) => {
    setStudents(prev => prev.map(s => 
      s.student_id === studentId ? { ...s, attendance_status: status } : s
    ));
  };

  const saveAttendance = async () => {
    if (!selectedEventId) return;

    try {
      setSaving(true);
      const payload = {
        attendance: students.map(s => ({
          student_id: s.student_id,
          status: s.attendance_status
        }))
      };
      
      await apiClient.updateEventAttendance(parseInt(selectedEventId), payload);
      toast.success('Attendance saved successfully');
      
      // Refresh to update timestamps
      loadParticipants(selectedEventId, selectedGroupId);
    } catch (err) {
      console.error('Failed to save attendance:', err);
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: students.length,
    present: students.filter(s => s.attendance_status === 'attended').length,
    absent: students.filter(s => s.attendance_status === 'missed').length,
    late: students.filter(s => s.attendance_status === 'late').length,
  };

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Attendance Tracking
          </h1>
          <p className="text-slate-500 mt-1">Mark student attendance for your scheduled lessons.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate('/teacher/class')}
          >
            <Users className="w-4 h-4 mr-2" />
            My Class
          </Button>
          <Button 
            onClick={saveAttendance} 
            disabled={saving || students.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? (
              <Clock className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Attendance
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Select Group</label>
          <Select value={selectedGroupId} onValueChange={handleGroupChange}>
            <SelectTrigger className="bg-slate-50 border-slate-200">
              <SelectValue placeholder="Chose group..." />
            </SelectTrigger>
            <SelectContent>
              {groups.map(g => (
                <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Select Lesson</label>
          <Select 
            value={selectedEventId} 
            onValueChange={handleEventChange}
            disabled={!selectedGroupId || events.length === 0}
          >
            <SelectTrigger className="bg-slate-50 border-slate-200">
              <SelectValue placeholder={events.length > 0 ? "Choose lesson..." : "No lessons found"} />
            </SelectTrigger>
            <SelectContent>
              {events.map(e => (
                <SelectItem key={e.id} value={e.id.toString()}>
                  {new Date(e.start_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Bar */}
      {students.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-none bg-blue-50 shadow-none">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
              <div className="text-xs font-semibold text-blue-500 uppercase tracking-wider">Total Students</div>
            </CardContent>
          </Card>
          <Card className="border-none bg-green-50 shadow-none">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-700">{stats.present}</div>
              <div className="text-xs font-semibold text-green-500 uppercase tracking-wider">Present</div>
            </CardContent>
          </Card>
          <Card className="border-none bg-red-50 shadow-none">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-700">{stats.absent}</div>
              <div className="text-xs font-semibold text-red-500 uppercase tracking-wider">Absent</div>
            </CardContent>
          </Card>
          <Card className="border-none bg-yellow-50 shadow-none">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-700">{stats.late}</div>
              <div className="text-xs font-semibold text-yellow-500 uppercase tracking-wider">Late</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Students Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search students..." 
                className="pl-10 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           
           <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs uppercase font-bold text-slate-500"
                onClick={() => students.forEach(s => updateStudentStatus(s.student_id, 'attended'))}
              >
                Mark All Present
              </Button>
           </div>
        </div>
        
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center">
              <Clock className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-slate-500">Loading student list...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-20 text-center">
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900">No students selected</h3>
              <p className="text-slate-500">Select a group and a lesson to track attendance.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                  <tr>
                    <th className="px-6 py-4 text-left">Student Name</th>
                    <th className="px-6 py-4 text-center">Attendance Status</th>
                    <th className="px-6 py-4 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredStudents.map((student) => (
                    <tr key={student.student_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{student.name}</div>
                        {student.last_updated && (
                          <div className="text-[10px] text-slate-400 mt-1">
                            Updated: {new Date(student.last_updated).toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <Badge className={`${statusColors[student.attendance_status]} border px-3 py-1 shadow-none rounded-full`}>
                            {student.attendance_status.toUpperCase()}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => {
                              const next = student.attendance_status === 'attended' ? 'late' : 
                                           student.attendance_status === 'late' ? 'missed' : 'attended';
                              updateStudentStatus(student.student_id, next);
                            }}
                            className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all shadow-sm active:scale-90 border-2 ${
                              student.attendance_status === 'attended' 
                                ? 'bg-green-600 border-green-500 text-white' 
                                : student.attendance_status === 'late'
                                ? 'bg-yellow-500 border-yellow-400 text-white'
                                : 'bg-red-600 border-red-500 text-white'
                            }`}
                            title="Click to Cycle: Attended -> Late -> Missed"
                          >
                            {student.attendance_status === 'attended' && <CheckCircle className="w-6 h-6" />}
                            {student.attendance_status === 'late' && <Clock className="w-6 h-6" />}
                            {(student.attendance_status === 'missed' || student.attendance_status === 'registered') && <XCircle className="w-6 h-6" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
