import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'success';

const variants: Record<Variant, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 border border-blue-500/50',
  secondary:
    'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700',
  ghost:
    'bg-transparent text-zinc-300 hover:bg-zinc-800/80 border border-zinc-700/80',
  success:
    'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 border border-emerald-500/50',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'primary',
  className = '',
  children,
  href,
  ...props
}: {
  variant?: Variant;
  className?: string;
  children: ReactNode;
  href: string;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </a>
  );
}
