import { useAuth } from '../context/AuthContextState';
import { useLanguage } from '../context/LanguageContextState';
import { getMyPosts } from '@shared/api/users';
import PostCard from '../components/PostCard';
import MyContentPage from '../components/MyContentPage';
export default function MyPosts() {
  const { user } = useAuth();
  const { isZh } = useLanguage();
  return <MyContentPage kind="posts" title={isZh ? '我的帖子' : 'My posts'} load={getMyPosts}
    emptyTitle={isZh ? '暂无帖子' : 'No posts yet'} actionLabel={isZh ? '去写帖子' : 'Write a post'} actionTo="/post/new"
    renderItem={post => <PostCard post={{ ...post, author: user }} />} />;
}
