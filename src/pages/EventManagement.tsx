import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Users, 
  Clock, 
  MapPin,
  Video,
  AlertCircle,
  CheckCircle,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Badge } from '../components/ui/badge';
import Loader from '../components/Loader';
import { getAllEvents, deleteEvent, getAllGroups } from '../services/api';
import type { Event, EventType, Group } from '../types';
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from '../types';

export default function EventManagement() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventType, setSelectedEventType] = useState<EventType | 'all'>('all');
  const [selectedGroupId, setSelectedGroupId] = useState<number | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'upcoming' | 'today' | 'this_week'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventsData, groupsData] = await Promise.all([
        getAllEvents(),
        getAllGroups()
      ]);
      setEvents(eventsData);
      setGroups(groupsData.groups || groupsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      await deleteEvent(eventId);
      setEvents(events.filter(event => event.id !== eventId));
    } catch (error) {
      console.error('Failed to delete event:', error);
      alert('Error deleting event');
    }
  };

  const filteredEvents = events.filter(event => {
    // Search filter
    if (searchTerm && !event.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Event type filter
    if (selectedEventType !== 'all' && event.event_type !== selectedEventType) {
      return false;
    }

    // Group filter
    if (selectedGroupId !== 'all') {
      // This is a simplified check - in reality, you'd need to check if the event is assigned to the selected group
      // For now, we'll skip this filter since we don't have the group relationships loaded
    }

    // Date filter
    const now = new Date();
    const eventDate = new Date(event.start_datetime);
    
    switch (dateFilter) {
      case 'upcoming':
        return eventDate > now;
      case 'today':
        return eventDate.toDateString() === now.toDateString();
      case 'this_week':
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return eventDate >= now && eventDate <= weekFromNow;
      default:
        return true;
    }
  });

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventTypeColor = (eventType: EventType) => {
    return EVENT_TYPE_COLORS[eventType] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return <Loader size="xl" animation="spin" color="#2563eb" />;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Management</h1>
          <p className="text-gray-600">Create and manage group schedules</p>
        </div>
        <Button 
          onClick={() => navigate('/admin/events/create')}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Event Type Filter */}
          <Select value={selectedEventType} onValueChange={(value) => setSelectedEventType(value as EventType | 'all')}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="class">Classes</SelectItem>
              <SelectItem value="weekly_test">Weekly Tests</SelectItem>
              <SelectItem value="webinar">Webinars</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Filter */}
          <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as any)}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
            </SelectContent>
          </Select>

          {/* Group Filter */}
          <Select value={selectedGroupId.toString()} onValueChange={(value) => setSelectedGroupId(value === 'all' ? 'all' : parseInt(value))}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="Group" />
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
      </div>

      {/* Events List */}
      <div className="bg-white rounded-lg border">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedEventType !== 'all' || dateFilter !== 'all' 
                ? 'Try adjusting your search filters'
                : 'Create your first event to get started'
              }
            </p>
            {!searchTerm && selectedEventType === 'all' && dateFilter === 'all' && (
              <Button onClick={() => navigate('/admin/events/create')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredEvents.map(event => (
              <div key={event.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Event Header */}
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {event.title}
                      </h3>
                      <Badge className={`${getEventTypeColor(event.event_type)} border`}>
                        {EVENT_TYPE_LABELS[event.event_type]}
                      </Badge>
                      {event.is_recurring && (
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          Recurring
                        </Badge>
                      )}
                    </div>

                    {/* Event Details */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDateTime(event.start_datetime)} - {formatDateTime(event.end_datetime)}
                      </div>
                      
                      {event.location && (
                        <div className="flex items-center gap-1">
                          {event.is_online ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                          {event.location}
                        </div>
                      )}

                      {event.groups && event.groups.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {event.groups.join(', ')}
                        </div>
                      )}

                      {event.max_participants && (
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {event.participant_count || 0}/{event.max_participants}
                        </div>
                      )}
                    </div>

                    {/* Event Description */}
                    {event.description && (
                      <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                        {event.description}
                      </p>
                    )}

                    {/* Event Meta */}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Created by: {event.creator_name || 'Unknown'}</span>
                      <span>•</span>
                      <span>{new Date(event.created_at).toLocaleDateString('en-US')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/events/${event.id}/edit`)}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => navigate(`/admin/events/${event.id}`)}
                        >
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate(`/admin/events/${event.id}/participants`)}
                        >
                          Participants
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">{events.length}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Classes</p>
              <p className="text-2xl font-bold text-blue-600">
                {events.filter(e => e.event_type === 'class').length}
              </p>
            </div>
            <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">C</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tests</p>
              <p className="text-2xl font-bold text-yellow-600">
                {events.filter(e => e.event_type === 'weekly_test').length}
              </p>
            </div>
            <div className="w-8 h-8 rounded bg-yellow-100 flex items-center justify-center">
              <span className="text-yellow-600 font-bold text-sm">T</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Webinars</p>
              <p className="text-2xl font-bold text-red-600">
                {events.filter(e => e.event_type === 'webinar').length}
              </p>
            </div>
            <div className="w-8 h-8 rounded bg-red-100 flex items-center justify-center">
              <span className="text-red-600 font-bold text-sm">W</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
