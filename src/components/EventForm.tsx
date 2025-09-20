import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Video, 
  Users, 
  Repeat, 
  Save,
  X,
  AlertCircle
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { createEvent, updateEvent, getAllGroups } from '../services/api';
import type { Event, CreateEventRequest, UpdateEventRequest, EventType, Group } from '../types';
import { EVENT_TYPE_LABELS } from '../types';

interface EventFormProps {
  event?: Event;
  onSave: (event: Event) => void;
  onCancel: () => void;
}

export default function EventForm({ event, onSave, onCancel }: EventFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    event_type: event?.event_type || 'class' as EventType,
    start_datetime: event?.start_datetime ? new Date(event.start_datetime).toISOString().slice(0, 16) : '',
    end_datetime: event?.end_datetime ? new Date(event.end_datetime).toISOString().slice(0, 16) : '',
    location: event?.location || '',
    is_online: event?.is_online ?? true,
    meeting_url: event?.meeting_url || '',
    is_recurring: event?.is_recurring || false,
    recurrence_pattern: event?.recurrence_pattern || 'weekly',
    recurrence_end_date: event?.recurrence_end_date || '',
    max_participants: event?.max_participants || undefined,
    group_ids: [] as number[]
  });

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const groupsData = await getAllGroups();
      setGroups(groupsData.groups || groupsData);
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleGroupToggle = (groupId: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      group_ids: checked 
        ? [...prev.group_ids, groupId]
        : prev.group_ids.filter(id => id !== groupId)
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.title.trim()) {
      return 'Event title is required';
    }
    
    if (!formData.start_datetime) {
      return 'Start date and time are required';
    }
    
    if (!formData.end_datetime) {
      return 'End date and time are required';
    }
    
    const startDate = new Date(formData.start_datetime);
    const endDate = new Date(formData.end_datetime);
    
    if (startDate >= endDate) {
      return 'Start time must be before end time';
    }
    
    if (formData.group_ids.length === 0) {
      return 'Select at least one group';
    }
    
    if (formData.event_type === 'webinar' && formData.max_participants && formData.max_participants < 1) {
      return 'Maximum participants must be greater than 0';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const eventData: CreateEventRequest | UpdateEventRequest = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        event_type: formData.event_type,
        start_datetime: formData.start_datetime,
        end_datetime: formData.end_datetime,
        location: formData.location.trim() || undefined,
        is_online: formData.is_online,
        meeting_url: formData.meeting_url.trim() || undefined,
        is_recurring: formData.is_recurring,
        recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : undefined,
        recurrence_end_date: formData.is_recurring && formData.recurrence_end_date ? formData.recurrence_end_date : undefined,
        max_participants: formData.event_type === 'webinar' ? formData.max_participants : undefined,
        group_ids: formData.group_ids
      };

      let savedEvent: Event;
      if (event) {
        savedEvent = await updateEvent(event.id, eventData);
      } else {
        savedEvent = await createEvent(eventData as CreateEventRequest);
      }

      onSave(savedEvent);
    } catch (error: any) {
      setError(error.message || 'Ошибка при сохранении события');
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeIcon = (type: EventType) => {
    switch (type) {
      case 'class':
        return <Users className="w-4 h-4" />;
      case 'weekly_test':
        return <Clock className="w-4 h-4" />;
      case 'webinar':
        return <Video className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {event ? 'Edit Event' : 'Create Event'}
        </h1>
        <p className="text-gray-600">
          {event ? 'Make changes to the event' : 'Fill in information about the new event'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter event title"
                required
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Event description (optional)"
                rows={3}
              />
            </div>

            {/* Event Type */}
            <div>
              <Label htmlFor="event_type">Event Type *</Label>
              <Select value={formData.event_type} onValueChange={(value) => handleInputChange('event_type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="class">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {EVENT_TYPE_LABELS.class}
                    </div>
                  </SelectItem>
                  <SelectItem value="weekly_test">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {EVENT_TYPE_LABELS.weekly_test}
                    </div>
                  </SelectItem>
                  <SelectItem value="webinar">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      {EVENT_TYPE_LABELS.webinar}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Date and Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Date and Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_datetime">Start Time *</Label>
                <Input
                  id="start_datetime"
                  type="datetime-local"
                  value={formData.start_datetime}
                  onChange={(e) => handleInputChange('start_datetime', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_datetime">End Time *</Label>
                <Input
                  id="end_datetime"
                  type="datetime-local"
                  value={formData.end_datetime}
                  onChange={(e) => handleInputChange('end_datetime', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Recurring */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_recurring"
                checked={formData.is_recurring}
                onCheckedChange={(checked) => handleInputChange('is_recurring', checked)}
              />
              <Label htmlFor="is_recurring" className="flex items-center gap-2">
                <Repeat className="w-4 h-4" />
                Recurring Event
              </Label>
            </div>

            {formData.is_recurring && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                <div>
                  <Label htmlFor="recurrence_pattern">Frequency</Label>
                  <Select 
                    value={formData.recurrence_pattern} 
                    onValueChange={(value) => handleInputChange('recurrence_pattern', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="recurrence_end_date">End Date</Label>
                  <Input
                    id="recurrence_end_date"
                    type="date"
                    value={formData.recurrence_end_date}
                    onChange={(e) => handleInputChange('recurrence_end_date', e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_online"
                checked={formData.is_online}
                onCheckedChange={(checked) => handleInputChange('is_online', checked)}
              />
              <Label htmlFor="is_online" className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                Online Event
              </Label>
            </div>

            <div>
              <Label htmlFor="location">
                {formData.is_online ? 'Meeting Link' : 'Location'}
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder={formData.is_online ? 'https://zoom.us/j/...' : 'Room 101'}
              />
            </div>

            {formData.is_online && (
              <div>
                <Label htmlFor="meeting_url">Additional Link</Label>
                <Input
                  id="meeting_url"
                  value={formData.meeting_url}
                  onChange={(e) => handleInputChange('meeting_url', e.target.value)}
                  placeholder="https://teams.microsoft.com/..."
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webinar Settings */}
        {formData.event_type === 'webinar' && (
          <Card>
            <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Webinar Settings
            </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="max_participants">Maximum Participants</Label>
                <Input
                  id="max_participants"
                  type="number"
                  min="1"
                  value={formData.max_participants || ''}
                  onChange={(e) => handleInputChange('max_participants', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="No limit"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Groups */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Participant Groups *
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {groups.map(group => (
                <div key={group.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`group-${group.id}`}
                    checked={formData.group_ids.includes(group.id)}
                    onCheckedChange={(checked) => handleGroupToggle(group.id, checked as boolean)}
                  />
                  <Label htmlFor={`group-${group.id}`} className="flex items-center gap-2">
                    {group.name}
                    <Badge variant="outline" className="text-xs">
                      {group.student_count} students
                    </Badge>
                  </Label>
                </div>
              ))}
              {groups.length === 0 && (
                <p className="text-gray-500 text-sm">No groups found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : event ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </div>
  );
}
