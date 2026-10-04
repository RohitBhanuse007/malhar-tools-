import { en } from './en';
import { mr } from './mr';

export type Language = 'en' | 'mr';

export const translations = {
  en,
  mr,
};

// Helper type to support nested dot keys or direct access
export function getNestedTranslation(obj: any, path: string): string {
  const keys = path.split('.');
  let current: any = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return path; // fallback to key path if missing
    }
  }
  return typeof current === 'string' ? current : path;
}
