import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, Search, Menu, X, User, LogOut, Plus, MessageSquare, Settings, Shield } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore.js';
import { cn } from '../lib/utils.js';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/services?keyword=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="font-serif text-xl font-bold gradient-text">时间银行</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-neutral-700 hover:text-primary-600 font-medium transition-colors">
              首页
            </Link>
            <Link to="/services" className="text-neutral-700 hover:text-primary-600 font-medium transition-colors">
              服务广场
            </Link>
            {isAuthenticated && (
              <Link
                to="/publish"
                className="flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                发布
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                searchOpen ? 'bg-primary-100 text-primary-600' : 'text-neutral-600 hover:bg-neutral-100'
              )}
            >
              <Search className="w-5 h-5" />
            </button>

            {isAuthenticated ? (
              <>
                <Link
                  to="/messages"
                  className="hidden md:flex p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors relative"
                >
                  <MessageSquare className="w-5 h-5" />
                </Link>

                <div className="relative group">
                  <button className="flex items-center gap-2 p-1 rounded-full hover:bg-neutral-100 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white font-medium text-sm">
                      {user?.username?.charAt(0)}
                    </div>
                    <span className="hidden md:block text-sm font-medium text-neutral-700">
                      {user?.timeBalance}h
                    </span>
                  </button>

                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-neutral-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="px-4 py-2 border-b border-neutral-100">
                      <p className="font-medium text-neutral-800">{user?.username}</p>
                      <p className="text-sm text-neutral-500">时间余额: {user?.timeBalance}小时</p>
                    </div>
                    <Link
                      to="/profile"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      <User className="w-4 h-4" />
                      个人中心
                    </Link>
                    {user?.isAdmin && (
                      <Link
                        to="/admin"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                      >
                        <Shield className="w-4 h-4" />
                        管理后台
                      </Link>
                    )}
                    <Link
                      to="/profile/transactions"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      <Clock className="w-4 h-4" />
                      交易记录
                    </Link>
                    <Link
                      to="/profile/settings"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      账户设置
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      退出登录
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-neutral-700 hover:text-primary-600 font-medium transition-colors"
                >
                  登录
                </Link>
                <Link to="/register" className="btn btn-primary text-sm">
                  注册
                </Link>
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="py-4 border-t border-neutral-100 animate-fade-in">
            <form onSubmit={handleSearch} className="flex gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索服务或需求..."
                className="input flex-1"
                autoFocus
              />
              <button type="submit" className="btn btn-primary">
                搜索
              </button>
            </form>
          </div>
        )}

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-neutral-100 animate-fade-in">
            <div className="flex flex-col gap-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 text-neutral-700 hover:bg-neutral-50 rounded-lg font-medium transition-colors"
              >
                首页
              </Link>
              <Link
                to="/services"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 text-neutral-700 hover:bg-neutral-50 rounded-lg font-medium transition-colors"
              >
                服务广场
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/publish"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 text-primary-600 hover:bg-primary-50 rounded-lg font-medium transition-colors"
                  >
                    发布帖子
                  </Link>
                  <Link
                    to="/messages"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 text-neutral-700 hover:bg-neutral-50 rounded-lg font-medium transition-colors"
                  >
                    消息中心
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 text-neutral-700 hover:bg-neutral-50 rounded-lg font-medium transition-colors"
                  >
                    个人中心
                  </Link>
                  {user?.isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-4 py-3 text-neutral-700 hover:bg-neutral-50 rounded-lg font-medium transition-colors"
                    >
                      管理后台
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                  >
                    退出登录
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 text-neutral-700 hover:bg-neutral-50 rounded-lg font-medium transition-colors"
                  >
                    登录
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 text-center btn btn-primary rounded-lg"
                  >
                    注册账户
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
