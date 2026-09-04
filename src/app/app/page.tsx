import type { Metadata } from 'next';
import { StudioShell } from '@/components/Studio/StudioShell';

export const metadata: Metadata = {
  title: 'CodeBhasha Studio — Bolo, Likho, Chalao',
  description:
    'The CodeBhasha developer studio: speak Hinglish or type it, generate Python, and run it instantly in the browser.',
};

export default function PlaygroundPage() {
  return <StudioShell />;
}
