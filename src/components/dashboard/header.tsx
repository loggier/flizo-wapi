import { CreateInstanceDialog } from './create-instance-dialog';
import { HelpDialog } from './help-dialog';
import { LogoutButton } from './logout-button';

export function Header() {
  return (
    <header className="flex items-center justify-between h-16 px-4 md:px-8 border-b bg-card shadow-sm">
      <h1 className="text-xl md:text-2xl font-bold font-headline text-primary">
        Dashboard de Evolution
      </h1>
      <div className="flex items-center gap-2 md:gap-4">
        <HelpDialog />
        <CreateInstanceDialog />
        <LogoutButton />
      </div>
    </header>
  );
}
