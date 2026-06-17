import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Star,
  Shield,
  User as UserIcon,
  CheckCircle,
  AlertCircle,
  Loader2,
  Home,
  ChevronRight,
  ArrowRight,
  CheckSquare,
} from 'lucide-react';
import { postsApi, usersApi, servicesApi } from '../lib/api.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { CATEGORY_MAP } from '../../shared/types.js';
import type { Post, User, Service } from '../../shared/types.js';
import { cn } from '../lib/utils.js';

export default function ServiceConfirm() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [post, setPost] = useState<(Post & { user: Partial<User> }) | null>(null);
  const [otherUser, setOtherUser] = useState<{
    id: number;
    username: string;
    avatar?: string;
    creditScore: number;
    completedServices: number;
    avgRating?: number;
  } | null>(null);
  const [service, setService] = useState<(Service & {
    post: Partial<Post>;
    requester: Partial<User>;
    provider: Partial<User>;
  }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errors, setErrors] = useState<{ rating?: string; confirmed?: string }>({});

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login?redirect=/service-confirm/' + postId);
      return;
    }

    const loadData = async () => {
      if (!postId || !user) return;

      setLoading(true);
      setError(null);

      try {
        const id = parseInt(postId, 10);
        if (isNaN(id)) {
          throw new Error('无效的帖子ID');
        }

        const postRes = await postsApi.getDetail(id);
        if (!postRes.success || !postRes.data) {
          throw new Error('加载帖子详情失败');
        }

        const postData = postRes.data;
        setPost(postData);

        const otherUserId = postData.userId;
        const profileRes = await usersApi.getProfile(otherUserId);
        if (profileRes.success && profileRes.data) {
          setOtherUser(profileRes.data);
        }

        const serviceRes = await servicesApi.getOrCreate({
          postId: id,
          duration: postData.duration,
        });
        if (serviceRes.success && serviceRes.data) {
          setService(serviceRes.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [postId, user, isAuthenticated, authLoading, navigate]);

  const isOffer = post?.type === 'offer';
  const currentUserIsRequester = isOffer;
  const currentUserIsProvider = !isOffer;

  const category = post ? CATEGORY_MAP[post.category] : null;

  const validateForm = () => {
    const newErrors: { rating?: string; confirmed?: string } = {};

    if (rating < 1 || rating > 5) {
      newErrors.rating = '请选择评分';
    }

    if (!confirmed) {
      newErrors.confirmed = '请确认服务已完成';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !service) return;

    setSubmitting(true);
    try {
      const res = await servicesApi.confirm(service.id, {
        rating,
        review: review.trim() || undefined,
      });

      if (res.success) {
        setSubmitSuccess(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '确认失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="page-container">
          <div className="animate-pulse space-y-6">
            <div className="h-4 bg-neutral-200 rounded w-64 mb-8" />
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="card p-6 space-y-4">
                <div className="h-6 bg-neutral-200 rounded w-32" />
                <div className="h-8 bg-neutral-200 rounded w-3/4" />
                <div className="h-4 bg-neutral-200 rounded" />
                <div className="h-4 bg-neutral-200 rounded w-2/3" />
              </div>
              <div className="card p-6 space-y-4">
                <div className="h-6 bg-neutral-200 rounded w-40" />
                <div className="h-20 bg-neutral-200 rounded" />
              </div>
              <div className="card p-6 space-y-4">
                <div className="h-6 bg-neutral-200 rounded w-32" />
                <div className="h-10 bg-neutral-200 rounded" />
                <div className="h-24 bg-neutral-200 rounded" />
                <div className="h-6 bg-neutral-200 rounded w-48" />
                <div className="h-12 bg-neutral-200 rounded" />
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

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="page-container">
          <div className="max-w-lg mx-auto">
            <div className="card p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="font-serif text-2xl font-bold text-neutral-800 mb-3">
                服务确认成功
              </h2>
              <p className="text-neutral-600 mb-2">
                感谢您的评价，时间积分已完成划转
              </p>
              <p className="text-sm text-neutral-500 mb-8">
                {currentUserIsRequester
                  ? `您已支付 ${post.duration} 小时给 ${otherUser?.username}`
                  : `您已获得 ${post.duration} 小时的时间积分`}
              </p>
              <div className="flex gap-4 justify-center">
                <Link to="/services" className="btn btn-ghost">
                  浏览更多服务
                </Link>
                <Link to="/messages" className="btn btn-primary">
                  返回消息
                </Link>
              </div>
            </div>
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
          <Link to="/messages" className="hover:text-primary-600 transition-colors">
            消息
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-neutral-800 font-medium">服务确认</span>
        </nav>

        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-neutral-600 hover:text-primary-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>

        <div className="max-w-2xl mx-auto space-y-6">
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

            <h1 className="font-serif text-2xl font-bold text-neutral-800 mb-3">
              {post.title}
            </h1>

            <p className="text-neutral-600 leading-relaxed whitespace-pre-wrap line-clamp-3">
              {post.description}
            </p>
          </div>

          <div className="card p-6">
            <h3 className="font-serif text-lg font-semibold text-neutral-800 mb-4">
              服务协议摘要
            </h3>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl">
                <div className="flex-1 text-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mx-auto mb-2 overflow-hidden">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <p className="font-medium text-neutral-800 text-sm">
                    {user?.username}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {currentUserIsRequester ? '服务请求方' : '服务提供方'}
                  </p>
                </div>

                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 text-neutral-400 mb-1">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1 text-primary-600 font-semibold text-sm">
                    <Clock className="w-4 h-4" />
                    {post.duration}小时
                  </div>
                </div>

                <div className="flex-1 text-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary-500 to-secondary-600 flex items-center justify-center mx-auto mb-2 overflow-hidden">
                    {otherUser?.avatar ? (
                      <img
                        src={otherUser.avatar}
                        alt={otherUser.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <p className="font-medium text-neutral-800 text-sm">
                    {otherUser?.username || post.user?.username}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {currentUserIsRequester ? '服务提供方' : '服务请求方'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-neutral-50 rounded-xl">
                  <p className="text-neutral-500 mb-1">服务内容</p>
                  <p className="font-medium text-neutral-800">{post.title}</p>
                </div>
                <div className="p-4 bg-neutral-50 rounded-xl">
                  <p className="text-neutral-500 mb-1">时间积分划转</p>
                  <p className="font-medium text-primary-600">
                    {currentUserIsRequester
                      ? `您支付 ${post.duration} 小时`
                      : `您获得 ${post.duration} 小时`}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800 mb-1">安全提示</p>
                    <p className="text-yellow-700">
                      请确认服务已按约定完成后再进行确认。确认后时间积分将自动划转，无法撤回。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="card p-6 space-y-6">
            <h3 className="font-serif text-lg font-semibold text-neutral-800">
              服务评价
            </h3>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-3">
                服务评分 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className={cn(
                      'p-1 rounded-lg transition-all duration-200',
                      'hover:scale-110 active:scale-95',
                      errors.rating ? 'animate-pulse' : ''
                    )}
                  >
                    <Star
                      className={cn(
                        'w-10 h-10 transition-colors duration-200',
                        (hoverRating || rating) >= star
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-neutral-300'
                      )}
                    />
                  </button>
                ))}
                <span className="ml-2 text-lg font-semibold text-neutral-700">
                  {rating} 分
                </span>
              </div>
              <p className="text-sm text-neutral-500 mt-2">
                {rating === 1 && '非常不满意'}
                {rating === 2 && '不太满意'}
                {rating === 3 && '一般'}
                {rating === 4 && '比较满意'}
                {rating === 5 && '非常满意'}
              </p>
              {errors.rating && (
                <p className="mt-1 text-sm text-red-600">{errors.rating}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                评价内容 <span className="text-neutral-400">(选填)</span>
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="分享您的服务体验，帮助其他用户了解对方的服务质量..."
                rows={4}
                className="input resize-none"
                maxLength={500}
              />
              <p className="mt-1 text-xs text-neutral-400 text-right">
                {review.length} / 500 字符
              </p>
            </div>

            <div className={cn(
              'p-4 rounded-xl border-2 transition-colors duration-200',
              confirmed
                ? 'bg-green-50 border-green-300'
                : 'bg-neutral-50 border-neutral-200',
              errors.confirmed ? 'border-red-300 animate-pulse' : ''
            )}>
              <label className="flex items-start gap-3 cursor-pointer">
                <div
                  className={cn(
                    'mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200',
                    confirmed
                      ? 'bg-green-500 text-white'
                      : 'bg-white border-2 border-neutral-300'
                  )}
                >
                  {confirmed && <CheckSquare className="w-4 h-4" />}
                </div>
                <div className="text-sm">
                  <p className={cn(
                    'font-medium transition-colors',
                    confirmed ? 'text-green-800' : 'text-neutral-700'
                  )}>
                    我确认服务已按约定完成
                  </p>
                  <p className="text-neutral-500 mt-1">
                    确认后，时间积分将从请求方账户划转至提供方账户，此操作不可撤销
                  </p>
                </div>
              </label>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => {
                  setConfirmed(e.target.checked);
                  if (e.target.checked && errors.confirmed) {
                    setErrors(prev => ({ ...prev, confirmed: undefined }));
                  }
                }}
                className="sr-only"
              />
              {errors.confirmed && (
                <p className="mt-2 text-sm text-red-600 pl-9">{errors.confirmed}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  确认中...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  确认服务完成
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
