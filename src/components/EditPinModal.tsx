import { useState, useEffect } from 'react';
import { KeyRound, ShieldCheck, AlertCircle, X, Eye, EyeOff, Lock } from 'lucide-react';
import { Member } from '../types';
import { verifyMemberEditPin } from '../services/api';
import { useAdmin } from '../context/AdminContext';

interface EditPinModalProps {
  member: Member | null;
  onClose: () => void;
  onVerified: (member: Member, verifiedPin: string) => void;
}

export const EditPinModal: React.FC<EditPinModalProps> = ({ member, onClose, onVerified }) => {
  const { openLoginModal } = useAdmin();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPin('');
    setShowPin(false);
    setError(null);
    setVerifying(false);
  }, [member]);

  if (!member) return null;

  const hasPin = member.hasEditPin !== false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = pin.trim();
    if (!/^\d{4}$/.test(cleaned)) {
      setError('Please enter your 4-digit Edit PIN.');
      return;
    }

    setVerifying(true);
    setError(null);
    try {
      await verifyMemberEditPin(member.id, cleaned);
      onVerified(member, cleaned);
    } catch (err: any) {
      setError(err.message || 'Incorrect 4-digit Edit PIN.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '430px',
          padding: '24px',
          background: 'var(--modal-card-bg)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
          title="Close"
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '14px',
              background: hasPin ? 'rgba(20, 184, 166, 0.14)' : 'rgba(245, 158, 11, 0.15)',
              color: hasPin ? 'var(--accent-teal)' : 'var(--accent-amber)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}
          >
            {hasPin ? <KeyRound size={26} /> : <Lock size={24} />}
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
            {hasPin ? 'Verify Profile Edit PIN' : 'EXCO Admin Assistance Required'}
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            {hasPin
              ? `Enter the 4-digit Edit PIN you created when registering ${member.firstName} ${member.lastName}'s profile.`
              : `${member.firstName} ${member.lastName}'s profile was registered before Edit PINs were enabled. Ask an EXCO Admin to edit it or assign a 4-digit Edit PIN.`}
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.14)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              marginBottom: '16px',
              color: '#ef4444',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {!hasPin ? (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                openLoginModal();
              }}
              className="btn-primary"
              style={{ flex: 1.4 }}
            >
              <ShieldCheck size={16} /> EXCO Admin Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="input-label">4-Digit Edit PIN *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  className="input-field"
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  style={{ paddingRight: '40px', letterSpacing: showPin ? '0.25em' : '0.35em', fontWeight: 700, fontSize: '1.05rem' }}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                  title={showPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={verifying || pin.length !== 4}
                className="btn-primary"
                style={{ flex: 1.4, opacity: verifying || pin.length !== 4 ? 0.65 : 1 }}
              >
                {verifying ? 'Verifying...' : 'Unlock & Edit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

