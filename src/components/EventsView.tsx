import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Trash2,
  CalendarDays,
  AlertCircle,
  MessageCircle,
  KeyRound
} from 'lucide-react';
import { FellowshipEvent } from '../types';
import { fetchEvents, deleteEvent } from '../services/api';
import { useAdmin } from '../context/AdminContext';
import { EventFormModal } from './EventFormModal';

export function EventsView() {
  const { isAdmin, passcode, openLoginModal } = useAdmin();
  const [events, setEvents] = useState<FellowshipEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await fetchEvents();
      setEvents(data);
    } catch (err: any) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleEventCreated = (newEvent: FellowshipEvent) => {
    setEvents((prev) => [newEvent, ...prev]);
  };

  const handleDelete = async (event: FellowshipEvent) => {
    if (!isAdmin) return;
    const confirmDelete = window.confirm(`Are you sure you want to delete the event: "${event.title}"?`);
    if (!confirmDelete) return;

    setDeletingId(event.id);
    setActionError(null);

    try {
      await deleteEvent(event.id, passcode);
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete event');
    } finally {
      setDeletingId(null);
    }
  };

  const handleShareWhatsApp = (evt: FellowshipEvent) => {
    const text = `*LICC Men's Fellowship Event*\n\n📌 *${evt.title}*\n🗓️ Date: ${evt.eventDate}\n⏰ Time: ${evt.eventTime}\n📍 Venue: ${evt.venue}\n\n${evt.description ? `${evt.description}\n\n` : ''}_Light International Christian Center (LICC) - Men Fellowship_`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const filteredEvents = events.filter((evt) => {
    if (filter === 'upcoming') {
      return !evt.eventDate || evt.eventDate >= todayStr;
    }
    if (filter === 'past') {
      return evt.eventDate && evt.eventDate < todayStr;
    }
    return true;
  });

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return { day: '--', month: 'TBD', year: '' };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        return { day: dateStr, month: '', year: '' };
      }
      return {
        day: d.getDate().toString(),
        month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
        year: d.getFullYear().toString(),
        weekday: d.toLocaleString('en-US', { weekday: 'short' })
      };
    } catch (e) {
      return { day: dateStr, month: '', year: '' };
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Top Header */}
      <div
        className="glass-card"
        style={{
          padding: '32px 28px',
          borderRadius: '20px',
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          border: '1px solid var(--border-color)',
          background: 'var(--card-bg)'
        }}
      >
        <div style={{ maxWidth: '750px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'rgba(15, 118, 110, 0.12)',
              color: 'var(--accent-teal)',
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: '12px'
            }}
          >
            <CalendarDays size={14} /> Fellowship Schedule & Gatherings
          </div>
          <h1
            style={{
              fontFamily: "'Aclonica', sans-serif",
              fontSize: '1.75rem',
              margin: '0 0 10px',
              color: 'var(--text-primary)',
              letterSpacing: '-0.3px'
            }}
          >
            Fellowship Events & Programs
          </h1>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.92rem',
              lineHeight: 1.6,
              margin: 0
            }}
          >
            Stay updated with our monthly men breakfast meetings, spiritual retreats, and career seminars.
            Gatherings take place at Light Cathedral, By Old Airport Bus-Stop, Samonda, Ibadan.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {isAdmin ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary"
              style={{
                borderRadius: '12px',
                padding: '12px 20px',
                fontSize: '0.9rem',
                fontWeight: 700
              }}
            >
              <Plus size={18} /> Create New Event
            </button>
          ) : (
            <button
              onClick={openLoginModal}
              className="btn-secondary"
              style={{
                borderRadius: '12px',
                padding: '11px 18px',
                fontSize: '0.86rem',
                fontWeight: 600
              }}
            >
              <KeyRound size={16} /> EXCO Admin Access
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#ef4444',
            fontSize: '0.86rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
            border: '1px solid rgba(239, 68, 68, 0.25)'
          }}
        >
          <AlertCircle size={18} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '22px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '12px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <button
          onClick={() => setFilter('upcoming')}
          style={{
            padding: '8px 18px',
            borderRadius: '10px',
            border: filter === 'upcoming' ? '1px solid var(--accent-teal)' : '1px solid var(--border-color)',
            background: filter === 'upcoming' ? 'var(--accent-teal)' : 'var(--badge-bg)',
            color: filter === 'upcoming' ? '#ffffff' : 'var(--text-primary)',
            fontSize: '0.86rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s ease'
          }}
        >
          Upcoming Events
        </button>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '8px 18px',
            borderRadius: '10px',
            border: filter === 'all' ? '1px solid var(--accent-teal)' : '1px solid var(--border-color)',
            background: filter === 'all' ? 'var(--accent-teal)' : 'var(--badge-bg)',
            color: filter === 'all' ? '#ffffff' : 'var(--text-primary)',
            fontSize: '0.86rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s ease'
          }}
        >
          All Events ({events.length})
        </button>
        <button
          onClick={() => setFilter('past')}
          style={{
            padding: '8px 18px',
            borderRadius: '10px',
            border: filter === 'past' ? '1px solid var(--accent-teal)' : '1px solid var(--border-color)',
            background: filter === 'past' ? 'var(--accent-teal)' : 'var(--badge-bg)',
            color: filter === 'past' ? '#ffffff' : 'var(--text-primary)',
            fontSize: '0.86rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s ease'
          }}
        >
          Past Records
        </button>
      </div>

      {/* Events Listing */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: '200px', borderRadius: '18px' }} />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div
          className="glass-card"
          style={{
            padding: '48px 24px',
            borderRadius: '20px',
            textAlign: 'center',
            border: '1px solid var(--border-color)',
            background: 'var(--card-bg)'
          }}
        >
          <Calendar size={44} style={{ color: 'var(--text-muted)', opacity: 0.65, marginBottom: '14px' }} />
          <h3 style={{ fontFamily: "'Aclonica', sans-serif", fontSize: '1.2rem', color: 'var(--text-primary)', margin: '0 0 8px' }}>
            No {filter === 'upcoming' ? 'upcoming' : ''} events scheduled
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0 auto 20px', maxWidth: '420px', lineHeight: 1.5 }}>
            {isAdmin
              ? 'As an EXCO administrator, you can schedule and announce the next fellowship program.'
              : 'Check back soon for upcoming fellowship dates and announcements from the EXCO team.'}
          </p>
          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary"
              style={{
                padding: '11px 22px',
                borderRadius: '12px',
                fontSize: '0.88rem',
                fontWeight: 700
              }}
            >
              <Plus size={16} /> Schedule First Event
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '22px' }}>
          {filteredEvents.map((evt) => {
            const dateObj = formatDateDisplay(evt.eventDate);

            return (
              <div
                key={evt.id}
                className="glass-card"
                style={{
                  borderRadius: '18px',
                  padding: '24px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '18px',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                <div>
                  {/* Top Row: Date Pill & Category Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {/* Date Badge */}
                      <div
                        style={{
                          background: 'rgba(15, 118, 110, 0.12)',
                          border: '1px solid rgba(15, 118, 110, 0.3)',
                          borderRadius: '12px',
                          padding: '6px 10px',
                          textAlign: 'center',
                          minWidth: '50px'
                        }}
                      >
                        <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent-teal)', textTransform: 'uppercase' }}>
                          {dateObj.month}
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                          {dateObj.day}
                        </div>
                      </div>

                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          background: 'var(--badge-bg)',
                          color: 'var(--text-primary)',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        {evt.category}
                      </span>
                    </div>

                    {/* ONLY Admins see the Delete Button */}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(evt)}
                        disabled={deletingId === evt.id}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '8px',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ef4444',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        title="Delete Event (EXCO Admin Only)"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  {/* Title */}
                  <h3
                    style={{
                      fontFamily: "'Aclonica', sans-serif",
                      fontSize: '1.2rem',
                      color: 'var(--text-primary)',
                      margin: '0 0 10px',
                      lineHeight: 1.35
                    }}
                  >
                    {evt.title}
                  </h3>

                  {/* Description */}
                  {evt.description && (
                    <p
                      style={{
                        fontSize: '0.86rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                        margin: '0 0 14px'
                      }}
                    >
                      {evt.description}
                    </p>
                  )}

                  {/* Time & Venue meta */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={15} style={{ color: 'var(--accent-teal)', flexShrink: 0 }} />
                      <span>{evt.eventTime}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <MapPin size={15} style={{ color: 'var(--accent-teal)', flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ lineHeight: 1.4 }}>{evt.venue}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div
                  style={{
                    paddingTop: '14px',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    By {evt.createdBy || 'EXCO'}
                  </span>

                  <button
                    onClick={() => handleShareWhatsApp(evt)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '10px',
                      background: 'rgba(37, 211, 102, 0.12)',
                      color: '#25D366',
                      border: 'none',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    title="Share to WhatsApp"
                  >
                    <MessageCircle size={14} /> Share
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Event Creation Modal */}
      <EventFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onEventCreated={handleEventCreated}
      />
    </div>
  );
}
