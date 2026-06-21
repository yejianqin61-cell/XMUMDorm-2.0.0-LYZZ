import { createElement, lazy, Suspense } from 'react';
import { Route, Navigate } from 'react-router-dom';
import TreeHole from '../pages/TreeHole';
import SquareHome from '../pages/SquareHome';
import MyZone from '../pages/MyZone';
import CanteenHome from '../pages/CanteenHome';

const PostNew = lazy(() => import('../pages/PostNew'));
const PostDetail = lazy(() => import('../pages/PostDetail'));
const PostSearch = lazy(() => import('../pages/PostSearch'));
const PostTagFeed = lazy(() => import('../pages/PostTagFeed'));
const AboutUs = lazy(() => import('../pages/AboutUs'));
const SquareTrendingList = lazy(() => import('../pages/SquareTrendingList'));
const SquareTrendingDetail = lazy(() => import('../pages/SquareTrendingDetail'));
const SquareTrendingPostNew = lazy(() => import('../pages/SquareTrendingPostNew'));
const SquareTrendingPostDetail = lazy(() => import('../pages/SquareTrendingPostDetail'));
const SquareCampusPostNew = lazy(() => import('../pages/SquareCampusPostNew'));
const SquareCampusPostDetail = lazy(() => import('../pages/SquareCampusPostDetail'));
const SquareOrgAdmin = lazy(() => import('../pages/SquareOrgAdmin'));
const AboutTeam = lazy(() => import('../pages/AboutTeam'));
const AboutThanks = lazy(() => import('../pages/AboutThanks'));
const AboutEditorNote = lazy(() => import('../pages/AboutEditorNote'));
const AboutAlgorithm = lazy(() => import('../pages/AboutAlgorithm'));
const AboutLevelAlgorithm = lazy(() => import('../pages/AboutLevelAlgorithm'));
const AboutProfile = lazy(() => import('../pages/AboutProfile'));
const SquareClub = lazy(() => import('../pages/SquareClub'));
const SquareSecondHand = lazy(() => import('../pages/SquareSecondHand'));
const MarketplaceDetail = lazy(() => import('../pages/Marketplace/MarketplaceDetail'));
const MarketplacePublish = lazy(() => import('../pages/Marketplace/MarketplacePublish'));
const MarketplaceMyWants = lazy(() => import('../pages/Marketplace/MarketplaceMyWants'));
const MarketplaceChat = lazy(() => import('../pages/Marketplace/MarketplaceChat'));
const SquareFreshmanGuide = lazy(() => import('../pages/SquareFreshmanGuide'));
const SquareErrands = lazy(() => import('../pages/SquareErrands'));
const ClubProfile = lazy(() => import('../pages/Clubs/ClubProfile'));
const ClubMembersPage = lazy(() => import('../pages/Clubs/ClubMembersPage'));
const ActivityDetail = lazy(() => import('../pages/Clubs/ActivityDetail'));
const ClubPostDetail = lazy(() => import('../pages/Clubs/ClubPostDetail'));
const PublishClubPost = lazy(() => import('../pages/Clubs/PublishClubPost'));
const ClubListPage = lazy(() => import('../pages/Clubs/ClubListPage'));
const MyClubs = lazy(() => import('../pages/Clubs/MyClubs'));
const PublishActivity = lazy(() => import('../pages/Clubs/PublishActivity'));
const CreateClub = lazy(() => import('../pages/Clubs/CreateClub'));
const ErrandDetail = lazy(() => import('../pages/Errands/ErrandDetail'));
const PublishErrand = lazy(() => import('../pages/Errands/PublishErrand'));
const HandbookArticleDetail = lazy(() => import('../pages/Handbook/HandbookArticleDetail'));
const HandbookEditor = lazy(() => import('../pages/Handbook/HandbookEditor'));
const HandbookMe = lazy(() => import('../pages/Handbook/HandbookMe'));
const CourseReviewPage = lazy(() => import('../pages/Handbook/CourseReviewPage'));
const CourseReviewDetail = lazy(() => import('../pages/Handbook/CourseReviewDetail'));
const CourseReviewCreate = lazy(() => import('../pages/Handbook/CourseReviewCreate'));
const Schedule = lazy(() => import('../pages/Schedule'));
const Diary = lazy(() => import('../pages/Diary'));
const TodoList = lazy(() => import('../pages/TodoList'));
const Disclaimer = lazy(() => import('../pages/Disclaimer'));
const ContactUs = lazy(() => import('../pages/ContactUs'));
const UserZone = lazy(() => import('../pages/UserZone'));
const MyPosts = lazy(() => import('../pages/MyPosts'));
const MyReviews = lazy(() => import('../pages/MyReviews'));
const ProfileEdit = lazy(() => import('../pages/ProfileEdit'));
const Mailbox = lazy(() => import('../pages/Mailbox'));
const CanteenArea = lazy(() => import('../pages/CanteenArea'));
const CanteenBannerManage = lazy(() => import('../pages/CanteenBannerManage'));
const CanteenSearch = lazy(() => import('../pages/CanteenSearch'));
const MerchantList = lazy(() => import('../pages/MerchantList'));
const AreaProductRanking = lazy(() => import('../pages/AreaProductRanking'));
const FoodList = lazy(() => import('../pages/FoodList'));
const FoodShopHot = lazy(() => import('../pages/FoodShopHot'));
const FoodDetail = lazy(() => import('../pages/FoodDetail'));
const FoodReviewPublish = lazy(() => import('../pages/FoodReviewPublish'));
const StoreCreate = lazy(() => import('../pages/StoreCreate'));
const FoodManage = lazy(() => import('../pages/FoodManage'));
const FoodCreate = lazy(() => import('../pages/FoodCreate'));
const MerchantFoodDetail = lazy(() => import('../pages/MerchantFoodDetail'));
const MerchantShopEdit = lazy(() => import('../pages/MerchantShopEdit'));
const Rankings = lazy(() => import('../pages/Rankings'));

