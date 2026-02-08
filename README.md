# Nika Finance

A cross-chain bridge that lets you swap tokens from Solana to Ethereum, Arbitrum, and Base - without needing gas tokens on the destination chain.

<img width="1302" height="885" alt="Screenshot 2026-02-08 at 3 28 57 PM" src="https://github.com/user-attachments/assets/8062ad37-dc31-4a15-8c22-63612f5524e4" />

## What Does It Do?

Nika Finance solves a common problem in crypto: you have tokens on Solana and want to move them to another blockchain (like Ethereum or Base), but you don't have gas tokens on that destination chain. 

**With Nika**: Pay a small fee in SOL or USDC on Solana, and we sponsor the gas fees for you on the destination chain. No need to buy ETH first!

## How It Works (Simple Explanation)

```
1. You connect your Solana wallet
   ↓
2. Choose what token to send and where (Ethereum, Arbitrum, or Base)
   ↓
3. We find you the best price from multiple bridge providers
   ↓
4. You approve TWO transactions on Solana:
   - First: Pay a small fee to our sponsor wallet
   - Second: Send your tokens to the bridge
   ↓
5. The bridge handles everything on the destination chain
   ↓
6. Your tokens arrive at your destination wallet - done!
```

## Architecture Overview

### The Flow Behind the Scenes

**Step 1: Getting Quotes**
```
User fills form → Frontend calls /api/quote
                       ↓
    Server queries both Relay + deBridge in parallel
                       ↓
    Calculates fees for each quote (gas + provider + markup + buffer)
                       ↓
    Determines "best" quote (highest output amount)
                       ↓
    Returns all quotes with fees to user
```

The "best" quote is determined by which provider gives you the **most tokens** on the destination chain. Fees are calculated separately and shown transparently.

**Step 2: Calculating Fees**

For each quote, we calculate a single fee charged on Solana that covers:

1. **Solana Transaction Costs**: Base fees + priority fees for both transactions
2. **Solana Rent**: If any token accounts need creation (e.g., sponsor USDC ATA)
3. **Provider Fee**: The bridge provider's fee (Relay relayer fee or deBridge fixed/variable fees)
4. **Percentage Markup**: 0.5% (50 bps) service fee on input amount
5. **Safety Buffer**: Fixed buffer (default 0.01 SOL) to protect against price fluctuations

The fee is automatically charged in **USDC if you have enough**, otherwise in **SOL**. This single fee covers everything - you don't pay anything on the destination chain.

**Step 3: Executing the Swap**

```
User clicks swap → Frontend calls /api/swap with selected quote
                        ↓
    Server re-validates quote and recalculates fee (drift protection)
                        ↓
    Builds TWO Solana transactions:
    
    1. Fee Payment Transaction (partially signed by sponsor)
       - User transfers fee (SOL/USDC) to sponsor wallet
       - Sponsor pays the gas for this transaction
       
    2. Bridge Transaction (from provider's quote)
       - User sends tokens to bridge provider
       - User pays gas for this transaction
                        ↓
    Returns both serialized transactions to frontend
                        ↓
    User signs both transactions in wallet
                        ↓
    Frontend sends fee tx → then bridge tx
                        ↓
    Provider executes bridge on destination chain
                        ↓
    Tokens arrive in user's destination wallet
```

**Key Design Decisions:**

- **Two-Transaction Flow**: Fee payment is separate from the bridge transaction. This ensures transparency and allows for sponsor gas payment on the fee transaction.
- **Sponsor as Fee Payer**: The sponsor wallet pays gas for the fee payment transaction, reducing user friction.
- **Drift Protection**: Server re-calculates fees during swap execution and rejects if fee increased >10% since quote.
- **Fee Token Selection**: Automatically uses USDC if user has sufficient balance, falls back to SOL.

**Step 4: Tracking**

Every swap is saved to the database with:
- User wallet address
- Input/output tokens and amounts  
- Provider used
- Fee paid and token
- Destination chain and recipient
- Transaction signatures
- Status tracking (pending → fee_paid → bridge_initiated → completed/failed)

