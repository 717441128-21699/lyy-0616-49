import type {
  User,
  Post,
  Service,
  Transaction,
  Conversation,
  Message,
  Report,
  LoginRequest,
  RegisterRequest,
  CreatePostRequest,
  CreateReportRequest,
  ConfirmServiceRequest,
  GiftPointsRequest,
  ProcessReportRequest,
  PaginatedResponse,
  ApiResponse,
} from '../../shared/types.js';

const BASE_URL = '/api';

async function request<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || '请求失败');
  }

  return data;
}

export const authApi = {
  login: (data: LoginRequest) =>
    request<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  register: (data: RegisterRequest) =>
    request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request('/auth/logout', { method: 'POST' }),

  getMe: () => request<User>('/auth/me'),
};

export const postsApi = {
  getList: (params?: {
    category?: string;
    type?: string;
    page?: number;
    pageSize?: number;
    keyword?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.type) query.append('type', params.type);
    if (params?.page) query.append('page', String(params.page));
    if (params?.pageSize) query.append('pageSize', String(params.pageSize));
    if (params?.keyword) query.append('keyword', params.keyword);

    return request<PaginatedResponse<Post & { user: Partial<User> }>>(
      `/posts?${query.toString()}`
    );
  },

  getDetail: (id: number) =>
    request<Post & { user: Partial<User> }>(`/posts/${id}`),

  search: (keyword: string) =>
    request<Post[]>(`/posts/search?keyword=${encodeURIComponent(keyword)}`),

  create: (data: CreatePostRequest) =>
    request<Post & { user: Partial<User> }>('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const usersApi = {
  getProfile: (id: number) =>
    request<{
      id: number;
      username: string;
      avatar?: string;
      creditScore: number;
      completedServices: number;
      avgRating?: number;
      joinDate: string;
    }>(`/users/${id}`),

  getPosts: (id: number, params?: { type?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.type) query.append('type', params.type);
    if (params?.status) query.append('status', params.status);
    return request<Post[]>(`/users/${id}/posts?${query.toString()}`);
  },

  getReviews: (id: number, type: 'received' | 'given' = 'received') =>
    request<Array<{
      id: number;
      rating: number;
      comment?: string;
      createdAt: string;
      post: { id: number; title: string };
      otherUser: { id: number; username: string; avatar?: string };
    }>>(`/users/${id}/reviews?type=${type}`),
};

export const servicesApi = {
  create: (data: { postId: number; duration: number }) =>
    request<
      Service & {
        post: Partial<Post>;
        requester: Partial<User>;
        provider: Partial<User>;
      }
    >('/services', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getOrCreate: (data: { postId: number; duration: number }) =>
    request<
      Service & {
        post: Partial<Post>;
        requester: Partial<User>;
        provider: Partial<User>;
      }
    >('/services/get-or-create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getDetail: (id: number) =>
    request<
      Service & {
        post: Partial<Post>;
        requester: Partial<User>;
        provider: Partial<User>;
        reviews: Array<{
          id: number;
          rating: number;
          comment?: string;
          createdAt: string;
          reviewer: Partial<User>;
        }>;
      }
    >(`/services/${id}`),

  confirm: (id: number, data: ConfirmServiceRequest) =>
    request<
      Transaction & {
        fromUser: Partial<User>;
        toUser: Partial<User>;
      }
    >(`/services/${id}/confirm`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const transactionsApi = {
  getList: (params?: { page?: number; pageSize?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.pageSize) query.append('pageSize', String(params.pageSize));

    return request<
      PaginatedResponse<
        Transaction & {
          fromUser: Partial<User>;
          toUser: Partial<User>;
          service?: { id: number; status: string; duration: number; postTitle: string };
        }
      >
    >(`/transactions?${query.toString()}`);
  },

  getStats: () =>
    request<{
      totalEarned: number;
      totalSpent: number;
      currentBalance: number;
    }>('/transactions/stats'),
};

export const conversationsApi = {
  getList: () =>
    request<
      Array<
        Conversation & {
          otherUser: Partial<User>;
          postTitle?: string;
          lastMessage?: { content: string; createdAt: string; senderId: number };
          unreadCount: number;
        }
      >
    >('/conversations'),

  getMessages: (id: number) =>
    request<
      Array<
        Message & {
          sender: Partial<User>;
        }
      >
    >(`/conversations/${id}/messages`),

  sendMessage: (id: number, data: { content: string; type?: string }) =>
    request<
      Message & {
        sender: Partial<User>;
      }
    >(`/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  create: (data: { participantId: number; postId?: number }) =>
    request<{ id: number; isNew: boolean }>('/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const reportsApi = {
  create: (data: CreateReportRequest) =>
    request<Report>('/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getList: (params?: { status?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    return request<
      Array<
        Report & {
          reporter: Partial<User>;
          targetUser?: Partial<User>;
          targetPost?: Partial<Post>;
        }
      >
    >(`/reports?${query.toString()}`);
  },

  process: (id: number, data: ProcessReportRequest) =>
    request(`/reports/${id}/process`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const adminApi = {
  getStats: () =>
    request<{
      totalUsers: number;
      totalPosts: number;
      totalServices: number;
      totalHours: number;
      pendingReports: number;
      frozenUsers: number;
    }>('/admin/stats'),

  getUsers: (params?: { page?: number; pageSize?: number; keyword?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.pageSize) query.append('pageSize', String(params.pageSize));
    if (params?.keyword) query.append('keyword', params.keyword);
    if (params?.status) query.append('status', params.status);

    return request<
      PaginatedResponse<
        User & {
          postCount: number;
          serviceCount: number;
          avgRating?: number;
        }
      >
    >(`/admin/users?${query.toString()}`);
  },

  giftPoints: (id: number, data: GiftPointsRequest) =>
    request<{ newBalance: number }>(`/admin/users/${id}/gift-points`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  freezeUser: (id: number, data: { reason: string }) =>
    request(`/admin/users/${id}/freeze`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  unfreezeUser: (id: number) =>
    request(`/admin/users/${id}/unfreeze`, {
      method: 'POST',
    }),

  getTransactions: () =>
    request<
      Array<
        Transaction & {
          fromUser: Partial<User>;
          toUser: Partial<User>;
          postTitle?: string;
        }
      >
    >('/admin/transactions'),
};

export const publicApi = {
  getStats: () =>
    request<{
      totalUsers: number;
      totalServices: number;
      totalHours: number;
      activePosts: number;
    }>('/stats/public'),
};
