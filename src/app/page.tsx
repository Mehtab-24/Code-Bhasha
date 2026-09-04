import type { Metadata } from 'next';
import { LandingPage } from '@/components/Landing/LandingPage';

export const metadata: Metadata = {
  title: 'CodeBhasha — Syntax is a barrier. Logic is universal.',
  description:
    'A voice-first Hinglish-to-Python compiler. Speak your logic, get working Python, and run it instantly in the browser.',
};

export default function Home() {
  return <LandingPage />;
}
