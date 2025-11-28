'use client';

import { useState, useTransition } from 'react';
import type { Instance, InstanceStatus } from '@/lib/definitions';
import { disconnectInstance, deleteInstance } from '@/app/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, LogOut, Trash2, Copy, Zap, XCircle, Loader2, MessageSquareText, Users, AtSign, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QrDialog } from './qr-dialog';
import { SendMessageDialog } from './send-message-dialog';
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
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';

type StatusVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const statusMap: Record<InstanceStatus, { text: string; variant: StatusVariant; icon: React.ReactNode }> = {
  CREATED: { text: 'Creado', variant: 'outline', icon: <XCircle className="w-3 h-3 text-amber-500" /> },
  CONNECTING: { text: 'Conectando', variant: 'secondary', icon: <Loader2 className="w-3 h-3 animate-spin text-blue-500" /> },
  CONNECTED: { text: 'Conectado', variant: 'default', icon: <Zap className="w-3 h-3 text-green-500" /> },
  DISCONNECTED: { text: 'Desconectado', variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
  CLOSED: { text: 'Desconectado', variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
};

interface InstanceCardProps {
  instance: Instance;
  onRefresh: () => void;
}

export function InstanceCard({ instance, onRefresh }: InstanceCardProps) {
  const { toast } = useToast();
  const [isDisconnecting, startDisconnectTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  
  const ownerNumber = instance.owner?.split('@')[0] || instance.number || 'N/A';
  const profileInitial = (instance.profileName || instance.instanceName).charAt(0).toUpperCase();

  const apiUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/sendMessage?instance=${instance.instanceName}&key=${instance.apiKey}`
    : `/api/sendMessage?instance=${instance.instanceName}&key=${instance.apiKey}`;

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

  const statusInfo = statusMap[instance.status] || statusMap.DISCONNECTED;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
            <div className='flex items-center gap-4'>
                <Avatar>
                    <AvatarImage src={instance.profilePicUrl || ''} alt={instance.profileName || instance.instanceName} />
                    <AvatarFallback>{profileInitial}</AvatarFallback>
                </Avatar>
                <div className='flex-1'>
                    <CardTitle className="font-headline text-lg break-all">{instance.profileName || instance.instanceName}</CardTitle>
                    <CardDescription>Número: {ownerNumber}</CardDescription>
                </div>
            </div>
            <Badge variant={statusInfo.variant} className="flex items-center gap-1.5 shrink-0 text-xs">
                {statusInfo.icon}
                {statusInfo.text}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        {instance._count && (
            <>
                <div className='grid grid-cols-3 gap-2 text-center text-sm'>
                    <div>
                        <p className='font-bold text-lg'>{instance._count.Message}</p>
                        <p className='text-muted-foreground text-xs flex items-center justify-center gap-1'><MessageSquareText /> Mensajes</p>
                    </div>
                    <div>
                        <p className='font-bold text-lg'>{instance._count.Chat}</p>
                        <p className='text-muted-foreground text-xs flex items-center justify-center gap-1'><AtSign /> Chats</p>
                    </div>
                    <div>
                        <p className='font-bold text-lg'>{instance._count.Contact}</p>
                        <p className='text-muted-foreground text-xs flex items-center justify-center gap-1'><Users /> Contactos</p>
                    </div>
                </div>
                <Separator />
            </>
        )}
        <div>
          <Label htmlFor={`api-url-${instance.instanceName}`} className="text-xs">Tu URL de API para enviar mensajes</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input id={`api-url-${instance.instanceName}`} type="text" readOnly value={apiUrl} className="text-xs h-9" />
            <Button variant="outline" size="icon" onClick={handleCopy}><Copy className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        {instance.status === 'CONNECTED' && (
          <SendMessageDialog instance={instance}>
            <Button variant="outline" size="icon" aria-label="Enviar Mensaje de Prueba">
              <Send className="h-4 w-4" />
            </Button>
          </SendMessageDialog>
        )}
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
            <Button variant="destructive" size="icon" disabled={isDeleting} aria-label="Eliminar Instancia">
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
