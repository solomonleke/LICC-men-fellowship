import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Copy, Check, ExternalLink, QrCode, Sparkles, ShieldCheck } from 'lucide-react';
import { QRCode } from '../utils/qrGenerator';
import { useAdmin } from '../context/AdminContext';

interface AdminQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUrl?: string;
}

export const AdminQRCodeModal: React.FC<AdminQRCodeModalProps> = ({
  isOpen,
  onClose,
  defaultUrl = 'https://ln.run/Wh312'
}) => {
  const { isAdmin } = useAdmin();
  const [url] = useState(defaultUrl);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate and render the QR code whenever open
  const renderQR = () => {
    try {
      const qr = new QRCode(url, 0, 'M');
      if (canvasRef.current) {
        qr.drawToCanvas(canvasRef.current, 360, '#000000', '#ffffff');
      }
      const dataUrl = qr.toDataURL(600, '#000000', '#ffffff');
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('QR code generation error:', err);
    }
  };

  useEffect(() => {
    if (isOpen && isAdmin) {
      const timer = setTimeout(() => {
        renderQR();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [url, isOpen, isAdmin]);

  // Hook rules: Early return must occur AFTER all hooks
  if (!isOpen || !isAdmin) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Downloads a high-resolution 1024x1024 scannable QR Code PNG.
   * Attaches anchor to document.body so Chromium preserves the .png filename.
   */
  const handleDownloadPNG = () => {
    setDownloading(true);
    try {
      const qr = new QRCode(url, 0, 'M');
      const exportCanvas = document.createElement('canvas');
      qr.drawToCanvas(exportCanvas, 1024, '#000000', '#ffffff');

      const triggerAnchor = (href: string) => {
        const link = document.createElement('a');
        link.href = href;
        link.download = 'LICC_Men_Fellowship_QR.png';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
          setDownloading(false);
        }, 300);
      };

      if (typeof exportCanvas.toBlob === 'function') {
        exportCanvas.toBlob((blob) => {
          if (blob) {
            const blobUrl = URL.createObjectURL(blob);
            triggerAnchor(blobUrl);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
          } else {
            triggerAnchor(exportCanvas.toDataURL('image/png'));
          }
        }, 'image/png');
      } else {
        triggerAnchor(exportCanvas.toDataURL('image/png'));
      }
    } catch (err) {
      console.error('Download error:', err);
      setDownloading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 110 }}>
      <div
        className="modal-card animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)',
          border: '1px solid var(--glass-border-teal)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface-raised)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(20, 184, 166, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-teal)'
              }}
            >
              <QrCode size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Portal QR Code
                </h3>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: 'var(--accent-gold)'
                  }}
                >
                  <ShieldCheck size={11} /> Admin Only
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Official scannable code for meetings, screens & flyers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '6px', borderRadius: '50%', border: 'none' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px' }}>
          
          {/* QR Code Display Card */}
          <div
            style={{
              padding: '18px',
              borderRadius: '16px',
              background: '#ffffff',
              boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              border: '4px solid #ffffff'
            }}
          >
            {/* Render with high-contrast canvas & image fallback for right-click saving */}
            <div style={{ position: 'relative', width: '250px', height: '250px' }}>
              <canvas
                ref={canvasRef}
                style={{
                  width: '250px',
                  height: '250px',
                  display: qrDataUrl ? 'none' : 'block'
                }}
              />
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="LICC Men's Fellowship QR Code"
                  style={{
                    width: '250px',
                    height: '250px',
                    display: 'block'
                  }}
                />
              )}
            </div>

            <div style={{ marginTop: '10px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.76rem', color: '#0f766e', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                LICC Men's Fellowship Portal
              </span>
            </div>
          </div>

          {/* Embedded URL Box */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              background: 'var(--bg-surface-raised)',
              border: '1px solid var(--glass-border-teal)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px'
            }}
          >
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Embedded Short Link
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--accent-teal-bright)',
                  fontWeight: 700,
                  fontSize: '0.94rem',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '2px',
                  fontFamily: 'monospace'
                }}
              >
                <span>{url}</span>
                <ExternalLink size={14} />
              </a>
            </div>

            <button
              onClick={handleCopyLink}
              className="btn-secondary"
              style={{
                padding: '8px 12px',
                fontSize: '0.8rem',
                flexShrink: 0,
                borderColor: copied ? 'var(--accent-teal)' : undefined,
                color: copied ? 'var(--accent-teal-bright)' : undefined
              }}
            >
              {copied ? (
                <>
                  <Check size={14} /> Copied!
                </>
              ) : (
                <>
                  <Copy size={14} /> Copy
                </>
              )}
            </button>
          </div>

          {/* Camera Scanning Notice */}
          <div
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(20, 184, 166, 0.08)',
              border: '1px solid rgba(20, 184, 166, 0.2)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.45,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Sparkles size={16} color="var(--accent-teal-bright)" style={{ flexShrink: 0 }} />
            <div>
              Point your iPhone or Android camera at the QR code to open the portal instantly.
            </div>
          </div>

          {/* Single Direct Download Button */}
          <div style={{ width: '100%' }}>
            <button
              onClick={handleDownloadPNG}
              disabled={downloading}
              className="btn-primary btn-gold"
              style={{
                width: '100%',
                padding: '13px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.96rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <Download size={18} />
              <span>{downloading ? 'Preparing Download...' : 'Download QR Code (PNG)'}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
