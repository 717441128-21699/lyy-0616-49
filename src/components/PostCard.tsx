import { Link } from 'react-router-dom';
import { Clock, MapPin, User } from 'lucide-react';
import type { Post } from '../../shared/types.js';
import { CATEGORY_MAP } from '../../shared/types.js';
import { cn } from '../lib/utils.js';

interface PostCardProps {
  post: Post & { user?: { id: number; username: string; creditScore?: number; avatar?: string } };
}

export default function PostCard({ post }: PostCardProps) {
  const category = CATEGORY_MAP[post.category];

  return (
    <Link
      to={`/services/${post.id}`}
      className={cn(
        'card card-hover p-5 block animate-fade-in',
        `category-border-${post.category}`
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={cn('badge', `badge-category-${post.category}`)}
            style={{ backgroundColor: category ? `${category.color}15` : undefined, color: category?.color }}
          >
            {category?.name || post.category}
          </span>
          <span className={cn('badge text-xs', post.type === 'offer' ? 'badge-offer' : 'badge-request')}>
            {post.type === 'offer' ? '提供服务' : '寻求帮助'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-primary-600 font-semibold">
          <Clock className="w-4 h-4" />
          <span>{post.duration}h</span>
        </div>
      </div>

      <h3 className="font-serif text-lg font-semibold text-neutral-800 mb-2 line-clamp-2 hover:text-primary-600 transition-colors">
        {post.title}
      </h3>

      <p className="text-neutral-600 text-sm mb-4 line-clamp-2">{post.description}</p>

      <div className="flex items-center justify-between text-sm text-neutral-500 pt-3 border-t border-neutral-100">
        <div className="flex items-center gap-1">
          <User className="w-4 h-4" />
          <span>{post.user?.username}</span>
          {post.user?.creditScore && (
            <span className="text-secondary-600 font-medium ml-1">
              ({post.user.creditScore}分)
            </span>
          )}
        </div>
        {post.location && (
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span className="truncate max-w-32">{post.location}</span>
          </div>
        )}
      </div>

      <div className="mt-2 text-xs text-neutral-400">
        {new Date(post.createdAt).toLocaleDateString('zh-CN')}
      </div>
    </Link>
  );
}
