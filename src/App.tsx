import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from 'react';
import Home from "@/pages/Home";
import Register from "@/pages/Register";
import Login from "@/pages/Login";
import ServicesList from "@/pages/ServicesList";
import PostDetail from "@/pages/PostDetail";
import Admin from "@/pages/Admin";
import Publish from "@/pages/Publish";
import Messages from "@/pages/Messages";
import ServiceConfirm from "@/pages/ServiceConfirm";
import Profile from "@/pages/Profile";
import Navbar from "@/components/Navbar";
import { useAuthStore } from "@/store/useAuthStore.js";

function AppContent() {
  const { checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      <main className="page-container pb-12">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/services" element={<ServicesList />} />
          <Route path="/services/:id" element={<PostDetail />} />
          <Route path="/publish" element={<Publish />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:id" element={<Messages />} />
          <Route path="/service-confirm/:postId" element={<ServiceConfirm />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/transactions" element={<Profile />} />
          <Route path="/profile/reviews" element={<Profile />} />
          <Route path="/profile/settings" element={<Profile />} />
        </Routes>
      </main>
      <footer className="bg-white border-t border-neutral-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-neutral-500 text-sm">
            <p className="font-serif text-lg font-semibold text-neutral-700 mb-2">社区互助时间银行</p>
            <p>让时间成为有价值的社区货币，共建温暖互助的社区</p>
            <p className="mt-2">© {new Date().getFullYear()} 时间银行. 保留所有权利.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
