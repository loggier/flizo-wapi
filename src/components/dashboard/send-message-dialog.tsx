'use client';

import { useState, useRef, type PropsWithChildren } from 'react';
import { useFormStatus } from 'react-dom';
import { sendMessage } from '@/app/actions';
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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      <Send className="mr-2 h-4 w-4" />
      {pending ? 'Enviando...' : 'Enviar Mensaje'}
    </Button>
  );
}

interface SendMessageDialogProps {
    instance: Instance;
}

export function SendMessageDialog({ instance, children }: PropsWithChildren<SendMessageDialogProps>) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();

  const handleSendMessage = async (formData: FormData) => {
    formData.append('instanceName', instance.instanceName);
    formData.append('apiKey', instance.apiKey);
    
    const result = await sendMessage(formData);

    if (result?.success) {
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
        <form ref={formRef} action={handleSendMessage} className="space-y-4">
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
                <SubmitButton />
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
