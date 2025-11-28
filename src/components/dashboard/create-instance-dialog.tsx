'use client';

import { useState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { createInstance } from '@/app/actions';
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
import { PlusCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Creando...' : 'Crear Instancia'}
    </Button>
  );
}

export function CreateInstanceDialog() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();

  const handleCreateInstance = async (formData: FormData) => {
    const result = await createInstance(formData);

    if (result?.success) {
      toast({
        title: 'Éxito',
        description: `Instancia "${result.instance?.instanceName}" creada con éxito.`,
      });
      setOpen(false);
      formRef.current?.reset();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error al crear instancia',
        description: result?.error || 'No se pudo crear la instancia.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nueva Instancia
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear Nueva Instancia</DialogTitle>
          <DialogDescription>
            Completa los detalles de tu nueva instancia. Se generará un token de API seguro automáticamente.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={handleCreateInstance} className="space-y-4">
          <div>
            <Label htmlFor="instanceName">Nombre *</Label>
            <Input
              id="instanceName"
              name="instanceName"
              placeholder="mi-bot-whatsapp"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="number">Número</Label>
            <Input
              id="number"
              name="number"
              placeholder="Número de teléfono asociado (ej. 521XXXXXXXXXX)"
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
