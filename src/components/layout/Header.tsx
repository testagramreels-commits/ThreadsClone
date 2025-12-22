import { AtSign } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b glass-effect">
      <div className="container flex h-16 items-center justify-center px-4">
        <div className="flex items-center gap-2">
          <AtSign className="h-8 w-8" />
          <h1 className="text-2xl font-bold">threads</h1>
        </div>
      </div>
    </header>
  );
}
