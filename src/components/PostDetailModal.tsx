import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageSquare, Send, Heart, User, Clock, Loader2 } from 'lucide-react';
import { ShowcasePost, ShowcaseComment } from '../types';
import { fetchComments, createComment, likeShowcasePost } from '../services/api';

interface PostDetailModalProps {
  post: ShowcasePost | null;
  onClose: () => void;
  onPostUpdated: () => void;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({ post, onClose, onPostUpdated }) => {
  const [comments, setComments] = useState<ShowcaseComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [likes, setLikes] = useState(0);

  useEffect(() => {
    if (post) {
      setLikes(post.likes);
      loadComments(post.id);
    }
  }, [post]);

  const loadComments = async (postId: string) => {
    setLoadingComments(true);
    try {
      const data = await fetchComments(postId);
      setComments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleLike = async () => {
    if (!post) return;
    try {
      const res = await likeShowcasePost(post.id);
      setLikes(res.likes);
      onPostUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !authorName.trim() || !commentText.trim()) return;

    setSubmitting(true);
    try {
      const newComment = await createComment(post.id, authorName, commentText);
      setComments([newComment, ...comments]);
      setCommentText('');
      onPostUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!post) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          overflow: 'hidden',
          background: 'var(--modal-card-bg)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface-raised)' }}>
          <div>
            <span className="badge badge-teal" style={{ marginBottom: '6px' }}>{post.category}</span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>{post.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <User size={14} color="var(--accent-teal)" /> {post.authorName}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={14} /> {new Date(post.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Post Image */}
          {post.imageUrl && (
            <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', maxHeight: '280px', border: '1px solid var(--glass-border)' }}>
              <img src={post.imageUrl} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}

          {/* Post Description */}
          <div>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>ABOUT THIS BUSINESS / SHOWCASE</h4>
            <p style={{ color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{post.description}</p>
          </div>

          {/* Post Actions & WhatsApp Contact */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
            <button onClick={handleLike} className="btn-secondary" style={{ color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.3)' }}>
              <Heart size={18} fill="#f43f5e" />
              <span>{likes} Appreciations</span>
            </button>

            {post.whatsappContact && (
              <a
                href={`https://wa.me/${post.whatsappContact.replace(/[^\d]/g, '')}?text=Hello%20${encodeURIComponent(post.authorName)},%20I%20saw%20your%20showcase%20post%20on%20LICC%20Men%20Fellowship%20app.`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ background: '#25D366', color: '#ffffff' }}
              >
                <MessageSquare size={18} /> Contact via WhatsApp
              </a>
            )}
          </div>

          {/* Comments Section */}
          <div style={{ marginTop: '12px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} color="var(--accent-teal-bright)" />
              Comments & Networking ({comments.length})
            </h3>

            {/* Comment Form */}
            <form onSubmit={handleCommentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Your Name (e.g. Bro. Emmanuel)"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                required
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Write a comment or query..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  required
                />
                <button type="submit" className="btn-primary" disabled={submitting} style={{ padding: '12px 18px' }}>
                  {submitting ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                </button>
              </div>
            </form>

            {/* Comments List */}
            {loadingComments ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>Loading comments from Excel database...</div>
            ) : comments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontStyle: 'italic' }}>No comments yet. Be the first to leave a comment!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {comments.map((c) => (
                  <div key={c.id} style={{ background: 'var(--bg-surface-subtle)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--accent-teal-bright)' }}>{c.authorName}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{c.commentText}</p>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>
      </div>
    </div>,
    document.body
  );
};
