import { RelayProvider } from './relay';
import { DeBridgeProvider } from './debridge';
import type { BridgeProvider, Quote, QuoteRequest } from './types';

const providers: BridgeProvider[] = [
  new RelayProvider(),
  new DeBridgeProvider(),
];

export function getProvider(name: string): BridgeProvider {
  const provider = providers.find((p) => p.name === name);
  if (!provider) throw new Error(`Unknown provider: ${name}`);
  return provider;
}

export interface ComparisonQuote {
  quotes: Quote[];
  bestQuote: Quote;
}

/**
 * Fetch quotes from ALL providers concurrently.
 * Uses Promise.allSettled so one failure doesn't block the other.
 * Returns all successful quotes sorted by best output.
 */
export async function getComparisonQuotes(
  request: QuoteRequest
): Promise<ComparisonQuote> {
  const results = await Promise.allSettled(
    providers.map((p) => p.getQuote(request))
  );

  const quotes: Quote[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      quotes.push(result.value);
    } else {
      console.error('Provider quote failed:', result.reason);
    }
  }

  if (quotes.length === 0) {
    throw new Error('No valid quotes available from any provider');
  }

  // Best quote = highest estimated output amount
  const bestQuote = quotes.reduce((best, q) =>
    q.estimatedOutputAmount > best.estimatedOutputAmount ? q : best
  );

  return { quotes, bestQuote };
}
