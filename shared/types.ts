export interface User {
  id: number;
  username: string;
  email: string;
  phone?: string;
  avatar?: string;
  timeBalance: number;
  creditScore: number;
  isAdmin: boolean;
  isFrozen: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: number;
  userId: number;
  title: string;
  description: string;
  category: string;
  type: 'offer' | 'request';
  duration: number;
  location?: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface Service {
  id: number;
  postId: number;
  requesterId: number;
  providerId: number;
  duration: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  scheduledAt?: string;
  completedAt?: string;
  createdAt: string;
  post?: Post;
  requester?: User;
  provider?: User;
}

export interface Transaction {
  id: number;
  serviceId?: number;
  fromUserId: number;
  toUserId: number;
  amount: number;
  type: 'service' | 'gift' | 'refund';
  description?: string;
  createdAt: string;
  fromUser?: User;
  toUser?: User;
  service?: Service;
}

export interface Conversation {
  id: number;
  postId?: number;
  createdAt: string;
  updatedAt: string;
  participants?: User[];
  lastMessage?: Message;
  unreadCount?: number;
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  type: 'text' | 'system';
  isRead: boolean;
  createdAt: string;
  sender?: User;
}

export interface Review {
  id: number;
  serviceId: number;
  reviewerId: number;
  revieweeId: number;
  rating: number;
  comment?: string;
  createdAt: string;
  reviewer?: User;
  reviewee?: User;
  service?: Service;
}

export interface Report {
  id: number;
  reporterId: number;
  targetType: 'post' | 'user' | 'service';
  targetId: number;
  reason: string;
  description?: string;
  status: 'pending' | 'processing' | 'resolved' | 'dismissed';
  adminNote?: string;
  createdAt: string;
  processedAt?: string;
  reporter?: User;
  targetUser?: User;
  targetPost?: Post;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  phone?: string;
}

export interface CreatePostRequest {
  title: string;
  description: string;
  category: string;
  type: 'offer' | 'request';
  duration: number;
  location?: string;
}

export interface CreateReportRequest {
  type: 'post' | 'user' | 'service';
  targetId: number;
  reason: string;
  description?: string;
}

export interface ConfirmServiceRequest {
  rating: number;
  review?: string;
}

export interface GiftPointsRequest {
  points: number;
  reason: string;
}

export interface FreezeUserRequest {
  reason: string;
}

export interface ProcessReportRequest {
  action: 'freeze' | 'warn' | 'dismiss';
  note?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const CATEGORIES = [
  { id: 'housework', name: '家政协助', icon: 'Home', color: '#FF6B35' },
  { id: 'teaching', name: '技能教学', icon: 'GraduationCap', color: '#2EC4B6' },
  { id: 'companion', name: '陪伴探访', icon: 'Heart', color: '#FF8FA3' },
  { id: 'transport', name: '托管接送', icon: 'Car', color: '#4ECDC4' },
] as const;

export const CATEGORY_MAP: Record<string, typeof CATEGORIES[number]> = CATEGORIES.reduce(
  (acc, cat) => ({ ...acc, [cat.id]: cat }),
  {} as Record<string, typeof CATEGORIES[number]>
);
