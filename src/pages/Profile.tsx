import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User as UserIcon,
  CreditCard,
  Clock,
  Star,
  TrendingUp,
  TrendingDown,
  Wallet,
  Filter,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  Phone,
  Lock,
  Save,
  Loader2,
  FileText,
  Settings as SettingsIcon,
  LayoutDashboard,
  ArrowLeftRight,
  MessageSquare,
  Inbox,
  Send,
} from 'lucide-react';
import { transactionsApi, usersApi } from '../lib/api.js';
import { useAuthStore } from '../store/useAuthStore.js';
import PostCard from '../components/PostCard.js';
import Empty from '../components/Empty.js';
import { cn } from '../lib/utils.js';
import type { Post, Transaction, User } from '../../shared/types.js';

type TabType = 'overview' | 'posts' | 'transactions' | 'reviews' | 'settings';

type TransactionItem = Transaction & {
  fromUser: { id: number; username: string; avatar?: string };
  toUser: { id: number; username: string; avatar?: string };
  service?: { id: number; status: string; duration: number; postTitle: string };
};

type ProfileData = {
  id: number;
  username: string;
  avatar?: string;
  creditScore: number;
  completedServices: number;
  avgRating?: number;
  joinDate: string;
};

type TransactionStats = {
  totalEarned: number;
  totalSpent: number;
  currentBalance: number;
};

const TABS = [
  { id: 'overview' as TabType, label: '概览', icon: LayoutDashboard },
  { id: 'posts' as TabType, label: '我的发布', icon: FileText },
  { id: 'transactions' as TabType, label: '交易记录', icon: ArrowLeftRight },
  { id: 'reviews' as TabType, label: '服务评价', icon: MessageSquare },
  { id: 'settings' as TabType, label: '账户设置', icon: SettingsIcon },
];

