import { cn } from '@/lib/utils';
import { SearchX } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface EmptyProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  className?: string;
}

export default function Empty({
  icon: Icon = SearchX,
  title = '暂无数据',
  description = '没有找到相关内容，试试其他筛选条件吧',
  className,
}: EmptyProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
    >
      <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-neutral-400" />
      </div>
      <h3 className="font-serif text-xl font-semibold text-neutral-700 mb-2">{title}</h3>
      <p className="text-neutral-500 max-w-md">{description}</p>
    </div>
  );
}
