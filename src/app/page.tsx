import { getInstances } from '@/lib/instances';
import { Header } from '@/components/dashboard/header';
import { InstanceList } from '@/components/dashboard/instance-list';

export default async function DashboardPage() {
  // Fetching instances on the server to be passed to the client component
  const instancesResult = await getInstances();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <InstanceList 
          initialInstances={instancesResult.success ? instancesResult.instances : []}
          error={!instancesResult.success ? instancesResult.error : null}
        />
      </main>
    </div>
  );
}
