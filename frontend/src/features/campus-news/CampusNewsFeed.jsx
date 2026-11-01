import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContextState';
import CampusNewsCard from './CampusNewsCard';
import { campusNewsPreviewPath, useCampusNewsInteraction, captureCampusNewsScroll, restoreCampusNewsScroll } from './campusNewsSession';
import './CampusNews.css';

function FeedItem({ post }) {
  const navigate = useNavigate();
  const interaction = useCampusNewsInteraction(post);
  return <CampusNewsCard post={post} {...interaction} onOpen={() => { captureCampusNewsScroll(); navigate(post.detailPath || campusNewsPreviewPath(post.id), { state: { fromCampusNews: true } }); }} />;
}

export default function CampusNewsFeed({ posts, hasMore = false }) {
  const { lang } = useLanguage();
  const en = lang === 'en';
  useEffect(() => {
    const frame = requestAnimationFrame(restoreCampusNewsScroll);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <section className="campus-news" aria-labelledby="campus-news-heading">
      <header className="campus-news-heading">
        <div><span className="campus-news-heading__eyebrow">XMUM DORM / CAMPUS</span><h2 id="campus-news-heading">{en ? 'Campus news' : '校园快讯'}</h2></div>
      </header>
      {posts.length ? posts.map((post) => <FeedItem key={post.id} post={post} />)
        : <p className="campus-news-empty">{en ? 'No campus news yet.' : '暂时没有校园快讯。'}</p>}
      {!hasMore && <footer className="campus-news-end">{en ? 'No more campus news' : '暂时没有更多快讯'}</footer>}
    </section>
  );
}
