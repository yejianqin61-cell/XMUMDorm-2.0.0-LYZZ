import { Outlet, useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import TabBar from './TabBar';
import { TABS } from './TabBar';
import './TopBar.css';
import './TabBar.css';
import './Layout.css';

/** 顶栏标题：中英并列（XMUM Dorm 厦马小筑） */
const TITLE_BY_PATH = {
  '/': '厦马小筑 XMUM Dorm',
  '/eat': '食堂 Eat',
  '/about': '关于我们 About us',
  '/myzone': '我的 My Zone',
  '/mailbox': '信箱 Mailbox',
  '/post/new': '发布帖子 Post',
  '/myzone/posts': '我的帖子 My Posts',
  '/myzone/reviews': '我的点评 My Reviews',
  '/myzone/profile': '修改资料 Profile',
};

/** 需要显示返回键的路径（含 /post/:id 详情页） */
const SHOW_BACK_PATHS = ['/post/new', '/post/'];

/** 整体布局：顶栏（标题+信箱）+ 内容区 + 底部 Tab */
function Layout() {
  const location = useLocation();
  const pathname = location.pathname;
  let title = TITLE_BY_PATH[pathname];
  if (!title) {
    if (pathname.startsWith('/eat')) title = '食堂 Eat';
    else if (pathname.startsWith('/mailbox')) title = '信箱 Mailbox';
    else if (pathname === '/post/new') title = '发布帖子 Post';
    else if (pathname.startsWith('/post/')) title = '帖子详情 Post';
    else if (pathname === '/myzone/posts') title = '我的帖子 My Posts';
    else if (pathname === '/myzone/reviews') title = '我的点评 My Reviews';
    else if (pathname === '/myzone/profile') title = '修改资料 Profile';
    else title = '厦马小筑 XMUM Dorm';
  }
  const showBack =
    pathname.startsWith('/post/') ||
    pathname === '/myzone/posts' ||
    pathname === '/myzone/reviews' ||
    pathname === '/myzone/profile';

  return (
    <div className="app-layout">
      <TopBar title={title} showBack={showBack} />
      <main className="app-main">
        <div className="app-main-bg" aria-hidden="true" />
        <div className="app-main-inner">
          <Outlet />
        </div>
      </main>
      <TabBar />
    </div>
  );
}

export default Layout;
