'use client';

import type { Instance } from '@/lib/definitions';
import { InstanceCard } from './instance-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, ServerOff } from 'lucide-react';

interface InstanceListProps {
  initialInstances: Instance[];
  error: string | null;
}

export function InstanceList({ initialInstances, error }: InstanceListProps) {
  if (error) {
    return (
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>
            Could not load instance data. Please check the console for details.
            <p className="mt-2 font-mono text-xs">{error}</p>
          </AlertDescription>
        </Alert>
    );
  }

  if (initialInstances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-4 border-2 border-dashed rounded-lg">
        <ServerOff className="w-16 h-16 text-muted-foreground" />
        <h2 className="mt-6 text-2xl font-semibold font-headline">No Instances Found</h2>
        <p className="mt-2 text-muted-foreground">Get started by creating your first Evolution API instance.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {initialInstances.map((instance) => (
        <InstanceCard key={instance.instanceName} instance={instance} />
      ))}
    </div>
  );
}
