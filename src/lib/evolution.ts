const API_URL = process.env.EVOLUTION_API_URL;
const API_KEY = process.env.EVOLUTION_API_KEY;

type EvolutionResponse = { success: true; data?: any; error?: never } | { success: false; error: string; data?: never };

async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  if (!API_URL || !API_KEY) {
    throw new Error('Evolution API URL or key is not configured in environment variables.');
  }

  const url = `${API_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': API_KEY,
      ...options.headers,
    },
  });

  if (!response.ok && response.status !== 404 && response.status !== 422) { // 422 is used for "instance not found" sometimes
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText || response.statusText}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

export async function createInstance(instanceName: string): Promise<EvolutionResponse> {
  try {
    const data = await apiFetch('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName,
        qrcode: true,
      }),
    });
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create instance' };
  }
}

export async function fetchQrCode(instanceName: string): Promise<{success: true, qr: string, instanceName: string} | {success: false, error: string}> {
  try {
    const data = await apiFetch(`/instance/connect/${instanceName}`);
    if (data.status === 'error') {
       return { success: false, error: data.message || 'Failed to fetch QR code.' };
    }
    return { success: true, qr: data.base64, instanceName: data.instance };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch QR code' };
  }
}

export async function getInstanceStatus(instanceName: string): Promise<{success: true, state: string} | {success: false, error: string}> {
    try {
        const data = await apiFetch(`/instance/connectionState/${instanceName}`);
        return { success: true, state: data.state };
    } catch(error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to get instance status' };
    }
}

export async function logoutInstance(instanceName: string): Promise<EvolutionResponse> {
  try {
    await apiFetch(`/instance/logout/${instanceName}`, { method: 'DELETE' });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to disconnect instance' };
  }
}

export async function deleteInstance(instanceName: string): Promise<EvolutionResponse> {
  try {
    await apiFetch(`/instance/delete/${instanceName}`, { method: 'DELETE' });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete instance from API' };
  }
}

export async function sendMessage(instanceName: string, number: string, text: string): Promise<EvolutionResponse> {
    try {
        const data = await apiFetch(`/message/sendText/${instanceName}`, {
            method: 'POST',
            body: JSON.stringify({
                number,
                options: {
                    delay: 1200,
                    presence: 'composing'
                },
                textMessage: {
                    text
                }
            })
        });
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to send message' };
    }
}
