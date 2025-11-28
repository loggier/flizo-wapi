'use server';

// The API_URL is the base URL for the Evolution API instance.
const API_URL = process.env.EVOLUTION_API_URL;
// The GLOBAL_API_KEY is used for instance management (create, connect).
const GLOBAL_API_KEY = process.env.EVOLUTION_API_KEY;

type EvolutionResponse = { success: true; data?: any; error?: never } | { success: false; error: string; data?: never };

async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  if (!API_URL) {
    throw new Error('La URL de la API de Evolution no está configurada en las variables de entorno.');
  }

  const url = `${API_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers, // apikey should be provided in the calling function
    },
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  if (!response.ok) {
    let errorMessage = `Error de API (${response.status})`;
    if (isJson) {
      try {
        const errorJson = await response.json();
        if (errorJson.message) {
            errorMessage = Array.isArray(errorJson.message) ? errorJson.message.join(', ') : errorJson.message;
        } else if (errorJson.error) {
            errorMessage = errorJson.error;
        } else if (errorJson.response?.message) {
             errorMessage = errorJson.response.message;
        } else {
            errorMessage = JSON.stringify(errorJson);
        }
      } catch (e) {
        errorMessage = await response.text();
      }
    } else {
      const errorText = await response.text();
      errorMessage = errorText || response.statusText;
    }
    throw new Error(errorMessage);
  }
  
  if (response.status === 204 || !contentType) {
    return null;
  }

  if (isJson) {
    return response.json();
  }
  return response.text();
}

export async function createInstance(instanceName: string, token: string, number?: string): Promise<EvolutionResponse> {
  try {
    const payload: any = {
      instanceName,
      token,
      qrcode: false,
      integration: "WHATSAPP-BAILEYS",
    };
    if (number) {
      payload.number = number;
    }

    const data = await apiFetch('/instance/create', {
      method: 'POST',
      headers: { 'apikey': GLOBAL_API_KEY! },
      body: JSON.stringify(payload),
    });
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'No se pudo crear la instancia' };
  }
}

export async function fetchQrCode(instanceName: string): Promise<{success: true, qr: string, instanceName: string} | {success: false, error: string}> {
  try {
    const data = await apiFetch(`/instance/connect/${instanceName}`, {
        headers: { 'apikey': GLOBAL_API_KEY! }
    });
    if (data.status === 'error' || !data.base64) {
       return { success: false, error: data.message || 'La API no devolvió un código QR. La instancia podría estar ya conectada.' };
    }
    return { success: true, qr: `data:image/png;base64,${data.base64}`, instanceName: data.instance };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'No se pudo obtener el código QR' };
  }
}

export async function getInstanceStatus(instanceName: string, instanceApiKey: string): Promise<{success: true, state: string} | {success: false, error: string}> {
    try {
        const data = await apiFetch(`/instance/connectionState/${instanceName}`, {
            headers: { 'apikey': instanceApiKey }
        });
        return { success: true, state: data.state };
    } catch(error) {
        return { success: false, error: error instanceof Error ? error.message : 'No se pudo obtener el estado de la instancia' };
    }
}

export async function logoutInstance(instanceName: string, instanceApiKey: string): Promise<EvolutionResponse> {
  try {
    await apiFetch(`/instance/logout/${instanceName}`, { 
        method: 'DELETE',
        headers: { 'apikey': instanceApiKey }
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'No se pudo desconectar la instancia' };
  }
}

export async function deleteInstance(instanceName: string, instanceApiKey: string): Promise<EvolutionResponse> {
  try {
    await apiFetch(`/instance/delete/${instanceName}`, { 
        method: 'DELETE',
        headers: { 'apikey': instanceApiKey }
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'No se pudo eliminar la instancia de la API' };
  }
}

export async function sendMessage(instanceName: string, apiKey: string, number: string, text: string): Promise<EvolutionResponse> {
    try {
        const data = await apiFetch(`/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: { 'apikey': apiKey },
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
        return { success: false, error: error instanceof Error ? error.message : 'No se pudo enviar el mensaje' };
    }
}


export async function fetchInstances(): Promise<EvolutionResponse> {
  try {
    const data = await apiFetch('/instance/fetchInstances', {
      method: 'GET',
      headers: { 'apikey': GLOBAL_API_KEY! },
    });
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'No se pudieron obtener las instancias de la API' };
  }
}