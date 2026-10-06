import React, { useState, useEffect } from 'react';
import { Sidebar, AppTab } from './components/Sidebar';
import { QuickStats } from './components/QuickStats';
import { MemberDirectory } from './components/MemberDirectory';
import { BusinessShowcase } from './components/BusinessShowcase';
import { ExcelAdmin } from './components/ExcelAdmin';
import { EventsView } from './components/EventsView';
import { ExcoMembers } from './components/ExcoMembers';
import { MemberFormModal } from './components/MemberFormModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { Member, ShowcasePost, ExcelStats } from './types';
import { fetchMembers, deleteMember, fetchShowcases, fetchExcelStats } from './services/api';
import { useAdmin } from './context/AdminContext';
import { RefreshCw, UserPlus, ShieldCheck, CheckCircle2, X } from 'lucide-react';

export function App() {
  const { passcode, isAdmin, adminUser, openLoginModal } = useAdmin();
  const [activeTab, setActiveTab] = useState<AppTab>('directory');
  const [members, setMembers] = useState<Member[]>([]);
  const [showcases, setShowcases] = useState<ShowcasePost[]>([]);
  const [excelStats, setExcelStats] = useState<ExcelStats | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const loadData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      setError(null);
      const [membersData, showcasesData, statsData] = await Promise.all([
        fetchMembers().catch((err) => {
          console.warn('Members fetch error:', err);
          return [];
        }),
        fetchShowcases().catch((err) => {
          console.warn('Showcases fetch error:', err);
          return [];
        }),
        fetchExcelStats().catch((err) => {
          console.warn('Stats fetch error:', err);
          return null;
        }),
      ]);
      setMembers(membersData);
      setShowcases(showcasesData);
      setExcelStats(statsData);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError('Could not connect to Excel Backend API server. Please make sure `npm run dev` or the server is running.');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMemberAdded = (newMember: Member) => {
    setMembers([newMember, ...members]);
    setToastNotice(`Fellowship member "${newMember.firstName} ${newMember.lastName}" registered successfully!`);
    loadData();
    setTimeout(() => setToastNotice(null), 6000);
  };

  const handleDeleteMember = async (id: string) => {
    try {
      await deleteMember(id, passcode);
      setMembers(members.filter(m => m.id !== id));
      setToastNotice('Member record deleted successfully from directory.');
      loadData();
      setTimeout(() => setToastNotice(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete member (requires EXCO Admin authorization)');
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'directory':
        return {
          title: 'Fellowship Member Directory',
          subtitle: 'Verified contact records, professions & age bracket distributions'
        };
      case 'showcase':
        return {
          title: 'Business & Service Showcase',
          subtitle: 'Connecting Christian men, businesses, and professional services'
        };
      case 'events':
        return {
          title: 'Events & Gathering Calendar',
          subtitle: 'Monthly breakfast fellowships, prayer meetings & spiritual growth programs'
        };
      case 'excos':
        return {
          title: 'Executive Committee (EXCO)',
          subtitle: 'Servant leadership council overseeing the spiritual and administrative vision'
        };
      case 'excel-admin':
        return {
          title: 'System Settings & Backups',
          subtitle: 'Administrative data management, demographic reports & local backups'
        };
      default:
        return { title: 'LICC Men Fellowship', subtitle: 'Portal' };
    }
  };


  const pageInfo = getPageTitle();

  const validMembers = members.filter(m => {
    const fName = (m.firstName || '').trim();
    const lName = (m.lastName || '').trim();
    const phone = (m.whatsappPhone || '').trim();
    const id = (m.id || '').trim();
    const fullName = `${fName} ${lName}`.toLowerCase();
    if (!fName && !lName && !phone) return false;
    if (fName.toUpperCase() === 'N/A' && lName.toUpperCase() === 'N/A') return false;
    if (id.startsWith('MEM-100')) return false;
    if (fullName.includes('emmanuel adeyemi') || fullName.includes('david okonkwo') || fullName.includes('test') || fullName.includes('dummy')) return false;
    return true;
  });

  const validShowcases = showcases.filter(s => {
    if (!s.title || !s.title.trim() || !s.authorName || !s.authorName.trim()) return false;
    const title = s.title.toLowerCase();
    const author = s.authorName.toLowerCase();
    if (s.id === 'POST-5001' || title.includes('leke tech') || title.includes('apex engineering') || title.includes('test') || title.includes('dummy')) return false;
    if (author.includes('david okonkwo') || author.includes('emmanuel adeyemi')) return false;
    return true;
  });

  return (
    <div className="app-layout">
      
      {/* Executive Sidebar with Fellowship Info & Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        memberCount={validMembers.length}
        showcaseCount={validShowcases.length}
      />

      {/* Main Content Area */}
      <div className="main-content">
        
        {/* Top Header Bar */}
        <header className="glass-card app-header" style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          borderRadius: 0,
          borderTop: 0,
          borderLeft: 0,
          borderRight: 0,
          background: 'var(--nav-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>LICC Men Portal</span>
              <span style={{ color: 'var(--text-muted)' }}>/</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--accent-teal)', fontWeight: 700 }}>
                {activeTab === 'directory' ? 'Directory' : activeTab === 'showcase' ? 'Showcase' : activeTab === 'events' ? 'Events' : activeTab === 'excos' ? 'EXCOs' : 'Settings'}
              </span>
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {pageInfo.title}
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {pageInfo.subtitle}
            </p>
          </div>

          {/* Header Action Tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {isAdmin && adminUser ? (
              <button
                onClick={openLoginModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#10b981',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Click to view EXCO admin session details"
              >
                <ShieldCheck size={14} />
                <span>{adminUser.role}: {adminUser.name.split(' ')[1] || adminUser.name}</span>
              </button>
            ) : (
              <button
                onClick={openLoginModal}
                className="btn-secondary"
                style={{ padding: '7px 12px', fontSize: '0.78rem', gap: '6px' }}
                title="EXCO Admin Sign In"
              >
                <ShieldCheck size={14} />
                <span>EXCO Admin</span>
              </button>
            )}

            <button
              onClick={() => loadData(true)}
              className="btn-secondary"
              title="Refresh Fellowship Records"
              style={{ padding: '9px 14px', fontSize: '0.85rem' }}
              disabled={refreshing}
            >
              <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="btn-primary btn-gold"
              style={{ padding: '9px 18px', fontSize: '0.88rem' }}
            >
              <UserPlus size={16} />
              <span>Add Member</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="app-main">
          
          {/* Global Toast Notice */}
          {toastNotice && (
            <div
              className="animate-fade-in"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(13, 148, 136, 0.15) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: 'var(--text-primary)',
                padding: '14px 18px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '20px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  flexShrink: 0
                }}>
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.92rem' }}>Operation Successful</strong>
                  <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>{toastNotice}</span>
                </div>
              </div>
              <button
                onClick={() => setToastNotice(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Dismiss"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Quick Stats Metrics Cards */}
          <QuickStats
            stats={excelStats}
            loading={loading}
            memberCount={validMembers.length}
            showcaseCount={validShowcases.length}
          />

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444', padding: '16px 20px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          {activeTab === 'directory' && (
            <MemberDirectory
              members={validMembers}
              loading={loading}
              onDeleteMember={handleDeleteMember}
              onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
            />
          )}

          {activeTab === 'showcase' && (
            <BusinessShowcase
              showcases={validShowcases}
              members={validMembers}
              loading={loading}
              onRefreshShowcases={() => loadData()}
            />
          )}

          {activeTab === 'events' && (
            <EventsView />
          )}

          {activeTab === 'excos' && (
            <ExcoMembers />
          )}

          {activeTab === 'excel-admin' && (
            <ExcelAdmin
              stats={excelStats}
              onRefreshStats={() => loadData()}
            />
          )}

        </main>

        {/* Register Member Form Modal */}
        <MemberFormModal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          onMemberAdded={handleMemberAdded}
        />

        {/* EXCO Admin Authentication Modal */}
        <AdminLoginModal />

        {/* Footer */}
        <footer style={{ borderTop: '1px solid var(--glass-border)', padding: '18px 28px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', background: 'var(--nav-pill-bg)', marginTop: 'auto' }}>
          LICC Men Fellowship • Light Cathedral, By Old Airport Bus-Stop, U.I Road, Samonda, Ibadan.
        </footer>

      </div>

    </div>
  );
}

export default App;
