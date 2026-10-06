import { Users, PhoneCall, Store } from 'lucide-react';
import { ExcelStats } from '../types';

interface QuickStatsProps {
  stats: ExcelStats | null;
  loading?: boolean;
  memberCount?: number;
  showcaseCount?: number;
}

export function QuickStats({ stats, loading = false, memberCount, showcaseCount }: QuickStatsProps) {
  const displayMembers = memberCount !== undefined ? memberCount : (stats ? stats.totalMembers : 0);
  const displayShowcases = showcaseCount !== undefined ? showcaseCount : (stats ? stats.totalShowcases : 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px', marginBottom: '28px' }}>
      
      <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(20, 184, 166, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(20, 184, 166, 0.3)' }}>
          <Users size={24} color="var(--accent-teal-bright)" />
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>MEMBERS DIRECTORY</span>
          {loading ? (
            <div className="skeleton-box" style={{ width: '64px', height: '30px', marginTop: '6px', borderRadius: '6px', display: 'block' }} />
          ) : (
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {displayMembers}
            </h3>
          )}
        </div>
      </div>

      <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <PhoneCall size={24} color="var(--accent-amber)" />
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>WHATSAPP PHONE DB</span>
          {loading ? (
            <div className="skeleton-box" style={{ width: '130px', height: '24px', marginTop: '6px', borderRadius: '6px', display: 'block' }} />
          ) : (
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
              100% Unique Validated
            </h3>
          )}
        </div>
      </div>

      <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <Store size={24} color="#60a5fa" />
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>BUSINESS SHOWCASES</span>
          {loading ? (
            <div className="skeleton-box" style={{ width: '64px', height: '30px', marginTop: '6px', borderRadius: '6px', display: 'block' }} />
          ) : (
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {displayShowcases}
            </h3>
          )}
        </div>
      </div>

    </div>
  );
}
