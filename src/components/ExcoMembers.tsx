import { useState, useEffect } from 'react';
import { Shield, Award, Phone, CheckCircle2, UserCheck, KeyRound, MessageCircle } from 'lucide-react';
import { ExcoMember } from '../types';
import { fetchExcos } from '../services/api';
import { useAdmin } from '../context/AdminContext';

export function ExcoMembers() {
  const [excos, setExcos] = useState<ExcoMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { isAdmin, adminUser, openLoginModal } = useAdmin();

  useEffect(() => {
    let isMounted = true;
    fetchExcos()
      .then((data) => {
        if (isMounted) {
          setExcos(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load excos:', err);
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const getRoleBadgeColor = (order: number) => {
    switch (order) {
      case 1:
        return { bg: 'rgba(217, 119, 6, 0.15)', text: '#d97706', border: 'rgba(217, 119, 6, 0.35)', title: 'Presidential Desk' };
      case 2:
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.35)', title: 'Vice Presidency' };
      case 3:
      case 4:
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: 'rgba(16, 185, 129, 0.35)', title: 'Secretariat' };
      case 5:
        return { bg: 'rgba(236, 72, 153, 0.15)', text: '#ec4899', border: 'rgba(236, 72, 153, 0.35)', title: 'Welfare & Socials' };
      case 6:
        return { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6', border: 'rgba(139, 92, 246, 0.35)', title: 'Treasury & Finance' };
      default:
        return { bg: 'rgba(20, 184, 166, 0.15)', text: '#14b8a6', border: 'rgba(20, 184, 166, 0.35)', title: 'Executive Member' };
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Page Header */}
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
              background: 'rgba(20, 184, 166, 0.12)',
              color: 'var(--accent-teal)',
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: '12px'
            }}
          >
            <Shield size={14} /> Fellowship Leadership Council
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
            Executive Committee (EXCO)
          </h1>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.92rem',
              lineHeight: 1.6,
              margin: 0
            }}
          >
            Meet the designated servant-leaders guiding the spiritual, administrative, and developmental vision of the
            Light International Christian Center (LICC) Men Fellowship. EXCO members hold authorized admin privileges
            to oversee fellowship events and member administration.
          </p>
        </div>

        {/* Admin Login / Status Quick Trigger */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
          {isAdmin && adminUser ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 16px',
                borderRadius: '14px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981'
              }}
            >
              <UserCheck size={18} />
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Admin Verified</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700 }}>{adminUser.name}</div>
              </div>
              <button
                onClick={openLoginModal}
                className="btn-secondary"
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  marginLeft: '4px'
                }}
              >
                Manage
              </button>
            </div>
          ) : (
            <button
              onClick={openLoginModal}
              className="btn-primary"
              style={{
                padding: '11px 18px',
                borderRadius: '12px',
                fontSize: '0.86rem',
                fontWeight: 700
              }}
            >
              <KeyRound size={16} /> EXCO Admin Sign In
            </button>
          )}
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Only EXCO executives can create or manage events
          </span>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px'
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="skeleton-box"
              style={{
                height: '220px',
                borderRadius: '18px'
              }}
            />
          ))}
        </div>
      ) : (
        /* EXCO Cards Grid */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '22px'
          }}
        >
          {excos.map((exco) => {
            const roleStyle = getRoleBadgeColor(exco.order);
            const isCurrentSessionAdmin = isAdmin && adminUser?.id === exco.id;

            return (
              <div
                key={exco.id}
                className="glass-card"
                style={{
                  borderRadius: '18px',
                  padding: '24px',
                  border: isCurrentSessionAdmin ? '2px solid #10b981' : '1px solid var(--border-color)',
                  background: 'var(--card-bg)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  position: 'relative',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                {/* Header row: Order badge and Desk */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '14px',
                      background: roleStyle.bg,
                      color: roleStyle.text,
                      border: `1px solid ${roleStyle.border}`,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px'
                    }}
                  >
                    <Award size={13} /> #{exco.order} {exco.role}
                  </div>

                  {isCurrentSessionAdmin ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '0.72rem',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        fontWeight: 600
                      }}
                    >
                      <CheckCircle2 size={12} /> Active Admin
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {roleStyle.title}
                    </span>
                  )}
                </div>

                {/* Profile Information */}
                <div>
                  <h3
                    style={{
                      fontFamily: "'Aclonica', sans-serif",
                      fontSize: '1.25rem',
                      color: 'var(--text-primary)',
                      margin: '0 0 8px',
                      letterSpacing: '-0.2px'
                    }}
                  >
                    {exco.name}
                  </h3>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: 'var(--accent-teal)',
                      marginBottom: '10px'
                    }}
                  >
                    {exco.role}
                  </div>
                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      margin: 0
                    }}
                  >
                    {exco.portfolio || 'Fellowship executive coordination, oversight, and leadership.'}
                  </p>
                </div>

                {/* Contact and Verification Footer */}
                <div
                  style={{
                    paddingTop: '16px',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {exco.phone && (
                      <a
                        href={`https://wa.me/${exco.phone.replace(/\D/g, '')}?text=Praise%20God%20${encodeURIComponent(exco.role)}%20${encodeURIComponent(exco.name)}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '10px',
                          background: 'rgba(37, 211, 102, 0.12)',
                          color: '#25D366',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          textDecoration: 'none'
                        }}
                        title={`Message ${exco.name} on WhatsApp`}
                      >
                        <MessageCircle size={14} /> WhatsApp
                      </a>
                    )}
                    {exco.phone && (
                      <a
                        href={`tel:${exco.phone}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 10px',
                          borderRadius: '10px',
                          background: 'var(--badge-bg)',
                          color: 'var(--text-muted)',
                          fontSize: '0.78rem',
                          textDecoration: 'none'
                        }}
                        title="Voice Call"
                      >
                        <Phone size={13} />
                      </a>
                    )}
                  </div>

                  {!isAdmin && (
                    <button
                      onClick={openLoginModal}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px'
                      }}
                      title="Authenticate as this EXCO leader"
                    >
                      <KeyRound size={12} /> Admin Login
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
