import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPostsByAuthorId } from '../data/mockPosts';
import PostCard from '../components/PostCard';
import './MyPosts.css';

/** 我的帖子列表，点击进入帖子详情 */
function MyPosts() {
  const { user, isLoggedIn } = useAuth();
  const myPosts = isLoggedIn && user?.id ? getPostsByAuthorId(user.id) : [];

  return (
    <div className="myposts-page">
      {myPosts.length === 0 ? (
        <p className="myposts-empty">暂无帖子，去首页发一条吧 No posts yet. Post one on the home feed.</p>
      ) : (
        <ul className="myposts-list">
          {myPosts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MyPosts;
