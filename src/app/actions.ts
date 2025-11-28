'use server';

import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import {
  createInstance as apiCreateInstance,
  fetchQrCode as apiFetchQrCode,
  getInstanceStatus as apiGetInstanceStatus,
  logoutInstance as apiLogoutInstance,
  deleteInstance as apiDeleteInstance,
  fetchInstances as apiFetchInstances,
} from '@/lib/evolution';
import { encrypt } from '@/lib/session';
import type { Instance, ApiInstance, InstanceStatus } from '@/lib/definitions';
import { getEvolutionApiHelp as genAiGetHelp } from '@/ai/flows/evolution-api-tool-prompts';


// --- FILE SYSTEM ACTIONS FOR INSTANCES ---

const dataFilePath = path.join(process.cwd(), 'src', 'data', 'instances.json');

type GetInstancesResult = { success: true; instances: Instance[] } | { success: false; error: string };
type MutateInstanceResult = { success: true } | { success: false; error: string };

async function readData(): Promise<{ success: true; instances: Omit<Instance, 'status' | 'owner'>[] } | { success: false; error: string }> {
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
    return { success: false, error: 'No se pudieron leer los datos de las instancias locales.' };
  }
}

async function writeData(data: Omit<Instance, 'status' | 'owner'>[]): Promise<MutateInstanceResult> {
  try {
    const jsonData = JSON.stringify(data, null, 2);
    await fs.writeFile(dataFilePath, jsonData, 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Failed to write instances data:', error);
    return { success: false, error: 'No se pudieron escribir los datos de las instancias.' };
  }
}

// Fetches live data from Evolution API and merges it with local data
export async function getInstances(): Promise<GetInstancesResult> {
  const localDataResult = await readData();
  const apiDataResult = await apiFetchInstances();

  if (!localDataResult.success) {
    return localDataResult;
  }
  
  if (!apiDataResult.success) {
    // If API fails, return local data with 'DISCONNECTED' status as a fallback
    console.error("API fetch failed, returning local data as fallback:", apiDataResult.error);
    const fallbackInstances = localDataResult.instances.map(inst => ({
      ...inst,
      status: 'DISCONNECTED' as InstanceStatus,
    }));
    return { success: true, instances: fallbackInstances };
  }

  const localInstances = localDataResult.instances;
  const apiInstances: ApiInstance[] = apiDataResult.data;

  const mergedInstances: Instance[] = localInstances.map(localInst => {
    const apiInst = apiInstances.find(ai => ai.instance.instanceName === localInst.instanceName);
    
    let status: InstanceStatus = 'DISCONNECTED';
    let owner: string | undefined = undefined;

    if (apiInst) {
      switch (apiInst.instance.status) {
        case 'open':
          status = 'CONNECTED';
          break;
        case 'connecting':
          status = 'CONNECTING';
          break;
        case 'close':
          status = 'CLOSED';
          break;
        default:
          status = 'DISCONNECTED';
      }
      owner = apiInst.instance.owner;
    }
    
    return {
      ...localInst,
      status,
      owner,
    };
  });

  return { success: true, instances: mergedInstances };
}


async function addInstance(newInstance: Omit<Instance, 'status' | 'owner'>): Promise<MutateInstanceResult> {
  const readResult = await readData();
  if (!readResult.success) return readResult;

  const instances = readResult.instances;
  if (instances.some(inst => inst.instanceName === newInstance.instanceName)) {
    return { success: false, error: 'La instancia ya existe.' };
  }
  
  instances.push(newInstance);
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

type AuthState = {
  success: boolean;
  error?: string;
  token?: string;
};

export async function authenticate(
  prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  try {
    const { username, password } = AuthFormSchema.parse(Object.fromEntries(formData.entries()));

    if (username === process.env.AUTH_USER && password === process.env.AUTH_PASSWORD) {
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      const session = await encrypt({ user: { name: username }, expires });
      // The token is returned to the client to be stored in localStorage
      return { success: true, token: session };
    } else {
      return { success: false, error: 'Credenciales inválidas.' };
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Ocurrió un error desconocido.' };
  }
}

// Session check is now client-side, this can be simplified or removed if not used server-side
export async function getSession() {
  return null;
}


// --- INSTANCE ACTIONS ---

export async function createInstance(formData: FormData) {
  const schema = z.object({
    instanceName: z.string().min(1, "El nombre es requerido"),
    number: z.string().optional(),
  });
  
  const parseResult = schema.safeParse(Object.fromEntries(formData.entries()));

  if (!parseResult.success) {
    return { success: false, error: parseResult.error.errors.map(e => e.message).join(', ') };
  }
  
  const { instanceName, number } = parseResult.data;

  // Generate a random token
  const token = randomBytes(16).toString('hex');

  try {
     const apiResult = await apiCreateInstance(instanceName, token, number);
     if (!apiResult.success) {
       return { success: false, error: apiResult.error };
     }

     const newInstance: Omit<Instance, 'status' | 'owner'> = {
       instanceName,
       apiKey: token,
       channel: 'baileys',
       number: number || '',
     };
 
     await addInstance(newInstance);
     return { success: true, instance: { ...newInstance, status: 'CREATED' } };

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
    return { success: true, qr: result.qr, instanceName: result.instanceName };
  }
  return { success: false, error: result.error };
}

export async function checkInstanceStatus(instanceName: string) {
    const instancesResult = await getInstances();
    if (!instancesResult.success) {
      return { success: false, error: "No se pudieron obtener las instancias locales." };
    }
    const instance = instancesResult.instances.find(inst => inst.instanceName === instanceName);
    if (!instance) {
      return { success: false, error: "Instancia no encontrada." };
    }

    // Now, status comes from getInstances, but we can double-check with the specific endpoint if needed
    if (instance.status === 'CONNECTED') {
        return { success: true, status: 'CONNECTED' };
    }

    // If not connected, let's poll the specific endpoint to be sure
    const result = await apiGetInstanceStatus(instanceName, instance.apiKey);
    if (result.success && result.state === 'CONNECTED') {
        return { success: true, status: 'CONNECTED' };
    }
    
    return { success: false, status: instance.status }; // Return current status if not connected
}

export async function disconnectInstance(instanceName: string) {
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
    revalidatePath('/');
    return { success: true };
  }
  return { success: false, error: result.error };
}

export async function deleteInstance(instanceName: string) {
  const instancesResult = await readData();
  let apiKey: string | undefined;
  if (instancesResult.success) {
    apiKey = instancesResult.instances.find(inst => inst.instanceName === instanceName)?.apiKey;
  }

  const fileDeleteResult = await fileDeleteInstance(instanceName);
  if (!fileDeleteResult.success) {
    return { success: false, error: fileDeleteResult.error };
  }
  
  revalidatePath('/'); 

  if (apiKey) {
      const apiDeleteResult = await apiDeleteInstance(instanceName, apiKey);
      if (!apiDeleteResult.success) {
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