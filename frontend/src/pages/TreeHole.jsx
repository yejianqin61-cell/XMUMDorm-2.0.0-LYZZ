import { useState } from 'react';
import { Link } from 'react-router-dom';
import PostCard from '../components/PostCard';
import { MOCK_POSTS } from '../data/mockPosts';
import './TreeHole.css';

function TreeHole() {
  const [posts] = useState(MOCK_POSTS);
  const leftColumn = posts.filter((_, i) => i % 2 === 0);
  const rightColumn = posts.filter((_, i) => i % 2 === 1);

  return (
    <div className="treehole-page">
      <div className="treehole-content">
        <div className="treehole-grid">
          <div className="treehole-column">
            {leftColumn.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          <div className="treehole-column treehole-column-right">
            {rightColumn.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      </div>
      <Link to="/post/new" className="treehole-fab" aria-label="发布帖子 Post">
        <PlusIcon />
      </Link>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default TreeHole;
