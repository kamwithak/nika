// Comprehensive test for the swap API endpoints
const testSwapFlow = async () => {
  console.log('Testing full swap flow...\n');
  
  try {
    // Step 1: Get a quote
    console.log('Step 1: Fetching quote...');
    const quoteResponse = await fetch('http://localhost:3000/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputToken: 'So11111111111111111111111111111111111111112',
        inputAmount: '100000000', // 0.1 SOL
        destChainId: 8453, // Base
        outputToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
        userWallet: 'DeYmwP58u9y2R79NpGc16xrUk9R3FziuGxhE7GtbYjSF',
        recipientAddress: '0x0742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      }),
    });

    if (!quoteResponse.ok) {
      throw new Error(`Quote failed: ${await quoteResponse.text()}`);
    }

    const quoteData = await quoteResponse.json();
    console.log('✓ Quote received successfully');
    console.log(`  Providers: ${quoteData.quotes.length}`);
    
    const bestQuote = quoteData.quotes.find(q => q.isBest);
    if (!bestQuote) {
      throw new Error('No best quote found');
    }
    
    console.log(`  Best provider: ${bestQuote.provider}`);
    console.log(`  Estimated output: ${bestQuote.estimatedOutput}`);
    console.log(`  Fee: ${bestQuote.fee.totalFee} ${bestQuote.fee.feeToken}`);
    
    // Step 2: Test history endpoint
    console.log('\nStep 2: Testing history endpoint...');
    const historyResponse = await fetch('http://localhost:3000/api/history?wallet=DeYmwP58u9y2R79NpGc16xrUk9R3FziuGxhE7GtbYjSF');
    
    if (!historyResponse.ok) {
      throw new Error(`History failed: ${await historyResponse.text()}`);
    }
    
    const historyData = await historyResponse.json();
    console.log('✓ History endpoint working');
    console.log(`  Swaps found: ${historyData.swaps?.length || 0}`);
    
    console.log('\n✅ All API endpoints working correctly!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
};

testSwapFlow();
