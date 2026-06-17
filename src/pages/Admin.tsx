import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Users,
  FileText,
  CreditCard,
  Clock,
  AlertTriangle,
  Snowflake,
  Search,
  Filter,
  Gift,
  Ban,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  BarChart3,
  FileBarChart,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore.js';
import { adminApi, reportsApi } from '../lib/api.js';
import { cn } from '../lib/utils.js';
import Empty from '../components/Empty.js';
import type { User, Report, Transaction } from '../../shared/types.js';

type TabType = 'dashboard' | 'users' | 'reports' | 'transactions';

interface Stats {
  totalUsers: number;
  totalPosts: number;
  totalServices: number;
  totalHours: number;
  pendingReports: number;
  frozenUsers: number;
}

interface UserWithStats extends User {
  postCount: number;
  serviceCount: number;
  avgRating?: number;
}

interface ReportWithDetails extends Omit<Report, 'reporter' | 'targetUser' | 'targetPost'> {
  reporter?: Partial<User>;
  targetUser?: Partial<User>;
  targetPost?: Partial<{ id: number; title: string }>;
  targetService?: {
    id: number;
    postId: number;
    postTitle: string;
    duration: number;
    status: string;
    requester: { id: number; username: string; avatar?: string };
    provider: { id: number; username: string; avatar?: string };
  };
}

interface TransactionWithDetails extends Omit<Transaction, 'fromUser' | 'toUser'> {
  fromUser?: Partial<User>;
  toUser?: Partial<User>;
  postTitle?: string;
}

interface GiftPointsModalProps {
  user: UserWithStats | null;
  onClose: () => void;
  onConfirm: (userId: number, points: number, reason: string) => Promise<void>;
}

interface FreezeModalProps {
  user: UserWithStats | null;
  onClose: () => void;
  onConfirm: (userId: number, reason?: string) => Promise<void>;
}

interface ProcessReportModalProps {
  report: ReportWithDetails | null;
  action: 'freeze' | 'warn' | 'dismiss' | null;
  onClose: () => void;
  onConfirm: (reportId: number, action: 'freeze' | 'warn' | 'dismiss', note?: string) => Promise<void>;
}

