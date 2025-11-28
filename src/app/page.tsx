'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getInstances } from '@/app/actions';
import { Header } from '@/components/dashboard/header';
import { InstanceList } from '@/components/dashboard/instance-list';
import Loading from './loading';
import type { Instance } from '@/lib/definitions';

export default function DashboardPage() {
  const router = useRouter();
  const [instancesResult, setInstancesResult] = useState<{ success: boolean; instances?: Instance[]; error?: string | null }>({ success: false, instances: [], error: null });
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleRefresh = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    const result = await getInstances();
    if (result.success) {
      setInstancesResult({ success: true, instances: result.instances, error: null });
    } else {
      setInstancesResult({ success: false, error: result.error });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const token = localStorage.getItem('session_token');
    if (!token) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);
  
  useEffect(() => {
    handleRefresh();
  }, [isAuthenticated]);
  
  if (!isAuthenticated) {
    return <Loading />;
  }

  if (isLoading && instancesResult.instances?.length === 0) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header onRefresh={handleRefresh} />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <InstanceList 
          initialInstances={instancesResult.success ? instancesResult.instances ?? [] : []}
          error={!instancesResult.success ? instancesResult.error : null}
          onRefresh={handleRefresh}
        />
      </main>
    </div>
  );
}
