import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EventForm from '../components/EventForm';
import Loader from '../components/Loader';
import { getEventDetails } from '../services/api';
import type { Event } from '../types';

export default function EditEvent() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const eventData = await getEventDetails(parseInt(eventId!));
      setEvent(eventData);
    } catch (error: any) {
      setError(error.message || 'Ошибка при загрузке события');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (updatedEvent: Event) => {
    navigate('/admin/events', {
      state: { message: `Event "${updatedEvent.title}" updated successfully` }
    });
  };

  const handleCancel = () => {
    navigate('/admin/events');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader size="xl" animation="spin" color="#2563eb" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Loading Error</h2>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => navigate('/admin/events')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Back to Events List
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">Event Not Found</h2>
          <p className="text-yellow-600">The requested event does not exist or has been deleted.</p>
          <button 
            onClick={() => navigate('/admin/events')}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Back to Events List
          </button>
        </div>
      </div>
    );
  }

  return (
    <EventForm
      event={event}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}
