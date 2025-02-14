// App.js
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react';
import { useWeb3Modal, useWeb3ModalProvider, useWeb3ModalAccount, useWeb3ModalState } from '@web3modal/ethers/react';

// Configure Web3Modal
createWeb3Modal({
  ethersConfig: defaultConfig({ 
    metadata: {
      name: 'USDT Transfer App',
      description: 'Transfer USDT across different networks',
    }
  }),
  chains: [
    {
      chainId: 56,
      name: 'BNB Smart Chain',
      currency: 'BNB',
      explorerUrl: 'https://bscscan.com',
      rpcUrl: 'https://bsc-dataseed.binance.org'
    }
  ],
  projectId: 'b00311bb20f1d71b977b474eac2b7dcd' // Get this from cloud.walletconnect.com
});

const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955'; // BSC USDT
const USDT_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address, uint256) returns (bool)'
];

function App() {
  const { open } = useWeb3Modal();
  const { address, isConnected } = useWeb3ModalAccount();
  const { chainId } = useWeb3ModalState();
  const { walletProvider } = useWeb3ModalProvider();
  
  const [bnbBalance, setBnbBalance] = useState('0');
  const [usdtBalance, setUsdtBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  const switchToBNBChain = async () => {
    try {
      if (!walletProvider) return;
      
      await walletProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x38' }], // BSC Mainnet
      });
    } catch (err) {
      if (err.code === 4902) {
        try {
          await walletProvider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x38',
                chainName: 'BNB Smart Chain',
                nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                rpcUrls: ['https://bsc-dataseed.binance.org/'],
                blockExplorerUrls: ['https://bscscan.com/'],
              },
            ],
          });
        } catch (addError) {
          setError('Failed to add BSC network');
        }
      } else {
        setError('Failed to switch network');
      }
    }
  };

  const fetchBalances = async () => {
    if (!isConnected || !walletProvider || !address) return;

    try {
      const provider = new ethers.BrowserProvider(walletProvider);
      
      // Get BNB Balance
      const bnbBal = await provider.getBalance(address);
      setBnbBalance(ethers.formatEther(bnbBal));

      // Get USDT Balance
      const usdtContract = new ethers.Contract(
        USDT_ADDRESS,
        USDT_ABI,
        provider
      );
      
      const decimals = await usdtContract.decimals();
      const usdtBal = await usdtContract.balanceOf(address);
      setUsdtBalance(ethers.formatUnits(usdtBal, decimals));
    } catch (err) {
      setError('Failed to fetch balances');
    }
  };

  const handleTransfer = async () => {
    if (!recipient || !amount) {
      setError('Please enter recipient address and amount');
      return;
    }

    if (!walletProvider) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const provider = new ethers.BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      
      const usdtContract = new ethers.Contract(
        USDT_ADDRESS,
        USDT_ABI,
        signer
      );

      const decimals = await usdtContract.decimals();
      const transferAmount = ethers.parseUnits(amount, decimals);

      const tx = await usdtContract.transfer(recipient, transferAmount);
      await tx.wait();

      // Refresh balances
      await fetchBalances();
      
      // Clear form
      setRecipient('');
      setAmount('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch balances when account or chain changes
  useEffect(() => {
    if (isConnected && address) {
      fetchBalances();
    }
  }, [isConnected, address, chainId]);

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-8">
          Multi-wallet USDT Transfer
        </h1>

        {!isConnected ? (
          <button
            onClick={() => open()}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Connected Account</p>
              <p className="font-mono text-sm">
                {address}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">BNB Balance</p>
                <p className="text-xl font-bold text-yellow-600">
                  {parseFloat(bnbBalance).toFixed(4)} BNB
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">USDT Balance</p>
                <p className="text-xl font-bold text-green-600">
                  ${parseFloat(usdtBalance).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0x..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount (USDT)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>

              <button
                onClick={handleTransfer}
                disabled={loading}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Transfer USDT'}
              </button>

              <w3m-button />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;