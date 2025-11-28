'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { getInstances } from '@/app/actions';
import { sendMessage as apiSendMessage } from '@/lib/evolution';

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const instanceName = searchParams.get('instance');
  
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Cuerpo de la petición inválido (no es JSON).' }, { status: 400 });
  }

  const { number, text } = body;

  if (!instanceName || !number || !text) {
    return NextResponse.json(
      { success: false, error: 'Faltan parámetros requeridos: instance en la URL y number, text en el body.' },
      { status: 400 }
    );
  }

  try {
    const instancesResult = await getInstances();
    if (!instancesResult.success) {
      throw new Error(instancesResult.error);
    }

    const instance = instancesResult.instances.find(inst => inst.instanceName === instanceName);

    if (!instance) {
      return NextResponse.json(
        { success: false, error: 'Instancia no encontrada' },
        { status: 404 }
      );
    }
    
    if (instance.status !== 'CONNECTED') {
      return NextResponse.json(
        { success: false, error: 'La instancia no está conectada' },
        { status: 409 }
      );
    }

    // Simplified payload with only number and text at the root level.
    const payload = {
        number,
        text,
    };

    const sendMessageResult = await apiSendMessage(instanceName, instance.apiKey, payload);

    if (sendMessageResult.success) {
      return NextResponse.json({ success: true, data: sendMessageResult.data });
    } else {
      // The error from apiSendMessage should be detailed now.
      return NextResponse.json(
        { success: false, error: sendMessageResult.error },
        { status: 400 } // Propagate bad request from Evolution API
      );
    }
  } catch (error) {
    console.error('Error en la API de envío de mensajes:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error interno del servidor';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
