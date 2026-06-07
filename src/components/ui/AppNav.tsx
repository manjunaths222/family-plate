'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { UtensilsCrossed, ShoppingCart, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/cn';

const NAV_ITEMS = [
  { href: '/plan',     icon: UtensilsCrossed, label: 'Plan'    },
  { href: '/grocery',  icon: ShoppingCart,    label: 'Grocery' },
  { href: '/settings', icon: Settings,        label: 'Settings'},
];

export function AppNav() {
  const { user } = useAuth();
  const pathname  = usePathname();

  return (
    <>
      {/* Top bar (desktop) */}
      <header className="hidden md:flex items-center justify-between px-6 py-3 bg-surface-raised border-b border-border">
        <Link href="/plan" className="flex items-center gap-2 font-bold text-brand text-lg">
          🍲 FamilyPlate
        </Link>
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                pathname.startsWith(href)
                  ? 'bg-brand text-white'
                  : 'text-on-surface-muted hover:text-on-surface hover:bg-border',
              )}
            >
              <Icon size={16} /> {label}
            </Link>
          ))}
        </nav>
        {user?.photoURL && (
          <Image
            src={user.photoURL}
            alt={user.displayName ?? 'User'}
            width={32}
            height={32}
            className="rounded-full"
          />
        )}
      </header>

      {/* Bottom tab bar (mobile) */}
      <nav className="fixed bottom-0 inset-x-0 md:hidden flex items-center justify-around bg-surface-raised border-t border-border py-2 z-50">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-6 py-1 rounded-xl text-xs font-medium transition-colors',
                active ? 'text-brand' : 'text-on-surface-muted',
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
