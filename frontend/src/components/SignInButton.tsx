import React, { useState } from "react";
import detectEthereumProvider from "@metamask/detect-provider";
import { useSharedState } from "../context/BCContext"; 
import { axiosInstance } from "../lib/axios"; 

const SignInButton: React.FC = () => {
  const { login, address: currentAddress } = useSharedState(); 
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null); // Clear previous errors

    try {
      const provider = await detectEthereumProvider({ mustBeMetaMask: true });

      // Check if multiple providers are injected
      const providers = (window as any).ethereum?.providers || [];
      const metamaskProvider = providers.find((p: any) => p.isMetaMask) || provider;

      if (!metamaskProvider) {
          throw new Error("MetaMask not detected. Please install MetaMask.");
      }

      // Now use 'metamaskProvider' instead of 'provider' for all subsequent requests
      const accounts = await metamaskProvider.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found. Please ensure your MetaMask wallet is unlocked and connected.");
      }
      const userWalletAddress = accounts[0];

      // Prepare the message for signing
      const messageToSign = "Login to Music NFT Platform"; // Must match backend

      // Request signature
      const signature = await (provider as any).request({
        method: "personal_sign",
        params: [messageToSign, userWalletAddress],
      });

      if (!signature) {
        throw new Error("Signature request was denied or failed.");
      }

      console.log("Sending login request to backend:", { address: userWalletAddress, signature });

      // Call your backend /auth/login endpoint
      const response = await axiosInstance.post("/auth/login", {
        address: userWalletAddress,
        signature,
      });

      const responseData = response.data;
      console.log("Login response from backend:", responseData);

      if (!responseData.success || !responseData.data || !responseData.data.token) {
        throw new Error(responseData.error?.message || responseData.message || "Login failed: Invalid response from server.");
      }

      const { address: loggedInAddress, isMusician: musicianStatus, token: authToken, boughtAlbums } = responseData.data;

      login(loggedInAddress, authToken, musicianStatus, boughtAlbums); 
      
      console.log("Successfully logged in and context updated:", { loggedInAddress, tokenSet: !!authToken, musicianStatus, boughtAlbums });

    } catch (err: any) {
      let errorMessage = "An unknown error occurred during login.";
      if (err.response && err.response.data && err.response.data.error) {
        errorMessage = err.response.data.error.message || err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      console.error("Error in handleSignIn:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Prevent sign-in if already logged in (optional, based on your UI flow)
  if (currentAddress) {
    return (
      <div className="text-sm text-gray-600">
        Connected: {currentAddress.substring(0, 6)}...{currentAddress.substring(currentAddress.length - 4)}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleSignIn}
        disabled={isLoading}
        className={`bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors ${
          isLoading ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {isLoading ? "Connecting & Signing..." : "Sign In with MetaMask"}
      </button>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
};

export default SignInButton;