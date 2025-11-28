'use client';

import { useState, useTransition } from 'react';
import type { Instance } from '@/lib/definitions';
import { disconnectInstance, deleteInstance } from '@/app/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, LogOut, Trash2, Copy, Zap, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QrDialog } from './qr-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type StatusVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const statusMap: Record<Instance['status'], { text: string; variant: StatusVariant; icon: React.ReactNode }> = {
  CREATED: { text: 'Creado', variant: 'outline', icon: <XCircle className="w-3 h-3 text-amber-500" /> },
  CONNECTING: { text: 'Conectando', variant: 'secondary', icon: <Loader2 className="w-3 h-3 animate-spin text-blue-500" /> },
  CONNECTED: { text: 'Conectado', variant: 'default', icon: <Zap className="w-3 h-3 text-green-500" /> },
  DISCONNECTED: { text: 'Desconectado', variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
};

interface InstanceCardProps {
  instance: Instance;
  onRefresh: () => void;
}

export function InstanceCard({ instance, onRefresh }: InstanceCardProps) {
  const { toast } = useToast();
  const [isDisconnecting, startDisconnectTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const apiUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/sendMessage?instance=${instance.instanceName}&key=${instance.apiKey}&number=...&message=...`
    : `/api/sendMessage?instance=${instance.instanceName}&key=${instance.apiKey}&number=...&message=...`;

  const handleCopy = () => {
    navigator.clipboard.writeText(apiUrl);
    toast({ description: 'URL de API copiada al portapapeles.' });
  };

  const handleDisconnect = () => {
    startDisconnectTransition(async () => {
      const result = await disconnectInstance(instance.instanceName);
      if (result.success) {
        toast({ description: `Instancia "${instance.instanceName}" desconectada.` });
        onRefresh();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    });
  };

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const result = await deleteInstance(instance.instanceName);
      if (result.success) {
        toast({ description: `Instancia "${instance.instanceName}" eliminada.` });
        if (result.warning) {
          toast({ variant: 'default', title: 'Advertencia', description: result.warning, duration: 5000 });
        }
        onRefresh();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    });
  };

  const status = statusMap[instance.status] || statusMap.DISCONNECTED;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="font-headline break-all">{instance.instanceName}</CardTitle>
          <Badge variant={status.variant} className="flex items-center gap-1.5 shrink-0">
            {status.icon}
            {status.text}
          </Badge>
        </div>
        <CardDescription>Número: {instance.number || 'N/A'}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div>
          <Label htmlFor={`api-url-${instance.instanceName}`} className="text-xs">Tu URL de API para enviar mensajes</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input id={`api-url-${instance.instanceName}`} type="text" readOnly value={apiUrl} className="text-xs h-9" />
            <Button variant="outline" size="icon" onClick={handleCopy}><Copy className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        {instance.status !== 'CONNECTED' && (
          <QrDialog instanceName={instance.instanceName} onConnected={onRefresh}>
            <Button variant="outline"><QrCode className="mr-2 h-4 w-4" />Conectar</Button>
          </QrDialog>
        )}
        {instance.status === 'CONNECTED' && (
          <Button variant="outline" onClick={handleDisconnect} disabled={isDisconnecting}>
            {isDisconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <LogOut className="mr-2 h-4 w-4" />Desconectar
          </Button>
        )}
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="icon" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esto eliminará permanentemente la instancia <strong className="font-mono">{instance.instanceName}</strong>. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </CardFooter>
    </Card>
  );
}
