import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Plus, 
  Filter,
  Clock,
  MapPin,
  Video,
  Users,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import Loader from '../components/Loader';
import { 
  getCalendarEvents, 
  getTeacherGroups, 
  getCuratorGroups, 
  getGroups,
  getMyLessonRequests,
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Event, EventType, LessonRequest } from '../types';
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from '../types';

interface CalendarDay {
  date: Date;
  events: Event[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

// Palette of distinct, readable saturated pastel colors with high-contrast text
const CLASS_COLORS = [
  'bg-emerald-100 text-emerald-900 border-emerald-200',
  'bg-violet-100 text-violet-900 border-violet-200',
  'bg-amber-100 text-amber-900 border-amber-200',
  'bg-cyan-100 text-cyan-900 border-cyan-200',
  'bg-pink-100 text-pink-900 border-pink-200',
  'bg-indigo-100 text-indigo-900 border-indigo-200',
  'bg-teal-100 text-teal-900 border-teal-200',
  'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200',
  'bg-lime-100 text-lime-900 border-lime-200',
  'bg-sky-100 text-sky-900 border-sky-200',
  'bg-rose-100 text-rose-900 border-rose-200',
];

export default function Calendar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [eventTypeFilter, setEventTypeFilter] = useState<EventType | 'all'>('all');
  const [groups, setGroups] = useState<{id: number, name: string}[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [myRequests, setMyRequests] = useState<Map<number, LessonRequest>>(new Map()); // event_id -> request object

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    loadEvents();
    loadGroups();
  }, [currentDate]);

  // Auto-scroll to current time or first event when dialog opens
  useEffect(() => {
    if (selectedDay) {
      setTimeout(() => {
        const timeIndicator = document.getElementById('current-time-indicator');
        if (timeIndicator) {
          timeIndicator.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // If no time indicator (e.g. not today), scroll to first event?
          // Default behavior is top, which is fine.
        }
      }, 100);
    }
  }, [selectedDay]);

