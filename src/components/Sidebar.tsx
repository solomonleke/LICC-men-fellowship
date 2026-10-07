import { useState } from 'react';
import { 
  Users, 
  Store, 
  Settings, 
  Sun, 
  Moon, 
  Monitor, 
  BookOpen, 
  Calendar, 
  MapPin, 
  Menu, 
  X,
  ShieldCheck,
  KeyRound,
  QrCode
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAdmin } from '../context/AdminContext';
import { ExcelStats } from '../types';

export type AppTab = 'directory' | 'showcase' | 'events' | 'excos' | 'excel-admin';

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  onOpenQRModal?: () => void;
  memberCount: number;
  showcaseCount: number;
  eventCount?: number;
  stats?: ExcelStats | null;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  onOpenQRModal,
  memberCount,
  showcaseCount,
  eventCount = 0,
}: SidebarProps) {
  const { themeMode, setThemeMode } = useTheme();
  const { isAdmin, adminUser, openLoginModal } = useAdmin();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    {
      id: 'directory' as const,
      label: 'Member Directory',
      icon: Users,
      badge: memberCount,
      desc: 'Contacts & Age brackets'
    },
    {
      id: 'showcase' as const,
      label: 'Business Showcase',
      icon: Store,
      badge: showcaseCount,
      desc: 'Marketplace & Services'
    },
    {
      id: 'events' as const,
      label: 'Events & Schedule',
      icon: Calendar,
      badge: eventCount > 0 ? eventCount : 'Live',
      desc: 'Meetings & Programs'
    },
    {
      id: 'excos' as const,
      label: 'EXCO Members',
      icon: ShieldCheck,
      badge: '6',
      desc: 'Fellowship Executives'
    },
  ];

  const handleNavClick = (tab: AppTab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };


  return (
    <>
      {/* Mobile Hamburger Header (visible only on small screens) */}
      <div className="mobile-top-bar glass-card" style={{
        display: 'none',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        padding: '12px 18px',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 0,
        borderTop: 0,
        borderLeft: 0,
        borderRight: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img 
            src="/logo.jpg" 
            alt="LICC Logo" 
            style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain', background: '#fff' }} 
          />
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 800 }}>LICC Men's</h1>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Fellowship Portal</span>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="btn-secondary"
          style={{ padding: '8px', borderRadius: '8px' }}
          aria-label="Toggle Navigation Menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 48,
            backdropFilter: 'blur(4px)'
          }}
        />
      )}

      {/* Main Sidebar */}
      <aside 
        className={`app-sidebar glass-card ${mobileOpen ? 'mobile-open' : ''}`}
        style={{
          width: '290px',
          minWidth: '290px',
          height: '100vh',
          position: 'sticky',
          top: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 0,
          borderTop: 0,
          borderBottom: 0,
          borderLeft: 0,
          background: 'var(--nav-bg)',
          zIndex: 50,
          transition: 'transform 0.3s ease',
          overflowY: 'auto'
        }}
      >
        {/* Brand Header */}
        <div style={{ padding: '22px 18px 16px', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '2px solid rgba(20, 184, 166, 0.4)',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(20, 184, 166, 0.25)'
            }}>
              <img 
                src="/logo.jpg" 
                alt="LICC Approved Logo" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
              />
            </div>
            <div>
              <h2 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                LICC Men's FELLOWSHIP
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--accent-teal)', fontWeight: 600, marginTop: '2px' }}>
                Light Cathedral • Samonda, Ibadan
              </p>
            </div>
          </div>

          {/* Theme Selector (Placed at the top of the sidebar) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface-raised)',
            padding: '4px 6px 4px 10px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--glass-border)'
          }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Appearance</span>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--bg-card)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-full)',
              padding: '2px',
              gap: '2px'
            }}>
              <button
                type="button"
                title="System Auto"
                onClick={() => setThemeMode('system')}
                style={{
                  background: themeMode === 'system' ? 'var(--accent-teal)' : 'transparent',
                  color: themeMode === 'system' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  padding: '4px 7px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  fontSize: '0.68rem',
                  fontWeight: 600
                }}
              >
                <Monitor size={11} />
                <span>Auto</span>
              </button>
              <button
                type="button"
                title="Light Theme"
                onClick={() => setThemeMode('light')}
                style={{
                  background: themeMode === 'light' ? 'var(--accent-teal)' : 'transparent',
                  color: themeMode === 'light' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  padding: '4px 7px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  fontSize: '0.68rem',
                  fontWeight: 600
                }}
              >
                <Sun size={11} />
                <span>Light</span>
              </button>
              <button
                type="button"
                title="Dark Theme"
                onClick={() => setThemeMode('dark')}
                style={{
                  background: themeMode === 'dark' ? 'var(--accent-teal)' : 'transparent',
                  color: themeMode === 'dark' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  padding: '4px 7px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  fontSize: '0.68rem',
                  fontWeight: 600
                }}
              >
                <Moon size={11} />
                <span>Dark</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div style={{ padding: '8px 12px', flex: 1 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px 8px' }}>
            Navigation
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: isActive ? '1px solid var(--glass-border-teal)' : '1px solid transparent',
                    background: isActive ? 'linear-gradient(135deg, rgba(20, 184, 166, 0.15) 0%, rgba(20, 184, 166, 0.05) 100%)' : 'transparent',
                    color: isActive ? 'var(--accent-teal)' : 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget.style.background = 'var(--bg-surface-raised)');
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget.style.background = 'transparent)');
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: isActive ? 'var(--accent-teal)' : 'var(--bg-surface-raised)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isActive ? '#ffffff' : 'var(--text-secondary)'
                    }}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: isActive ? 700 : 600 }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {item.desc}
                      </div>
                    </div>
                  </div>

                  <span className={`badge ${isActive ? 'badge-teal' : 'badge-gold'}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                    {item.badge}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Fellowship Identity & Motto Card */}
          <div style={{
            margin: '20px 8px 12px',
            padding: '14px',
            background: 'var(--bg-surface-subtle)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--glass-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-gold)', marginBottom: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
              <BookOpen size={14} />
              <span>FELLOWSHIP MOTTO</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.45 }}>
              "As iron sharpens iron, so one man sharpens another."
            </p>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-teal)', fontWeight: 600, display: 'block', marginTop: '4px' }}>
              — Proverbs 27:17
            </span>
          </div>

          {/* Meeting Schedule Pill */}
          <div style={{
            margin: '0 8px',
            padding: '12px 14px',
            background: 'var(--bg-surface-raised)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Calendar size={18} color="var(--accent-teal)" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>Monthly Meeting</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Every 1st Saturday • 8:00 AM</div>
            </div>
          </div>

          {/* Fellowship Venue Card */}
          <div style={{
            margin: '10px 8px 0',
            padding: '12px 14px',
            background: 'var(--bg-surface-raised)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            <MapPin size={18} color="var(--accent-gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>Fellowship Venue</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginTop: '2px' }}>
                Light Cathedral, By Old Airport Bus-Stop, U.I Road, Samonda, Ibadan.
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--glass-border)',
          background: 'var(--bg-surface-raised)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {/* EXCO Admin Status Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={openLoginModal}
              style={{
                background: isAdmin ? 'rgba(16, 185, 129, 0.15)' : 'rgba(217, 119, 6, 0.1)',
                border: isAdmin ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(217, 119, 6, 0.25)',
                color: isAdmin ? '#10b981' : 'var(--text-muted)',
                borderRadius: '8px',
                padding: '5px 10px',
                fontSize: '0.74rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
              title={isAdmin ? `Admin Active: ${adminUser?.name}` : 'Authenticate as EXCO Admin'}
            >
              {isAdmin ? <ShieldCheck size={13} /> : <KeyRound size={13} />}
              <span>{isAdmin ? (adminUser?.role || 'Admin Active') : 'EXCO Login'}</span>
            </button>

            {isAdmin && onOpenQRModal && (
              <button
                type="button"
                onClick={onOpenQRModal}
                title="Portal QR Code (Admins Only)"
                style={{
                  background: 'rgba(20, 184, 166, 0.12)',
                  border: '1px solid rgba(20, 184, 166, 0.25)',
                  color: 'var(--accent-teal-bright)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.72rem',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontWeight: 600
                }}
              >
                <QrCode size={13} />
                <span>QR</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleNavClick('excel-admin')}
              title="Admin Settings & Backup"
              style={{
                background: activeTab === 'excel-admin' ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
                border: 'none',
                color: activeTab === 'excel-admin' ? 'var(--accent-teal)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.72rem',
                padding: '4px 6px',
                borderRadius: '6px',
                opacity: activeTab === 'excel-admin' ? 1 : 0.75
              }}
            >
              <Settings size={13} />
              <span>Settings</span>
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.66rem', color: 'var(--text-muted)' }}>
            <span>LICC Men's Portal © 2026</span>
            <span>Light Cathedral</span>
          </div>
        </div>

      </aside>
    </>
  );
}
