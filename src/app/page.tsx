import { SwapForm } from '@/components/swap/SwapForm';
import pageStyles from './page.module.css';

export default function Home() {
  return (
    <main className={pageStyles.main}>
      <SwapForm />
      <footer className={pageStyles.footer}>
        <p className={pageStyles.footerText}>
          Powered by Relay & deBridge • Secured with Sponsored Transactions
        </p>
      </footer>
    </main>
  );
}
