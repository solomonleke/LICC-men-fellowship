import { useState, useEffect, useRef } from 'react';
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
  ShieldCheck,
  QrCode,
  Printer,
  Sparkles
} from 'lucide-react';
import { BackendStats, AgeGroup } from '../types';
import { getExcelDownloadUrl, fetchSheetsConfig, saveSheetsConfig, testSheetsUrl } from '../services/api';
import { QRCode } from '../utils/qrGenerator';
import { AdminQRCodeModal } from './AdminQRCodeModal';

interface ExcelAdminProps {
  stats: BackendStats | null;
  onRefreshStats: () => void;
  onOpenQRModal?: () => void;
}

export const ExcelAdmin: React.FC<ExcelAdminProps> = ({ stats, onRefreshStats, onOpenQRModal }) => {
  const ageGroupsList: AgeGroup[] = ['18-29', '30-39', '40-49', '50-59', '60 and above'];

  const [sheetsUrl, setSheetsUrl] = useState('');
  const [sheetsToken, setSheetsToken] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // QR Code State
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [copiedShortlink, setCopiedShortlink] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const portalShortlink = 'https://ln.run/Wh312';

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

  useEffect(() => {
    if (qrCanvasRef.current) {
      try {
        const qr = new QRCode(portalShortlink, 0, 'M');
        qr.drawToCanvas(qrCanvasRef.current, 280, '#0a0f1d', '#ffffff');
      } catch (err) {
        console.error('Admin QR Code preview render error:', err);
      }
    }
  }, []);

  const handleCopyShortlink = () => {
    navigator.clipboard.writeText(portalShortlink);
    setCopiedShortlink(true);
    setTimeout(() => setCopiedShortlink(false), 2000);
  };

  const handleDownloadCleanPNG = () => {
    try {
      const qr = new QRCode(portalShortlink, 0, 'M');
      const offscreenCanvas = document.createElement('canvas');
      qr.drawToCanvas(offscreenCanvas, 1024, '#0a0f1d', '#ffffff');
      const a = document.createElement('a');
      a.download = `LICC_Portal_QR_Wh312.png`;
      a.href = offscreenCanvas.toDataURL('image/png');
      a.click();
    } catch (err) {
      console.error('Clean PNG download failed:', err);
    }
  };

  const handleDownloadSVG = () => {
    try {
      const qr = new QRCode(portalShortlink, 0, 'M');
      const svg = qr.toSVGString(600, '#0a0f1d', '#ffffff');
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const a = document.createElement('a');
      a.download = `LICC_Portal_QR_Wh312.svg`;
      a.href = URL.createObjectURL(blob);
      a.click();
    } catch (err) {
      console.error('SVG download failed:', err);
    }
  };

  const handleDownloadPrintableFlyer = () => {
    try {
      const qr = new QRCode(portalShortlink, 0, 'M');
      const flyerCanvas = document.createElement('canvas');
      flyerCanvas.width = 1200;
      flyerCanvas.height = 1500;
      const ctx = flyerCanvas.getContext('2d');
      if (!ctx) return;

      const bgGrad = ctx.createLinearGradient(0, 0, 0, 1500);
      bgGrad.addColorStop(0, '#06131c');
      bgGrad.addColorStop(0.5, '#0a1d28');
      bgGrad.addColorStop(1, '#050c12');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1200, 1500);

      const goldGrad = ctx.createLinearGradient(150, 0, 1050, 0);
      goldGrad.addColorStop(0, '#14b8a6');
      goldGrad.addColorStop(0.5, '#f59e0b');
      goldGrad.addColorStop(1, '#14b8a6');
      ctx.fillStyle = goldGrad;
      ctx.fillRect(150, 60, 900, 6);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 52px system-ui, -apple-system, sans-serif';
      ctx.fillText("LICC MEN'S FELLOWSHIP", 600, 150);

      ctx.fillStyle = '#f59e0b';
      ctx.font = '600 28px system-ui, -apple-system, sans-serif';
      ctx.fillText('LIGHT INTERNATIONAL CHRISTIAN CENTRE', 600, 195);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '400 24px system-ui, -apple-system, sans-serif';
      ctx.fillText('Samonda, Ibadan • Member Directory & Business Showcase', 600, 235);

      const cardX = 220;
      const cardY = 300;
      const cardSize = 760;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 20;

      const radius = 28;
      ctx.beginPath();
      ctx.moveTo(cardX + radius, cardY);
      ctx.lineTo(cardX + cardSize - radius, cardY);
      ctx.quadraticCurveTo(cardX + cardSize, cardY, cardX + cardSize, cardY + radius);
      ctx.lineTo(cardX + cardSize, cardY + cardSize - radius);
      ctx.quadraticCurveTo(cardX + cardSize, cardY + cardSize, cardX + cardSize - radius, cardY + cardSize);
      ctx.lineTo(cardX + radius, cardY + cardSize);
      ctx.quadraticCurveTo(cardX, cardY + cardSize, cardX, cardY + cardSize - radius);
      ctx.lineTo(cardX, cardY + radius);
      ctx.quadraticCurveTo(cardX, cardY, cardX + radius, cardY);
      ctx.closePath();
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      const qrCanvas = document.createElement('canvas');
      qr.drawToCanvas(qrCanvas, 660, '#0a0f1d', '#ffffff');
      ctx.drawImage(qrCanvas, cardX + 50, cardY + 50, 660, 660);

      ctx.fillStyle = '#14b8a6';
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
      ctx.fillText('SCAN WITH YOUR PHONE CAMERA', 600, 1140);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '500 28px system-ui, -apple-system, sans-serif';
      ctx.fillText('Or visit directly via browser:', 600, 1195);

      const pillWidth = 480;
      const pillHeight = 64;
      const pillX = (1200 - pillWidth) / 2;
      const pillY = 1230;
      ctx.fillStyle = 'rgba(20, 184, 166, 0.15)';
      ctx.strokeStyle = '#14b8a6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(pillX, pillY, pillWidth, pillHeight, 32);
      } else {
        ctx.rect(pillX, pillY, pillWidth, pillHeight);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px monospace';
      ctx.fillText(portalShortlink, 600, 1272);

      ctx.fillStyle = '#64748b';
      ctx.font = '400 22px system-ui, -apple-system, sans-serif';
      ctx.fillText('Official LICC Men Fellowship Digital Portal • 2026', 600, 1370);

      const a = document.createElement('a');
      a.download = `LICC_Men_Fellowship_Flyer_Wh312.png`;
      a.href = flyerCanvas.toDataURL('image/png');
      a.click();
    } catch (err) {
      console.error('Printable flyer download failed:', err);
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
          <button onClick={() => setIsQRModalOpen(true)} className="btn-secondary" style={{ borderColor: 'var(--accent-teal)' }}>
            <QrCode size={16} color="var(--accent-teal)" /> Portal QR Code
          </button>
          <a href={getExcelDownloadUrl()} download className="btn-primary btn-gold" style={{ textDecoration: 'none' }}>
            <Download size={18} /> Download .XLSX
          </a>
        </div>
      </div>

      {/* Portal QR Code & Mobile Access Hub (Admin Only) */}
      <div className="glass-card" style={{ padding: '24px', border: '1px solid var(--glass-border-teal)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(20, 184, 166, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-teal)'
            }}>
              <QrCode size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                  Fellowship Portal QR Code & Mobile Access
                </h3>
                <span className="badge badge-gold" style={{ textTransform: 'none' }}>
                  <ShieldCheck size={11} /> Admin Only
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Embedded short link: <strong style={{ color: 'var(--accent-teal-bright)' }}>{portalShortlink}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsQRModalOpen(true)}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}
            >
              <QrCode size={15} color="var(--accent-teal)" />
              <span>Full Screen / Projector View</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'center' }}>
          {/* QR Canvas Display */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{
              padding: '16px',
              borderRadius: '16px',
              background: '#ffffff',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              border: '3px solid #ffffff',
              display: 'inline-block'
            }}>
              <canvas
                ref={qrCanvasRef}
                style={{ width: '190px', height: '190px', display: 'block' }}
              />
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Scan with phone camera to test
            </span>
          </div>

          {/* Details & Download Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Shortlink Target
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <input
                  type="text"
                  readOnly
                  value={portalShortlink}
                  className="input-field"
                  style={{ fontFamily: 'monospace', fontSize: '0.92rem', color: 'var(--accent-teal-bright)' }}
                />
                <button
                  onClick={handleCopyShortlink}
                  className="btn-secondary"
                  style={{ padding: '10px 14px', flexShrink: 0 }}
                  title="Copy short link"
                >
                  {copiedShortlink ? <Check size={16} color="var(--accent-teal)" /> : <Copy size={16} />}
                </button>
                <a
                  href={portalShortlink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ padding: '10px 14px', flexShrink: 0 }}
                  title="Open in new tab"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Use this QR code during Sunday services, monthly meetings, and outreach programs. Brothers can point their phone camera to instantly register, view the member directory, or check out business showcases.
            </p>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={handleDownloadPrintableFlyer}
                className="btn-primary btn-gold"
                style={{ fontSize: '0.86rem', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={16} />
                <span>Download Printable Flyer (PNG)</span>
              </button>

              <button
                onClick={handleDownloadCleanPNG}
                className="btn-secondary"
                style={{ fontSize: '0.86rem', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={15} />
                <span>Clean QR (PNG)</span>
              </button>

              <button
                onClick={handleDownloadSVG}
                className="btn-secondary"
                style={{ fontSize: '0.86rem', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={15} />
                <span>Vector (SVG)</span>
              </button>
            </div>
          </div>
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

      {/* Admin QR Code Modal */}
      <AdminQRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        defaultUrl={portalShortlink}
      />

    </section>
  );
};
