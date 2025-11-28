'use client';

import { useState, useRef, useTransition } from 'react';
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
      {pending ? 'Creating...' : 'Create Instance'}
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
        title: 'Success',
        description: `Instance "${result.instance?.instanceName}" created successfully.`,
      });
      setOpen(false);
      formRef.current?.reset();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result?.error || 'Failed to create instance.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Instance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Instance</DialogTitle>
          <DialogDescription>
            Enter a name for your new Evolution API instance.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={handleCreateInstance}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="instanceName" className="text-right">
                Name
              </Label>
              <Input
                id="instanceName"
                name="instanceName"
                className="col-span-3"
                placeholder="my-whatsapp-bot"
                required
                minLength={3}
              />
            </div>
          </div>
          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
