'use client';

import { useState } from 'react';
import { getApiHelp } from '@/app/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { HelpCircle, Loader2, Sparkles } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

export function HelpDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [helpText, setHelpText] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setHelpText('');

    const formData = new FormData(event.currentTarget);
    const feature = formData.get('feature') as string;

    const result = await getApiHelp(feature);

    if (result.success) {
      setHelpText(result.helpText);
    } else {
      setError(result.error || 'Ocurrió un error inesperado.');
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <HelpCircle className="mr-2 h-4 w-4" />
          Ayuda
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary" />
            Asistente de Features de API
          </DialogTitle>
          <DialogDescription>
            Pide ayuda sobre cualquier feature de la API de FlizoWapi (ej., "enviar una imagen", "crear un grupo").
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input name="feature" placeholder="¿Cómo envío un mensaje con botones?" disabled={isLoading} required />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Preguntar'}
          </Button>
        </form>
        {(isLoading || helpText || error) && (
            <ScrollArea className="mt-4 max-h-[50vh] rounded-md border p-4">
                {isLoading && (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                    </div>
                )}
                {error && <p className="text-sm text-destructive">{error}</p>}
                {helpText && (
                    <pre className="text-sm whitespace-pre-wrap font-sans">
                        {helpText}
                    </pre>
                )}
            </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
