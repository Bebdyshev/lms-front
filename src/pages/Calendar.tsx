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
  Users
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
import { getCalendarEvents } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Event, EventType } from '../types';
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from '../types';

interface CalendarDay {
  date: Date;
  events: Event[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

export default function Calendar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [eventTypeFilter, setEventTypeFilter] = useState<EventType | 'all'>('all');

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  useEffect(() => {
    loadEvents();
  }, [currentDate]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const eventsData = await getCalendarEvents(year, month);
      setEvents(eventsData);
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
    const lastDay = new Date(year, month + 1, 0);
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
        const eventDate = new Date(event.start_datetime);
        return eventDate.toDateString() === date.toDateString();
      });

      // Apply event type filter
      const filteredEvents = eventTypeFilter === 'all' 
        ? dayEvents 
        : dayEvents.filter(event => event.event_type === eventTypeFilter);

      days.push({
        date,
        events: filteredEvents,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString(),
        isWeekend: date.getDay() === 0 || date.getDay() === 6
      });
    }

    return days;
  };

  const formatTime = (dateTimeString: string) => {
    return new Date(dateTimeString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventTypeColor = (eventType: EventType) => {
    return EVENT_TYPE_COLORS[eventType] || 'bg-gray-100 text-gray-800';
  };

  const calendarDays = generateCalendarDays();

  if (loading && events.length === 0) {
    return <Loader size="xl" animation="spin" color="#2563eb" />;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6" />
            Event Calendar
          </h1>
          <p className="text-gray-600">View schedule and events</p>
        </div>
        
        <div className="flex items-center gap-2">
          {user?.role === 'admin' && (
            <Button 
              onClick={() => navigate('/admin/events/create')}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Event
            </Button>
          )}
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
          </div>

          {/* Event Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <Select value={eventTypeFilter} onValueChange={(value) => setEventTypeFilter(value as EventType | 'all')}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="class">Classes</SelectItem>
                <SelectItem value="weekly_test">Weekly Tests</SelectItem>
                <SelectItem value="webinar">Webinars</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {dayNames.map(day => (
            <div key={day} className="p-3 text-center font-medium text-gray-700 border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`
                min-h-[120px] p-2 border-r border-b last:border-r-0 cursor-pointer
                hover:bg-gray-50 transition-colors
                ${!day.isCurrentMonth ? 'bg-gray-50' : ''}
                ${day.isToday ? 'bg-blue-50 border-blue-200' : ''}
                ${day.isWeekend && day.isCurrentMonth ? 'bg-gray-25' : ''}
              `}
              onClick={() => day.events.length > 0 && setSelectedDay(day)}
            >
              <div className={`
                text-sm font-medium mb-1
                ${!day.isCurrentMonth ? 'text-gray-400' : 'text-gray-900'}
                ${day.isToday ? 'text-blue-600 font-bold' : ''}
              `}>
                {day.date.getDate()}
              </div>
              
              {/* Events */}
              <div className="space-y-1">
                {day.events.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className={`
                      text-xs p-1 rounded truncate cursor-pointer
                      ${getEventTypeColor(event.event_type)}
                    `}
                    title={`${event.title} - ${formatTime(event.start_datetime)}`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="truncate">{event.title}</span>
                    </div>
                    <div className="text-xs opacity-75">
                      {formatTime(event.start_datetime)}
                    </div>
                  </div>
                ))}
                
                {day.events.length > 3 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    +{day.events.length - 3} еще
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-medium text-gray-900 mb-3">Event Types:</h3>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-100 border border-blue-200"></div>
            <span className="text-sm text-gray-600">Classes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-200"></div>
            <span className="text-sm text-gray-600">Weekly Tests</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-100 border border-red-200"></div>
            <span className="text-sm text-gray-600">Webinars</span>
          </div>
        </div>
      </div>

      {/* Day Events Dialog */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Events on {selectedDay?.date.toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {selectedDay?.events.map(event => (
              <div key={event.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{event.title}</h3>
                  <Badge className={`${getEventTypeColor(event.event_type)} border`}>
                    {EVENT_TYPE_LABELS[event.event_type]}
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {formatTime(event.start_datetime)} - {formatTime(event.end_datetime)}
                  </div>
                  
                  {event.location && (
                    <div className="flex items-center gap-2">
                      {event.is_online ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                      {event.location}
                    </div>
                  )}
                  
                  {event.groups && event.groups.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {event.groups.join(', ')}
                    </div>
                  )}
                </div>
                
                {event.description && (
                  <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
