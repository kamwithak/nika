'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import Image from 'next/image';
import { SOLANA_TOKENS, EVM_TOKENS } from '@/lib/constants';
import { useQuote, type QuoteResult, type QuoteParams } from '@/hooks/useQuote';
import { useSwap } from '@/hooks/useSwap';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { TokenSelector, type TokenOption } from './TokenSelector';
import { ChainSelector } from './ChainSelector';
import { AmountInput } from './AmountInput';
import { QuoteDisplay } from './QuoteDisplay';
import { SwapButton } from './SwapButton';
import { StatusTracker } from './StatusTracker';
import { Tooltip } from '../shared/Tooltip';
import styles from './SwapForm.module.css';

function SwapFormContent() {
  const { publicKey } = useWallet();
  const swap = useSwap();

  const [inputToken, setInputToken] = useState<TokenOption | null>(null);
  const [amount, setAmount] = useState('');
  const [destChainId, setDestChainId] = useState<number | null>(null);
  const [outputToken, setOutputToken] = useState<TokenOption | null>(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<QuoteResult | null>(null);

  // Fetch balance for selected input token
  const { balance, balanceFormatted } = useTokenBalance(
    inputToken?.address || null,
    inputToken?.decimals || 6
  );

  const solanaTokenOptions: TokenOption[] = useMemo(
    () => SOLANA_TOKENS.map((t) => ({ 
      address: t.mint, 
      symbol: t.symbol, 
      name: t.name, 
      decimals: t.decimals,
      icon: undefined
    })),
    []
  );

  const evmTokenOptions: TokenOption[] = useMemo(() => {
    if (!destChainId) return [];
    return (EVM_TOKENS[destChainId] || []).map((t) => ({ 
      address: t.address, 
      symbol: t.symbol, 
      name: t.name, 
      decimals: t.decimals,
      icon: t.icon 
    }));
  }, [destChainId]);

  const inputAmountRaw = useMemo(() => {
    if (!amount || !inputToken) return '0';
    try {
      const parts = amount.split('.');
      const whole = parts[0] || '0';
      const frac = (parts[1] || '').padEnd(inputToken.decimals, '0').slice(0, inputToken.decimals);
      return (BigInt(whole) * BigInt(10 ** inputToken.decimals) + BigInt(frac)).toString();
    } catch {
      return '0';
    }
  }, [amount, inputToken]);

  const quoteParams: QuoteParams | null = useMemo(() => {
    if (!inputToken || !outputToken || !destChainId || !recipientAddress || !publicKey || inputAmountRaw === '0') return null;
    return {
      inputToken: inputToken.address,
      inputAmount: inputAmountRaw,
      destChainId,
      outputToken: outputToken.address,
      userWallet: publicKey.toBase58(),
      recipientAddress,
    };
  }, [inputToken, outputToken, destChainId, recipientAddress, publicKey, inputAmountRaw]);

  const { quotes, isLoading: quotesLoading, error: quoteError } = useQuote(quoteParams);

  // Auto-select the best quote when quotes are loaded
  useEffect(() => {
    if (quotes.length > 0 && !selectedQuote) {
      const bestQuote = quotes.find(q => q.isBest) || quotes[0];
      setSelectedQuote(bestQuote);
    }
  }, [quotes, selectedQuote]);

  const handleChainChange = useCallback((chainId: number) => {
    setDestChainId(chainId);
    setOutputToken(null);
    setSelectedQuote(null);
  }, []);

  const handleFractionClick = useCallback((fraction: number) => {
    if (!inputToken || balance === 0n) return;
    
    // Calculate the fraction of the balance
    const fractionAmount = (balance * BigInt(Math.floor(fraction * 10000))) / 10000n;
    
    // Convert to human-readable format
    const divisor = BigInt(10 ** inputToken.decimals);
    const whole = fractionAmount / divisor;
    const frac = fractionAmount % divisor;
    
    let formattedAmount: string;
    if (frac === 0n) {
      formattedAmount = whole.toString();
    } else {
      const fracStr = frac.toString().padStart(inputToken.decimals, '0');
      const trimmedFrac = fracStr.replace(/0+$/, '');
      formattedAmount = `${whole}.${trimmedFrac}`;
    }
    
    setAmount(formattedAmount);
    setSelectedQuote(null);
  }, [inputToken, balance]);

  const handleSwap = useCallback(() => {
    if (!selectedQuote || !inputToken || !outputToken || !destChainId) return;
    const chainNames: Record<number, string> = { 1: 'ethereum', 42161: 'arbitrum', 8453: 'base' };
    swap.execute({
      inputToken: inputToken.address,
      inputTokenSymbol: inputToken.symbol,
      inputAmount: inputAmountRaw,
      destChainId,
      destChain: chainNames[destChainId] || `chain-${destChainId}`,
      outputToken: outputToken.address,
      outputTokenSymbol: outputToken.symbol,
      recipientAddress,
      selectedQuote,
    });
  }, [selectedQuote, inputToken, outputToken, destChainId, inputAmountRaw, recipientAddress, swap]);

  const isSwapping = swap.state !== 'idle' && swap.state !== 'error';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logoContainer}>
          <Image 
            src="/nika/nika.svg" 
            alt="Nika Finance" 
            width={48} 
            height={48}
            className={styles.logoIcon}
          />
          <div className={styles.logoText}>
            <span className={styles.logo}>NIKA FINANCE</span>
            <div className={styles.subtitleRow}>
              <span className={styles.subtitle}>Cross-Chain Swapper • Gas-Free Bridging</span>
              <Tooltip text="No destination gas needed! Pay once in SOL/USDC on Solana. We sponsor all gas fees on Ethereum, Arbitrum, and Base for you. Get competitive quotes from multiple providers and complete your cross-chain swap in minutes.">
                <span className={styles.infoIcon}>ⓘ</span>
              </Tooltip>
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Link href="/history" className={styles.historyLink}>
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className={styles.historyIcon}
            >
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>History</span>
          </Link>
          <WalletMultiButton />
        </div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.leftColumn}>
          <div className={styles.card}>
            <div className={styles.section}>
              <span className={styles.sectionLabel}>From (Solana)</span>
              <TokenSelector
                tokens={solanaTokenOptions}
                selectedToken={inputToken}
                onSelect={(t) => { setInputToken(t); setSelectedQuote(null); }}
                label="Select token"
                disabled={isSwapping}
              />
              <AmountInput
                value={amount}
                onChange={(v) => { setAmount(v); setSelectedQuote(null); }}
                onFractionClick={handleFractionClick}
                maxBalance={balanceFormatted}
                tokenSymbol={inputToken?.symbol}
                disabled={isSwapping}
              />
            </div>

            <div className={styles.arrow}>&#8595;</div>

            <div className={styles.section}>
              <span className={styles.sectionLabel}>To</span>
              <ChainSelector selectedChainId={destChainId} onSelect={handleChainChange} disabled={isSwapping} />
              {destChainId && (
                <TokenSelector
                  tokens={evmTokenOptions}
                  selectedToken={outputToken}
                  onSelect={(t) => { setOutputToken(t); setSelectedQuote(null); }}
                  label="Select token"
                  disabled={isSwapping}
                />
              )}
            </div>

            <div className={styles.section}>
              <span className={styles.sectionLabel}>Recipient Address (EVM)</span>
              <input
                type="text"
                placeholder="0x..."
                value={recipientAddress}
                onChange={(e) => { setRecipientAddress(e.target.value); setSelectedQuote(null); }}
                disabled={isSwapping}
                className={styles.recipientInput}
              />
            </div>
          </div>

          {(quoteError || swap.error) && (
            <div className={styles.errorBanner}>{quoteError || swap.error}</div>
          )}

          <SwapButton
            swapState={swap.state}
            hasAmount={inputAmountRaw !== '0'}
            hasQuote={!!selectedQuote}
            inputTokenSymbol={inputToken?.symbol || ''}
            outputTokenSymbol={outputToken?.symbol || ''}
            onSwap={handleSwap}
            disabled={isSwapping}
          />

          {swap.swapId && destChainId && swap.state === 'tracking' && (
            <StatusTracker swapId={swap.swapId} destChainId={destChainId} />
          )}
        </div>

        <div className={styles.rightColumn}>
          <QuoteDisplay
            quotes={quotes}
            selectedProvider={selectedQuote?.provider || null}
            onSelect={setSelectedQuote}
            isLoading={quotesLoading}
            outputTokenSymbol={outputToken?.symbol || ''}
            outputTokenDecimals={outputToken?.decimals || 6}
            outputTokenIcon={outputToken?.icon}
            destChainId={destChainId}
          />
        </div>
      </div>
    </div>
  );
}

export function SwapForm() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch - don't render wallet-dependent content until mounted
  if (!mounted) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.logoContainer}>
            <Image 
              src="/nika/nika.svg" 
              alt="Nika Finance" 
              width={48} 
              height={48}
              className={styles.logoIcon}
            />
            <div className={styles.logoText}>
              <span className={styles.logo}>NIKA FINANCE</span>
              <span className={styles.subtitle}>Cross-Chain Swapper</span>
            </div>
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.section}>
            <span className={styles.sectionLabel}>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return <SwapFormContent />;
}
