import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  GraduationCap,
  Heart,
  Car,
  ArrowRight,
  Loader2,
  AlertTriangle,
  MapPin,
  Clock,
  FileText,
  Tag,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore.js';
import { postsApi } from '../lib/api.js';
import { CATEGORIES } from '../../shared/types.js';
import { cn } from '../lib/utils.js';

const ICON_MAP: Record<string, React.ElementType> = {
  Home,
  GraduationCap,
  Heart,
  Car,
};

interface FormData {
  type: 'offer' | 'request';
  category: string;
  title: string;
  description: string;
  duration: string;
  location: string;
}

interface FormErrors {
  type?: string;
  category?: string;
  title?: string;
  description?: string;
  duration?: string;
  general?: string;
}

export default function Publish() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  const [formData, setFormData] = useState<FormData>({
    type: 'offer',
    category: '',
    title: '',
    description: '',
    duration: '',
    location: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const showTimeBalanceWarning =
    formData.type === 'request' &&
    user &&
    parseFloat(formData.duration) > user.timeBalance &&
    parseFloat(formData.duration) > 0;

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.type) {
      newErrors.type = '请选择发布类型';
    }

    if (!formData.category) {
      newErrors.category = '请选择服务分类';
    }

    if (!formData.title.trim()) {
      newErrors.title = '请输入标题';
    } else if (formData.title.length < 5) {
      newErrors.title = '标题至少需要5个字符';
    }

    if (!formData.description.trim()) {
      newErrors.description = '请输入描述内容';
    } else if (formData.description.length < 10) {
      newErrors.description = '描述至少需要10个字符';
    }

    if (!formData.duration) {
      newErrors.duration = '请输入服务时长';
    } else if (parseFloat(formData.duration) <= 0) {
      newErrors.duration = '时长必须大于0';
    } else if (parseFloat(formData.duration) > 24) {
      newErrors.duration = '单次服务时长不能超过24小时';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTypeChange = (type: 'offer' | 'request') => {
    setFormData((prev) => ({ ...prev, type }));
    if (errors.type) {
      setErrors((prev) => ({ ...prev, type: undefined }));
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    setFormData((prev) => ({ ...prev, category: categoryId }));
    if (errors.category) {
      setErrors((prev) => ({ ...prev, category: undefined }));
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await postsApi.create({
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        type: formData.type,
        duration: parseFloat(formData.duration),
        location: formData.location.trim() || undefined,
      });

      if (response.success && response.data) {
        navigate(`/services/${response.data.id}`);
      }
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : '发布失败，请稍后重试',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="page-container">
        <div className="mb-8">
          <h1 className="section-title mb-2">发布服务</h1>
          <p className="text-neutral-600">
            发布您能提供的服务或需要的帮助，与社区邻居建立连接
          </p>
        </div>

        {errors.general && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="card p-6">
            <h2 className="font-serif text-xl font-semibold text-neutral-800 mb-4">
              发布类型
            </h2>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handleTypeChange('offer')}
                className={cn(
                  'flex-1 py-4 px-6 rounded-xl font-medium transition-all duration-200 border-2',
                  formData.type === 'offer'
                    ? 'bg-secondary-50 border-secondary-500 text-secondary-700'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <ArrowRight className="w-5 h-5 rotate-180" />
                  提供服务
                </div>
                <p className="text-xs mt-1 font-normal opacity-70">我能帮助别人</p>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('request')}
                className={cn(
                  'flex-1 py-4 px-6 rounded-xl font-medium transition-all duration-200 border-2',
                  formData.type === 'request'
                    ? 'bg-primary-50 border-primary-500 text-primary-700'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <ArrowRight className="w-5 h-5" />
                  寻求帮助
                </div>
                <p className="text-xs mt-1 font-normal opacity-70">我需要帮助</p>
              </button>
            </div>
            {errors.type && (
              <p className="mt-2 text-sm text-red-600">{errors.type}</p>
            )}
          </div>

          <div className="card p-6">
            <h2 className="font-serif text-xl font-semibold text-neutral-800 mb-4">
              服务分类
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {CATEGORIES.map((cat) => {
                const Icon = ICON_MAP[cat.icon] || Home;
                const isActive = formData.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryClick(cat.id)}
                    className={cn(
                      'p-4 rounded-xl transition-all duration-200 border-2 text-left',
                      isActive
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                    )}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                      style={{ backgroundColor: `${cat.color}15` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: cat.color }} />
                    </div>
                    <h3 className="font-semibold text-neutral-800">{cat.name}</h3>
                  </button>
                );
              })}
            </div>
            {errors.category && (
              <p className="mt-2 text-sm text-red-600">{errors.category}</p>
            )}
          </div>

          <div className="card p-6 space-y-6">
            <h2 className="font-serif text-xl font-semibold text-neutral-800">
              详细信息
            </h2>

            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-neutral-700 mb-2"
              >
                <span className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  标题
                  <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="请输入简洁明了的标题"
                className={cn('input', errors.title && 'input-error')}
                disabled={isSubmitting}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-neutral-700 mb-2"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  详细描述
                  <span className="text-red-500">*</span>
                </span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="请详细描述您的服务或需求，包括具体内容、时间要求等..."
                rows={5}
                className={cn('input resize-none', errors.description && 'input-error')}
                disabled={isSubmitting}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="duration"
                  className="block text-sm font-medium text-neutral-700 mb-2"
                >
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    预计时长（小时）
                    <span className="text-red-500">*</span>
                  </span>
                </label>
                <input
                  id="duration"
                  name="duration"
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={formData.duration}
                  onChange={handleInputChange}
                  placeholder="例如：2"
                  className={cn('input', errors.duration && 'input-error')}
                  disabled={isSubmitting}
                />
                {errors.duration && (
                  <p className="mt-1 text-sm text-red-600">{errors.duration}</p>
                )}
                {showTimeBalanceWarning && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-700">
                        <p className="font-medium">时间余额不足</p>
                        <p className="mt-0.5">
                          您当前的时间余额为 {user?.timeBalance} 小时，
                          本次服务需要 {formData.duration} 小时。
                          完成服务后您的余额将为负数，请确保有足够的时间积分。
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-medium text-neutral-700 mb-2"
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    服务地点（可选）
                  </span>
                </label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="例如：朝阳区、线上服务等"
                  className="input"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-ghost"
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary min-w-32"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  发布中...
                </>
              ) : (
                '发布'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
