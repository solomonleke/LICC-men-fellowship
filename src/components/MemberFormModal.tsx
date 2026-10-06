import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, ShieldCheck, Loader2, ChevronDown, Search, Check } from 'lucide-react';
import { AgeGroup, Member, OCCUPATIONS } from '../types';
import { checkPhoneUniqueness, createMember } from '../services/api';
import { validatePhoneNumber } from '../utils/phoneValidation';

interface MemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemberAdded: (member: Member) => void;
}

export const MemberFormModal: React.FC<MemberFormModalProps> = ({ isOpen, onClose, onMemberAdded }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [occupation, setOccupation] = useState<string>(OCCUPATIONS[0]);
  const [isOccupationOpen, setIsOccupationOpen] = useState(false);
  const [occupationSearch, setOccupationSearch] = useState('');
  const occupationRef = useRef<HTMLDivElement>(null);
  const [customOccupation, setCustomOccupation] = useState('');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('30-39');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');

  const [phoneChecking, setPhoneChecking] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Close occupation dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (occupationRef.current && !occupationRef.current.contains(event.target as Node)) {
        setIsOccupationOpen(false);
      }
    };
    if (isOccupationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOccupationOpen]);

  const filteredOccupations = OCCUPATIONS.filter(occ =>
    occ.toLowerCase().includes(occupationSearch.toLowerCase())
  );

  const phoneValidation = validatePhoneNumber(whatsappPhone);
  const altValidation = altPhone.trim() ? validatePhoneNumber(altPhone) : { isValid: true, error: undefined };

  // Debounced Phone Uniqueness Validation - Only runs when format is valid!
  useEffect(() => {
    if (!whatsappPhone.trim()) {
      setIsDuplicate(null);
      return;
    }

    const val = validatePhoneNumber(whatsappPhone);
    if (!val.isValid) {
      setIsDuplicate(null);
      return;
    }

    const timer = setTimeout(async () => {
      setPhoneChecking(true);
      try {
        const queryNum = val.normalized || whatsappPhone.trim();
        const res = await checkPhoneUniqueness(queryNum);
        setIsDuplicate(res.exists);
        if (res.exists) {
          setErrorMsg(`Phone number (${whatsappPhone}) is already registered in the fellowship records!`);
        } else {
          setErrorMsg(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setPhoneChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [whatsappPhone]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalOccupation = occupation === 'Other' ? (customOccupation.trim() || 'Other') : occupation;
    if (!firstName || !lastName || !finalOccupation || !whatsappPhone) {
      setErrorMsg('Please fill in all mandatory fields.');
      return;
    }

    // Phone format validation
    const val = validatePhoneNumber(whatsappPhone);
    if (!val.isValid) {
      setErrorMsg(val.error || 'Please enter a valid phone number.');
      return;
    }

    if (altPhone.trim()) {
      const altVal = validatePhoneNumber(altPhone);
      if (!altVal.isValid) {
        setErrorMsg(`Alternate Phone: ${altVal.error}`);
        return;
      }
    }

    if (isDuplicate) {
      setErrorMsg(`Cannot submit! WhatsApp number (${whatsappPhone}) already exists in the fellowship records.`);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const newMember = await createMember({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        occupation: finalOccupation,
        ageGroup,
        whatsappPhone: val.normalized || whatsappPhone.trim(),
        altPhone: altPhone.trim() ? (validatePhoneNumber(altPhone).normalized || altPhone.trim()) : undefined,
      });

      onMemberAdded(newMember);
      resetForm();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving to Excel database.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setOccupation(OCCUPATIONS[0]);
    setIsOccupationOpen(false);
    setOccupationSearch('');
    setCustomOccupation('');
    setAgeGroup('30-39');
    setWhatsappPhone('');
    setAltPhone('');
    setIsDuplicate(null);
    setErrorMsg(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck color="var(--accent-teal)" size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Add Fellowship Member Record</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: '18px', color: '#ef4444', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Name Fields */}
          <div className="form-grid-2">
            <div>
              <label className="input-label">First Name *</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Solomon"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="input-label">Last Name *</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Leke"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Occupation Dropdown with Internal Scroll */}
          <div>
            <label className="input-label">Occupation / Profession Category *</label>
            <div style={{ position: 'relative' }} ref={occupationRef}>
              <button
                type="button"
                className="input-field"
                onClick={() => setIsOccupationOpen(!isOccupationOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: 'var(--bg-input)'
                }}
              >
                <span style={{ color: occupation ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600 }}>
                  {occupation}
                </span>
                <ChevronDown
                  size={16}
                  style={{
                    transform: isOccupationOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease',
                    color: 'var(--text-secondary)'
                  }}
                />
              </button>

              {isOccupationOpen && (
                <div
                  className="glass-card"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    background: 'var(--bg-surface-raised)',
                    border: '1px solid var(--glass-border-teal)',
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Quick Search */}
                  <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-input)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                      <Search size={14} color="var(--text-muted)" />
                      <input
                        type="text"
                        placeholder="Search or filter occupation..."
                        value={occupationSearch}
                        onChange={(e) => setOccupationSearch(e.target.value)}
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
                    </div>
                  </div>

                  {/* Scrollable list with internal scroll that NEVER flushes to bottom of screen */}
                  <div
                    style={{
                      maxHeight: '210px',
                      overflowY: 'auto',
                      padding: '4px'
                    }}
                  >
                    {filteredOccupations.map((occ) => {
                      const isSelected = occupation === occ;
                      return (
                        <div
                          key={occ}
                          onClick={() => {
                            setOccupation(occ);
                            setIsOccupationOpen(false);
                            setOccupationSearch('');
                          }}
                          style={{
                            padding: '9px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.86rem',
                            color: isSelected ? 'var(--accent-teal-bright)' : 'var(--text-primary)',
                            background: isSelected ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
                            fontWeight: isSelected ? 700 : 500,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'var(--bg-card-hover)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <span>{occ}</span>
                          {isSelected && <Check size={14} color="var(--accent-teal-bright)" />}
                        </div>
                      );
                    })}
                    {filteredOccupations.length === 0 && (
                      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No matching occupation found
                      </div>
                    )}
                  </div>
                </div>
              )}

              {occupation === 'Other' && (
                <div style={{ marginTop: '10px' }}>
                  <label className="input-label">Specify Profession *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter specific occupation..."
                    value={customOccupation}
                    onChange={(e) => setCustomOccupation(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* Age Group Dropdown */}
          <div>
            <label className="input-label">Age Group *</label>
            <select
              className="input-field"
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
              style={{ cursor: 'pointer' }}
            >
              <option value="18-29">18 - 29 years</option>
              <option value="30-39">30 - 39 years</option>
              <option value="40-49">40 - 49 years</option>
              <option value="50-59">50 - 59 years</option>
              <option value="60 and above">60 and above</option>
            </select>
          </div>

          {/* WhatsApp Primary Phone */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="input-label" style={{ margin: 0 }}>Primary WhatsApp Phone Number *</label>
              
              {/* Validation Status Badges */}
              {whatsappPhone.trim().length > 0 && !phoneValidation.isValid && (
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  <AlertCircle size={14} /> Incomplete / Invalid Number
                </span>
              )}

              {whatsappPhone.trim().length > 0 && phoneValidation.isValid && phoneChecking && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Loader2 size={12} className="spin" /> Checking DB...
                </span>
              )}

              {whatsappPhone.trim().length > 0 && phoneValidation.isValid && !phoneChecking && isDuplicate === false && (
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                  <CheckCircle size={14} /> Valid & Available
                </span>
              )}

              {whatsappPhone.trim().length > 0 && phoneValidation.isValid && !phoneChecking && isDuplicate === true && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                  <AlertTriangle size={14} /> Already Registered!
                </span>
              )}
            </div>

            <input
              type="text"
              className="input-field"
              placeholder="e.g. 08165413812 or +2348165413812"
              value={whatsappPhone}
              onChange={(e) => setWhatsappPhone(e.target.value)}
              style={{
                borderColor: whatsappPhone.trim().length > 0 && !phoneValidation.isValid
                  ? 'var(--accent-amber)'
                  : isDuplicate === true
                  ? '#ef4444'
                  : isDuplicate === false && phoneValidation.isValid
                  ? 'var(--accent-teal)'
                  : undefined
              }}
              required
            />
            
            {whatsappPhone.trim().length > 0 && !phoneValidation.isValid ? (
              <p style={{ fontSize: '0.76rem', color: 'var(--accent-amber)', marginTop: '4px', fontWeight: 600 }}>
                ⚠️ {phoneValidation.error}
              </p>
            ) : (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Must be a valid 11-digit Nigerian number (e.g. 08031234567) or international format (+234...).
              </p>
            )}
          </div>

          {/* Secondary Phone */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="input-label" style={{ margin: 0 }}>Alternate Phone Number (Optional)</label>
              {altPhone.trim().length > 0 && !altValidation.isValid && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>
                  ⚠️ Invalid Format
                </span>
              )}
            </div>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. 08099887766 (if different or non-WhatsApp)"
              value={altPhone}
              onChange={(e) => setAltPhone(e.target.value)}
              style={{
                borderColor: altPhone.trim().length > 0 && !altValidation.isValid ? '#ef4444' : undefined
              }}
            />
            {altPhone.trim().length > 0 && !altValidation.isValid && (
              <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px' }}>
                ⚠️ {altValidation.error}
              </p>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                submitting ||
                isDuplicate === true ||
                phoneChecking ||
                !phoneValidation.isValid ||
                (altPhone.trim().length > 0 && !altValidation.isValid)
              }
              className="btn-primary"
              style={{
                flex: 1,
                opacity: (submitting || isDuplicate === true || phoneChecking || !phoneValidation.isValid || (altPhone.trim().length > 0 && !altValidation.isValid)) ? 0.6 : 1
              }}
            >
              {submitting ? 'Saving to Excel...' : 'Save Member Record'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
