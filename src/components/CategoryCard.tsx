import { Link } from 'react-router-dom';
import { Home, GraduationCap, Heart, Car } from 'lucide-react';
import { cn } from '../lib/utils.js';

const iconMap: Record<string, React.ElementType> = {
  housework: Home,
  teaching: GraduationCap,
  companion: Heart,
  transport: Car,
};

interface CategoryCardProps {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export default function CategoryCard({ id, name, icon, color, description }: CategoryCardProps) {
  const Icon = iconMap[icon] || Home;

  return (
    <Link
      to={`/services?category=${id}`}
      className="card card-hover p-6 group block"
    >
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon className="w-7 h-7" style={{ color }} />
      </div>
      <h3 className="font-serif text-xl font-semibold text-neutral-800 mb-2 group-hover:text-primary-600 transition-colors">
        {name}
      </h3>
      <p className="text-neutral-600 text-sm">{description}</p>
    </Link>
  );
}
