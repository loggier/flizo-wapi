import { CreateInstanceDialog } from './create-instance-dialog';
import { HelpDialog } from './help-dialog';
import { LogoutButton } from './logout-button';
import { Button } from '../ui/button';
import { RefreshCw } from 'lucide-react';

interface HeaderProps {
  onRefresh: () => void;
}

export function Header({ onRefresh }: HeaderProps) {
  return (
    <header className="flex items-center justify-between h-16 px-4 md:px-8 border-b bg-card shadow-sm">
      <h1 className="text-xl md:text-2xl font-bold font-headline text-primary">
        Dashboard de Evolution
      </h1>
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="outline" size="icon" onClick={onRefresh} aria-label="Refrescar instancias">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <HelpDialog />
        <CreateInstanceDialog />
        <LogoutButton />
      </div>
    </header>
  );
}
