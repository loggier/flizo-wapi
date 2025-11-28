'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    router.push('/login');
  };

  return (
    <form action={handleLogout}>
      <Button variant="ghost" size="icon" type="submit" aria-label="Cerrar sesión">
        <LogOut className="h-5 w-5" />
      </Button>
    </form>
  );
}