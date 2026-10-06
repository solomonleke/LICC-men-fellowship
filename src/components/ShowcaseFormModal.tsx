import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Store, X, AlertTriangle, Search, ChevronDown, Check, User, Phone, ShieldCheck } from 'lucide-react';
import { Member } from '../types';
import { isValidMember } from '../utils/dummyData';
import { createShowcase, fetchMembers } from '../services/api';

interface ShowcaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (post?: any) => void;
  members?: Member[];
}

const CATEGORIES = [
  'Information Technology',
  'Construction & Engineering',
  'Finance & Consulting',
  'Real Estate',
  'Health & Medical',
  'Retail & Trade',
  'Services & Skilled Craft'
];

export const ShowcaseFormModal: React.FC<ShowcaseFormModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
  members: propMembers
}) => {
  const [membersList, setMembersList] = useState<Member[]>(propMembers || []);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const memberDropdownRef = useRef<HTMLDivElement>(null);

  const [authorName, setAuthorName] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sync prop members or fetch if missing
  useEffect(() => {
    if (propMembers && propMembers.length > 0) {
      setMembersList(propMembers);
    } else if (isOpen) {
      fetchMembers()
        .then((data) => setMembersList(data))
        .catch((err) => console.error('Failed to fetch members for dropdown:', err));
    }
  }, [propMembers, isOpen]);

  // Close member dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(event.target as Node)) {
        setIsMemberDropdownOpen(false);
      }
    };
    if (isMemberDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMemberDropdownOpen]);

  if (!isOpen) return null;

  // Filter valid members only
  const validMembers = membersList.filter(isValidMember);

  const filteredMembers = validMembers.filter((m) => {
    const q = memberSearch.toLowerCase();
    const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
    const occ = (m.occupation || '').toLowerCase();
    const phone = (m.whatsappPhone || '').toLowerCase();
    return fullName.includes(q) || occ.includes(q) || phone.includes(q);
  });

  const handleSelectMember = (m: Member) => {
    setSelectedMember(m);
    const fullName = `${m.firstName} ${m.lastName}`.trim();
    setAuthorName(fullName);
    setIsMemberDropdownOpen(false);
    setMemberSearch('');
    setFormError(null);
  };

  const resetForm = () => {
    setSelectedMember(null);
    setAuthorName('');
    setTitle('');
    setCategory(CATEGORIES[0]);
    setDescription('');
    setImageUrl('');
    setFormError(null);
    setIsMemberDropdownOpen(false);
    setMemberSearch('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !authorName.trim()) {
      setFormError('Only known fellowship members can post. Please select your name from the directory dropdown.');
      return;
    }
    if (!title.trim() || !description.trim()) {
      setFormError('Please fill in all required post details.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const newPost = await createShowcase({
        authorPhone: selectedMember.whatsappPhone,
        authorName: authorName.trim(),
        title: title.trim(),
        category,
        description: description.trim(),
        imageUrl: imageUrl.trim() || undefined,
        whatsappContact: selectedMember.whatsappPhone,
      });

      handleClose();
      onPostCreated(newPost);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Failed to create showcase post.');
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (m: Member) => {
    const f = (m.firstName || '').trim().charAt(0).toUpperCase();
    const l = (m.lastName || '').trim().charAt(0).toUpperCase();
    return `${f}${l}` || 'M';
  };

  return createPortal(
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px',
          background: 'var(--modal-card-bg)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            borderBottom: '1px solid var(--glass-border)',
            paddingBottom: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Store color="var(--accent-teal)" size={24} />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Post a Business / Showcase
              </h2>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px'
            }}
            title="Close"
          >
            <X size={22} />
          </button>
        </div>

        {/* Error Alert */}
        {formError && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              marginBottom: '18px',
              color: '#ef4444',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Member Selection Searchable Dropdown */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label className="input-label" style={{ margin: 0 }}>
                Fellowship Member (Publisher) *
              </label>
              <span style={{ fontSize: '0.74rem', color: 'var(--accent-teal)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={13} /> Verified Members Only
              </span>
            </div>

            <div style={{ position: 'relative' }} ref={memberDropdownRef}>
              <button
                type="button"
                className="input-field"
                onClick={() => setIsMemberDropdownOpen(!isMemberDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: 'var(--bg-input)',
                  padding: '10px 14px'
                }}
              >
                {selectedMember ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent-teal), var(--accent-teal-dark))',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {getInitials(selectedMember)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                        {selectedMember.firstName} {selectedMember.lastName}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                        {selectedMember.occupation || 'Member'} • {selectedMember.whatsappPhone}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                    <User size={16} />
                    <span>Select verified fellowship member...</span>
                  </div>
                )}

                <ChevronDown
                  size={16}
                  style={{
                    transform: isMemberDropdownOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease',
                    color: 'var(--text-secondary)',
                    flexShrink: 0,
                    marginLeft: '8px'
                  }}
                />
              </button>

              {/* Dropdown Menu with Search */}
              {isMemberDropdownOpen && (
                <div
                  className="modal-card"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    right: 0,
                    zIndex: 120,
                    background: 'var(--modal-card-bg)',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 16px 36px rgba(0, 0, 0, 0.45)',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Search input in dropdown */}
                  <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--glass-border)' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'var(--bg-input)',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--glass-border)'
                      }}
                    >
                      <Search size={14} color="var(--text-muted)" />
                      <input
                        type="text"
                        placeholder="Search member by name, profession or phone..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                          width: '100%'
                        }}
                        autoFocus
                      />
                      {memberSearch && (
                        <button
                          type="button"
                          onClick={() => setMemberSearch('')}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Member items list */}
                  <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                    {filteredMembers.length === 0 ? (
                      <div style={{ padding: '20px 14px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {validMembers.length === 0
                          ? 'No registered members found in the directory.'
                          : `No members found matching "${memberSearch}".`}
                      </div>
                    ) : (
                      filteredMembers.map((m) => {
                        const isSelected = selectedMember?.id === m.id;
                        return (
                          <div
                            key={m.id}
                            onClick={() => handleSelectMember(m)}
                            style={{
                              padding: '10px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              background: isSelected ? 'rgba(20, 184, 166, 0.12)' : 'transparent',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                              transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.background = 'var(--bg-surface-raised)';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                              <div
                                style={{
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, var(--accent-teal), var(--accent-teal-dark))',
                                  color: '#fff',
                                  fontWeight: 700,
                                  fontSize: '0.78rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}
                              >
                                {getInitials(m)}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {m.firstName} {m.lastName}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {m.occupation && <span>{m.occupation}</span>}
                                  {m.whatsappPhone && <span>• {m.whatsappPhone}</span>}
                                </div>
                              </div>
                            </div>
                            {isSelected && <Check size={16} color="var(--accent-teal)" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Title & Category Fields */}
          <div className="form-grid-2">
            <div>
              <label className="input-label">Business / Post Title *</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Leke Tech Ltd."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="input-label">Category *</label>
              <select
                className="input-field"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="input-label">Description & Offerings *</label>
            <textarea
              className="input-field"
              rows={4}
              placeholder="Describe your products, services, skills, or what awareness you are creating for the fellowship..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Image Banner URL */}
          <div>
            <label className="input-label">Image URL / Banner Link (Optional)</label>
            <input
              type="url"
              className="input-field"
              placeholder="https://images.unsplash.com/..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

          {/* Linked WhatsApp Badge */}
          {selectedMember && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(20, 184, 166, 0.12)',
                border: '1px solid rgba(20, 184, 166, 0.3)',
                color: 'var(--accent-teal)'
              }}
            >
              <Phone size={16} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.82rem', lineHeight: 1.45 }}>
                <span style={{ fontWeight: 700 }}>Verified Contact Linked: </span>
                Inquiries from fellowship members will connect directly to{' '}
                <strong>{selectedMember.firstName}'s</strong> registered WhatsApp number (
                <strong style={{ color: 'var(--text-primary)' }}>{selectedMember.whatsappPhone}</strong>).
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedMember}
              className="btn-primary"
              style={{
                flex: 1,
                opacity: submitting || !selectedMember ? 0.6 : 1
              }}
            >
              {submitting ? 'Publishing...' : 'Publish Post'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
