'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { authenticate } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, LogIn, AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

function LoginButton() {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full" type="submit" aria-disabled={pending}>
      <LogIn className="mr-2 h-4 w-4" />
      {pending ? 'Signing In...' : 'Sign In'}
    </Button>
  );
}

// A simple check to see if the app is likely running in a dev environment where .env.local would be used.
const isDevEnvironment = process.env.NODE_ENV === 'development';

export default function LoginPage() {
  const [errorMessage, dispatch] = useFormState(authenticate, undefined);
  const { toast } = useToast();

  useEffect(() => {
    if (errorMessage) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: errorMessage,
      });
    }
  }, [errorMessage, toast]);

  return (
    <main className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
            <h1 className="text-3xl font-bold font-headline text-foreground">Evolution Dashboard</h1>
            <p className="text-muted-foreground mt-2">Connect and manage your API instances</p>
        </div>
        <Card>
          <form action={dispatch}>
            <CardHeader>
              <CardTitle>Secure Access</CardTitle>
              <CardDescription>Enter your credentials to manage your instances.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" name="username" type="text" placeholder="admin" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required />
              </div>
            </CardContent>
            <CardFooter>
              <LoginButton />
            </CardFooter>
          </form>
        </Card>
        
        {isDevEnvironment && (
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Developer Information</AlertTitle>
            <AlertDescription>
              To get started, create a <code className="font-mono text-sm font-semibold">.env.local</code> file in the root directory and add the following variables:
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
