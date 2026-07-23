import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'prompt-ocean — type a sea, watch it exist',
  description:
    'An open-source AI-driven 3D ocean. Describe the sea in plain words and a Gerstner-wave shader brings it to life. Next.js + React Three Fiber + optional local LLM.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
