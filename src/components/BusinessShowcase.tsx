import { useState } from 'react';
import { Store, PlusCircle, Heart, MessageSquare, ExternalLink, Search, CheckCircle2, X } from 'lucide-react';
import { ShowcasePost, Member } from '../types';
import { isValidShowcase } from '../utils/dummyData';
import { likeShowcasePost } from '../services/api';
import { PostDetailModal } from './PostDetailModal';
import { ShowcaseFormModal } from './ShowcaseFormModal';

interface BusinessShowcaseProps {
  showcases: ShowcasePost[];
  members?: Member[];
  loading?: boolean;
  onRefreshShowcases: () => void;
}

export const BusinessShowcase: React.FC<BusinessShowcaseProps> = ({ showcases, members = [], loading = false, onRefreshShowcases }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPost, setSelectedPost] = useState<ShowcasePost | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const validShowcases = showcases.filter(isValidShowcase);

  const filteredShowcases = validShowcases.filter(s =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.authorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePostCreated = (newPost?: ShowcasePost) => {
    const postTitle = newPost?.title ? ` "${newPost.title}"` : '';
    setSuccessNotice(`Business showcase${postTitle} published successfully! Your listing is now live in the fellowship directory.`);
    onRefreshShowcases();
    setTimeout(() => {
      setSuccessNotice(null);
    }, 6000);
  };

  const handleQuickLike = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await likeShowcasePost(id);
      onRefreshShowcases();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <section className="animate-fade-in">
      
      {/* Header Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Store color="var(--accent-teal-bright)" size={26} />
            Fellowship Business Showcase Feed
            {loading ? (
              <span className="skeleton-box" style={{ width: '70px', height: '24px', borderRadius: '9999px' }} />
            ) : (
              <span className="badge badge-gold">{validShowcases.length} Posts</span>
            )}
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Men promoting their businesses, professional services, products, and community initiatives.
          </p>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <PlusCircle size={18} />
          Create Showcase Post
        </button>
      </div>

      {/* Success Notification Banner */}
      {successNotice && (
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
              <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.95rem' }}>Listing Published Successfully!</strong>
              <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>{successNotice}</span>
            </div>
          </div>
          <button
            onClick={() => setSuccessNotice(null)}
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
            title="Dismiss notification"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Search Input */}
      <div style={{ marginBottom: '24px', position: 'relative' }}>
        <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          className="input-field"
          placeholder="Search showcases by business name, keywords, category, or owner..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ paddingLeft: '42px' }}
        />
      </div>

      {/* Showcase Cards Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '24px' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={`skel-showcase-${i}`} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="skeleton-box" style={{ height: '160px', width: '100%', borderRadius: 'var(--radius-sm)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="skeleton-box" style={{ width: '80px', height: '22px', borderRadius: '9999px' }} />
                <div className="skeleton-box" style={{ width: '60px', height: '14px', borderRadius: '4px' }} />
              </div>
              <div className="skeleton-box" style={{ width: '75%', height: '22px', borderRadius: '4px' }} />
              <div className="skeleton-box" style={{ width: '90%', height: '14px', borderRadius: '4px' }} />
              <div className="skeleton-box" style={{ width: '60%', height: '14px', borderRadius: '4px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: '12px' }}>
                <div className="skeleton-box" style={{ width: '50px', height: '20px', borderRadius: '4px' }} />
                <div className="skeleton-box" style={{ width: '90px', height: '20px', borderRadius: '4px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filteredShowcases.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <Store size={48} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '6px' }}>No Showcase Posts Found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Be the first brother to showcase a business or product!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '24px' }}>
          {filteredShowcases.map((post) => (
            <div
              key={post.id}
              className="glass-card"
              style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}
              onClick={() => setSelectedPost(post)}
            >
              
              {/* Media Preview if exists */}
              {post.imageUrl && (
                <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', height: '180px', margin: '-20px -20px 0 -20px', borderBottom: '1px solid var(--glass-border)' }}>
                  <img src={post.imageUrl} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="badge badge-teal">{post.category}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(post.createdAt).toLocaleDateString()}</span>
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>{post.title}</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--accent-teal-bright)', fontWeight: 600, marginBottom: '10px' }}>By: {post.authorName}</p>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {post.description}
                </p>
              </div>

              {/* Card Footer Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: '12px' }}>
                <button
                  onClick={(e) => handleQuickLike(e, post.id)}
                  style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  <Heart size={16} fill="#f43f5e" /> {post.likes}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MessageSquare size={16} /> {post.commentsCount || 0} Comments
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-teal-bright)' }}>
                    View Post <ExternalLink size={14} />
                  </span>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Detail & Comment Modal */}
      <PostDetailModal
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        onPostUpdated={onRefreshShowcases}
      />

      {/* Create Showcase Post Modal */}
      <ShowcaseFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPostCreated={handlePostCreated}
        members={members}
      />

    </section>
  );
}