function GiftPointsModal({ user, onClose, onConfirm }: GiftPointsModalProps) {
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !points || Number(points) <= 0) return;

    setLoading(true);
    try {
      await onConfirm(user.id, Number(points), reason);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-serif text-xl font-bold text-neutral-800 flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary-500" />
            赠送积分
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-neutral-100 transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-neutral-50 rounded-xl">
          <p className="text-sm text-neutral-600">用户</p>
          <p className="font-medium text-neutral-800">{user.username}</p>
          <p className="text-sm text-neutral-500">当前余额: {user.timeBalance} 小时</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              赠送时长（小时）
            </label>
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              min="1"
              placeholder="请输入时长"
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              赠送原因
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请输入赠送原因"
              rows={3}
              className="input resize-none"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost flex-1"
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={loading || !points || Number(points) <= 0}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                '确认赠送'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FreezeModal({ user, onClose, onConfirm }: FreezeModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      await onConfirm(user.id, user.isFrozen ? undefined : reason);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const isFreeze = !user.isFrozen;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h3 className={cn(
            'font-serif text-xl font-bold flex items-center gap-2',
            isFreeze ? 'text-red-600' : 'text-green-600'
          )}>
            {isFreeze ? (
              <Ban className="w-5 h-5" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            {isFreeze ? '冻结账户' : '解除冻结'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-neutral-100 transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className={cn(
          'mb-6 p-4 rounded-xl',
          isFreeze ? 'bg-red-50' : 'bg-green-50'
        )}>
          <p className="text-sm text-neutral-600">用户</p>
          <p className="font-medium text-neutral-800">{user.username}</p>
          <p className={cn(
            'text-sm',
            isFreeze ? 'text-red-600' : 'text-green-600'
          )}>
            {isFreeze
              ? '冻结后该用户将无法登录和进行任何操作'
              : '解除冻结后该用户将恢复正常使用'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isFreeze && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                冻结原因
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="请输入冻结原因"
                rows={3}
                className="input resize-none"
                required
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost flex-1"
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className={cn(
                'btn flex-1',
                isFreeze
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 focus:ring-red-500 active:scale-95 shadow-md hover:shadow-lg'
                  : 'btn-primary'
              )}
              disabled={loading || (isFreeze && !reason)}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                isFreeze ? '确认冻结' : '确认解除'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProcessReportModal({ report, action, onClose, onConfirm }: ProcessReportModalProps) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report || !action) return;

    setLoading(true);
    try {
      await onConfirm(report.id, action, note);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!report || !action) return null;

  const actionConfig = {
    freeze: {
      title: '冻结用户',
      icon: Ban,
      color: 'red',
      description: '冻结该用户账户，禁止登录和操作',
    },
    warn: {
      title: '警告用户',
      icon: AlertTriangle,
      color: 'yellow',
      description: '向该用户发送警告通知',
    },
    dismiss: {
      title: '驳回举报',
      icon: XCircle,
      color: 'neutral',
      description: '该举报不成立，予以驳回',
    },
  };

  const config = actionConfig[action];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h3 className={cn(
            'font-serif text-xl font-bold flex items-center gap-2',
            config.color === 'red' && 'text-red-600',
            config.color === 'yellow' && 'text-yellow-600',
            config.color === 'neutral' && 'text-neutral-700'
          )}>
            <Icon className="w-5 h-5" />
            {config.title}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-neutral-100 transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className={cn(
          'mb-6 p-4 rounded-xl space-y-3',
          config.color === 'red' && 'bg-red-50',
          config.color === 'yellow' && 'bg-yellow-50',
          config.color === 'neutral' && 'bg-neutral-50'
        )}>
          {report.targetType === 'service' && report.targetService ? (
            <>
              <div>
                <p className="text-sm text-neutral-600 mb-1">关联服务</p>
                <p className="font-medium text-neutral-800">
                  {report.targetService.postTitle}
                </p>
                <p className="text-xs text-neutral-500">
                  时长: {report.targetService.duration}小时 · 状态: {report.targetService.status}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">涉及双方账号</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-neutral-800">{report.targetService.requester.username}</span>
                  <span className="text-neutral-400">(请求方)</span>
                  <span className="text-neutral-300">↔</span>
                  <span className="font-medium text-neutral-800">{report.targetService.provider.username}</span>
                  <span className="text-neutral-400">(提供方)</span>
                </div>
              </div>
              {action === 'freeze' && (
                <p className="text-xs text-red-600 font-medium">
                  ⚠️ 冻结操作将同时冻结以上两个账号的时间积分
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-neutral-600 mb-1">被举报用户</p>
              <p className="font-medium text-neutral-800">
                {report.targetUser?.username || `用户 #${report.targetId}`}
              </p>
            </>
          )}
          <p className="text-sm text-neutral-500 pt-1">{config.description}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              处理备注
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="请输入处理备注（可选）"
              rows={3}
              className="input resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost flex-1"
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className={cn(
                'btn flex-1',
                config.color === 'red' && 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 focus:ring-red-500 active:scale-95 shadow-md hover:shadow-lg',
                config.color === 'yellow' && 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white hover:from-yellow-600 hover:to-yellow-700 focus:ring-yellow-500 active:scale-95 shadow-md hover:shadow-lg',
                config.color === 'neutral' && 'bg-gradient-to-r from-neutral-500 to-neutral-600 text-white hover:from-neutral-600 hover:to-neutral-700 focus:ring-neutral-500 active:scale-95 shadow-md hover:shadow-lg'
              )}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                `确认${config.title}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPageSize] = useState(10);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersKeyword, setUsersKeyword] = useState('');
  const [usersStatus, setUsersStatus] = useState<'all' | 'frozen'>('all');

  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsStatus, setReportsStatus] = useState<'pending' | 'resolved' | 'dismissed' | 'all'>('pending');

  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  const [giftPointsModal, setGiftPointsModal] = useState<UserWithStats | null>(null);
  const [freezeModal, setFreezeModal] = useState<UserWithStats | null>(null);
  const [processReportModal, setProcessReportModal] = useState<{
    report: ReportWithDetails;
    action: 'freeze' | 'warn' | 'dismiss';
  } | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !user?.isAdmin) {
        navigate('/');
      }
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await adminApi.getStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await adminApi.getUsers({
        page: usersPage,
        pageSize: usersPageSize,
        keyword: usersKeyword || undefined,
        status: usersStatus === 'all' ? undefined : usersStatus,
      });
      if (res.success && res.data) {
        setUsers(res.data.list);
        setUsersTotal(res.data.total);
      }
    } catch (error) {
      console.error('加载用户列表失败:', error);
    } finally {
      setUsersLoading(false);
    }
  }, [usersPage, usersPageSize, usersKeyword, usersStatus]);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const res = await reportsApi.getList({
        status: reportsStatus === 'all' ? undefined : reportsStatus,
      });
      if (res.success && res.data) {
        setReports(res.data);
      }
    } catch (error) {
      console.error('加载举报列表失败:', error);
    } finally {
      setReportsLoading(false);
    }
  }, [reportsStatus]);

  const loadTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      const res = await adminApi.getTransactions();
      if (res.success && res.data) {
        setTransactions(res.data);
      }
    } catch (error) {
      console.error('加载交易记录失败:', error);
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.isAdmin) {
      if (activeTab === 'dashboard') loadStats();
      if (activeTab === 'users') loadUsers();
      if (activeTab === 'reports') loadReports();
      if (activeTab === 'transactions') loadTransactions();
    }
  }, [activeTab, isLoading, isAuthenticated, user, loadStats, loadUsers, loadReports, loadTransactions]);

  useEffect(() => {
    if (activeTab === 'users') {
      setUsersPage(1);
      loadUsers();
    }
  }, [usersKeyword, usersStatus, activeTab, loadUsers]);

  const handleGiftPoints = async (userId: number, points: number, reason: string) => {
    await adminApi.giftPoints(userId, { points, reason });
    loadUsers();
  };

  const handleFreezeUser = async (userId: number, reason?: string) => {
    const userToUpdate = users.find(u => u.id === userId);
    if (userToUpdate?.isFrozen) {
      await adminApi.unfreezeUser(userId);
    } else if (reason) {
      await adminApi.freezeUser(userId, { reason });
    }
    loadUsers();
    loadStats();
  };

  const handleProcessReport = async (
    reportId: number,
    action: 'freeze' | 'warn' | 'dismiss',
    note?: string
  ) => {
    await reportsApi.process(reportId, { action, note });
    loadReports();
    loadStats();
  };

  if (isLoading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user?.isAdmin) {
    return null;
  }

  const tabs = [
    { id: 'dashboard' as const, label: '数据概览', icon: BarChart3 },
    { id: 'users' as const, label: '用户管理', icon: Users },
    { id: 'reports' as const, label: '举报处理', icon: FileBarChart },
    { id: 'transactions' as const, label: '交易记录', icon: CreditCard },
  ];

  const statCards = stats ? [
    { label: '总用户数', value: stats.totalUsers, icon: Users, color: 'primary' },
    { label: '总帖子数', value: stats.totalPosts, icon: FileText, color: 'secondary' },
    { label: '总服务数', value: stats.totalServices, icon: CheckCircle, color: 'green' },
    { label: '总服务时长', value: `${stats.totalHours}h`, icon: Clock, color: 'purple' },
    { label: '待处理举报', value: stats.pendingReports, icon: AlertTriangle, color: 'yellow' },
    { label: '已冻结用户', value: stats.frozenUsers, icon: Snowflake, color: 'red' },
  ] : [];

  const totalUsersPages = Math.ceil(usersTotal / usersPageSize);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      pending: { className: 'bg-yellow-100 text-yellow-700', label: '待处理' },
      processing: { className: 'bg-blue-100 text-blue-700', label: '处理中' },
      resolved: { className: 'bg-green-100 text-green-700', label: '已处理' },
      dismissed: { className: 'bg-neutral-100 text-neutral-700', label: '已驳回' },
    };
    const cfg = config[status] || config.pending;
    return <span className={cn('badge', cfg.className)}>{cfg.label}</span>;
  };

  const getTargetTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      post: '帖子',
      user: '用户',
      service: '服务',
    };
    return labels[type] || type;
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      service: '服务交易',
      gift: '积分赠送',
      refund: '退款',
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-neutral-800">管理后台</h1>
              <p className="text-neutral-500 text-sm">平台数据管理与运营支持</p>
            </div>
          </div>

          <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl inline-flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200',
                    activeTab === tab.id
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-800'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div>
            {statsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="card p-6 animate-pulse">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 bg-neutral-200 rounded-xl" />
                      <div className="h-4 w-16 bg-neutral-200 rounded" />
                    </div>
                    <div className="h-8 w-24 bg-neutral-200 rounded mb-2" />
                    <div className="h-4 w-20 bg-neutral-200 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-stagger">
                {statCards.map((stat, index) => {
                  const Icon = stat.icon;
                  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
                    primary: { bg: 'bg-primary-100', text: 'text-primary-600', border: 'border-l-primary-500' },
                    secondary: { bg: 'bg-secondary-100', text: 'text-secondary-600', border: 'border-l-secondary-500' },
                    green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-l-green-500' },
                    purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-l-purple-500' },
                    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-l-yellow-500' },
                    red: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-l-red-500' },
                  };
                  const colors = colorClasses[stat.color] || colorClasses.primary;

                  return (
                    <div
                      key={index}
                      className={cn(
                        'card p-6 border-l-4',
                        colors.border
                      )}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center',
                          colors.bg
                        )}>
                          <Icon className={cn('w-5 h-5', colors.text)} />
                        </div>
                        {Number(stat.value) > 0 && (
                          <span className="text-xs text-neutral-500">实时数据</span>
                        )}
                      </div>
                      <div className="font-serif text-3xl font-bold text-neutral-800 mb-1">
                        {stat.value}
                      </div>
                      <div className="text-neutral-600">{stat.label}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <div className="card p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    value={usersKeyword}
                    onChange={(e) => setUsersKeyword(e.target.value)}
                    placeholder="搜索用户名、邮箱..."
                    className="input pl-10"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-neutral-600">
                    <Filter className="w-4 h-4" />
                    <select
                      value={usersStatus}
                      onChange={(e) => setUsersStatus(e.target.value as 'all' | 'frozen')}
                      className="input w-32"
                    >
                      <option value="all">全部状态</option>
                      <option value="frozen">已冻结</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {usersLoading ? (
              <div className="card overflow-hidden">
                <div className="divide-y divide-neutral-100">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-4 animate-pulse">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-neutral-200 rounded-full" />
                        <div className="flex-1">
                          <div className="h-5 w-32 bg-neutral-200 rounded mb-2" />
                          <div className="h-4 w-48 bg-neutral-200 rounded" />
                        </div>
                        <div className="flex gap-2">
                          <div className="h-8 w-20 bg-neutral-200 rounded-lg" />
                          <div className="h-8 w-20 bg-neutral-200 rounded-lg" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : users.length === 0 ? (
              <Empty
                icon={Users}
                title="暂无用户"
                description="没有找到符合条件的用户"
              />
            ) : (
              <>
                <div className="card overflow-hidden mb-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-neutral-50 border-b border-neutral-200">
                          <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-700">用户</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-700">邮箱</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-700">时间余额</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-700">信用分</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-700">帖子数</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-700">状态</th>
                          <th className="px-6 py-4 text-right text-sm font-semibold text-neutral-700">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-neutral-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white font-medium text-sm">
                                  {u.username.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-medium text-neutral-800">{u.username}</p>
                                  <p className="text-xs text-neutral-500">ID: {u.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-neutral-600">{u.email}</td>
                            <td className="px-6 py-4 font-medium text-neutral-800">{u.timeBalance}h</td>
                            <td className="px-6 py-4 text-neutral-600">{u.creditScore}</td>
                            <td className="px-6 py-4 text-neutral-600">{u.postCount}</td>
                            <td className="px-6 py-4">
                              {u.isFrozen ? (
                                <span className="badge bg-red-100 text-red-700 flex items-center gap-1">
                                  <Snowflake className="w-3 h-3" />
                                  已冻结
                                </span>
                              ) : (
                                <span className="badge bg-green-100 text-green-700 flex items-center gap-1">
                                  <UserCheck className="w-3 h-3" />
                                  正常
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setGiftPointsModal(u)}
                                  className="btn btn-ghost text-sm px-3 py-1.5 gap-1"
                                >
                                  <Gift className="w-4 h-4 text-primary-500" />
                                  赠送积分
                                </button>
                                <button
                                  onClick={() => setFreezeModal(u)}
                                  className={cn(
                                    'btn text-sm px-3 py-1.5 gap-1',
                                    u.isFrozen
                                      ? 'bg-green-50 text-green-600 hover:bg-green-100'
                                      : 'bg-red-50 text-red-600 hover:bg-red-100'
                                  )}
                                >
                                  {u.isFrozen ? (
                                    <>
                                      <UserCheck className="w-4 h-4" />
                                      解除冻结
                                    </>
                                  ) : (
                                    <>
                                      <UserX className="w-4 h-4" />
                                      冻结
                                    </>
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {totalUsersPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-neutral-600">
                      共 {usersTotal} 条记录，第 {usersPage} / {totalUsersPages} 页
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                        disabled={usersPage === 1}
                        className={cn(
                          'btn btn-ghost px-3 py-2',
                          usersPage === 1 && 'btn-disabled'
                        )}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {Array.from({ length: Math.min(5, totalUsersPages) }, (_, i) => {
                        let pageNum;
                        if (totalUsersPages <= 5) {
                          pageNum = i + 1;
                        } else if (usersPage <= 3) {
                          pageNum = i + 1;
                        } else if (usersPage >= totalUsersPages - 2) {
                          pageNum = totalUsersPages - 4 + i;
                        } else {
                          pageNum = usersPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setUsersPage(pageNum)}
                            className={cn(
                              'btn px-3 py-2 min-w-[40px]',
                              usersPage === pageNum
                                ? 'btn-primary'
                                : 'btn-ghost'
                            )}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setUsersPage(p => Math.min(totalUsersPages, p + 1))}
                        disabled={usersPage === totalUsersPages}
                        className={cn(
                          'btn btn-ghost px-3 py-2',
                          usersPage === totalUsersPages && 'btn-disabled'
                        )}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <div className="card p-4 mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <Filter className="w-4 h-4 text-neutral-500" />
                <div className="flex gap-2">
                  {[
                    { value: 'pending', label: '待处理' },
                    { value: 'resolved', label: '已处理' },
                    { value: 'dismissed', label: '已驳回' },
                    { value: 'all', label: '全部' },
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setReportsStatus(filter.value as typeof reportsStatus)}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                        reportsStatus === filter.value
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-neutral-600 hover:bg-neutral-100'
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {reportsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card p-6 animate-pulse">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-neutral-200 rounded-full" />
                        <div>
                          <div className="h-5 w-32 bg-neutral-200 rounded mb-2" />
                          <div className="h-4 w-24 bg-neutral-200 rounded" />
                        </div>
                      </div>
                      <div className="h-6 w-16 bg-neutral-200 rounded-full" />
                    </div>
                    <div className="h-4 w-full bg-neutral-200 rounded mb-2" />
                    <div className="h-4 w-3/4 bg-neutral-200 rounded" />
                  </div>
                ))}
              </div>
            ) : reports.length === 0 ? (
              <Empty
                icon={AlertCircle}
                title="暂无举报"
                description="当前没有符合条件的举报记录"
              />
            ) : (
              <div className="space-y-4 animate-stagger">
                {reports.map((report) => (
                  <div key={report.id} className="card p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
                          {report.reporter?.avatar ? (
                            <img
                              src={report.reporter.avatar}
                              alt=""
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-neutral-600 font-medium">
                              {report.reporter?.username?.charAt(0) || '?'}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-neutral-800">
                              {report.reporter?.username || `用户 #${report.reporterId}`}
                            </span>
                            <span className="text-neutral-400">举报了</span>
                            <span className="badge bg-neutral-100 text-neutral-700">
                              {getTargetTypeLabel(report.targetType)}
                            </span>
                          </div>
                          <p className="text-sm text-neutral-500">
                            {report.targetType === 'service' && report.targetService ? (
                              <>
                                服务: {report.targetService.postTitle} ({report.targetService.duration}小时)
                                <br />
                                双方账号: {report.targetService.requester.username} (请求方) ↔ {report.targetService.provider.username} (提供方)
                              </>
                            ) : (
                              <>
                                被举报者: {report.targetUser?.username || `用户 #${report.targetId}`}
                                {report.targetPost && ` · 帖子: ${report.targetPost.title}`}
                              </>
                            )}
                          </p>
                          <p className="text-xs text-neutral-400 mt-1">
                            {new Date(report.createdAt).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(report.status)}
                    </div>

                    <div className="bg-neutral-50 rounded-xl p-4 mb-4">
                      <p className="font-medium text-neutral-800 mb-2">{report.reason}</p>
                      {report.description && (
                        <p className="text-sm text-neutral-600">{report.description}</p>
                      )}
                    </div>

                    {report.status === 'pending' && (
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => setProcessReportModal({ report, action: 'freeze' })}
                          className="btn bg-red-50 text-red-600 hover:bg-red-100 gap-2"
                        >
                          <Ban className="w-4 h-4" />
                          冻结用户
                        </button>
                        <button
                          onClick={() => setProcessReportModal({ report, action: 'warn' })}
                          className="btn bg-yellow-50 text-yellow-600 hover:bg-yellow-100 gap-2"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          警告用户
                        </button>
                        <button
                          onClick={() => setProcessReportModal({ report, action: 'dismiss' })}
                          className="btn bg-neutral-50 text-neutral-600 hover:bg-neutral-100 gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          驳回举报
                        </button>
                      </div>
                    )}

                    {report.status !== 'pending' && report.adminNote && (
                      <div className="text-sm text-neutral-500">
                        <span className="font-medium">处理备注:</span> {report.adminNote}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div>
            {transactionsLoading ? (
              <div className="card overflow-hidden">
                <div className="divide-y divide-neutral-100">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-4 animate-pulse">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-neutral-200 rounded-full" />
                        <div className="flex-1">
                          <div className="h-5 w-48 bg-neutral-200 rounded mb-2" />
                          <div className="h-4 w-32 bg-neutral-200 rounded" />
                        </div>
                        <div className="h-6 w-16 bg-neutral-200 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : transactions.length === 0 ? (
              <Empty
                icon={CreditCard}
                title="暂无交易记录"
                description="当前还没有交易记录"
              />
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200">
                        <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-700">交易双方</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-700">类型</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-700">金额</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-700">关联帖子</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-700">时间</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-neutral-800">
                                {tx.fromUser?.username || `用户 #${tx.fromUserId}`}
                              </span>
                              <ChevronRight className="w-4 h-4 text-neutral-400" />
                              <span className="font-medium text-neutral-800">
                                {tx.toUser?.username || `用户 #${tx.toUserId}`}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="badge bg-primary-100 text-primary-700">
                              {getTransactionTypeLabel(tx.type)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-primary-600">+{tx.amount}h</span>
                          </td>
                          <td className="px-6 py-4 text-neutral-600">
                            {tx.postTitle || '-'}
                          </td>
                          <td className="px-6 py-4 text-neutral-500 text-sm">
                            {new Date(tx.createdAt).toLocaleString('zh-CN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <GiftPointsModal
        user={giftPointsModal}
        onClose={() => setGiftPointsModal(null)}
        onConfirm={handleGiftPoints}
      />

      <FreezeModal
        user={freezeModal}
        onClose={() => setFreezeModal(null)}
        onConfirm={handleFreezeUser}
      />

      <ProcessReportModal
        report={processReportModal?.report || null}
        action={processReportModal?.action || null}
        onClose={() => setProcessReportModal(null)}
        onConfirm={handleProcessReport}
      />
    </div>
  );
}
