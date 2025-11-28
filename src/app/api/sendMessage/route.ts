import { NextResponse, type NextRequest } from 'next/server';
import { getInstances } from '@/lib/instances';
import { sendMessage as apiSendMessage } from '@/lib/evolution';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const instanceName = searchParams.get('instance');
  const apiKey = searchParams.get('key');
  const number = searchParams.get('number');
  const text = searchParams.get('message');

  if (!instanceName || !apiKey || !number || !text) {
    return NextResponse.json(
      { success: false, error: 'Missing required parameters: instance, key, number, message' },
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
        { success: false, error: 'Instance not found' },
        { status: 404 }
      );
    }

    if (instance.apiKey !== apiKey) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    if (instance.status !== 'CONNECTED') {
      return NextResponse.json(
        { success: false, error: 'Instance is not connected' },
        { status: 409 }
      );
    }

    const sendMessageResult = await apiSendMessage(instanceName, number, text);

    if (sendMessageResult.success) {
      return NextResponse.json({ success: true, data: sendMessageResult.data });
    } else {
      return NextResponse.json(
        { success: false, error: sendMessageResult.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Send message API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
