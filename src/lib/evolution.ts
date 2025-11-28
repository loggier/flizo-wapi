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
        // Try to find the most specific error message from the API response
        if (typeof errorJson.message === 'string') {
          errorMessage = errorJson.message;
        } else if (Array.isArray(errorJson.message)) {
          errorMessage = errorJson.message.join(', ');
        } else if (typeof errorJson.error === 'string') {
          errorMessage = errorJson.error;
        } else if (typeof errorJson.response?.message === 'string') {
          errorMessage = errorJson.response.message;
        } else {
          // Fallback to stringifying the whole object if no specific message is found
          errorMessage = JSON.stringify(errorJson);
        }
      } catch (e) {
        // If parsing JSON fails, fallback to the raw text response
        errorMessage = await response.text();
      }
    } else {
      const errorText = await response.text();
      errorMessage = errorText || response.statusText;
    }
    throw new Error(errorMessage);
  }
  
  // Handle cases with no content
  if (response.status === 204 || !contentType) {
    return null;
  }

  if (isJson) {
    return response.json();
  }
  
  // Fallback for non-JSON responses
  return response.text();
}


export async function createInstance(instanceName: string, token: string, number?: string): Promise<EvolutionResponse> {
  try {
    const payload: any = {
      instanceName,
      token,
      qrcode: true,
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
    return { success: true, qr: data.base64, instanceName: data.instance };
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
                number: number,
                options: {
                    delay: 1200,
                    presence: 'composing'
                },
                textMessage: {
                    text: text
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
