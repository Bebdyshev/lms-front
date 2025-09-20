import { useNavigate } from 'react-router-dom';
import EventForm from '../components/EventForm';
import type { Event } from '../types';

export default function CreateEvent() {
  const navigate = useNavigate();

  const handleSave = (event: Event) => {
    // Navigate back to events list after successful creation
    navigate('/admin/events', {
      state: { message: `Event "${event.title}" created successfully` }
    });
  };

  const handleCancel = () => {
    navigate('/admin/events');
  };

  return (
    <EventForm
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}