Users can view their complete transaction history at `/history`.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your settings

# Generate a sponsor wallet
npm run generate:sponsor

# Set up database
npm run db:push

# Start the app
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Key Features

- **Multi-Provider Quote Comparison**: Automatically fetches quotes from Relay and deBridge in parallel
- **Smart "Best" Selection**: Identifies the quote with the highest output amount (most tokens for you)
- **Automatic Fee Token Selection**: Uses USDC when available, falls back to SOL
- **Sponsored Gas**: You never need gas tokens on the destination chain
- **Two-Transaction Safety**: Separate fee payment and bridge execution for transparency
- **Real-Time Balance Tracking**: Live token balances with automatic refresh
- **Transaction History**: Complete audit trail of all swaps with status tracking
- **Auto-Refreshing Quotes**: Quotes refresh every 30 seconds to ensure fresh pricing
- **Drift Protection**: Server validates fees haven't increased >10% since quote

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Blockchain**: Solana Web3.js, Viem (for EVM chains)
- **Database**: Prisma + SQLite
- **Bridge Providers**: Relay Protocol, deBridge

## Project Structure

```
src/
├── app/
│   ├── api/                    # API Routes (Next.js 16 App Router)
│   │   ├── quote/              # POST /api/quote - Get quotes from providers
│   │   ├── swap/               # POST /api/swap - Execute swap with sponsor
│   │   └── history/            # GET /api/history - Fetch user's swap history
│   ├── history/                # Transaction history page
│   │   └── page.tsx
│   └── page.tsx                # Main swap interface
│
├── components/
│   ├── swap/                   # Swap UI components
│   │   ├── SwapForm.tsx        # Main swap form container
│   │   ├── QuoteDisplay.tsx    # Shows quotes from providers with "Best" badge
│   │   ├── TokenSelector.tsx   # Dropdown for token selection
│   │   ├── ChainSelector.tsx   # Destination chain selector
│   │   ├── AmountInput.tsx     # Token amount input with balance
│   │   ├── SwapButton.tsx      # Swap execution button with states
│   │   └── StatusTracker.tsx   # Real-time swap status tracking
│   ├── history/                # History page components
│   │   └── SwapHistory.tsx     # Transaction history table
│   ├── shared/                 # Reusable UI components
│   │   ├── Tooltip.tsx         # Tooltip with hover state
│   │   ├── TokenIcon.tsx       # Token icon display
│   │   ├── ChainIcon.tsx       # Chain icon display
│   │   └── LoadingSpinner.tsx  # Loading indicator
│   └── providers/              # Context providers
│       └── WalletContextProvider.tsx  # Solana wallet adapter setup
│
├── lib/
│   ├── providers/              # Bridge provider integrations
│   │   ├── index.ts            # Provider orchestration, quote comparison
│   │   ├── relay.ts            # Relay Protocol integration
│   │   ├── debridge.ts         # deBridge integration
│   │   └── types.ts            # Shared provider types
│   │
│   ├── fees/                   # Fee calculation system
│   │   ├── calculator.ts       # Fee calculation logic with all components
│   │   └── types.ts            # Fee breakdown types
│   │
│   ├── solana/                 # Solana blockchain utilities
│   │   ├── connection.ts       # RPC connection singleton
│   │   ├── sponsor.ts          # Sponsor wallet keypair management
│   │   ├── transaction.ts      # Transaction building (fee payment, etc)
│   │   └── token.ts            # SPL token operations, ATA management
│   │
│   ├── swap/                   # Swap execution engine
│   │   ├── executor.ts         # Main swap execution with two-tx flow
│   │   └── types.ts            # Swap request/response types
│   │
│   ├── db.ts                   # Prisma client singleton
│   ├── config.ts               # Environment config with validation
│   └── constants.ts            # Chain IDs, token addresses, fee defaults
│
├── hooks/                      # React hooks
│   ├── useQuote.ts             # Fetch and auto-refresh quotes
│   ├── useSwap.ts              # Execute swap with state management
│   └── useTokenBalance.ts      # Real-time token balance fetching
│
└── prisma/
    └── schema.prisma           # Database schema (swap history)
```