  const loadGroups = async () => {
    try {
      let fetchedGroups: any[] = [];
      if (user?.role === 'teacher') {
        fetchedGroups = await getTeacherGroups();
      } else if (user?.role === 'curator') {
        fetchedGroups = await getCuratorGroups();
      } else if (user?.role === 'admin') {
        fetchedGroups = await getGroups();
      }
      // Deduplicate if needed and sort
      setGroups(fetchedGroups || []);
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const [eventsData, requestsData] = await Promise.all([
        getCalendarEvents(year, month),
        user?.role === 'teacher' ? getMyLessonRequests() : Promise.resolve([])
      ]);
      setEvents(eventsData);
      
      // Map event_id -> request
      const reqMap = new Map<number, LessonRequest>();
      requestsData.forEach(r => {
        if (r.event_id) reqMap.set(r.event_id, r);
      });
      setMyRequests(reqMap);

    } catch (error) {
      console.error('Failed to load calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const generateCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const today = new Date();

    // Get first day of the week (Monday = 1, Sunday = 0)
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(firstDay.getDate() - daysToSubtract);

    // Generate 42 days (6 weeks)
    const days: CalendarDay[] = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayEvents = events.filter(event => {
        const eventStart = new Date(event.start_datetime);
        const eventEnd = new Date(event.end_datetime);
        
        // Normalize dates to compare just the day part
        const currentDay = new Date(date);
        currentDay.setHours(0, 0, 0, 0);
        
        const startDay = new Date(eventStart);
        startDay.setHours(0, 0, 0, 0);
        
        const endDay = new Date(eventEnd);
        endDay.setHours(0, 0, 0, 0);
        
        return currentDay >= startDay && currentDay <= endDay;
      });

      // Apply event type filter
      let filteredEvents = eventTypeFilter === 'all' 
        ? dayEvents 
        : dayEvents.filter(event => event.event_type === eventTypeFilter);

      // Apply group filter
      if (selectedGroupId !== 'all') {
        const groupId = parseInt(selectedGroupId);
        filteredEvents = filteredEvents.filter(event => 
          event.group_ids && event.group_ids.includes(groupId)
        );
      }

      const finalEvents = user?.role === 'admin' 
        ? filteredEvents.filter(event => event.event_type !== 'assignment')
        : filteredEvents;

      days.push({
        date,
        events: finalEvents,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString(),
        isWeekend: date.getDay() === 0 || date.getDay() === 6
      });
    }

    return days;
  };

  const formatTime = (dateTimeString: string) => {
    // Backend stores in UTC, convert to Kazakhstan time (GMT+5)
    const utcDate = new Date(dateTimeString);
    return utcDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Almaty' // Kazakhstan timezone (GMT+5)
    });
  };

  // Helper to generate a consistent hash from a string
  const getStringHash = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };

  const checkMonthlyLimit = (event: Event): boolean => {
      if (!event.group_ids || event.group_ids.length === 0) return false;
      
      const eventDate = new Date(event.start_datetime);
      const eMonth = eventDate.getMonth();
      const eYear = eventDate.getFullYear();
      
      let count = 0;
      // Count requests for this group in this month
      // Iterate all myRequests
      for (const req of myRequests.values()) {
          // Check if request is for one of the event's groups
          const reqGroupId = req.group_id; // number
          if (!event.group_ids.includes(reqGroupId)) continue;
          
          if (req.status === 'rejected') continue;
          
          const reqDate = new Date(req.original_datetime);
          if (reqDate.getMonth() === eMonth && reqDate.getFullYear() === eYear) {
              count++;
          }
      }
      return count >= 2;
  };

  // Get color based on event type and content
  // Prioritize using group_ids to determine color, so all lessons for the same group(s) have the same color.
  // This avoids unique colors for each "Lesson N" title.
  const getEventColor = (event: Event) => {
    if (event.event_type === 'class') {
      let seed = event.title || 'default';
      
      // If groups are assigned, use them as the seed to ensure all lessons for the same group(s) have the same color
      if (event.group_ids && event.group_ids.length > 0) {
        // Sort group IDs to ensure consistent color regardless of order
        seed = [...event.group_ids].sort((a, b) => a - b).join(',');
      } else if (event.groups && event.groups.length > 0) {
        // Fallback to group names if IDs are missing for some reason
        seed = [...event.groups].sort().join(',');
      }

      const hash = getStringHash(seed);
      const colorIndex = hash % CLASS_COLORS.length;
      return CLASS_COLORS[colorIndex];
    }
    
    // For other types, use standard defined colors
    return EVENT_TYPE_COLORS[event.event_type] || 'bg-gray-100 text-gray-800';
  };

  const calendarDays = generateCalendarDays();

  if (loading && events.length === 0) {
    return <Loader size="xl" animation="spin" color="#2563eb" />;
  }

  return (
    <div className="p-2 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="hidden sm:inline">Event Calendar</span>
              <span className="sm:hidden">Calendar</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-600">View schedule and events</p>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {(user?.role === 'admin' || user?.role === 'curator') && (
              <Button 
                onClick={() => {
                  if (user?.role === 'admin') {
                    navigate('/admin/events/create');
                  } else {
                    navigate('/curator/events/create');
                  }
                }}
                className="flex items-center gap-2 w-full sm:w-auto"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Create Event</span>
                <span className="sm:hidden">Create</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="bg-white rounded-lg border p-3 sm:p-4">
        <div className="flex flex-col gap-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
                className="p-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 text-center min-w-[150px] sm:min-w-[200px]">
                <span className="hidden sm:inline">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                <span className="sm:hidden">{monthNames[currentDate.getMonth()].slice(0, 3)} {currentDate.getFullYear()}</span>
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
                className="p-2"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="text-xs sm:text-sm"
            >
              Today
            </Button>
          </div>

          {/* Event Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <Select value={eventTypeFilter} onValueChange={(value) => setEventTypeFilter(value as EventType | 'all')}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="class">Classes</SelectItem>
                <SelectItem value="weekly_test">Weekly Tests</SelectItem>
                <SelectItem value="webinar">Webinars</SelectItem>
                <SelectItem value="assignment">Assignments</SelectItem>
              </SelectContent>
            </Select>

            {/* Group Filter */}
            {(user?.role === 'teacher' || user?.role === 'curator' || user?.role === 'admin') && groups.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="All Groups" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {groups.map(group => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {dayNames.map(day => (
            <div key={day} className="p-2 sm:p-3 text-center font-medium text-gray-700 border-r last:border-r-0 text-xs sm:text-sm">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.slice(0, 1)}</span>
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`
                min-h-[80px] sm:min-h-[120px] p-1 sm:p-2 border-r border-b last:border-r-0 cursor-pointer
                hover:bg-gray-50 transition-colors touch-manipulation
                ${!day.isCurrentMonth ? 'bg-gray-50' : ''}
                ${day.isToday ? 'bg-blue-50 border-blue-200' : ''}
                ${day.isWeekend && day.isCurrentMonth ? 'bg-gray-25' : ''}
              `}
              onClick={() => day.events.length > 0 && setSelectedDay(day)}
            >
              <div className={`
                text-xs sm:text-sm font-medium mb-1
                ${!day.isCurrentMonth ? 'text-gray-400' : 'text-gray-900'}
                ${day.isToday ? 'text-blue-600 font-bold' : ''}
              `}>
                {day.date.getDate()}
              </div>
              
              {/* Events */}
              <div className="space-y-0.5 sm:space-y-1">
                  {day.events.slice(0, 2).map(event => {
                    const isSubstituted = user?.role === 'teacher' && event.teacher_id && Number(event.teacher_id) !== Number(user.id);
                    return (
                      <div
                        key={event.id}
                        className={`
                          text-xs p-0.5 sm:p-1 rounded truncate cursor-pointer
                          ${getEventColor(event)}
                          ${isSubstituted ? 'border-dashed border-2 opacity-75' : ''}
                        `}
                        title={`${event.title} - ${formatTime(event.start_datetime)}${isSubstituted ? ' (Substituted)' : ''}`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="truncate text-xs">{event.title}</span>
                          {isSubstituted && <span className="text-[10px] uppercase font-bold tracking-tighter opacity-80">(SUB)</span>}
                        </div>
                        <div className="text-xs opacity-75 hidden sm:block">
                          {formatTime(event.start_datetime)}
                        </div>
                      </div>
                    );
                  })}
                
                {day.events.length > 2 && (
                  <div className="text-xs text-gray-500 text-center py-0.5 sm:py-1">
                    +{day.events.length - 2} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg border p-3 sm:p-4">
        <h3 className="font-medium text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">Event Types:</h3>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-gradient-to-br from-emerald-100 to-indigo-100 border border-gray-200 flex-shrink-0"></div>
            <span className="text-xs sm:text-sm text-gray-600">Classes (Varied)</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-yellow-100 border border-yellow-200 flex-shrink-0"></div>
            <span className="text-xs sm:text-sm text-gray-600">Weekly Tests</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-red-100 border border-red-200 flex-shrink-0"></div>
            <span className="text-xs sm:text-sm text-gray-600">Webinars</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-orange-100 border border-orange-200 flex-shrink-0"></div>
            <span className="text-xs sm:text-sm text-gray-600">Assignments</span>
          </div>
        </div>
      </div>

      {/* Day Events Dialog */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-4xl mx-4 sm:mx-0 h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-4 border-b flex-shrink-0 bg-white z-10">
            <DialogTitle className="text-xl sm:text-2xl flex items-center gap-2">
              <span className="font-bold text-gray-900">
                {selectedDay?.date.toLocaleDateString('en-US', { weekday: 'long' })}
              </span>
              <span className="text-gray-500 font-normal">
                {selectedDay?.date.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}
              </span>
              {selectedDay?.isToday && (
                <Badge className="ml-2 bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">Today</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4 sm:p-6" id="day-view-container">
            {selectedDay?.events.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <CalendarIcon className="w-12 h-12 mb-2 opacity-20" />
                <p>No events scheduled for this day</p>
              </div>
            ) : (
              <div className="relative max-w-3xl mx-auto space-y-6">
                 {/* Current Time Indicator (only for Today) */}
                 {selectedDay?.isToday && (() => {
                    const now = new Date();
                    // We render this absolutely or interjected? 
                    // Let's interject it into the flow visually using a custom component helper logic below
                    return null; 
                 })()}

                {/* Events List with Time Indicators */}
                {(() => {
                  const now = new Date();
                  const isToday = selectedDay?.isToday;
                  const currentHour = now.getHours();
                  const currentMinute = now.getMinutes();
                  const currentTimeValue = currentHour * 60 + currentMinute;

                  // Sort events by start time
                  const sortedEvents = [...(selectedDay?.events || [])].sort((a, b) => {
                    return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
                  });

                  let hasRenderedTimeLine = false;

                  return sortedEvents.map((event) => {
                    const startInfo = new Date(event.start_datetime);
                    const eventTimeValue = startInfo.getHours() * 60 + startInfo.getMinutes();
                    
                    // Check if we should render the time line before this event
                    // Render if it's today, we haven't rendered it yet, and this event is in the future (or now)
                    const showTimeLine = isToday && !hasRenderedTimeLine && eventTimeValue > currentTimeValue;
                    
                    if (showTimeLine) {
                      hasRenderedTimeLine = true;
                    }
                    
                    const isSubstituted = user?.role === 'teacher' && event.teacher_id && Number(event.teacher_id) !== Number(user.id);
                    
                    return (
                      <div key={`container-${event.id}`}>
                        {showTimeLine && (
                           <div 
                             id="current-time-indicator" 
                             className="flex items-center gap-4 my-6 scroll-mt-24"
                           >
                              <div className="text-red-500 font-bold text-sm w-16 text-right">
                                {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                              </div>
                              <div className="flex-1 h-px bg-red-500 relative">
                                <div className="absolute left-0 -top-1 w-2 h-2 rounded-full bg-red-500"></div>
                              </div>
                           </div>
                        )}

                        <div className="flex gap-4 group">
                          {/* Time Column */}
                          <div className="flex flex-col items-end w-16 flex-shrink-0 pt-1">
                            <span className="text-sm font-bold text-gray-900">
                              {formatTime(event.start_datetime).split(' ')[0]}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatTime(event.start_datetime).split(' ')[1]}
                            </span>
                          </div>

                          {/* Event Card */}
                          <div className={`
                            flex-1 p-4 rounded-xl border transition-all
                            ${getEventColor(event)}
                            ${isSubstituted ? 'border-dashed border-2 opacity-75' : ''}
                            hover:brightness-95
                          `}>
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div>
                                <h3 className="font-bold text-base sm:text-lg">{event.title}</h3>
                                {event.description && (
                                  <p className="text-sm opacity-90 mt-1 line-clamp-2">{event.description}</p>
                                )}
                              </div>
                              <Badge variant="outline" className="border-current opacity-75 hidden sm:flex">
                                {EVENT_TYPE_LABELS[event.event_type]}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm opacity-90">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 opacity-75" />
                                <span>
                                  {formatTime(event.start_datetime)} - {formatTime(event.end_datetime)}
                                </span>
                              </div>

                              {event.location && (
                                <div className="flex items-center gap-2 overflow-hidden">
                                  {event.is_online ? (
                                    <Video className="w-4 h-4 opacity-75 flex-shrink-0" />
                                  ) : (
                                    <MapPin className="w-4 h-4 opacity-75 flex-shrink-0" />
                                  )}
                                  {event.location.startsWith('http') ? (
                                    <a 
                                      href={event.location}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:underline truncate underline-offset-4"
                                    >
                                      Enter Class
                                    </a>
                                  ) : (
                                    <span className="truncate">{event.location}</span>
                                  )}
                                </div>
                              )}

                              {event.groups && event.groups.length > 0 && (
                                <div className="flex items-center gap-2 col-span-1 sm:col-span-2">
                                  <Users className="w-4 h-4 opacity-75 flex-shrink-0" />
                                  <span className="truncate">
                                    {event.groups.join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Substituted Indicator */}
                            {isSubstituted && (
                                <div className="text-xs font-semibold mt-2 px-2 py-1 text-amber-800 bg-amber-50 rounded border border-amber-200 w-fit">
                                    Substituted by: {event.teacher_name || 'Another Teacher'}
                                </div>
                            )}

                            {/* Substitute Teacher Indicator */}
                            {event.is_substitution && !isSubstituted && (
                                <div className="text-xs font-semibold mt-2 px-2 py-1 text-blue-800 bg-blue-50 rounded border border-blue-200 w-fit">
                                    You are substituting
                                </div>
                            )}

                            {/* Substitution / Reschedule buttons for teachers */}
                            {(user?.role === 'teacher' || user?.role === 'admin') && 
                             event.event_type === 'class' && 
                             !isSubstituted &&
                             !event.is_substitution &&
                             new Date(event.start_datetime) > new Date() && (
                              <div className="flex gap-2 mt-3 pt-3 border-t border-current/10 flex-wrap">
                                {myRequests.has(event.id) ? (
                                    <div className="text-xs font-semibold px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                                        Request {myRequests.get(event.id)?.status.replace('_', ' ')}
                                    </div>
                                ) : checkMonthlyLimit(event) ? (
                                    <div className="text-xs font-semibold px-2 py-1 bg-red-100 text-red-800 rounded border border-red-200">
                                        Monthly request limit reached (2/2)
                                    </div>
                                ) : (
                                    <>
                                        <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const params = new URLSearchParams({
                                            type: 'substitution',
                                            event_id: String(event.id),
                                            group_id: String(event.group_ids?.[0] || 0),
                                            title: event.title,
                                            datetime: event.start_datetime,
                                            });
                                            navigate(`/lesson-requests/new?${params.toString()}`);
                                        }}
                                        className="text-xs font-medium px-3 py-1.5 rounded-md bg-white/60 hover:bg-white/80 transition text-gray-700"
                                        >
                                        Find Substitute
                                        </button>
                                        <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const params = new URLSearchParams({
                                            type: 'reschedule',
                                            event_id: String(event.id),
                                            group_id: String(event.group_ids?.[0] || 0),
                                            title: event.title,
                                            datetime: event.start_datetime,
                                            });
                                            navigate(`/lesson-requests/new?${params.toString()}`);
                                        }}
                                        className="text-xs font-medium px-3 py-1.5 rounded-md bg-white/60 hover:bg-white/80 transition text-gray-700"
                                        >
                                        Reschedule
                                        </button>
                                    </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
                
                {/* Fallback timestamp at the end if all events passed today */}
                {selectedDay?.isToday && (() => {
                   const now = new Date();
                   const events = selectedDay.events;
                   const lastEvent = events.length > 0 
                     ? events.sort((a,b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())[events.length-1] 
                     : null;
                   
                   const lastEventEnd = lastEvent ? new Date(lastEvent.end_datetime) : new Date(0);
                   
                   // If now is after the last event, show the line at the bottom
                   if (now > lastEventEnd) {
                     return (
                       <div 
                         id="current-time-indicator" 
                         className="flex items-center gap-4 my-6 scroll-mt-24 opacity-50"
                       >
                          <div className="text-red-500 font-bold text-sm w-16 text-right">
                            {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </div>
                          <div className="flex-1 h-px bg-red-500 relative">
                             <div className="absolute left-0 -top-1 w-2 h-2 rounded-full bg-red-500"></div>
                          </div>
                       </div>
                     )
                   }
                   return null;
                })()}

              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
