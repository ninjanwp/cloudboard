import DebugInvitation from '../debug-invitation';
import { Header } from '../components/Header';

export default function DebugPage() {
  return (
    <>
      <Header />
      <main className="pt-16">
        <DebugInvitation />
      </main>
    </>
  );
}