### Key Architecture Patterns

- **API Routes**: Server-side logic in Next.js 16 App Router API routes for secure operations
- **Provider Abstraction**: Common interface (`BridgeProvider`) for all bridge providers
- **Fee Calculator**: Centralized fee calculation with all cost components
- **Two-Transaction Flow**: Separate fee payment and bridge execution for transparency
- **State Management**: React hooks for quote fetching, swap execution, and balance tracking
- **Type Safety**: Full TypeScript coverage with strict types
- **Database**: Prisma ORM with SQLite for development, easily swappable for production

## Environment Variables

Required in `.env.local`:

```env
# Your Solana RPC endpoint
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Generated sponsor wallet private key
SPONSOR_PRIVATE_KEY=<generate using npm run generate:sponsor>

# Database
DATABASE_URL=file:./dev.db
```

Optional configuration (with defaults):

```env
# Fee configuration
FEE_PERCENTAGE_BPS=50                    # 0.5% service markup
FEE_FIXED_BUFFER_LAMPORTS=10000000       # 0.01 SOL safety buffer
FEE_FIXED_BUFFER_USDC=50000              # 0.05 USDC safety buffer (if charging in USDC)

# Token configuration
USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v  # USDC mint address

# Quote refresh interval (frontend)
NEXT_PUBLIC_QUOTE_REFRESH_MS=30000       # 30 seconds
```

## Important Security Notes

