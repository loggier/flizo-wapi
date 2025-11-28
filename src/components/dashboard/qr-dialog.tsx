'use client';

import { useState, useEffect, type PropsWithChildren, useCallback } from 'react';
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

  const stableOnConnected = useCallback(onConnected, []);

  useEffect(() => {
    if (!open) {
      setQrCode(null);
      setError(null);
      return;
    }

    let isActive = true;
    let pollInterval: NodeJS.Timeout | undefined;

    const startPolling = () => {
      pollInterval = setInterval(async () => {
        if (!isActive || !open) {
          if (pollInterval) clearInterval(pollInterval);
          return;
        }
        try {
          const statusResult = await checkInstanceStatus(instanceName);
          if (isActive && statusResult.success && statusResult.status === 'CONNECTED') {
            toast({ title: 'Éxito', description: `Instancia "${instanceName}" conectada.` });
            if (pollInterval) clearInterval(pollInterval);
            setOpen(false);
            stableOnConnected();
          }
        } catch (pollError) {
            // Error during polling is less critical, we can just log it
            console.error("Polling error:", pollError);
        }
      }, 3000);
    };

    const fetchQr = async () => {
      setLoading(true);
      setError(null);
      setQrCode(null);
      try {
        const result = await getQrCode(instanceName);
        if (!isActive) return;

        if (result.success && result.qr) {
          setQrCode(result.qr);
          startPolling();
        } else {
          const errorMessage = result.error || 'No se pudo cargar el código QR.';
          setError(errorMessage);
          toast({
            variant: 'destructive',
            title: 'Error de Conexión',
            description: `${errorMessage} ¿Está la API de FlizoWapi en funcionamiento?`,
          });
        }
      } catch (e) {
        if (isActive) {
          const errorMessage = e instanceof Error ? e.message : 'Ocurrió un error inesperado.';
          setError(errorMessage);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: errorMessage,
          });
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchQr();

    return () => {
      isActive = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [open, instanceName, toast, stableOnConnected]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Conectar Instancia: {instanceName}</DialogTitle>
          <DialogDescription>
            Escanea el código QR con tu teléfono usando la aplicación WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center p-4 min-h-[250px] bg-muted rounded-md">
          {loading && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
          {error && !loading && <p className="text-center text-destructive">{error}</p>}
          {qrCode && (
            <Image
              src={qrCode}
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
