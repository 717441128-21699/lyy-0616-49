import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Calendar,
  User as UserIcon,
  Star,
  Shield,
  MessageCircle,
  Flag,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Home,
  ChevronRight,
} from 'lucide-react';
import { postsApi, usersApi, conversationsApi, reportsApi } from '../lib/api.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { CATEGORY_MAP } from '../../shared/types.js';
import type { Post, User } from '../../shared/types.js';
import { cn } from '../lib/utils.js';

const REPORT_REASONS = [
  { value: 'spam', label: '垃圾广告' },
  { value: 'fraud', label: '虚假信息' },
  { value: 'inappropriate', label: '不当内容' },
  { value: 'harassment', label: '骚扰辱骂' },
  { value: 'illegal', label: '违法违规' },
  { value: 'other', label: '其他原因' },
];

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const [post, setPost] = useState<(Post & { user: Partial<User> }) | null>(null);
  const [userProfile, setUserProfile] = useState<{
    id: number;
    username: string;
    avatar?: string;
    creditScore: number;
    completedServices: number;
    avgRating?: number;
    joinDate: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportErrors, setReportErrors] = useState<{ reason?: string; description?: string }>({});

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        const postId = parseInt(id, 10);
        if (isNaN(postId)) {
          throw new Error('无效的帖子ID');
        }

        const postRes = await postsApi.getDetail(postId);
        if (!postRes.success || !postRes.data) {
          throw new Error('加载帖子详情失败');
        }

        const postData = postRes.data;
        setPost(postData);

        const profileRes = await usersApi.getProfile(postData.userId);
        if (profileRes.success && profileRes.data) {
          setUserProfile(profileRes.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleContact = async () => {
    if (!isAuthenticated || !post) return;

    setContactLoading(true);
    try {
      const res = await conversationsApi.create({
        participantId: post.userId,
        postId: post.id,
      });

      if (res.success && res.data) {
        navigate(`/messages/${res.data.id}`);
      }
    } catch (err) {
      console.error('发起对话失败:', err);
      alert(err instanceof Error ? err.message : '发起对话失败，请稍后重试');
    } finally {
      setContactLoading(false);
    }
  };

  const validateReportForm = () => {
    const errors: { reason?: string; description?: string } = {};

    if (!reportReason) {
      errors.reason = '请选择举报原因';
    }

    if (!reportDescription.trim()) {
      errors.description = '请填写举报描述';
    } else if (reportDescription.trim().length < 10) {
      errors.description = '举报描述至少10个字符';
    }

    setReportErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateReportForm() || !post) return;

    setReportSubmitting(true);
    try {
      const res = await reportsApi.create({
        type: 'post',
        targetId: post.id,
        reason: reportReason,
        description: reportDescription.trim(),
      });

      if (res.success) {
        setReportSuccess(true);
        setTimeout(() => {
          setReportModalOpen(false);
          setReportSuccess(false);
          setReportReason('');
          setReportDescription('');
          setReportErrors({});
        }, 2000);
      }
    } catch (err) {
      setReportErrors({
        description: err instanceof Error ? err.message : '举报失败，请稍后重试',
      });
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleCloseReportModal = () => {
    if (reportSubmitting) return;
    setReportModalOpen(false);
    setReportReason('');
    setReportDescription('');
    setReportErrors({});
    setReportSuccess(false);
  };

  const isAuthor = user && post && user.id === post.userId;
  const category = post ? CATEGORY_MAP[post.category] : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="page-container">
          <div className="animate-pulse space-y-6">
            <div className="h-4 bg-neutral-200 rounded w-64 mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="card p-6 space-y-4">
                  <div className="flex gap-2 mb-4">
                    <div className="h-6 w-20 bg-neutral-200 rounded-full" />
                    <div className="h-6 w-16 bg-neutral-200 rounded-full" />
                    <div className="h-6 w-12 bg-neutral-200 rounded" />
                  </div>
                  <div className="h-8 bg-neutral-200 rounded w-3/4" />
                  <div className="h-4 bg-neutral-200 rounded" />
                  <div className="h-4 bg-neutral-200 rounded" />
                  <div className="h-4 bg-neutral-200 rounded w-2/3" />
                </div>
                <div className="card p-6">
                  <div className="h-6 bg-neutral-200 rounded w-32 mb-4" />
                  <div className="h-4 bg-neutral-200 rounded mb-2" />
                  <div className="h-4 bg-neutral-200 rounded mb-2" />
                  <div className="h-4 bg-neutral-200 rounded w-5/6" />
                </div>
              </div>
              <div className="space-y-6">
                <div className="card p-6">
                  <div className="h-20 bg-neutral-200 rounded-full w-20 mx-auto mb-4" />
                  <div className="h-6 bg-neutral-200 rounded w-32 mx-auto mb-2" />
                  <div className="h-4 bg-neutral-200 rounded w-24 mx-auto mb-6" />
                  <div className="space-y-3">
                    <div className="h-4 bg-neutral-200 rounded" />
                    <div className="h-4 bg-neutral-200 rounded" />
                    <div className="h-4 bg-neutral-200 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="page-container">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-neutral-800 mb-2">加载失败</h2>
            <p className="text-neutral-600 mb-6">{error || '帖子不存在或已被删除'}</p>
            <Link to="/services" className="btn btn-primary">
              返回服务广场
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="page-container">
        <nav className="flex items-center gap-2 text-sm text-neutral-500 mb-6">
          <Link to="/" className="hover:text-primary-600 transition-colors flex items-center gap-1">
            <Home className="w-4 h-4" />
            首页
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/services" className="hover:text-primary-600 transition-colors">
            服务广场
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-neutral-800 font-medium truncate max-w-48">
            {post.title}
          </span>
        </nav>

        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-neutral-600 hover:text-primary-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className={cn('card p-6', `category-border-${post.category}`)}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn('badge', `badge-category-${post.category}`)}
                    style={{
                      backgroundColor: category ? `${category.color}15` : undefined,
                      color: category?.color,
                    }}
                  >
                    {category?.name || post.category}
                  </span>
                  <span
                    className={cn(
                      'badge text-xs',
                      post.type === 'offer' ? 'badge-offer' : 'badge-request'
                    )}
                  >
                    {post.type === 'offer' ? '提供服务' : '寻求帮助'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-primary-600 font-semibold">
                  <Clock className="w-4 h-4" />
                  <span>{post.duration}小时</span>
                </div>
              </div>

              <h1 className="font-serif text-2xl md:text-3xl font-bold text-neutral-800 mb-4">
                {post.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500 mb-6">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    发布于 {new Date(post.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                {post.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{post.location}</span>
                  </div>
                )}
              </div>

              <div className="prose prose-neutral max-w-none">
                <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap">
                  {post.description}
                </p>
              </div>
            </div>

            {isAuthenticated && !isAuthor && (
              <div className="card p-6 bg-gradient-to-r from-primary-50 to-secondary-50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-neutral-800 mb-1">
                      对这个服务感兴趣？
                    </h3>
                    <p className="text-neutral-600 text-sm">
                      点击下方按钮与 {post.user?.username} 发起对话，了解更多细节
                    </p>
                  </div>
                  <button
                    onClick={handleContact}
                    disabled={contactLoading}
                    className="btn btn-primary whitespace-nowrap"
                  >
                    {contactLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        处理中...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-5 h-5 mr-2" />
                        联系对方
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="card p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center mx-auto mb-4 overflow-hidden">
                  {userProfile?.avatar ? (
                    <img
                      src={userProfile.avatar}
                      alt={userProfile.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-10 h-10 text-white" />
                  )}
                </div>
                <h3 className="font-serif text-xl font-semibold text-neutral-800 mb-1">
                  {userProfile?.username || post.user?.username}
                </h3>
                <div className="flex items-center justify-center gap-1 text-secondary-600">
                  <Shield className="w-4 h-4" />
                  <span className="font-medium">
                    信用分 {userProfile?.creditScore || post.user?.creditScore || '--'}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-t border-neutral-100">
                  <div className="flex items-center gap-2 text-neutral-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>完成服务</span>
                  </div>
                  <span className="font-semibold text-neutral-800">
                    {userProfile?.completedServices || 0} 次
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-t border-neutral-100">
                  <div className="flex items-center gap-2 text-neutral-600">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span>平均评分</span>
                  </div>
                  <span className="font-semibold text-neutral-800">
                    {userProfile?.avgRating ? `${userProfile.avgRating.toFixed(1)} 分` : '暂无评分'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-t border-neutral-100">
                  <div className="flex items-center gap-2 text-neutral-600">
                    <Calendar className="w-4 h-4 text-primary-500" />
                    <span>加入时间</span>
                  </div>
                  <span className="font-semibold text-neutral-800">
                    {userProfile?.joinDate
                      ? new Date(userProfile.joinDate).toLocaleDateString('zh-CN')
                      : '--'}
                  </span>
                </div>
              </div>

              {isAuthenticated && !isAuthor && (
                <button
                  onClick={handleContact}
                  disabled={contactLoading}
                  className="btn btn-primary w-full mt-6"
                >
                  {contactLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-5 h-5 mr-2" />
                      联系对方
                    </>
                  )}
                </button>
              )}

              {isAuthor && (
                <div className="mt-6 p-4 bg-primary-50 rounded-lg text-center">
                  <p className="text-primary-700 text-sm">这是您发布的帖子</p>
                </div>
              )}
            </div>

            <div className="card p-6">
              <h4 className="font-semibold text-neutral-800 mb-4">安全提示</h4>
              <ul className="space-y-3 text-sm text-neutral-600">
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span>请在平台内沟通，避免私下交易</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span>服务完成后再确认交易</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                  <span>如遇问题请及时举报</span>
                </li>
              </ul>

              <button
                onClick={() => setReportModalOpen(true)}
                className="btn btn-ghost w-full mt-4 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Flag className="w-4 h-4 mr-2" />
                举报此帖子
              </button>
            </div>
          </div>
        </div>
      </div>

      {reportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {reportSuccess ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-neutral-800 mb-2">
                  举报提交成功
                </h3>
                <p className="text-neutral-600">
                  感谢您的反馈，我们将尽快处理
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-6 border-b border-neutral-200">
                  <h3 className="font-serif text-xl font-semibold text-neutral-800">
                    举报帖子
                  </h3>
                  <button
                    onClick={handleCloseReportModal}
                    disabled={reportSubmitting}
                    className="text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmitReport} className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      举报原因 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className={cn('input', reportErrors.reason ? 'input-error' : '')}
                      disabled={reportSubmitting}
                    >
                      <option value="">请选择举报原因</option>
                      {REPORT_REASONS.map((reason) => (
                        <option key={reason.value} value={reason.value}>
                          {reason.label}
                        </option>
                      ))}
                    </select>
                    {reportErrors.reason && (
                      <p className="mt-1 text-sm text-red-600">{reportErrors.reason}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      详细描述 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      placeholder="请详细描述您举报的原因，至少10个字符..."
                      rows={4}
                      className={cn(
                        'input resize-none',
                        reportErrors.description ? 'input-error' : ''
                      )}
                      disabled={reportSubmitting}
                    />
                    {reportErrors.description && (
                      <p className="mt-1 text-sm text-red-600">{reportErrors.description}</p>
                    )}
                    <p className="mt-1 text-xs text-neutral-400">
                      {reportDescription.length} / 500 字符
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCloseReportModal}
                      disabled={reportSubmitting}
                      className="btn btn-ghost flex-1"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={reportSubmitting}
                      className="btn btn-primary flex-1"
                    >
                      {reportSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          提交中...
                        </>
                      ) : (
                        '提交举报'
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