- **Sponsor Wallet**: This wallet needs to be funded with SOL and/or USDC to pay for gas fees on behalf of users
- **Never commit** your `.env.local` file (it's in `.gitignore`)
- **Keep your private key safe** - it controls the sponsor wallet funds

### How to Fund the Sponsor Wallet

1. **Generate or view your sponsor wallet address:**
   ```bash
   npm run show:sponsor
   ```
   This will display your sponsor wallet address and current balance.

2. **Send funds to that address:**
   - **SOL**: Needed to pay gas fees for transactions
   - **USDC** (optional): Needed if users pay fees in USDC
   
3. **Recommended amounts:**
   - Development: 0.1 SOL minimum
   - Production: Monitor balance regularly, top up when low
   - Each swap costs ~0.01-0.02 SOL in gas fees

4. **Monitor balance:**
   ```bash
   npm run show:sponsor
   ```
   
   The sponsor wallet needs enough balance to:
   - Pay gas for fee collection transactions (~0.00011 SOL per swap)
   - Cover edge cases with 2x safety margin
   - Handle USDC if users pay fees in USDC

## Development Commands

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm test                 # Run tests
npm run generate:sponsor # Generate new sponsor keypair
npm run show:sponsor     # Show sponsor wallet address and balance
npm run db:studio        # Open database viewer
```

## Testing

This is a **mainnet-only** application. The bridge providers (Relay and deBridge) only work with real liquidity on mainnet.

**To test safely**: Start with small amounts ($1-5) to verify everything works.

## How Fees Work

**The Big Advantage**: You only pay once, in SOL or USDC on Solana. No need to worry about having ETH on the destination chain!

### Fee Components

When you make a swap, you pay a **single fee on Solana** that covers everything:

1. **Solana Gas Costs**: 
   - Base transaction fees (2 transactions: fee payment + bridge)
   - Priority fees to ensure fast execution
   - Total: ~0.00011 SOL per swap

2. **Solana Rent Costs**:
   - Token account creation if needed (e.g., sponsor's USDC ATA)
   - Only charged once per account
   - Total: ~0.00203928 SOL when needed, 0 otherwise

3. **Bridge Provider Fee**: 
   - Relay: Variable relayer fee based on destination gas costs
   - deBridge: Fixed 0.015 SOL + variable protocol fees
   - This covers the provider's costs to execute on the destination chain

4. **Service Markup**: 
   - 0.5% (50 basis points) on your input amount
   - Keeps the platform running and sustainable

5. **Safety Buffer**: 
   - Fixed 0.01 SOL buffer (configurable)
   - Protects against price fluctuations and gas spikes
   - Ensures your transaction completes successfully

**Fee Token Selection**: The system automatically charges in USDC if you have enough balance (better UX), otherwise falls back to SOL.

**Transparency First**: All fee components are calculated server-side and displayed upfront. The "Total Fee" you see is exactly what you'll pay - no hidden costs.

### Example Fee Calculation

For a 1 SOL → USDC swap to Base (assuming SOL = $100, USDC preferred):

```
Solana Gas (2 txs):        0.00011 SOL  = ~$0.011
Solana Rent (if needed):   0.00204 SOL  = ~$0.204
Bridge Provider Fee:       0.005 SOL    = ~$0.50
Service Markup (0.5%):     0.005 SOL    = ~$0.50
Safety Buffer:             0.01 SOL     = ~$1.00
------------------------------------------------
Total Cost in SOL:         0.02215 SOL  = ~$2.21

Converted to USDC (at $100/SOL): ~2.21 USDC charged
```

**You receive**: Full output amount quoted by the bridge provider (e.g., $97.79 worth of USDC on Base if you sent $100 of SOL).

### Why Two Transactions?

1. **Fee Payment Transaction**: You send the calculated fee (SOL or USDC) to the sponsor wallet. The sponsor pays the gas for this transaction.
2. **Bridge Transaction**: You send your tokens to the bridge provider. You pay the gas for this transaction.

This separation ensures:
- ✅ Complete transparency - you can see exactly where your fee goes
- ✅ Sponsor can pay gas for fee collection (better UX)
- ✅ If bridge fails, only the small fee is spent - your main tokens stay safe
- ✅ Clear audit trail for accounting and debugging

## FAQ

**Q: Why do I need to approve two transactions?**  
A: The first transaction pays the sponsor fee (in SOL or USDC) to cover all costs. The sponsor pays the gas for this transaction. The second transaction sends your tokens to the bridge provider. This separation ensures transparency and allows you to see exactly where your fee goes. If the bridge transaction fails, only the small fee is spent - your main tokens stay safe.

**Q: What if my transaction fails?**  
A: If the fee payment succeeds but the bridge transaction fails, your tokens stay in your wallet. Only the sponsor fee is spent. You can retry the swap with a new quote.

**Q: How long does a swap take?**  
A: Usually 15-30 seconds for the blockchain confirmations, but can vary depending on network congestion on both chains. The UI shows real-time status updates.

**Q: What tokens are supported?**  
A: Currently SOL and USDC on Solana, swapping to USDC on Ethereum (chainId: 1), Arbitrum (chainId: 42161), and Base (chainId: 8453).

**Q: How is the "Best" quote determined?**  
A: The "Best" badge goes to the provider offering the **highest output amount** - meaning you receive the most tokens on the destination chain. Fees are shown separately and charged on Solana.

**Q: What if the fee increases between quote and execution?**  
A: The server re-calculates fees during swap execution. If the fee has increased by more than 10% since the quote, the swap is rejected and you're asked to request a new quote. This "drift protection" prevents surprise costs.

**Q: Can I pay fees in USDC?**  
A: Yes! If you have enough USDC balance, the system automatically charges fees in USDC. Otherwise, it falls back to SOL. This is transparent in the quote display.

**Q: How do I fund the sponsor wallet?**  
A: The sponsor wallet needs SOL and/or USDC to pay gas fees on behalf of users. Simply send tokens to the sponsor wallet address (derived from `SPONSOR_PRIVATE_KEY`). Monitor the balance regularly to ensure uninterrupted service.

## Support

Having issues? Check:
1. Your sponsor wallet has enough balance
2. RPC endpoints are responding
3. Browser console for error messages

## License

MIT
