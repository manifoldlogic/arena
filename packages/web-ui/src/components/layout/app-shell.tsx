import { Header } from './header';
import { Sidebar } from './sidebar';
import { ContentArea } from './content-area';

export function AppShell() {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <ContentArea />
      </div>
    </div>
  );
}
