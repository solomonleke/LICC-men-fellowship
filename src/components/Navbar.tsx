import React from 'react';
import { Users, Store, FileSpreadsheet, UserPlus, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  activeTab: 'directory' | 'showcase' | 'excel-admin';
  setActiveTab: (tab: 'directory' | 'showcase' | 'excel-admin') => void;
  onOpenRegisterModal: () => void;
  memberCount: number;
}

export function Navbar({
  activeTab,
  setActiveTab,
  onOpenRegisterModal,
  memberCount,
}: NavbarProps) {
  const { themeMode, setThemeMode } = useTheme();

  return (
    <header className="glass-card" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, position: 'sticky', top: 0, zIndex: 50, background: 'var(--nav-bg)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Brand Logo & Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '2px solid rgba(20, 184, 166, 0.5)',
            boxShadow: '0 0 15px rgba(20, 184, 166, 0.4)',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <img 
              src="/logo.jpg" 
              alt="LICC Logo" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              LICC MEN FELLOWSHIP
            </h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Member Contact Directory & Business Showcase Portal</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--nav-pill-bg)', padding: '6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
          <button
            onClick={() => setActiveTab('directory')}
            className={activeTab === 'directory' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '8px 16px', fontSize: '0.88rem' }}
          >
            <Users size={16} />
            Directory ({memberCount})
          </button>
          <button
            onClick={() => setActiveTab('showcase')}
            className={activeTab === 'showcase' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '8px 16px', fontSize: '0.88rem' }}
          >
            <Store size={16} />
            Business Showcase
          </button>
        </nav>

        {/* Action Button & Theme Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Theme Selector Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'var(--nav-pill-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-full)',
            padding: '3px',
            gap: '2px'
          }}>
            <button
              type="button"
              title="System Theme"
              onClick={() => setThemeMode('system')}
              style={{
                background: themeMode === 'system' ? 'var(--accent-teal)' : 'transparent',
                color: themeMode === 'system' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.78rem',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
            >
              <Monitor size={14} />
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
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.78rem',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
            >
              <Sun size={14} />
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
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.78rem',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
            >
              <Moon size={14} />
              <span>Dark</span>
            </button>
          </div>

          {/* Add Member Button */}
          <button onClick={onOpenRegisterModal} className="btn-primary btn-gold">
            <UserPlus size={18} />
            Add Member Record
          </button>
        </div>

      </div>
    </header>
  );
}
