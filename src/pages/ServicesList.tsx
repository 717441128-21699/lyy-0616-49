import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Home,
  GraduationCap,
  Heart,
  Car,
  HandHeart,
  ArrowRight,
} from 'lucide-react';
import { postsApi } from '../lib/api.js';
import { CATEGORIES } from '../../shared/types.js';
import type { Post } from '../../shared/types.js';
import PostCard from '../components/PostCard.js';
import Empty from '../components/Empty.js';
import { cn } from '../lib/utils.js';

const ICON_MAP: Record<string, React.ElementType> = {
  Home,
  GraduationCap,
  Heart,
  Car,
};

const PAGE_SIZE = 9;

export default function ServicesList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const categoryParam = searchParams.get('category') || '';
  const typeParam = searchParams.get('type') || '';
  const keywordParam = searchParams.get('keyword') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [posts, setPosts] = useState<
    Array<Post & { user?: { id: number; username: string; creditScore?: number; avatar?: string } }>
  >([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(keywordParam);

  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string; value: string }> = [];
    if (categoryParam) {
      const cat = CATEGORIES.find((c) => c.id === categoryParam);
      filters.push({ key: 'category', label: '分类', value: cat?.name || categoryParam });
    }
    if (typeParam) {
      filters.push({
        key: 'type',
        label: '类型',
        value: typeParam === 'offer' ? '提供服务' : '寻求帮助',
      });
    }
    if (keywordParam) {
      filters.push({ key: 'keyword', label: '搜索', value: keywordParam });
    }
    return filters;
  }, [categoryParam, typeParam, keywordParam]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true);
      try {
        const res = await postsApi.getList({
          category: categoryParam || undefined,
          type: typeParam || undefined,
          keyword: keywordParam || undefined,
          page: pageParam,
          pageSize: PAGE_SIZE,
        });

        if (res.success && res.data) {
          setPosts(res.data.list);
          setTotal(res.data.total);
        }
      } catch (error) {
        console.error('加载服务列表失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [categoryParam, typeParam, keywordParam, pageParam]);

  const updateFilters = (updates: Record<string, string | number | null>) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === undefined) {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
    });

    if (updates.category !== undefined || updates.type !== undefined || updates.keyword !== undefined) {
      newParams.set('page', '1');
    }

    setSearchParams(newParams);
  };

  const handleCategoryClick = (categoryId: string) => {
    updateFilters({ category: categoryParam === categoryId ? null : categoryId });
  };

  const handleTypeClick = (type: string) => {
    updateFilters({ type: typeParam === type ? null : type });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ keyword: searchInput.trim() || null });
  };

  const handleClearFilter = (key: string) => {
    if (key === 'keyword') {
      setSearchInput('');
    }
    updateFilters({ [key]: null });
  };

  const handleClearAllFilters = () => {
    setSearchInput('');
    setSearchParams({});
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    updateFilters({ page: newPage });
  };

  const renderSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: PAGE_SIZE }).map((_, i) => (
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
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages: Array<number | 'ellipsis'> = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (pageParam <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (pageParam >= totalPages - 3) {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('ellipsis');
        pages.push(pageParam - 1);
        pages.push(pageParam);
        pages.push(pageParam + 1);
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }

    return (
      <div className="flex items-center justify-center gap-2 mt-12">
        <button
          onClick={() => handlePageChange(pageParam - 1)}
          disabled={pageParam <= 1}
          className={cn(
            'btn w-10 h-10 p-0',
            pageParam <= 1 ? 'btn-disabled bg-neutral-100 text-neutral-400' : 'btn-ghost'
          )}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {pages.map((page, idx) =>
          page === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-neutral-400">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={cn(
                'btn w-10 h-10 p-0 font-medium',
                page === pageParam
                  ? 'bg-primary-500 text-white hover:bg-primary-600'
                  : 'btn-ghost'
              )}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => handlePageChange(pageParam + 1)}
          disabled={pageParam >= totalPages}
          className={cn(
            'btn w-10 h-10 p-0',
            pageParam >= totalPages ? 'btn-disabled bg-neutral-100 text-neutral-400' : 'btn-ghost'
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="page-container">
        <div className="mb-8">
          <h1 className="section-title mb-2">服务广场</h1>
          <p className="text-neutral-600">
            浏览社区内的服务与需求，找到您需要的帮助或分享您的技能
          </p>
        </div>

        <div className="card p-6 mb-8">
          <form onSubmit={handleSearch} className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="搜索服务标题或描述..."
                className="input pl-12"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    updateFilters({ keyword: null });
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button type="submit" className="btn btn-primary">
              搜索
            </button>
          </form>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3 text-sm text-neutral-600">
              <Filter className="w-4 h-4" />
              <span className="font-medium">服务分类</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = ICON_MAP[cat.icon] || Home;
                const isActive = categoryParam === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className={cn(
                      'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'text-white shadow-md'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    )}
                    style={isActive ? { backgroundColor: cat.color } : undefined}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3 text-sm text-neutral-600">
              <HandHeart className="w-4 h-4" />
              <span className="font-medium">服务类型</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleTypeClick('offer')}
                className={cn(
                  'flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-200 border-2',
                  typeParam === 'offer'
                    ? 'bg-secondary-50 border-secondary-500 text-secondary-700'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  提供服务
                </div>
                <p className="text-xs mt-1 font-normal opacity-70">我能帮助别人</p>
              </button>
              <button
                onClick={() => handleTypeClick('request')}
                className={cn(
                  'flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-200 border-2',
                  typeParam === 'request'
                    ? 'bg-primary-50 border-primary-500 text-primary-700'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <ArrowRight className="w-4 h-4" />
                  寻求帮助
                </div>
                <p className="text-xs mt-1 font-normal opacity-70">我需要帮助</p>
              </button>
            </div>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-sm text-neutral-500">当前筛选：</span>
            {activeFilters.map((filter) => (
              <span
                key={filter.key}
                className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm"
              >
                <span className="font-medium">{filter.label}:</span>
                <span>{filter.value}</span>
                <button
                  onClick={() => handleClearFilter(filter.key)}
                  className="ml-1 hover:text-primary-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              onClick={handleClearAllFilters}
              className="text-sm text-neutral-500 hover:text-neutral-700 underline ml-2"
            >
              清除全部
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div className="text-neutral-600">
            {loading ? (
              <span>加载中...</span>
            ) : (
              <span>
                共找到 <span className="font-semibold text-primary-600">{total}</span> 条结果
              </span>
            )}
          </div>
        </div>

        {loading ? (
          renderSkeleton()
        ) : posts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-stagger">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
            {renderPagination()}
          </>
        ) : (
          <Empty
            title="没有找到相关服务"
            description={
              activeFilters.length > 0
                ? '当前筛选条件下没有找到内容，试试调整筛选条件或清除筛选'
                : '还没有任何服务发布，成为第一个发布服务的人吧'
            }
          />
        )}
      </div>
    </div>
  );
}
