'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { authenticate } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function LoginButton() {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full" type="submit" aria-disabled={pending}>
      <LogIn className="mr-2 h-4 w-4" />
      {pending ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
    </Button>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams?: {
    showDevInfo?: string;
  };
}) {
  const [errorMessage, dispatch] = useActionState(authenticate, undefined);
  const { toast } = useToast();

  const showDevInfo = searchParams?.showDevInfo === 'true' && process.env.NODE_ENV === 'development';

  useEffect(() => {
    if (errorMessage) {
      toast({
        variant: 'destructive',
        title: 'Fallo de Inicio de Sesión',
        description: errorMessage,
      });
    }
  }, [errorMessage, toast]);

  return (
    <main className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
            <h1 className="text-3xl font-bold font-headline text-foreground">Dashboard de Evolution</h1>
            <p className="text-muted-foreground mt-2">Conecta y administra tus instancias de API</p>
        </div>
        <Card>
          <form action={dispatch}>
            <CardHeader>
              <CardTitle>Acceso Seguro</CardTitle>
              <CardDescription>Ingresa tus credenciales para administrar tus instancias.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <Input id="username" name="username" type="text" placeholder="admin" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" name="password" type="password" required />
              </div>
            </CardContent>
            <CardFooter>
              <LoginButton />
            </CardFooter>
          </form>
        </Card>
        
        {showDevInfo && (
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Información para Desarrolladores</AlertTitle>
            <AlertDescription>
              Para comenzar, crea un archivo <code className="font-mono text-sm font-semibold">.env.local</code> en el directorio raíz y añade las siguientes variables:
              <pre className="mt-2 rounded-md bg-muted p-2 text-xs font-mono">
                {`EVOLUTION_API_URL=http://your_api_ip:port\nEVOLUTION_API_KEY=your_global_api_key\nAUTH_USER=your_username\nAUTH_PASSWORD=your_password\nAUTH_SECRET=a_secure_random_string_32_chars`}
              </pre>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </main>
  );
}
