// Test script to verify quote endpoint
const testQuote = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputToken: 'So11111111111111111111111111111111111111112', // SOL
        inputAmount: '1000000000', // 1 SOL
        destChainId: 8453, // Base
        outputToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
        userWallet: 'DeYmwP58u9y2R79NpGc16xrUk9R3FziuGxhE7GtbYjSF', // Generated sponsor wallet
        recipientAddress: '0x0742d35Cc6634C0532925a3b844Bc9e7595f0bEb', // Example address (valid checksum)
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Quote request failed:', error);
      process.exit(1);
    }

    const data = await response.json();
    console.log('✓ Quote endpoint working!');
    console.log('Number of quotes received:', data.quotes?.length || 0);
    
    if (data.quotes && data.quotes.length > 0) {
      data.quotes.forEach((quote, i) => {
        console.log(`\nQuote ${i + 1} (${quote.provider}):`);
        console.log('  Estimated output:', quote.estimatedOutput);
        console.log('  Fee:', quote.fee.totalFee, quote.fee.feeToken);
        console.log('  Time estimate:', quote.estimatedTimeSeconds, 'seconds');
        console.log('  Best quote:', quote.isBest ? 'YES' : 'NO');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
};

testQuote();
