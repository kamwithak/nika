import { SwapHistory } from '@/components/history/SwapHistory';
import pageStyles from './page.module.css';

export default function HistoryPage() {
  return (
    <main className={pageStyles.main}>
      <SwapHistory />
    </main>
  );
}
