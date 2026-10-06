import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, KeyRound, AlertCircle, CheckCircle, UserCheck, LogOut, X, Eye, EyeOff } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { fetchExcos } from '../services/api';
import { ExcoMember } from '../types';

export function AdminLoginModal() {
  const { isAdmin, adminUser, isLoginModalOpen, closeLoginModal, login, logout } = useAdmin();
  const [passcode, setPasscode] = useState('');
  const [selectedExcoId, setSelectedExcoId] = useState('');
  const [excos, setExcos] = useState<ExcoMember[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isLoginModalOpen) {
      setError(null);
      setSuccessMsg(null);
      setPasscode('');
      fetchExcos()
        .then(list => {
          setExcos(list);
          if (list.length > 0 && !selectedExcoId) {
            setSelectedExcoId(list[0].id);
          }
        })
        .catch(() => {});
    }
  }, [isLoginModalOpen]);

  if (!isLoginModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError('Please enter the EXCO admin passcode.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const ok = await login(passcode.trim(), selectedExcoId);
      if (ok) {
        setSuccessMsg('Authenticated successfully as EXCO Admin!');
        setTimeout(() => {
          closeLoginModal();
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || 'Incorrect passcode. Access denied.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setSuccessMsg('Logged out successfully.');
    setTimeout(() => {
      closeLoginModal();
    }, 600);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeLoginModal();
      }}
    >
      <div
        className="modal-card"
        style={{
          width: '100%',
          maxWidth: '480px',
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
          onClick={closeLoginModal}
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
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: isAdmin ? 'rgba(16, 185, 129, 0.15)' : 'rgba(217, 119, 6, 0.15)',
              color: isAdmin ? '#10b981' : '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px'
            }}
          >
            {isAdmin ? <ShieldCheck size={32} /> : <Lock size={30} />}
          </div>
          <h2
            style={{
              fontFamily: "'Aclonica', sans-serif",
              fontSize: '1.25rem',
              color: 'var(--text-primary)',
              margin: '0 0 6px'
            }}
          >
            {isAdmin ? 'EXCO Admin Active' : 'EXCO Executive Authentication'}
          </h2>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              margin: 0,
              lineHeight: 1.5
            }}
          >
            {isAdmin
              ? 'You currently hold administrator privileges for events & member records.'
              : 'Sign in as a targeted EXCO leader to create events, manage schedules, and administer records.'}
          </p>
        </div>

        {/* Active Session Info if already logged in */}
        {isAdmin && adminUser && (
          <div
            style={{
              background: 'var(--bg-surface-raised)',
              borderRadius: '14px',
              padding: '16px',
              marginBottom: '20px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-teal), var(--accent-teal-dark))',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1rem',
                flexShrink: 0
              }}
            >
              {adminUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.94rem' }}>
                {adminUser.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--accent-teal)', fontWeight: 700, textTransform: 'uppercase' }}>
                {adminUser.role}
              </div>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '20px',
                fontSize: '0.72rem',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                fontWeight: 600
              }}
            >
              <CheckCircle size={12} /> Verified
            </span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '18px',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}
          >
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
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

        {/* If already logged in, show Sign Out or Re-verify */}
        {isAdmin ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={handleLogout}
              className="btn-danger"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                fontSize: '0.88rem'
              }}
            >
              <LogOut size={16} /> End Admin Session (Sign Out)
            </button>
            <button
              onClick={closeLoginModal}
              className="btn-secondary"
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '12px',
                fontSize: '0.86rem',
                cursor: 'pointer'
              }}
            >
              Continue Working
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Select EXCO Profile */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px'
                }}
              >
                Select Your EXCO Portfolio
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedExcoId}
                  onChange={(e) => setSelectedExcoId(e.target.value)}
                  className="input-field"
                  style={{
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  {excos.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.order}. {ex.role}: {ex.name}
                    </option>
                  ))}
                  {excos.length === 0 && (
                    <option value="EXCO-ADMIN">EXCO Executive Member</option>
                  )}
                </select>
              </div>
            </div>

            {/* Passcode Input */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px'
                }}
              >
                EXCO Admin Passcode
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}
                >
                  <KeyRound size={17} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter EXCO admin passcode"
                  className="input-field"
                  style={{
                    paddingLeft: '38px',
                    paddingRight: '40px'
                  }}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
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
                  title={showPassword ? 'Hide passcode' : 'Show passcode'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={closeLoginModal}
                className="btn-secondary"
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '0.88rem'
                }}
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
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  opacity: loading ? 0.75 : 1
                }}
              >
                {loading ? 'Authenticating...' : <><ShieldCheck size={18} /> Sign In as Admin</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
