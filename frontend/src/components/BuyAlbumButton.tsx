import React, { useState } from 'react';
import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';

import { axiosInstance } from '../lib/axios'; 
import { useSharedState } from '@/context/BCContext'; 
import { isEthersError } from '@/lib/utils';  

interface BuyAlbumButtonProps {
  albumId: string; // MongoDB ID of the album
  albumTitle: string;
  onChainTokenId: string | null | undefined; 
  priceEth?: string; 
  albumArtistAddress?: string;
  onPurchaseSuccess?: (albumId: string, transactionHash: string) => void; 
  onPurchaseError?: (albumId: string, errorMessage: string) => void; 
}

const BuyAlbumButton: React.FC<BuyAlbumButtonProps> = ({
  albumId,
  albumTitle,
  onChainTokenId,
  priceEth = "0.01",
  albumArtistAddress,
  onPurchaseSuccess,
  onPurchaseError,
}) => {
  const { token, address: loggedInUserAddress, addBoughtAlbumOptimistically, boughtAlbumIds } = useSharedState();
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null); 

  const handleBuyAlbum = async () => {
    if (!loggedInUserAddress || !token) {
      setFeedback("Please log in to purchase an album.");
      if (onPurchaseError) onPurchaseError(albumId, "User not logged in.");
      return;
    }
    if (!onChainTokenId) {
      setFeedback("This album is not yet available for on-chain purchase (missing on-chain ID).");
      if (onPurchaseError) onPurchaseError(albumId, "Album not configured for on-chain purchase.");
      return;
    }

    setIsLoading(true);
    setFeedback("Preparing purchase...");

    try {
      const metamaskProvider = await detectEthereumProvider({ mustBeMetaMask: true });
      if (!metamaskProvider) throw new Error("MetaMask not detected.");
      
      const provider = new ethers.BrowserProvider(metamaskProvider as any);
      const signer = await provider.getSigner();
      const currentSignerAddress = await signer.getAddress();

      if (currentSignerAddress.toLowerCase() !== loggedInUserAddress.toLowerCase()) {
        throw new Error("MetaMask account mismatch. Please use the logged-in account.");
      }

      const messageToSign = `Buy album ${albumId} for ${loggedInUserAddress}`;
      const signature = await signer.signMessage(messageToSign);

      const buyApiResponse = await axiosInstance.post(`/album/buy`, {
        address: loggedInUserAddress,
        albumId: albumId,
        signature: signature,
      }, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      const backendResponseData = buyApiResponse.data;
      console.log(`Backend response for buying album "${albumTitle}":`, backendResponseData);

      if (!backendResponseData.success || !backendResponseData.transactionDetails) {
        throw new Error(backendResponseData.error?.message || backendResponseData.message || "Failed to initiate purchase from server.");
      }
      
      setFeedback("Please confirm transaction in your wallet...");

      const tx = await signer.sendTransaction({
        to: backendResponseData.transactionDetails.to,
        data: backendResponseData.transactionDetails.data,
        value: backendResponseData.transactionDetails.value, // Should be in Wei as string
      });

      setFeedback(`Transaction sent (hash: ${tx.hash.substring(0,10)}...). Waiting for confirmation...`);
      const receipt = await tx.wait();

      if (receipt && receipt.status === 1) {
        const successMsg = `Album "${albumTitle}" purchased successfully!`;
        setFeedback(successMsg);
        addBoughtAlbumOptimistically(albumId); 
        if (onPurchaseSuccess) onPurchaseSuccess(albumId, tx.hash);
      } else {
        throw new Error(`On-chain transaction failed or reverted. Status: ${receipt?.status}`);
      }

    } catch (err: any) {
      let errorMessage = "An unknown error occurred during purchase.";
      if (err.isAxiosError && err.response?.data) {
        errorMessage = err.response.data.error?.message || err.response.data.message || "Server communication error.";
      } else if (isEthersError(err)) {
        errorMessage = `Blockchain transaction error: ${err.reason || err.shortMessage || err.code}`;
        if (err.code === 'ACTION_REJECTED') errorMessage = "Transaction rejected in wallet.";
        else if (err.code === 'CALL_EXCEPTION') errorMessage = `Contract execution reverted: ${err.reason || "Check details."}`;
      } else if (err.message) {
        errorMessage = err.message;
      }
      console.error(`Buy album (${albumTitle}) error:`, err);
      setFeedback(`Error: ${errorMessage}`);
      if (onPurchaseError) onPurchaseError(albumId, errorMessage);
    } finally {
      setIsLoading(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const hasAlbum = boughtAlbumIds?.find(id => id === albumId);
  const artistAlbum = loggedInUserAddress === albumArtistAddress;
  console.log("is artist album", loggedInUserAddress , albumArtistAddress, artistAlbum);
  if (!loggedInUserAddress || !onChainTokenId || hasAlbum ||  artistAlbum) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleBuyAlbum}
        disabled={isLoading}
        className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          isLoading 
            ? "bg-gray-400 text-white cursor-not-allowed" 
            : "bg-green-500 text-white hover:bg-green-600"
        }`}
      >
        {isLoading ? "Processing..." : `Buy (${priceEth} ETH)`}
      </button>
      {feedback && <p className={`text-xs mt-1 text-center ${feedback.startsWith("Error:") ? 'text-red-500' : 'text-blue-500'}`}>{feedback}</p>}
    </>
  );
};

export default BuyAlbumButton;