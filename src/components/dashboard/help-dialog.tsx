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
      setError(result.error || 'An unexpected error occurred.');
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <HelpCircle className="mr-2 h-4 w-4" />
          Help
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary" />
            API Feature Assistant
          </DialogTitle>
          <DialogDescription>
            Ask for help about any Evolution API feature (e.g., "send an image", "create a group").
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input name="feature" placeholder="How do I send a button message?" disabled={isLoading} required />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ask'}
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
