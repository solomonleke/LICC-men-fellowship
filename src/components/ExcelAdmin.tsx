import { useState, useEffect } from 'react';
import {
  Download,
  RefreshCw,
  CheckCircle2,
  Database,
  Cpu,
  Cloud,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  HelpCircle,
  Link,
  ShieldCheck
} from 'lucide-react';
import { BackendStats, AgeGroup } from '../types';
import { getExcelDownloadUrl, fetchSheetsConfig, saveSheetsConfig, testSheetsUrl } from '../services/api';

interface ExcelAdminProps {
  stats: BackendStats | null;
  onRefreshStats: () => void;
}

export const ExcelAdmin: React.FC<ExcelAdminProps> = ({ stats, onRefreshStats }) => {
  const ageGroupsList: AgeGroup[] = ['18-29', '30-39', '40-49', '50-59', '60 and above'];

  const [sheetsUrl, setSheetsUrl] = useState('');
  const [sheetsToken, setSheetsToken] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await fetchSheetsConfig();
      setIsConfigured(cfg.isConfigured);
      if (cfg.url) setSheetsUrl(cfg.url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetsUrl.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid Google Apps Script Web App URL.' });
      return;
    }

    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await saveSheetsConfig(sheetsUrl.trim(), sheetsToken.trim());
      setIsConfigured(true);
      setStatusMsg({
        type: 'success',
        text: `Connected to Google Sheets successfully! ${res.testResult && res.testResult.message ? res.testResult.message : ''}`
      });
      onRefreshStats();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setStatusMsg(null);
    try {
      const res = await testSheetsUrl(sheetsUrl.trim());
      if (res.ok) {
        setStatusMsg({ type: 'success', text: 'Google Sheets API endpoint responded with OK (200)!' });
      } else {
        setStatusMsg({ type: 'error', text: `Test failed: ${res.error || 'Endpoint did not return ok'}` });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Test error: ${err.message}` });
    } finally {
      setTesting(false);
    }
  };

  const maxAgeCount = stats && stats.ageGroupBreakdown
    ? Math.max(...Object.values(stats.ageGroupBreakdown), 1)
    : 1;

  return (
    <section className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database color="var(--accent-teal-bright)" size={28} />
            Database & Google Sheets Sync Hub
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Manage your Google Sheets cloud connection, view live demographic breakdown, and download local backups.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setShowGuide(!showGuide)} className="btn-secondary">
            <HelpCircle size={16} /> {showGuide ? 'Hide Setup Guide' : 'Setup Guide (3 mins)'}
          </button>
          <button onClick={onRefreshStats} className="btn-secondary">
            <RefreshCw size={16} /> Refresh Metrics
          </button>
          <a href={getExcelDownloadUrl()} download className="btn-primary btn-gold" style={{ textDecoration: 'none' }}>
            <Download size={18} /> Download .XLSX
          </a>
        </div>
      </div>

      {/* Google Sheets Connection Card */}
      <div className="glass-card" style={{ padding: '24px', border: isConfigured ? '1px solid rgba(20, 184, 166, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: isConfigured ? 'rgba(20, 184, 166, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Cloud size={22} color={isConfigured ? 'var(--accent-teal-bright)' : 'var(--accent-amber)'} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                Google Sheets Integration
                {isConfigured ? (
                  <span className="badge badge-teal" style={{ textTransform: 'none' }}>● Connected to Cloud</span>
                ) : (
                  <span className="badge badge-gold" style={{ textTransform: 'none' }}>● Local Storage Active</span>
                )}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {isConfigured
                  ? 'All member registrations and showcase posts sync directly to your live Google Sheet in real time.'
                  : 'Paste your Google Apps Script Web App URL below to connect your Google Sheet.'}
              </p>
            </div>
          </div>

          <a
            href="https://sheets.new"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ fontSize: '0.82rem', padding: '8px 14px' }}
          >
            <ExternalLink size={14} /> Open Google Sheets
          </a>
        </div>

        {statusMsg && (
          <div style={{
            background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : statusMsg.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
            border: `1px solid ${statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : statusMsg.type === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            marginBottom: '16px',
            fontSize: '0.88rem',
            color: statusMsg.type === 'success' ? '#34d399' : statusMsg.type === 'error' ? '#fca5a5' : '#93c5fd',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-grid-2">
            <div>
              <label className="input-label">Google Apps Script Web App URL</label>
              <input
                type="url"
                className="input-field"
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                value={sheetsUrl}
                onChange={(e) => setSheetsUrl(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="input-label">API Secret Token (Optional)</label>
              <input
                type="password"
                className="input-field"
                placeholder="Enter secret token (if configured)"
                value={sheetsToken}
                onChange={(e) => setSheetsToken(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="submit" disabled={saving} className="btn-primary">
              <Link size={16} /> {saving ? 'Connecting...' : 'Save & Connect Google Sheet'}
            </button>
            <button type="button" onClick={handleTest} disabled={testing || !sheetsUrl} className="btn-secondary">
              <CheckCircle2 size={16} /> {testing ? 'Testing...' : 'Test URL'}
            </button>
          </div>
        </form>

      </div>

      {/* Step-by-Step Setup Guide Accordion */}
      {showGuide && (
        <div className="glass-card animate-fade-in" style={{ padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--glass-border-teal)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-teal-bright)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HelpCircle size={20} />
              Step-by-Step Google Sheets Setup (3 Minutes)
            </h3>
            <span className="badge badge-teal">Simple Setup</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <div style={{ background: 'var(--bg-surface-subtle)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Step 1: Create a Google Sheet</strong>
              <p>Go to <a href="https://sheets.new" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-teal-bright)' }}>sheets.new</a> and name it <strong>LICC Men's Fellowship Database</strong>.</p>
            </div>

            <div style={{ background: 'var(--bg-surface-subtle)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Step 2: Open Apps Script</strong>
              <p>In your sheet menu, click <strong>Extensions</strong> → <strong>Apps Script</strong>.</p>
            </div>

            <div style={{ background: 'var(--bg-surface-subtle)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Step 3: Paste the Script Code</strong>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`// Refer to google-apps-script/Code.gs in the project root`);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                >
                  {copiedCode ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                  {copiedCode ? 'Copied Reference' : 'Code located in google-apps-script/Code.gs'}
                </button>
              </div>
              <p>Open <code>google-apps-script/Code.gs</code> in this project, copy all its content, and paste it into the Apps Script editor. Click <strong>Save (Ctrl+S)</strong>.</p>
            </div>

            <div style={{ background: 'var(--bg-surface-subtle)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Step 4: Run Initial Setup</strong>
              <p>In the Apps Script editor, select <strong>setup</strong> from the function dropdown at the top and click <strong>Run</strong>. (Grant permissions when prompted). This automatically generates your 3 tabs (<code>Members</code>, <code>Showcases</code>, <code>Comments</code>) with styled headers!</p>
            </div>

            <div style={{ background: 'var(--bg-surface-subtle)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Step 5: Deploy as Web App & Paste URL</strong>
              <p>Click <strong>Deploy</strong> → <strong>New deployment</strong> → Select <strong>Web app</strong>. Set <em>Execute as: Me</em> and <em>Who has access: Anyone</em>. Click <strong>Deploy</strong>, copy the Web App URL (ends with <code>/exec</code>), and paste it into the box above!</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* Storage Metadata Card */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
            <Database color="var(--accent-teal-bright)" size={20} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Database Storage Info</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.78rem' }}>CURRENT ACTIVE SOURCE</span>
              <strong style={{ color: 'var(--accent-teal-bright)', fontSize: '1rem', marginTop: '4px', display: 'block' }}>
                {stats?.source || (isConfigured ? 'Google Sheets (Live Cloud)' : 'Local Excel Workbook (.xlsx)')}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Members:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{stats ? stats.totalMembers : '...'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Showcases:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{stats ? stats.totalShowcases : '...'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Comments:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{stats ? stats.totalComments : '...'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Phone Uniqueness Index:</span>
              <span style={{ color: 'var(--accent-teal-bright)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={16} /> 100% Unique Protection
              </span>
            </div>
          </div>
        </div>

        {/* Age Group Breakdown Visualizer */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
            <Cpu color="var(--accent-gold)" size={20} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Age Group Demographics</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {ageGroupsList.map(grp => {
              const count = stats?.ageGroupBreakdown ? stats.ageGroupBreakdown[grp] || 0 : 0;
              const percentage = Math.round((count / maxAgeCount) * 100);

              return (
                <div key={grp}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{grp} years</span>
                    <span style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>{count} members</span>
                  </div>
                  <div style={{ background: 'var(--bg-surface-subtle)', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--accent-teal) 0%, var(--accent-amber) 100%)',
                        borderRadius: '5px',
                        transition: 'width 0.5s ease-out'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </section>
  );
};
