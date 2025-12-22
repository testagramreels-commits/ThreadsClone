import { Header } from '@/components/layout/Header';
import { CreateThread } from '@/components/features/CreateThread';
import { ThreadCard } from '@/components/features/ThreadCard';
import { BottomNav } from '@/components/features/BottomNav';
import { mockThreads } from '@/data/mockThreads';

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-2xl mx-auto pb-20 md:pb-4">
        <CreateThread />
        
        <div className="divide-y">
          {mockThreads.map((thread) => (
            <ThreadCard key={thread.id} thread={thread} />
          ))}
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
}

export default App;
