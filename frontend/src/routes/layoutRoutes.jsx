import { Route, Navigate } from 'react-router-dom';
import TreeHole from '../pages/TreeHole';
import PostNew from '../pages/PostNew';
import PostDetail from '../pages/PostDetail';
import PostSearch from '../pages/PostSearch';
import PostTagFeed from '../pages/PostTagFeed';
import AboutUs from '../pages/AboutUs';
import AboutTeam from '../pages/AboutTeam';
import AboutThanks from '../pages/AboutThanks';
import AboutEditorNote from '../pages/AboutEditorNote';
import AboutAlgorithm from '../pages/AboutAlgorithm';
import AboutProfile from '../pages/AboutProfile';
import SquareClub from '../pages/SquareClub';
import SquareSecondHand from '../pages/SquareSecondHand';
import MarketplaceDetail from '../pages/Marketplace/MarketplaceDetail';
import MarketplacePublish from '../pages/Marketplace/MarketplacePublish';
import SquareTrending from '../pages/SquareTrending';
import SquareFreshmanGuide from '../pages/SquareFreshmanGuide';
import SquareErrands from '../pages/SquareErrands';
import HandbookArticleDetail from '../pages/Handbook/HandbookArticleDetail';
import HandbookEditor from '../pages/Handbook/HandbookEditor';
import HandbookMe from '../pages/Handbook/HandbookMe';
import CourseReviewPage from '../pages/Handbook/CourseReviewPage';
import CourseReviewDetail from '../pages/Handbook/CourseReviewDetail';
import CourseReviewCreate from '../pages/Handbook/CourseReviewCreate';
import Schedule from '../pages/Schedule';
import Diary from '../pages/Diary';
import Disclaimer from '../pages/Disclaimer';
import ContactUs from '../pages/ContactUs';
import MyZone from '../pages/MyZone';
import UserZone from '../pages/UserZone';
import MyPosts from '../pages/MyPosts';
import MyReviews from '../pages/MyReviews';
import ProfileEdit from '../pages/ProfileEdit';
import Mailbox from '../pages/Mailbox';
import CanteenArea from '../pages/CanteenArea';
import MerchantList from '../pages/MerchantList';
import AreaProductRanking from '../pages/AreaProductRanking';
import FoodList from '../pages/FoodList';
import FoodShopHot from '../pages/FoodShopHot';
import FoodDetail from '../pages/FoodDetail';
import FoodReviewPublish from '../pages/FoodReviewPublish';
import StoreCreate from '../pages/StoreCreate';
import FoodManage from '../pages/FoodManage';
import FoodCreate from '../pages/FoodCreate';
import MerchantFoodDetail from '../pages/MerchantFoodDetail';
import MerchantShopEdit from '../pages/MerchantShopEdit';
import Rankings from '../pages/Rankings';

/** Layout 下的子路由配置，供 App 与 Layout 四格常驻挂载共用 */
export const layoutRoutes = (
  <>
    <Route index element={<TreeHole />} />
    <Route path="post/new" element={<PostNew />} />
    <Route path="post/:id" element={<PostDetail />} />
    <Route path="posts/search" element={<PostSearch />} />
    <Route path="posts/tag/:slug" element={<PostTagFeed />} />
    <Route path="about" element={<AboutUs />} />
    <Route path="about/thanks" element={<AboutThanks />} />
    <Route path="about/profile" element={<AboutProfile />} />
    {/* 兼容旧路径：原本挂在 /about 下会导致 Tab 误高亮到“广场” */}
    <Route path="about/schedule" element={<Navigate to="/myzone/schedule" replace />} />
    <Route path="about/team" element={<AboutTeam />} />
    <Route path="about/editor-note" element={<AboutEditorNote />} />
    <Route path="about/algorithm" element={<AboutAlgorithm />} />
    <Route path="about/diary" element={<Navigate to="/myzone/diary" replace />} />
    <Route path="about/disclaimer" element={<Disclaimer />} />
    <Route path="about/contact" element={<ContactUs />} />
    <Route path="about/club" element={<SquareClub />} />
    <Route path="about/second-hand" element={<SquareSecondHand />} />
    <Route path="about/second-hand/new" element={<MarketplacePublish />} />
    <Route path="about/second-hand/item/:id" element={<MarketplaceDetail />} />
    <Route path="about/second-hand/item/:id/edit" element={<MarketplacePublish />} />
    <Route path="about/trending" element={<SquareTrending />} />
    <Route path="about/freshman-guide" element={<SquareFreshmanGuide />} />
    <Route path="about/freshman-guide/me" element={<HandbookMe />} />
    <Route path="about/freshman-guide/new" element={<HandbookEditor />} />
    <Route path="about/freshman-guide/a/:id" element={<HandbookArticleDetail />} />
    <Route path="about/freshman-guide/course-review" element={<CourseReviewPage />} />
    <Route path="about/freshman-guide/course-review/new" element={<CourseReviewCreate />} />
    <Route path="about/freshman-guide/course-review/:id/edit" element={<CourseReviewCreate />} />
    <Route path="about/freshman-guide/course-review/:id" element={<CourseReviewDetail />} />
    <Route path="about/errands" element={<SquareErrands />} />
    <Route path="myzone" element={<MyZone />} />
    <Route path="user/:id" element={<UserZone />} />
    <Route path="myzone/posts" element={<MyPosts />} />
    <Route path="myzone/reviews" element={<MyReviews />} />
    <Route path="myzone/profile" element={<ProfileEdit />} />
    <Route path="myzone/schedule" element={<Schedule />} />
    <Route path="myzone/diary" element={<Diary />} />
    <Route path="mailbox" element={<Mailbox />} />
    <Route path="eat" element={<CanteenArea />} />
    <Route path="eat/rankings" element={<Rankings />} />
    <Route path="eat/:area/ranking" element={<AreaProductRanking />} />
    <Route path="eat/:area" element={<MerchantList />} />
    <Route path="eat/merchant/:id" element={<FoodList />} />
    <Route path="eat/merchant/:id/hot" element={<FoodShopHot />} />
    <Route path="eat/food/:id" element={<FoodDetail />} />
    <Route path="eat/food/:id/review" element={<FoodReviewPublish />} />
    <Route path="merchant/create" element={<StoreCreate />} />
    <Route path="merchant/manage" element={<FoodManage />} />
    <Route path="merchant/shop/edit" element={<MerchantShopEdit />} />
    <Route path="merchant/food/new" element={<FoodCreate />} />
    <Route path="merchant/food/:id" element={<MerchantFoodDetail />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </>
);
