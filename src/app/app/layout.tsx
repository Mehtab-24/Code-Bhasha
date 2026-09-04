import type { Metadata } from 'next';
import { BodyScrollLock } from '@/components/Studio/BodyScrollLock';

export const metadata: Metadata = {
  title: 'CodeBhasha Studio — Bolo, Likho, Chalao',
  description:
    'The CodeBhasha developer studio: speak Hinglish or type it, generate Python, and run it instantly in the browser.',
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BodyScrollLock />
      {children}
    </>
  );
}
