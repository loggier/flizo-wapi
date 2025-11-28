const API_URL = process.env.EVOLUTION_API_URL;
const API_KEY = process.env.EVOLUTION_API_KEY;

type EvolutionResponse = { success: true; data?: any; error?: never } | { success: false; error: string; data?: never };

async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  if (!API_URL || !API_KEY) {
    throw new Error('La URL o clave de la API de Evolution no está configurada en las variables de entorno.');
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

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  // Handle non-successful responses
  if (!response.ok) {
    let errorMessage = `Error de API (${response.status})`;
    if (isJson) {
      try {
        const errorJson = await response.json();
        // Evolution API often returns errors in a "message" property, or an array of messages.
        if (errorJson.message) {
            errorMessage = Array.isArray(errorJson.message) ? errorJson.message.join(', ') : errorJson.message;
        } else if (errorJson.error) {
            errorMessage = errorJson.error;
        } else {
            errorMessage = JSON.stringify(errorJson);
        }
      } catch (e) {
        // Not a JSON response, fall back to text.
        errorMessage = await response.text();
      }
    } else {
      const errorText = await response.text();
      errorMessage = errorText || response.statusText;
    }
    throw new Error(errorMessage);
  }
  
  // Handle empty successful responses (e.g., DELETE returning 204 No Content)
  if (response.status === 204 || !contentType) {
    return null;
  }

  if (isJson) {
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
    return { success: false, error: error instanceof Error ? error.message : 'No se pudo crear la instancia' };
  }
}

export async function fetchQrCode(instanceName: string): Promise<{success: true, qr: string, instanceName: string} | {success: false, error: string}> {
  try {
    const data = await apiFetch(`/instance/connect/${instanceName}`);
    if (data.status === 'error') {
       return { success: false, error: data.message || 'No se pudo obtener el código QR.' };
    }
    return { success: true, qr: data.base64, instanceName: data.instance };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'No se pudo obtener el código QR' };
  }
}

export async function getInstanceStatus(instanceName: string): Promise<{success: true, state: string} | {success: false, error: string}> {
    try {
        const data = await apiFetch(`/instance/connectionState/${instanceName}`);
        return { success: true, state: data.state };
    } catch(error) {
        return { success: false, error: error instanceof Error ? error.message : 'No se pudo obtener el estado de la instancia' };
    }
}

export async function logoutInstance(instanceName: string): Promise<EvolutionResponse> {
  try {
    await apiFetch(`/instance/logout/${instanceName}`, { method: 'DELETE' });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'No se pudo desconectar la instancia' };
  }
}

export async function deleteInstance(instanceName: string): Promise<EvolutionResponse> {
  try {
    await apiFetch(`/instance/delete/${instanceName}`, { method: 'DELETE' });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'No se pudo eliminar la instancia de la API' };
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
        return { success: false, error: error instanceof Error ? error.message : 'No se pudo enviar el mensaje' };
    }
}