const PAGE_SIZE = 10;

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();

  const getInitialTab = (): TabType => {
    if (location.pathname.includes('transactions')) return 'transactions';
    if (location.pathname.includes('reviews')) return 'reviews';
    if (location.pathname.includes('settings')) return 'settings';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab());

  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [location.pathname]);

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    if (tabId === 'overview') {
      navigate('/profile');
    } else {
      navigate(`/profile/${tabId}`);
    }
  };

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [transactionStats, setTransactionStats] = useState<TransactionStats>({
    totalEarned: 0,
    totalSpent: 0,
    currentBalance: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const [recentTransactions, setRecentTransactions] = useState<TransactionItem[]>([]);
  const [recentTxLoading, setRecentTxLoading] = useState(true);

  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postTypeFilter, setPostTypeFilter] = useState<string>('all');
  const [postStatusFilter, setPostStatusFilter] = useState<string>('all');

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  const [reviews, setReviews] = useState<Array<{
    id: number;
    rating: number;
    comment?: string;
    createdAt: string;
    post: { id: number; title: string };
    otherUser: { id: number; username: string; avatar?: string };
  }>>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewType, setReviewType] = useState<'received' | 'given'>('received');

  const [settingsForm, setSettingsForm] = useState({
    username: '',
    phone: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user) {
      setSettingsForm((prev) => ({
        ...prev,
        username: user.username,
        phone: user.phone || '',
      }));
    }
  }, [authLoading, isAuthenticated, user]);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadTransactionStats();
      loadRecentTransactions();
    }
  }, [user]);

  useEffect(() => {
    if (user && activeTab === 'posts') {
      loadPosts();
    }
  }, [user, activeTab, postTypeFilter, postStatusFilter]);

  useEffect(() => {
    if (user && activeTab === 'transactions') {
      loadTransactions();
    }
  }, [user, activeTab, transactionsPage]);

  useEffect(() => {
    if (user && activeTab === 'reviews') {
      loadReviews();
    }
  }, [user, activeTab, reviewType]);

  const loadProfile = async () => {
    if (!user) return;
    setProfileLoading(true);
    try {
      const res = await usersApi.getProfile(user.id);
      if (res.success && res.data) {
        setProfile(res.data);
      }
    } catch (error) {
      console.error('加载用户资料失败:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const loadTransactionStats = async () => {
    setStatsLoading(true);
    try {
      const res = await transactionsApi.getStats();
      if (res.success && res.data) {
        setTransactionStats(res.data);
      }
    } catch (error) {
      console.error('加载交易统计失败:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadRecentTransactions = async () => {
    setRecentTxLoading(true);
    try {
      const res = await transactionsApi.getList({ page: 1, pageSize: 5 });
      if (res.success && res.data) {
        setRecentTransactions(res.data.list as TransactionItem[]);
      }
    } catch (error) {
      console.error('加载最近交易失败:', error);
    } finally {
      setRecentTxLoading(false);
    }
  };

  const loadPosts = async () => {
    if (!user) return;
    setPostsLoading(true);
    try {
      const res = await usersApi.getPosts(user.id, {
        type: postTypeFilter === 'all' ? undefined : postTypeFilter,
        status: postStatusFilter === 'all' ? undefined : postStatusFilter,
      });
      if (res.success && res.data) {
        setPosts(res.data);
      }
    } catch (error) {
      console.error('加载我的发布失败:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const loadTransactions = async () => {
    setTransactionsLoading(true);
    try {
      const res = await transactionsApi.getList({
      page: transactionsPage,
      pageSize: PAGE_SIZE,
    });
    if (res.success && res.data) {
      setTransactions(res.data.list as TransactionItem[]);
      setTransactionsTotal(res.data.total);
    }
  } catch (error) {
    console.error('加载交易记录失败:', error);
  } finally {
    setTransactionsLoading(false);
  }
  };

  const loadReviews = async () => {
    if (!user) return;
    setReviewsLoading(true);
    try {
      const res = await usersApi.getReviews(user.id, reviewType);
      if (res.success && res.data) {
        setReviews(res.data as any);
      }
    } catch (error) {
      console.error('加载评价失败:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setTimeout(() => {
      setSaveLoading(false);
      alert('个人信息已保存（演示功能）');
    }, 1000);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('两次输入的密码不一致');
      return;
    }
    setSaveLoading(true);
    setTimeout(() => {
      setSaveLoading(false);
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      alert('密码修改成功（演示功能）');
    }, 1000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isCurrentUser = (userId: number) => userId === user?.id;

  const totalPages = Math.ceil(transactionsTotal / PAGE_SIZE);

  const completedServicesCount = profile?.completedServices || 0;
  const avgRating = profile?.avgRating || 0;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const renderOverviewTab = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white text-3xl font-bold">
              {profile?.username.charAt(0)}
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold text-neutral-800">
                {profile?.username}
              </h2>
              <p className="text-sm text-neutral-500">
                加入于 {formatDate(profile?.joinDate || user.createdAt)}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-secondary-500" />
                <span className="text-neutral-600">信用积分</span>
              </div>
              <span className="font-semibold text-secondary-600">
                {profile?.creditScore || 0}分
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary-500" />
                <span className="text-neutral-600">时间余额</span>
              </div>
              <span className="font-semibold text-primary-600">
                {transactionStats.currentBalance}h
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <h3 className="font-serif text-xl font-semibold text-neutral-800 mb-4">
            数据统计
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-5 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700">总收入</span>
              </div>
              {statsLoading ? (
                <div className="h-8 bg-green-200 rounded animate-pulse" />
              ) : (
                <p className="font-serif text-3xl font-bold text-green-700">
                  +{transactionStats.totalEarned}h
                </p>
              )}
            </div>
            <div className="card p-5 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-5 h-5 text-red-600" />
                <span className="text-sm text-red-700">总支出</span>
              </div>
              {statsLoading ? (
                <div className="h-8 bg-red-200 rounded animate-pulse" />
              ) : (
                <p className="font-serif text-3xl font-bold text-red-700">
                  -{transactionStats.totalSpent}h
                </p>
              )}
            </div>
            <div className="card p-5 bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-primary-600" />
                <span className="text-sm text-primary-700">完成服务</span>
              </div>
              {profileLoading ? (
                <div className="h-8 bg-primary-200 rounded animate-pulse" />
              ) : (
                <p className="font-serif text-3xl font-bold text-primary-700">
                {completedServicesCount}
              </p>
              )}
            </div>
            <div className="card p-5 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-yellow-600" />
                <span className="text-sm text-yellow-700">平均评分</span>
              </div>
              {profileLoading ? (
                <div className="h-8 bg-yellow-200 rounded animate-pulse" />
              ) : (
                <p className="font-serif text-3xl font-bold text-yellow-700">
                  {avgRating > 0 ? avgRating.toFixed(1) : '暂无'}
                  {avgRating > 0 && <span className="text-lg"> 分</span>}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-xl font-semibold text-neutral-800">
            最近交易
          </h3>
          <button
            onClick={() => handleTabChange('transactions')}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            查看全部
          </button>
        </div>
        {recentTxLoading ? (
          <div className="card p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-200 rounded-full" />
                  <div>
                    <div className="h-4 w-32 bg-neutral-200 rounded mb-1" />
                    <div className="h-3 w-20 bg-neutral-200 rounded" />
                  </div>
                </div>
                <div className="h-6 w-16 bg-neutral-200 rounded" />
              </div>
            ))}
          </div>
        ) : recentTransactions.length > 0 ? (
          <div className="card divide-y divide-neutral-100">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="p-4 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white font-medium text-sm">
                      {isCurrentUser(tx.fromUserId)
                        ? tx.toUser?.username?.charAt(0)
                        : tx.fromUser?.username?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-neutral-800">
                        {isCurrentUser(tx.fromUserId)
                          ? `支付给 ${tx.toUser?.username}`
                          : `来自 ${tx.fromUser?.username}`}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {tx.service?.postTitle || tx.description}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {formatDateTime(tx.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'font-semibold',
                      isCurrentUser(tx.fromUserId)
                        ? 'text-red-600'
                        : 'text-green-600'
                    )}
                  >
                    {isCurrentUser(tx.fromUserId) ? '-' : '+'}
                    {tx.amount}h
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="暂无交易记录"
            description="完成服务后交易记录会显示在这里"
            className="py-8"
          />
        )}
      </div>
    </div>
  );

  const renderPostsTab = () => (
    <div>
      <div className="card p-6 mb-6">
      <div className="flex items-center gap-2 mb-4 text-sm text-neutral-600">
        <Filter className="w-4 h-4" />
        <span className="font-medium">筛选条件</span>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-500">类型：</span>
          <div className="flex gap-1">
            {['all', 'offer', 'request'].map((type) => (
              <button
                key={type}
                onClick={() => setPostTypeFilter(type)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  postTypeFilter === type
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                )}
              >
                {type === 'all' ? '全部' : type === 'offer' ? '提供服务' : '寻求帮助'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-500">状态：</span>
          <div className="flex gap-1">
            {['all', 'active', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setPostStatusFilter(status)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  postStatusFilter === status
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                )}
              >
                {status === 'all' ? '全部' : status === 'active' ? '进行中' : '已完成'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>

    {postsLoading ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card p-5 animate-pulse">
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-2">
                <div className="h-6 w-20 bg-neutral-200 rounded-full" />
                <div className="h-6 w-16 bg-neutral-200 rounded-full" />
              </div>
              <div className="h-6 w-12 bg-neutral-200 rounded" />
            </div>
            <div className="h-6 bg-neutral-200 rounded mb-2" />
            <div className="h-4 bg-neutral-200 rounded mb-1" />
            <div className="h-4 bg-neutral-200 rounded w-3/4 mb-4" />
            <div className="h-4 bg-neutral-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    ) : posts.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-stagger">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={{
              ...post,
              user: {
                id: user.id,
                username: user.username,
                creditScore: user.creditScore,
                avatar: user.avatar,
              } as any,
            }}
          />
        ))}
      </div>
    ) : (
      <Empty
        title="暂无发布"
        description="还没有发布任何内容，去发布你的第一条服务吧"
      />
    )}
    </div>
  );

  const renderTransactionsTab = () => (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-5 bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">累计收入</span>
          </div>
          {statsLoading ? (
            <div className="h-8 bg-green-200 rounded animate-pulse" />
          ) : (
            <p className="font-serif text-2xl font-bold text-green-700">
              +{transactionStats.totalEarned}h
            </p>
          )}
        </div>
        <div className="card p-5 bg-gradient-to-br from-red-50 to-red-100">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-700">累计支出</span>
          </div>
          {statsLoading ? (
            <div className="h-8 bg-red-200 rounded animate-pulse" />
          ) : (
            <p className="font-serif text-2xl font-bold text-red-700">
              -{transactionStats.totalSpent}h
            </p>
          )}
        </div>
        <div className="card p-5 bg-gradient-to-br from-primary-50 to-primary-100">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-primary-600" />
            <span className="text-sm text-primary-700">当前余额</span>
          </div>
          {statsLoading ? (
            <div className="h-8 bg-primary-200 rounded animate-pulse" />
          ) : (
            <p className="font-serif text-2xl font-bold text-primary-700">
              {transactionStats.currentBalance}h
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-neutral-100">
          <h3 className="font-serif text-lg font-semibold text-neutral-800">
            交易记录
          </h3>
        </div>
        {transactionsLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-200 rounded-full" />
                  <div>
                    <div className="h-4 w-32 bg-neutral-200 rounded mb-1" />
                    <div className="h-3 w-20 bg-neutral-200 rounded" />
                  </div>
                </div>
                <div className="h-6 w-16 bg-neutral-200 rounded" />
              </div>
            ))}
          </div>
        ) : transactions.length > 0 ? (
          <>
            <div className="divide-y divide-neutral-100">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white font-medium text-sm">
                        {isCurrentUser(tx.fromUserId)
                          ? tx.toUser?.username?.charAt(0)
                          : tx.fromUser?.username?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-neutral-800">
                          {isCurrentUser(tx.fromUserId)
                            ? `支付给 ${tx.toUser?.username}`
                            : `来自 ${tx.fromUser?.username}`}
                        </p>
                        {tx.service?.postTitle && (
                          <p className="text-xs text-neutral-500">
                            {tx.service.postTitle}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-neutral-400">
                          <span
                            className={cn(
                              'badge px-2 py-0.5 text-xs',
                              tx.type === 'service'
                                ? 'bg-primary-100 text-primary-700'
                                : tx.type === 'gift'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-blue-100 text-blue-700'
                            )}
                          >
                            {tx.type === 'service'
                              ? '服务'
                              : tx.type === 'gift'
                              ? '赠送'
                              : '退款'}
                          </span>
                          <span>{formatDateTime(tx.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div
                      className={cn(
                        'font-semibold text-lg',
                        isCurrentUser(tx.fromUserId)
                          ? 'text-red-600'
                          : 'text-green-600'
                      )}
                    >
                      {isCurrentUser(tx.fromUserId) ? '-' : '+'}
                      {tx.amount}h
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 p-4 border-t border-neutral-100">
                <button
                  onClick={() =>
                    setTransactionsPage((p) => Math.max(1, p - 1))
                  }
                  disabled={transactionsPage <= 1}
                  className={cn(
                    'btn w-10 h-10 p-0',
                    transactionsPage <= 1
                      ? 'btn-disabled bg-neutral-100 text-neutral-400'
                      : 'btn-ghost'
                  )}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-neutral-600">
                  第 {transactionsPage} 页 / 共 {totalPages} 页
                </span>
                <button
                  onClick={() =>
                    setTransactionsPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={transactionsPage >= totalPages}
                  className={cn(
                    'btn w-10 h-10 p-0',
                    transactionsPage >= totalPages
                      ? 'btn-disabled bg-neutral-100 text-neutral-400'
                      : 'btn-ghost'
                  )}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <Empty
            title="暂无交易记录"
            description="完成服务后交易记录会显示在这里"
          />
        )}
      </div>
    </div>
  );

  const renderReviewsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-xl font-semibold text-neutral-800">
          服务评价
        </h3>
        <div className="flex gap-1 bg-neutral-100 rounded-lg p-1">
          <button
            onClick={() => setReviewType('received')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-all',
              reviewType === 'received'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-800'
            )}
          >
            <span className="flex items-center gap-2">
              <Inbox className="w-4 h-4" />
              收到的评价
            </span>
          </button>
          <button
            onClick={() => setReviewType('given')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-all',
              reviewType === 'given'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-800'
            )}
          >
            <span className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              我给出的评价
            </span>
          </button>
        </div>
      </div>

      {reviewsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-neutral-200" />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-neutral-200 rounded w-32" />
                    <div className="h-4 bg-neutral-200 rounded w-20" />
                  </div>
                  <div className="h-4 bg-neutral-200 rounded w-3/4" />
                  <div className="h-4 bg-neutral-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <Empty
          icon={MessageSquare}
          title={reviewType === 'received' ? '暂无收到的评价' : '暂无给出的评价'}
          description={
            reviewType === 'received'
              ? '完成服务后，对方的评价会显示在这里'
              : '您完成服务后给出的评价会显示在这里'
          }
        />
      ) : (
        <div className="space-y-4 animate-stagger">
          {reviews.map((review) => (
            <div key={review.id} className="card p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {review.otherUser.avatar ? (
                    <img
                      src={review.otherUser.avatar}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <p className="font-medium text-neutral-800">
                        {review.otherUser.username}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {new Date(review.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            'w-4 h-4',
                            review.rating >= star
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-neutral-300'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-neutral-600 mb-3 whitespace-pre-wrap">
                      {review.comment}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="truncate">关联服务: {review.post.title}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSettingsTab = () => (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="card p-6">
        <h3 className="font-serif text-xl font-semibold text-neutral-800 mb-6">
          个人信息
        </h3>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              <div className="flex items-center gap-2">
                <UserCircle className="w-4 h-4" />
                用户名
              </div>
            </label>
            <input
              type="text"
              value={settingsForm.username}
              onChange={(e) =>
                setSettingsForm((prev) => ({
                  ...prev,
                  username: e.target.value,
                }))
              }
              className="input"
              placeholder="请输入用户名"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                联系电话
              </div>
            </label>
            <input
              type="tel"
              value={settingsForm.phone}
              onChange={(e) =>
                setSettingsForm((prev) => ({
                  ...prev,
                  phone: e.target.value,
                }))
              }
              className="input"
              placeholder="请输入联系电话"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={saveLoading}
          >
            {saveLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                保存中...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                保存修改
              </>
            )}
          </button>
        </form>
      </div>

      <div className="card p-6">
        <h3 className="font-serif text-xl font-semibold text-neutral-800 mb-6">
          修改密码
        </h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                当前密码
              </div>
            </label>
            <input
              type="password"
              value={passwordForm.oldPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  oldPassword: e.target.value,
                }))
              }
              className="input"
              placeholder="请输入当前密码"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                新密码
              </div>
            </label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  newPassword: e.target.value,
                }))
              }
              className="input"
              placeholder="请输入新密码"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                确认新密码
              </div>
            </label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  confirmPassword: e.target.value,
                }))
              }
              className="input"
              placeholder="请再次输入新密码"
            />
          </div>
          <button
            type="submit"
            className="btn btn-secondary w-full"
            disabled={saveLoading}
          >
            {saveLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                修改中...
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 mr-2" />
                修改密码
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="page-container">
        <div className="mb-8">
          <h1 className="section-title mb-2">个人中心</h1>
          <p className="text-neutral-600">管理您的账户信息和活动记录</p>
        </div>

        <div className="flex border-b border-neutral-200 mb-8 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'inline-flex items-center gap-2 px-6 py-4 font-medium transition-all border-b-2 -mb-px whitespace-nowrap',
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                )}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'posts' && renderPostsTab()}
          {activeTab === 'transactions' && renderTransactionsTab()}
          {activeTab === 'reviews' && renderReviewsTab()}
          {activeTab === 'settings' && renderSettingsTab()}
        </div>
      </div>
    </div>
  );
}
