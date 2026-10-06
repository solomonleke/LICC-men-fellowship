import { useState } from 'react';
import { Search, Filter, MessageSquare, Briefcase, Trash2, ShieldCheck, UserPlus, Table, Grid, Users } from 'lucide-react';
import { Member, AgeGroup, OCCUPATIONS } from '../types';
import { useAdmin } from '../context/AdminContext';
import { isValidMember } from '../utils/dummyData';

interface MemberDirectoryProps {
  members: Member[];
  loading?: boolean;
  onDeleteMember: (id: string) => void;
  onOpenRegisterModal: () => void;
}

export const MemberDirectory: React.FC<MemberDirectoryProps> = ({
  members,
  loading = false,
  onDeleteMember,
  onOpenRegisterModal,
}) => {
  const { isAdmin } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('ALL');
  const [selectedOccupation, setSelectedOccupation] = useState<string>('ALL');

  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Strictly filter out any empty, placeholder, or corrupt rows
  const validMembers = members.filter(isValidMember);

  const filteredMembers = validMembers.filter((m) => {
    const matchesSearch =
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.occupation && m.occupation.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesAgeGroup = selectedAgeGroup === 'ALL' || m.ageGroup === selectedAgeGroup;
    const matchesOccupation = selectedOccupation === 'ALL' ||
      m.occupation === selectedOccupation ||
      (Boolean(m.occupation && selectedOccupation) && (
        m.occupation.toLowerCase().includes(selectedOccupation.toLowerCase()) ||
        selectedOccupation.toLowerCase().includes(m.occupation.toLowerCase())
      )) ||
      (selectedOccupation === 'Other' && !OCCUPATIONS.includes(m.occupation as any));

    return matchesSearch && matchesAgeGroup && matchesOccupation;
  });

  const getBadgeClass = (ageGroup: AgeGroup | string) => {
    switch (ageGroup) {
      case '18-29': return 'badge-teal';
      case '30-39': return 'badge-blue';
      case '40-49': return 'badge-gold';
      case '50-59': return 'badge-gold';
      default: return 'badge-teal';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    const f = firstName ? firstName.trim().charAt(0).toUpperCase() : '';
    const l = lastName ? lastName.trim().charAt(0).toUpperCase() : '';
    return `${f}${l}` || 'M';
  };

  const getAvatarGradient = (id: string) => {
    const gradients = [
      'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
      'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
      'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
      'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  return (
    <section className="animate-fade-in">
      
      {/* Top Bar Header & Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              Fellowship Directory
              {loading ? (
                <span className="skeleton-box" style={{ width: '86px', height: '26px', borderRadius: '9999px' }} />
              ) : (
                <span className="badge badge-teal">{filteredMembers.length} Members</span>
              )}
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Secure fellowship directory with direct encrypted WhatsApp messaging.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* View Mode Toggle */}
            <div style={{ display: 'flex', background: 'var(--bg-surface-raised)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
              <button
                onClick={() => setViewMode('table')}
                style={{
                  background: viewMode === 'table' ? 'var(--accent-teal)' : 'transparent',
                  color: viewMode === 'table' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Table size={16} /> Table View
              </button>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  background: viewMode === 'grid' ? 'var(--accent-teal)' : 'transparent',
                  color: viewMode === 'grid' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Grid size={16} /> Grid Cards
              </button>
            </div>

            <button onClick={onOpenRegisterModal} className="btn-primary">
              <UserPlus size={18} />
              Add Member Record
            </button>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="directory-toolbar">
          
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search member by first name, last name, or profession..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '42px', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flex: 1, minWidth: '160px', alignItems: 'center', gap: '8px', background: 'var(--bg-surface-raised)', padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
              <Briefcase size={16} color="var(--accent-gold)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 700, flexShrink: 0 }}>Occupation:</span>
              <select
                value={selectedOccupation}
                onChange={(e) => setSelectedOccupation(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.88rem', outline: 'none', cursor: 'pointer', width: '100%' }}
              >
                <option value="ALL" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>All Professions</option>
                {OCCUPATIONS.map((occ) => (
                  <option key={occ} value={occ} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                    {occ}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flex: 1, minWidth: '160px', alignItems: 'center', gap: '8px', background: 'var(--bg-surface-raised)', padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
              <Filter size={16} color="var(--accent-teal)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 700, flexShrink: 0 }}>Age:</span>
              <select
                value={selectedAgeGroup}
                onChange={(e) => setSelectedAgeGroup(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.88rem', outline: 'none', cursor: 'pointer', width: '100%' }}
              >
                <option value="ALL" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>All Ages</option>
                <option value="18-29" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>18 - 29 years</option>
                <option value="30-39" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>30 - 39 years</option>
                <option value="40-49" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>40 - 49 years</option>
                <option value="50-59" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>50 - 59 years</option>
                <option value="60 and above" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>60 and above</option>
              </select>
            </div>
          </div>

        </div>

      </div>

      {/* Directory Content Display */}
      {filteredMembers.length === 0 ? (
        <div className="glass-card" style={{ padding: '56px 20px', textAlign: 'center' }}>
          <ShieldCheck size={48} color="var(--text-muted)" style={{ marginBottom: '14px' }} />
          <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '6px' }}>No Members Found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Try adjusting your search query or filter dropdown settings.</p>
        </div>
      ) : viewMode === 'table' ? (
        
        /* EXECUTIVE TABLE VIEW - NO RAW NUMBERS SHOWN FOR PRIVACY & SECURITY */
        <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
            <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '16px 24px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Member</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Occupation / Profession</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Age Bracket</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>WhatsApp Connect</th>
                  {isAdmin && (
                    <th style={{ padding: '16px 24px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  /* SKELETON TABLE ROWS WHILE FETCHING EXCEL RECORDS */
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={`skel-row-${i}`} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div className="skeleton-box" style={{ width: '44px', height: '44px', borderRadius: '50%' }} />
                          <div>
                            <div className="skeleton-box" style={{ width: '140px', height: '18px', borderRadius: '4px', display: 'block' }} />
                            <div className="skeleton-box" style={{ width: '70px', height: '12px', borderRadius: '3px', marginTop: '6px', display: 'block' }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div className="skeleton-box" style={{ width: '130px', height: '16px', borderRadius: '4px' }} />
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div className="skeleton-box" style={{ width: '65px', height: '24px', borderRadius: '9999px' }} />
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div className="skeleton-box" style={{ width: '160px', height: '36px', borderRadius: '8px' }} />
                      </td>
                      {isAdmin && (
                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                          <div className="skeleton-box" style={{ width: '75px', height: '36px', borderRadius: '8px' }} />
                        </td>
                      )}
                    </tr>
                  ))
                ) : filteredMembers.length === 0 ? (
                  /* CLEAN EMPTY STATE - NO DUMMY DATA */
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} style={{ padding: '56px 24px', textAlign: 'center' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(20, 184, 166, 0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', color: 'var(--accent-teal)' }}>
                        <Users size={26} />
                      </div>
                      <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                        {validMembers.length === 0 ? 'No Member Records in Excel Database' : 'No Matching Members Found'}
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 18px', lineHeight: 1.5 }}>
                        {validMembers.length === 0
                          ? 'Your database is currently empty. Add your fellowship brothers to begin building the directory.'
                          : 'No members match your current filters. Clear your search or change the age bracket.'}
                      </p>
                      {validMembers.length === 0 ? (
                        <button onClick={onOpenRegisterModal} className="btn-primary btn-gold" style={{ margin: '0 auto' }}>
                          <UserPlus size={16} /> Add Member Record
                        </button>
                      ) : (
                        <button onClick={() => { setSearchTerm(''); setSelectedAgeGroup('ALL'); setSelectedOccupation('ALL'); }} className="btn-secondary" style={{ margin: '0 auto' }}>
                          Clear Search Filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member, index) => {
                    const initials = getInitials(member.firstName, member.lastName);
                    const avatarBg = getAvatarGradient(member.id || `member-${index}`);

                    return (
                      <tr
                        key={member.id ? `member-row-${member.id}` : `member-row-${index}`}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          background: index % 2 === 0 ? 'transparent' : 'var(--table-row-hover)',
                          transition: 'background 0.2s ease'
                        }}
                      >
                        {/* Avatar Circle with Initials followed by Full Name */}
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div
                              style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '50%',
                                background: avatarBg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                fontWeight: 800,
                                fontSize: '1rem',
                                letterSpacing: '0.05em',
                                boxShadow: '0 3px 10px rgba(0,0,0,0.4)',
                                flexShrink: 0
                              }}
                            >
                              {initials}
                            </div>
                            <div>
                              <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)', display: 'block', fontWeight: 700 }}>
                                {member.firstName} {member.lastName}
                              </strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {member.id}</span>
                            </div>
                          </div>
                        </td>

                        {/* Occupation */}
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '0.94rem', fontWeight: 500 }}>
                            <Briefcase size={16} color="var(--accent-teal-bright)" style={{ flexShrink: 0 }} />
                            <span>{member.occupation || 'N/A'}</span>
                          </div>
                        </td>

                        {/* Age Group */}
                        <td style={{ padding: '16px 24px' }}>
                          <span className={`badge ${getBadgeClass(member.ageGroup)}`}>
                            {member.ageGroup || 'N/A'}
                          </span>
                        </td>

                        {/* Secure WhatsApp Link (NO PHONE NUMBER PRINTED FOR SECURITY) */}
                        <td style={{ padding: '16px 24px' }}>
                          <a
                            href={`https://wa.me/${(member.whatsappPhone || '').replace(/[^\d]/g, '')}?text=Hello%20${encodeURIComponent(member.firstName)},%20I%20am%20reaching%20out%20from%20LICC%20Men%20Fellowship.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary"
                            style={{ padding: '8px 16px', fontSize: '0.85rem', borderColor: 'rgba(37, 211, 102, 0.4)', color: '#25D366', fontWeight: 600, textDecoration: 'none' }}
                          >
                            <MessageSquare size={16} /> Connect on WhatsApp
                          </a>
                        </td>

                        {/* Actions (EXCO Admin Only) */}
                        {isAdmin && (
                          <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to remove ${member.firstName} ${member.lastName} from the Excel database?`)) {
                                  onDeleteMember(member.id);
                                }
                              }}
                              className="btn-secondary"
                              style={{ padding: '8px 12px', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
                              title="Remove Record (EXCO Admin Only)"
                            >
                              <Trash2 size={16} /> Remove
                            </button>
                          </td>
                        )}

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      ) : (
        
        /* GRID CARD VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
          {loading ? (
            /* SKELETON GRID CARDS */
            [1, 2, 3, 4, 5, 6].map((i) => (
              <div key={`skel-card-${i}`} className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div className="skeleton-box" style={{ width: '50px', height: '50px', borderRadius: '50%' }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton-box" style={{ width: '140px', height: '18px', borderRadius: '4px', marginBottom: '6px', display: 'block' }} />
                    <div className="skeleton-box" style={{ width: '70px', height: '20px', borderRadius: '9999px', display: 'block' }} />
                  </div>
                </div>
                <div className="skeleton-box" style={{ width: '100%', height: '40px', borderRadius: 'var(--radius-sm)' }} />
                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--glass-border)', paddingTop: '14px' }}>
                  <div className="skeleton-box" style={{ flex: 1, height: '38px', borderRadius: '8px' }} />
                  {isAdmin && <div className="skeleton-box" style={{ width: '38px', height: '38px', borderRadius: '8px' }} />}
                </div>
              </div>
            ))
          ) : filteredMembers.length === 0 ? (
            <div className="glass-card" style={{ gridColumn: '1 / -1', padding: '56px 24px', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(20, 184, 166, 0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', color: 'var(--accent-teal)' }}>
                <Users size={26} />
              </div>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                {validMembers.length === 0 ? 'No Member Records in Excel Database' : 'No Matching Members Found'}
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 18px', lineHeight: 1.5 }}>
                {validMembers.length === 0
                  ? 'Your database is currently empty. Add your fellowship brothers to begin building the directory.'
                  : 'No members match your current filters. Clear your search or change the age bracket.'}
              </p>
              {validMembers.length === 0 ? (
                <button onClick={onOpenRegisterModal} className="btn-primary btn-gold" style={{ margin: '0 auto' }}>
                  <UserPlus size={16} /> Add Member Record
                </button>
              ) : (
                <button onClick={() => { setSearchTerm(''); setSelectedAgeGroup('ALL'); setSelectedOccupation('ALL'); }} className="btn-secondary" style={{ margin: '0 auto' }}>
                  Clear Search Filters
                </button>
              )}
            </div>
          ) : (
            filteredMembers.map((member, index) => {
              const initials = getInitials(member.firstName, member.lastName);
              const avatarBg = getAvatarGradient(member.id || `member-${index}`);

              return (
                <div key={member.id ? `member-card-${member.id}` : `member-card-${index}`} className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '18px' }}>
                  
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                      <div
                        style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '50%',
                          background: avatarBg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '1.15rem',
                          letterSpacing: '0.05em',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                          flexShrink: 0
                        }}
                      >
                        {initials}
                      </div>

                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                          {member.firstName} {member.lastName}
                        </h3>
                        <span className={`badge ${getBadgeClass(member.ageGroup)}`}>
                          Age: {member.ageGroup}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-teal)', fontSize: '0.9rem', background: 'var(--bg-surface-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                      <Briefcase size={16} style={{ flexShrink: 0 }} />
                      <span>{member.occupation || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid var(--glass-border)', paddingTop: '14px' }}>
                    <a
                      href={`https://wa.me/${(member.whatsappPhone || '').replace(/[^\d]/g, '')}?text=Hello%20${encodeURIComponent(member.firstName)},%20I%20am%20reaching%20out%20from%20LICC%20Men%20Fellowship.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{ flex: 1, padding: '10px 14px', fontSize: '0.88rem', borderColor: 'rgba(37, 211, 102, 0.4)', color: '#25D366', fontWeight: 600, textDecoration: 'none' }}
                    >
                      <MessageSquare size={16} /> Connect on WhatsApp
                    </a>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to remove ${member.firstName} ${member.lastName} from the Excel database?`)) {
                            onDeleteMember(member.id);
                          }
                        }}
                        className="btn-secondary"
                        style={{ padding: '10px 12px', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
                        title="Remove Record (EXCO Admin Only)"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>
      )}

    </section>
  );
};
