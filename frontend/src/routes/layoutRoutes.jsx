import { Route, Navigate } from 'react-router-dom';
import TreeHole from '../pages/TreeHole';
import PostNew from '../pages/PostNew';
import PostDetail from '../pages/PostDetail';
import AboutUs from '../pages/AboutUs';
import AboutTeam from '../pages/AboutTeam';
import MyZone from '../pages/MyZone';
import MyPosts from '../pages/MyPosts';
import MyReviews from '../pages/MyReviews';
import ProfileEdit from '../pages/ProfileEdit';
import Mailbox from '../pages/Mailbox';
import CanteenArea from '../pages/CanteenArea';
import MerchantList from '../pages/MerchantList';
import FoodList from '../pages/FoodList';
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
    <Route path="about" element={<AboutUs />} />
    <Route path="about/team" element={<AboutTeam />} />
    <Route path="myzone" element={<MyZone />} />
    <Route path="myzone/posts" element={<MyPosts />} />
    <Route path="myzone/reviews" element={<MyReviews />} />
    <Route path="myzone/profile" element={<ProfileEdit />} />
    <Route path="mailbox" element={<Mailbox />} />
    <Route path="eat" element={<CanteenArea />} />
    <Route path="eat/rankings" element={<Rankings />} />
    <Route path="eat/:area" element={<MerchantList />} />
    <Route path="eat/merchant/:id" element={<FoodList />} />
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
