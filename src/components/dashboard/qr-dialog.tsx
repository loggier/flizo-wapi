'use client';

import { useState, useEffect, type PropsWithChildren } from 'react';
import { getQrCode, checkInstanceStatus } from '@/app/actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

interface QrDialogProps {
  instanceName: string;
  onConnected: () => void;
}

export function QrDialog({ instanceName, onConnected, children }: PropsWithChildren<QrDialogProps>) {
  const [open, setOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setQrCode(null);
      setError(null);
      return;
    }

    let isActive = true;
    let pollInterval: NodeJS.Timeout | undefined;

    const fetchQr = async () => {
      setLoading(true);
      setError(null);
      const result = await getQrCode(instanceName);
      if (!isActive) return;

      if (result.success) {
        setQrCode(result.qr);
        startPolling();
      } else {
        setError(result.error || 'No se pudo cargar el código QR.');
        toast({
          variant: 'destructive',
          title: 'Error de Conexión',
          description: result.error || 'No se pudo cargar el código QR. ¿Está la API de Evolution en funcionamiento?',
        });
      }
      setLoading(false);
    };

    const startPolling = () => {
      pollInterval = setInterval(async () => {
        if (!isActive || !open) {
            if(pollInterval) clearInterval(pollInterval);
            return;
        }
        const statusResult = await checkInstanceStatus(instanceName);
        if (statusResult.success && statusResult.status === 'CONNECTED') {
          toast({ title: 'Éxito', description: `Instancia "${instanceName}" conectada.` });
          if (pollInterval) clearInterval(pollInterval);
          setOpen(false); 
          onConnected(); // Avisa a la página principal para que se refresque
        }
      }, 3000); 
    };
    
    fetchQr();

    return () => {
      isActive = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [open, instanceName, toast, onConnected]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar Instancia: {instanceName}</DialogTitle>
          <DialogDescription>
            Escanea el código QR con tu teléfono usando la aplicación WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center p-4 min-h-[250px] bg-muted rounded-md">
          {loading && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
          {error && <p className="text-center text-destructive">{error}</p>}
          {qrCode && (
            <Image
              src={`data:image/png;base64,${qrCode}`}
              alt="Código QR de WhatsApp"
              width={250}
              height={250}
              priority
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
