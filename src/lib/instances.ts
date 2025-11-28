import fs from 'fs/promises';
import path from 'path';
import type { Instance } from './definitions';

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
      // File doesn't exist, which is fine. Return an empty array.
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

export async function addInstance(newInstance: Instance): Promise<MutateInstanceResult> {
  const readResult = await readData();
  if (!readResult.success) return readResult;

  const instances = readResult.instances;
  if (instances.some(inst => inst.instanceName === newInstance.instanceName)) {
    return { success: false, error: 'La instancia ya existe.' };
  }
  
  instances.push(newInstance);
  return writeData(instances);
}

export async function updateInstance(instanceName: string, updateData: Partial<Instance>): Promise<MutateInstanceResult> {
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

export async function deleteInstance(instanceName: string): Promise<MutateInstanceResult> {
  const readResult = await readData();
  if (!readResult.success) return readResult;

  let instances = readResult.instances;
  const initialLength = instances.length;
  instances = instances.filter(inst => inst.instanceName !== instanceName);

  if (instances.length === initialLength) {
    // No instance was found/deleted, but we can treat this as a non-error
    return { success: true };
  }

  return writeData(instances);
}
