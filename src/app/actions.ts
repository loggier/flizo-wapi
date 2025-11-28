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
      return 'Credenciales inválidas.';
    }
  } catch (error) {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Ocurrió un error desconocido.';
  }
  redirect('/');
}

export async function logout() {
  cookies().set('session', '', { expires: new Date(0) });
  redirect('/login');
}


// --- INSTANCE ACTIONS ---

export async function createInstance(formData: FormData) {
  const schema = z.object({
    instanceName: z.string().min(1, "El nombre es requerido"),
    apiKey: z.string().min(1, "El token es requerido"),
    channel: z.string().optional(),
    number: z.string().optional(),
  });
  
  const parseResult = schema.safeParse(Object.fromEntries(formData.entries()));

  if (!parseResult.success) {
    return { success: false, error: parseResult.error.errors.map(e => e.message).join(', ') };
  }
  
  const { instanceName, apiKey, channel, number } = parseResult.data;

  // Check if instance already exists
  const existingInstancesResult = await getInstances();
  if (existingInstancesResult.success && existingInstancesResult.instances.some(inst => inst.instanceName === instanceName)) {
    return { success: false, error: 'Ya existe una instancia con este nombre.' };
  }

  // NOTE: We are no longer calling the Evolution API to create the instance here.
  // We assume the instance is pre-configured and we are just adding it to the dashboard.
  // We can try to get the status to see if it's a valid instance.
  
  try {
     // Let's check if we can get a connection state. This validates the instance and API key.
     await apiGetInstanceStatus(instanceName, apiKey);

     const newInstance: Instance = {
       instanceName,
       apiKey,
       status: 'DISCONNECTED', // Start as disconnected, user will need to connect
       channel: channel || '',
       number: number || '',
     };
 
     await addInstance(newInstance);
     revalidatePath('/');
     return { success: true, instance: newInstance };

  } catch (error) {
      let errorMessage = 'No se pudo verificar la instancia con la API de Evolution. Revisa el nombre y el token.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      return { success: false, error: errorMessage };
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
    // We need to retrieve the apiKey for the instance to check its status
    const instancesResult = await getInstances();
    if (!instancesResult.success) {
      return { success: false, error: "No se pudieron obtener las instancias locales." };
    }
    const instance = instancesResult.instances.find(inst => inst.instanceName === instanceName);
    if (!instance) {
      return { success: false, error: "Instancia no encontrada localmente." };
    }

    const result = await apiGetInstanceStatus(instanceName, instance.apiKey);
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
    console.error(`La eliminación de la API falló para ${instanceName}: ${apiDeleteResult.error}`);
    return { success: true, warning: 'Instancia eliminada del dashboard, pero no se pudo eliminar de la API de Evolution.' };
  }

  return { success: true };
}


// --- GenAI ACTION ---

export async function getApiHelp(feature: string) {
  if (!feature) {
    return { success: false, error: "Por favor, proporciona una feature para obtener ayuda." };
  }

  try {
    const result = await genAiGetHelp({ feature });
    return { success: true, helpText: result.helpText };
  } catch (error) {
    console.error("Error de ayuda de GenAI:", error);
    return { success: false, error: "No se pudo obtener ayuda del asistente de IA." };
  }
}
