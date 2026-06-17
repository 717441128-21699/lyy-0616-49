import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Users, HandHeart, Zap, ArrowRight } from 'lucide-react';
import CategoryCard from '../components/CategoryCard.js';
import PostCard from '../components/PostCard.js';
import { CATEGORIES } from '../../shared/types.js';
import { publicApi, postsApi } from '../lib/api.js';
import type { Post } from '../../shared/types.js';

export default function Home() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalServices: 0,
    totalHours: 0,
    activePosts: 0,
  });
  const [latestPosts, setLatestPosts] = useState<
    Array<Post & { user?: { id: number; username: string; creditScore?: number } }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsRes, postsRes] = await Promise.all([
          publicApi.getStats(),
          postsApi.getList({ pageSize: 6 }),
        ]);

        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data);
        }
        if (postsRes.success && postsRes.data) {
          setLatestPosts(postsRes.data.list);
        }
      } catch (error) {
        console.error('加载首页数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const categoryDescriptions: Record<string, string> = {
    housework: '家政清洁、维修保养、代购跑腿等日常家务协助',
    teaching: '语言学习、乐器教学、技能培训等知识分享',
    companion: '陪伴聊天、散步探访、节日关怀等温暖陪伴',
    transport: '老人接送、儿童托管、出行协助等接送服务',
  };

  return (
    <div className="min-h-screen">
      <section className="hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-noise pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 relative">
          <div className="max-w-3xl animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-white/90 text-sm mb-6">
              <Zap className="w-4 h-4" />
              让时间成为有价值的社区货币
            </div>
            <h1 className="font-serif text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              社区互助
              <br />
              <span className="text-white/90">时间银行</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8 leading-relaxed max-w-2xl">
              以时间为货币，通过提供服务获得时间积分，使用服务消耗时间积分，
              构建邻里互助、共建共享的温暖社区。
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/services"
                className="inline-flex items-center gap-2 bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold hover:bg-neutral-100 transition-all duration-300 hover:scale-105 shadow-lg"
              >
                浏览服务广场
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white border border-white/30 px-8 py-4 rounded-xl font-semibold hover:bg-white/20 transition-all duration-300"
              >
                立即加入
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 animate-stagger">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary-600" />
              </div>
              <div className="font-serif text-3xl font-bold text-neutral-800 mb-1">
                {stats.totalUsers}+
              </div>
              <div className="text-neutral-600">注册用户</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-secondary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <HandHeart className="w-8 h-8 text-secondary-600" />
              </div>
              <div className="font-serif text-3xl font-bold text-neutral-800 mb-1">
                {stats.totalServices}+
              </div>
              <div className="text-neutral-600">完成服务</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#FF8FA3]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-[#FF8FA3]" />
              </div>
              <div className="font-serif text-3xl font-bold text-neutral-800 mb-1">
                {stats.totalHours}+
              </div>
              <div className="text-neutral-600">服务时长(小时)</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#4ECDC4]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-[#4ECDC4]" />
              </div>
              <div className="font-serif text-3xl font-bold text-neutral-800 mb-1">
                {stats.activePosts}+
              </div>
              <div className="text-neutral-600">活跃帖子</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="section-title inline-block">服务分类</h2>
            <p className="text-neutral-600 mt-2">选择您需要或可以提供的服务类别</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-stagger">
            {CATEGORIES.map((cat) => (
              <CategoryCard
                key={cat.id}
                id={cat.id}
                name={cat.name}
                icon={cat.icon}
                color={cat.color}
                description={categoryDescriptions[cat.id]}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="section-title mb-1">最新发布</h2>
              <p className="text-neutral-600">看看社区里有哪些最新的服务和需求</p>
            </div>
            <Link
              to="/services"
              className="hidden md:inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              查看全部
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-stagger">
              {latestPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}

          <div className="mt-8 text-center md:hidden">
            <Link to="/services" className="btn btn-outline">
              查看全部服务
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center animate-fade-in">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-neutral-800 mb-6">
            如何使用时间银行？
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="relative">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-primary-600">
                1
              </div>
              <h3 className="font-serif text-xl font-semibold text-neutral-800 mb-3">
                注册账户
              </h3>
              <p className="text-neutral-600">
                完成注册成为社区一员，信用良好的新用户可获赠初始积分。
              </p>
            </div>
            <div className="relative">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-secondary-600">
                2
              </div>
              <h3 className="font-serif text-xl font-semibold text-neutral-800 mb-3">
                发布或浏览
              </h3>
              <p className="text-neutral-600">
                发布您能提供的服务，或浏览社区内的求助需求。
              </p>
            </div>
            <div className="relative">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-[#FF8FA3]">
                3
              </div>
              <h3 className="font-serif text-xl font-semibold text-neutral-800 mb-3">
                完成服务
              </h3>
              <p className="text-neutral-600">
                双方协商完成服务后确认，系统自动划转时间积分。
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
