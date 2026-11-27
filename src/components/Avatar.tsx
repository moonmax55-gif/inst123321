import { ShieldCheck } from 'lucide-react';
import { UserRole } from '../types';

interface AvatarProps {
  name: string;
  color: string;
  role?: UserRole;
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({ name, color, role, size = 'md' }: AvatarProps) {
  const sizeClass =
    size === 'sm'
      ? 'w-8 h-8 text-xs'
      : size === 'lg'
      ? 'w-14 h-14 text-lg'
      : 'w-10 h-10 text-sm';

  const initial = (name || '학').trim().slice(0, 1);

  return (
    <div className="relative inline-flex shrink-0">
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white shadow-sm ring-2 ring-blue-100 select-none`}
        style={{ backgroundColor: color || '#2563EB' }}
        aria-label={`${name} 프로필`}
      >
        {initial}
      </div>
      {role === 'teacher' && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-700 text-white flex items-center justify-center ring-2 ring-white"
          title="담임 선생님"
        >
          <ShieldCheck className="w-2.5 h-2.5" />
        </span>
      )}
    </div>
  );
}
