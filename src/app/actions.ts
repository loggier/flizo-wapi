'use server';

import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import {
  createInstance as apiCreateInstance,
  fetchQrCode as apiFetchQrCode,
  getInstanceStatus as apiGetInstanceStatus,
  logoutInstance as apiLogoutInstance,
  deleteInstance as apiDeleteInstance,
} from '@/lib/evolution';
import { encrypt, decrypt } from '@/lib/session';
import type { Instance } from '@/lib/definitions';
import { getEvolutionApiHelp as genAiGetHelp } from '@/ai/flows/evolution-api-tool-prompts';


// --- FILE SYSTEM ACTIONS FOR INSTANCES ---

const dataFilePath = path.join(process.cwd(), 'src', 'data', 'instances.json');

type GetInstancesResult = { success: true; instances: Instance[] } | { success: false; error: string };
type MutateInstanceResult = { success: true } | { success: false; error: string };

async function readData(): Promise<GetInstancesResult> {
  try {
    await fs.access(dataFilePath);
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    const instances: Instance[] = JSON.parse(fileContent);
    return { success: true, instances };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await writeData([]);
      return { success: true, instances: [] };
    }
    console.error('Failed to read instances data:', error);
    return { success: false, error: 'No se pudieron leer los datos de las instancias.' };
  }
}

async function writeData(data: Instance[]): Promise<MutateInstanceResult> {
  try {
    const jsonData = JSON.stringify(data, null, 2);
    await fs.writeFile(dataFilePath, jsonData, 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Failed to write instances data:', error);
    return { success: false, error: 'No se pudieron escribir los datos de las instancias.' };
  }
}

export async function getInstances(): Promise<GetInstancesResult> {
  return readData();
}

async function addInstance(newInstance: Instance): Promise<MutateInstanceResult> {
  const readResult = await readData();
  if (!readResult.success) return readResult;

  const instances = readResult.instances;
  if (instances.some(inst => inst.instanceName === newInstance.instanceName)) {
    return { success: false, error: 'La instancia ya existe.' };
  }
  
  instances.push(newInstance);
  return writeData(instances);
}

async function updateInstance(instanceName: string, updateData: Partial<Instance>): Promise<MutateInstanceResult> {
  const readResult = await readData();
  if (!readResult.success) return readResult;

  const instances = readResult.instances;
  const instanceIndex = instances.findIndex(inst => inst.instanceName === instanceName);

  if (instanceIndex === -1) {
    return { success: false, error: 'Instancia no encontrada.' };
  }

  instances[instanceIndex] = { ...instances[instanceIndex], ...updateData };
  return writeData(instances);
}

async function fileDeleteInstance(instanceName: string): Promise<MutateInstanceResult> {
  const readResult = await readData();
  if (!readResult.success) return readResult;

  let instances = readResult.instances;
  const initialLength = instances.length;
  instances = instances.filter(inst => inst.instanceName !== instanceName);

  if (instances.length === initialLength) {
    return { success: true };
  }

  return writeData(instances);
}


// --- AUTH ACTIONS ---

const AuthFormSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export async function authenticate(
  prevState: { error: string | undefined },
  formData: FormData,
) {
  try {
    const { username, password } = AuthFormSchema.parse(Object.fromEntries(formData.entries()));

    if (username === process.env.AUTH_USER && password === process.env.AUTH_PASSWORD) {
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      const session = await encrypt({ user: { name: username }, expires });
      return { success: true, token: session };
    } else {
      return { error: 'Credenciales inválidas.' };
    }
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: 'Ocurrió un error desconocido.' };
  }
}

export async function getSession() {
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) return null;
  // This might fail if the secret changes or token is invalid
  try {
    return await decrypt(sessionCookie);
  } catch (error) {
    return null;
  }
}


// --- INSTANCE ACTIONS ---

export async function createInstance(formData: FormData) {
  const schema = z.object({
    instanceName: z.string().min(1, "El nombre es requerido"),
    channel: z.string().optional(),
    number: z.string().optional(),
  });
  
  const parseResult = schema.safeParse(Object.fromEntries(formData.entries()));

  if (!parseResult.success) {
    return { success: false, error: parseResult.error.errors.map(e => e.message).join(', ') };
  }
  
  const { instanceName, channel, number } = parseResult.data;

  // Generate a random token
  const token = randomBytes(16).toString('hex');

  try {
     const apiResult = await apiCreateInstance(instanceName, token, number);
     if (!apiResult.success) {
       return { success: false, error: apiResult.error };
     }

     const newInstance: Instance = {
       instanceName,
       apiKey: token,
       status: 'CREATED', // Start as created, user will need to connect
       channel: channel || '',
       number: number || '',
     };
 
     await addInstance(newInstance);
     revalidatePath('/');
     return { success: true, instance: newInstance };

  } catch (error) {
      let errorMessage = 'No se pudo crear la instancia en la API de Evolution.';
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
  // We need to retrieve the apiKey for the instance to disconnect
  const instancesResult = await getInstances();
  if (!instancesResult.success) {
      return { success: false, error: "No se pudieron obtener las instancias locales." };
  }
  const instance = instancesResult.instances.find(inst => inst.instanceName === instanceName);
  if (!instance) {
      return { success: false, error: "Instancia no encontrada localmente." };
  }

  const result = await apiLogoutInstance(instanceName, instance.apiKey);
  if (result.success) {
    await updateInstance(instanceName, { status: 'DISCONNECTED' });
    revalidatePath('/');
    return { success: true };
  }
  return { success: false, error: result.error };
}

export async function deleteInstance(instanceName: string) {
  // We need to retrieve the apiKey for the instance to delete from API
  const instancesResult = await getInstances();
  let apiKey: string | undefined;
  if (instancesResult.success) {
    apiKey = instancesResult.instances.find(inst => inst.instanceName === instanceName)?.apiKey;
  }

  // First, delete from the local file to prevent orphaned entries
  const fileDeleteResult = await fileDeleteInstance(instanceName);
  if (!fileDeleteResult.success) {
    return { success: false, error: fileDeleteResult.error };
  }
  
  revalidatePath('/'); // Revalidate immediately after local deletion

  if (apiKey) {
      // Then, attempt to delete from the Evolution API
      const apiDeleteResult = await apiDeleteInstance(instanceName, apiKey);
      if (!apiDeleteResult.success) {
        // Log the error but consider the primary operation (file deletion) a success for the UI
        console.error(`La eliminación de la API falló para ${instanceName}: ${apiDeleteResult.error}`);
        return { success: true, warning: 'Instancia eliminada del dashboard, pero no se pudo eliminar de la API de Evolution.' };
      }
  } else {
    console.warn(`No se encontró API key para ${instanceName}, no se eliminará de la API de Evolution.`);
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
