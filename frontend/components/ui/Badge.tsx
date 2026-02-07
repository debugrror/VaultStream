import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'default' | 'public' | 'unlisted' | 'private';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    success: 'bg-green-500/10 text-green-500 border-green-500/20',
    warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    error: 'bg-red-500/10 text-red-500 border-red-500/20',
    default: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    public: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    unlisted: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    private: 'bg-gray-600/10 text-gray-400 border-gray-600/20',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
