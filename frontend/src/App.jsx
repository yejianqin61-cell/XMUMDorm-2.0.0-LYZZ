import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import TreeHole from './pages/TreeHole';
import PostNew from './pages/PostNew';
import PostDetail from './pages/PostDetail';
import Eat from './pages/Eat';
import AboutUs from './pages/AboutUs';
import MyZone from './pages/MyZone';
import MyPosts from './pages/MyPosts';
import MyReviews from './pages/MyReviews';
import ProfileEdit from './pages/ProfileEdit';
import Mailbox from './pages/Mailbox';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <AuthGuard>
                <Layout />
              </AuthGuard>
            }
          >
            <Route index element={<TreeHole />} />
            <Route path="post/new" element={<PostNew />} />
            <Route path="post/:id" element={<PostDetail />} />
            <Route path="eat" element={<Eat />} />
            <Route path="about" element={<AboutUs />} />
            <Route path="myzone" element={<MyZone />} />
            <Route path="myzone/posts" element={<MyPosts />} />
            <Route path="myzone/reviews" element={<MyReviews />} />
            <Route path="myzone/profile" element={<ProfileEdit />} />
            <Route path="mailbox" element={<Mailbox />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
