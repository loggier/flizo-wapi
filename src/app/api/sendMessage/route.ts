'use client';
import { NextResponse, type NextRequest } from 'next/server';
import { getInstances } from '@/app/actions';
import { sendMessage as apiSendMessage } from '@/lib/evolution';

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const instanceName = searchParams.get('instance');
  
  const body = await request.json();
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

    const payload = {
        number,
        textMessage: {
          text
        },
        options: {
          delay: 1200,
          presence: 'composing'
        }
    };

    const sendMessageResult = await apiSendMessage(instanceName, instance.apiKey, payload);

    if (sendMessageResult.success) {
      return NextResponse.json({ success: true, data: sendMessageResult.data });
    } else {
      return NextResponse.json(
        { success: false, error: sendMessageResult.error },
        { status: 400 }
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
