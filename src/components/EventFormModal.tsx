import { useState } from 'react';
import { Calendar, X, AlertCircle, PlusCircle } from 'lucide-react';
import { FellowshipEvent } from '../types';
import { createEvent } from '../services/api';
import { useAdmin } from '../context/AdminContext';

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: (event: FellowshipEvent) => void;
}

const DEFAULT_VENUE = 'Light Cathedral, By Old Airport Bus-Stop, U.I Road, Samonda, Ibadan.';

const EVENT_CATEGORIES: FellowshipEvent['category'][] = [
  'Monthly Meeting',
  'Business Seminar',
  'Prayer Vigil',
  'Breakfast & Word',
  'Outreach',
  'Special Event'
];

export function EventFormModal({ isOpen, onClose, onEventCreated }: EventFormModalProps) {
  const { adminUser, passcode } = useAdmin();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<FellowshipEvent['category']>('Monthly Meeting');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('8:00 AM - 10:30 AM');
  const [venue, setVenue] = useState(DEFAULT_VENUE);
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Event title is required.');
      return;
    }
    if (!eventDate) {
      setError('Event date is required.');
      return;
    }

    setLoading(true);
    setError(null);

    const createdByLabel = adminUser
      ? `${adminUser.role}: ${adminUser.name}`
      : 'EXCO Secretariat';

    try {
      const newEvent = await createEvent(
        {
          title: title.trim(),
          category,
          eventDate,
          eventTime: eventTime.trim() || '8:00 AM - 10:30 AM',
          venue: venue.trim() || DEFAULT_VENUE,
          description: description.trim(),
          bannerUrl: bannerUrl.trim(),
          createdBy: createdByLabel
        },
        passcode
      );

      onEventCreated(newEvent);
      onClose();
      // Reset form
      setTitle('');
      setCategory('Monthly Meeting');
      setEventDate('');
      setEventTime('8:00 AM - 10:30 AM');
      setVenue(DEFAULT_VENUE);
      setDescription('');
      setBannerUrl('');
    } catch (err: any) {
      setError(err.message || 'Failed to create event. Please verify admin privileges.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(6px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          borderRadius: '20px',
          border: '1px solid var(--border-color)',
          background: 'var(--modal-card-bg)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          position: 'relative'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'var(--badge-bg)',
            border: 'none',
            borderRadius: '50%',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-secondary)'
          }}
          title="Close modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: '22px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: 'rgba(20, 184, 166, 0.12)',
              color: 'var(--accent-teal)',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: '8px'
            }}
          >
            <Calendar size={13} /> EXCO Admin Portal
          </div>
          <h2
            style={{
              fontFamily: "'Aclonica', sans-serif",
              fontSize: '1.3rem',
              color: 'var(--text-primary)',
              margin: '0 0 6px'
            }}
          >
            Create Fellowship Event
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0 }}>
            Publish an upcoming fellowship program to Google Sheets & the local fellowship calendar.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '18px',
              border: '1px solid rgba(239, 68, 68, 0.25)'
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Title */}
          <div>
            <label className="input-label">Event Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. November Breakfast Fellowship & Word Session"
              className="input-field"
            />
          </div>

          {/* Category & Date */}
          <div className="form-grid-2">
            <div>
              <label className="input-label">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field"
                style={{ cursor: 'pointer' }}
              >
                {EVENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="input-label">Date *</label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {/* Time & Venue */}
          <div className="form-grid-2">
            <div>
              <label className="input-label">Time</label>
              <input
                type="text"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                placeholder="e.g. 8:00 AM - 10:30 AM"
                className="input-field"
              />
            </div>

            <div>
              <label className="input-label">Venue</label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Venue address"
                className="input-field"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="input-label">Description & Details</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Topic, Bible text, speaker, dress code, breakfast arrangements..."
              className="input-field"
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Submit Actions */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ flex: 1, padding: '12px', borderRadius: '12px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                flex: 2,
                padding: '12px',
                borderRadius: '12px',
                fontWeight: 700,
                opacity: loading ? 0.75 : 1
              }}
            >
              {loading ? 'Publishing Event...' : <><PlusCircle size={18} /> Publish Event</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