function renderLazyRoute(Component) {
  return (
    <Suspense fallback={<div className="state-loading route-loading">Loading...</div>}>
      {createElement(Component)}
    </Suspense>
  );
}

/** Layout 下的子路由配置，供 App 与 Layout 四格常驻挂载共用 */
export const layoutRoutes = (
  <>
    <Route index element={<Navigate to="/about" replace />} />
    <Route path="treehole" element={<TreeHole />} />
    <Route path="post/new" element={renderLazyRoute(PostNew)} />
    <Route path="post/:id" element={renderLazyRoute(PostDetail)} />
    <Route path="posts/search" element={renderLazyRoute(PostSearch)} />
    <Route path="posts/tag/:slug" element={renderLazyRoute(PostTagFeed)} />
    <Route path="about" element={<SquareHome />} />
    <Route path="about/map" element={renderLazyRoute(AboutUs)} />
    <Route path="about/thanks" element={renderLazyRoute(AboutThanks)} />
    <Route path="about/profile" element={renderLazyRoute(AboutProfile)} />
    {/* 兼容旧路径：原本挂在 /about 下会导致 Tab 误高亮到“广场” */}
    <Route path="about/schedule" element={<Navigate to="/myzone/schedule" replace />} />
    <Route path="about/team" element={renderLazyRoute(AboutTeam)} />
    <Route path="about/editor-note" element={renderLazyRoute(AboutEditorNote)} />
    <Route path="about/algorithm" element={renderLazyRoute(AboutAlgorithm)} />
    <Route path="about/level-algorithm" element={renderLazyRoute(AboutLevelAlgorithm)} />
    <Route path="about/diary" element={<Navigate to="/myzone/diary" replace />} />
    <Route path="about/disclaimer" element={renderLazyRoute(Disclaimer)} />
    <Route path="about/contact" element={renderLazyRoute(ContactUs)} />
    <Route path="about/club" element={renderLazyRoute(SquareClub)} />
    <Route path="about/club/list" element={renderLazyRoute(ClubListPage)} />
    <Route path="about/club/my" element={renderLazyRoute(MyClubs)} />
    <Route path="about/club/new" element={renderLazyRoute(CreateClub)} />
    <Route path="about/club/:id/members" element={renderLazyRoute(ClubMembersPage)} />
    <Route path="about/club/:id" element={renderLazyRoute(ClubProfile)} />
    <Route path="about/club/activity/:id" element={renderLazyRoute(ActivityDetail)} />
    <Route path="about/club/post/new" element={renderLazyRoute(PublishClubPost)} />
    <Route path="about/club/post/:id" element={renderLazyRoute(ClubPostDetail)} />
    <Route path="about/club/activity/new" element={renderLazyRoute(PublishActivity)} />
    <Route path="about/second-hand" element={renderLazyRoute(SquareSecondHand)} />
    <Route path="about/second-hand/new" element={renderLazyRoute(MarketplacePublish)} />
    <Route path="about/second-hand/me/wants" element={renderLazyRoute(MarketplaceMyWants)} />
    <Route path="about/second-hand/chat/:threadId" element={renderLazyRoute(MarketplaceChat)} />
    <Route path="about/second-hand/item/:id" element={renderLazyRoute(MarketplaceDetail)} />
    <Route path="about/second-hand/item/:id/edit" element={renderLazyRoute(MarketplacePublish)} />
    <Route path="about/trending" element={renderLazyRoute(SquareTrendingList)} />
    <Route path="about/trending/:id" element={renderLazyRoute(SquareTrendingDetail)} />
    <Route path="about/trending/:id/new" element={renderLazyRoute(SquareTrendingPostNew)} />
    <Route path="about/trending/post/:id" element={renderLazyRoute(SquareTrendingPostDetail)} />
    <Route path="about/campus/new" element={renderLazyRoute(SquareCampusPostNew)} />
    <Route path="about/campus/:id" element={renderLazyRoute(SquareCampusPostDetail)} />
    <Route path="about/admin/orgs" element={renderLazyRoute(SquareOrgAdmin)} />
    <Route path="about/freshman-guide" element={renderLazyRoute(SquareFreshmanGuide)} />
    <Route path="about/freshman-guide/me" element={renderLazyRoute(HandbookMe)} />
    <Route path="about/freshman-guide/new" element={renderLazyRoute(HandbookEditor)} />
    <Route path="about/freshman-guide/a/:id" element={renderLazyRoute(HandbookArticleDetail)} />
    <Route path="about/freshman-guide/course-review" element={renderLazyRoute(CourseReviewPage)} />
    <Route path="about/freshman-guide/course-review/new" element={renderLazyRoute(CourseReviewCreate)} />
    <Route path="about/freshman-guide/course-review/:id/edit" element={renderLazyRoute(CourseReviewCreate)} />
    <Route path="about/freshman-guide/course-review/:id" element={renderLazyRoute(CourseReviewDetail)} />
    <Route path="about/errands" element={renderLazyRoute(SquareErrands)} />
    <Route path="about/errands/new" element={renderLazyRoute(PublishErrand)} />
    <Route path="about/errands/:id" element={renderLazyRoute(ErrandDetail)} />
    <Route path="myzone" element={<MyZone />} />
    <Route path="user/:id" element={renderLazyRoute(UserZone)} />
    <Route path="myzone/posts" element={renderLazyRoute(MyPosts)} />
    <Route path="myzone/reviews" element={renderLazyRoute(MyReviews)} />
    <Route path="myzone/profile" element={renderLazyRoute(ProfileEdit)} />
    <Route path="myzone/schedule" element={renderLazyRoute(Schedule)} />
    <Route path="myzone/todos" element={renderLazyRoute(TodoList)} />
    <Route path="myzone/diary" element={renderLazyRoute(Diary)} />
    <Route path="mailbox" element={renderLazyRoute(Mailbox)} />
    <Route path="eat" element={<CanteenHome />} />
    <Route path="eat/map" element={renderLazyRoute(CanteenArea)} />
    <Route path="eat/search" element={renderLazyRoute(CanteenSearch)} />
    <Route path="eat/banners" element={renderLazyRoute(CanteenBannerManage)} />
    <Route path="eat/rankings" element={renderLazyRoute(Rankings)} />
    <Route path="eat/:area/ranking" element={renderLazyRoute(AreaProductRanking)} />
    <Route path="eat/:area" element={renderLazyRoute(MerchantList)} />
    <Route path="eat/merchant/:id" element={renderLazyRoute(FoodList)} />
    <Route path="eat/merchant/:id/hot" element={renderLazyRoute(FoodShopHot)} />
    <Route path="eat/food/:id" element={renderLazyRoute(FoodDetail)} />
    <Route path="eat/food/:id/review" element={renderLazyRoute(FoodReviewPublish)} />
    <Route path="merchant/create" element={renderLazyRoute(StoreCreate)} />
    <Route path="merchant/manage" element={renderLazyRoute(FoodManage)} />
    <Route path="merchant/shop/edit" element={renderLazyRoute(MerchantShopEdit)} />
    <Route path="merchant/food/new" element={renderLazyRoute(FoodCreate)} />
    <Route path="merchant/food/:id" element={renderLazyRoute(MerchantFoodDetail)} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </>
);
