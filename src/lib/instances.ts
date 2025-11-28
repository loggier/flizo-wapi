import type { Instance } from './definitions';
import { getInstances as getInstancesAction } from '@/app/actions';

// This file is now a proxy for server actions to avoid bundling server-side code on the client.

type GetInstancesResult = { success: true; instances: Instance[] } | { success: false; error: string };

export async function getInstances(): Promise<GetInstancesResult> {
    return await getInstancesAction();
}
