'use client';

import { useState, useRef, type PropsWithChildren, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Instance } from '@/lib/definitions';

function SubmitButton({ isPending }: { isPending: boolean }) {
  return (
    <Button type="submit" disabled={isPending}>
      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      <Send className="mr-2 h-4 w-4" />
      {isPending ? 'Enviando...' : 'Enviar Mensaje'}
    </Button>
  );
}

interface SendMessageDialogProps {
    instance: Instance;
}

export function SendMessageDialog({ instance, children }: PropsWithChildren<SendMessageDialogProps>) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const number = formData.get('number') as string;
    const message = formData.get('message') as string;
    
    try {
        const url = new URL('/api/sendMessage', window.location.origin);
        url.searchParams.append('instance', instance.instanceName);
        url.searchParams.append('number', number);
        url.searchParams.append('text', message);

        const response = await fetch(url.toString(), {
            method: 'GET',
        });

        const result = await response.json();

        if (result.success) {
            toast({
                title: 'Éxito',
                description: 'Mensaje enviado a la cola para su procesamiento.',
            });
            setOpen(false);
            formRef.current?.reset();
        } else {
            toast({
                variant: 'destructive',
                title: 'Error al enviar mensaje',
                description: result?.error || 'No se pudo enviar el mensaje.',
            });
        }
    } catch (e) {
        toast({
            variant: 'destructive',
            title: 'Error de Red',
            description: 'No se pudo conectar con el servidor para enviar el mensaje.',
        });
    }


    setIsPending(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Mensaje de Prueba</DialogTitle>
          <DialogDescription>
            Envia un mensaje desde la instancia <span className="font-bold">{instance.instanceName}</span>.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSendMessage} className="space-y-4">
            <div>
                <Label htmlFor="number">Número de Destino</Label>
                <Input
                id="number"
                name="number"
                placeholder="Ej. 521XXXXXXXXXX"
                required
                />
                <p className="text-xs text-muted-foreground mt-1">Incluye el código de país y área. Sin espacios ni símbolos.</p>
            </div>
          
            <div>
                <Label htmlFor="message">Mensaje</Label>
                <Textarea
                id="message"
                name="message"
                placeholder="Escribe tu mensaje aquí..."
                required
                />
            </div>

            <DialogFooter>
                <SubmitButton isPending={isPending} />
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
