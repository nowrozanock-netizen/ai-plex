import { createFileRoute } from '@tanstack/react-router';
import { handleAdmobReward } from '@/lib/admob-verification.server';

export const Route = createFileRoute('/api/public/admob-reward')({
  server: { handlers: { GET: ({ request }) => handleAdmobReward(request) } },
});