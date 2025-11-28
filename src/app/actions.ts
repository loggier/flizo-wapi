'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  createInstance as apiCreateInstance,
  fetchQrCode as apiFetchQrCode,
  getInstanceStatus as apiGetInstanceStatus,
  logoutInstance as apiLogoutInstance,
  deleteInstance as apiDeleteInstance,
} from '@/lib/evolution';
import { addInstance, updateInstance, deleteInstance as fileDeleteInstance, getInstances } from '@/lib/instances';
import { encrypt, decrypt } from '@/lib/session';
import type { Instance } from '@/lib/definitions';
import { getEvolutionApiHelp as genAiGetHelp } from '@/ai/flows/evolution-api-tool-prompts';

// --- AUTH ACTIONS ---

const AuthFormSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    const { username, password } = AuthFormSchema.parse(Object.fromEntries(formData.entries()));

    if (username === process.env.AUTH_USER && password === process.env.AUTH_PASSWORD) {
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      const session = await encrypt({ user: { name: username }, expires });

      cookies().set('session', session, { expires, httpOnly: true });
      
    } else {
      return 'Invalid credentials.';
    }
  } catch (error) {
    if (error instanceof Error) {
      return error.message;
    }
    return 'An unknown error occurred.';
  }
  redirect('/');
}

export async function logout() {
  cookies().set('session', '', { expires: new Date(0) });
  redirect('/login');
}


// --- INSTANCE ACTIONS ---

export async function createInstance(formData: FormData) {
  const schema = z.object({ instanceName: z.string().min(3).max(50) });
  const parseResult = schema.safeParse({ instanceName: formData.get('instanceName') });

  if (!parseResult.success) {
    return { success: false, error: 'Invalid instance name.' };
  }
  
  const { instanceName } = parseResult.data;

  // Check if instance already exists
  const existingInstancesResult = await getInstances();
  if (existingInstancesResult.success && existingInstancesResult.instances.some(inst => inst.instanceName === instanceName)) {
    return { success: false, error: 'An instance with this name already exists.' };
  }

  const result = await apiCreateInstance(instanceName);

  if (result.success) {
    const newInstance: Instance = {
      instanceName: result.data.instance.instanceName,
      apiKey: result.data.hash.apikey,
      status: 'CREATED',
    };
    await addInstance(newInstance);
    revalidatePath('/');
    return { success: true, instance: newInstance };
  } else {
    return { success: false, error: result.error };
  }
}

export async function getQrCode(instanceName: string) {
  const result = await apiFetchQrCode(instanceName);
  if (result.success) {
    await updateInstance(instanceName, { status: 'CONNECTING' });
    revalidatePath('/');
    return { success: true, qr: result.qr, instanceName: result.instanceName };
  }
  return { success: false, error: result.error };
}

export async function checkInstanceStatus(instanceName: string) {
    const result = await apiGetInstanceStatus(instanceName);
    if (result.success) {
        const newStatus = result.state === 'CONNECTED' ? 'CONNECTED' : 'DISCONNECTED';
        await updateInstance(instanceName, { status: newStatus });
        revalidatePath('/');
        return { success: true, status: newStatus };
    }
    return { success: false, error: result.error };
}

export async function disconnectInstance(instanceName: string) {
  const result = await apiLogoutInstance(instanceName);
  if (result.success) {
    await updateInstance(instanceName, { status: 'DISCONNECTED' });
    revalidatePath('/');
    return { success: true };
  }
  return { success: false, error: result.error };
}

export async function deleteInstance(instanceName: string) {
  // First, delete from the local file to prevent orphaned entries
  const fileDeleteResult = await fileDeleteInstance(instanceName);
  if (!fileDeleteResult.success) {
    return { success: false, error: fileDeleteResult.error };
  }

  // Then, attempt to delete from the Evolution API
  const apiDeleteResult = await apiDeleteInstance(instanceName);
  
  revalidatePath('/');

  if (!apiDeleteResult.success) {
    // Log the error but consider the primary operation (file deletion) a success for the UI
    console.error(`API deletion failed for ${instanceName}: ${apiDeleteResult.error}`);
    return { success: true, warning: 'Instance removed from dashboard, but failed to delete from Evolution API.' };
  }

  return { success: true };
}


// --- GenAI ACTION ---

export async function getApiHelp(feature: string) {
  if (!feature) {
    return { success: false, error: "Please provide a feature to get help with." };
  }

  try {
    const result = await genAiGetHelp({ feature });
    return { success: true, helpText: result.helpText };
  } catch (error) {
    console.error("GenAI help error:", error);
    return { success: false, error: "Failed to get help from AI assistant." };
  }
}
