import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merges Tailwind classes, resolving conflicts correctly. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
