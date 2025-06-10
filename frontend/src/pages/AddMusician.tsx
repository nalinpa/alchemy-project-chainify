import React, { useState, FormEvent, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { ethers, EthersError } from "ethers";
import detectEthereumProvider from "@metamask/detect-provider";

import { axiosInstance } from "../lib/axios";
import { useSharedState } from "@/context/BCContext";
import { UserCheck } from "lucide-react";

// Helper components for consistent UI
const InputField = ({ label, ...props }: { label: string, [key: string]: any }) => (
  <div>
    <label htmlFor={props.id || props.name} className="block text-sm font-medium text-gray-400 mb-1">
      {label}
    </label>
    <input
      {...props}
      className="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-900 text-white placeholder-gray-500"
    />
  </div>
);

const FileInputField = ({ label, ...props }: { label: string, [key: string]: any }) => (
  <div>
    <label htmlFor={props.id || props.name} className="block text-sm font-medium text-gray-400 mb-1">
      {label}
    </label>
    <input
      type="file"
      {...props}
      className="mt-1 block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/10 file:text-indigo-300 hover:file:bg-indigo-500/20"
    />
  </div>
);

// Type guard for EthersError
function isEthersError(error: any): error is EthersError & { code: string; reason?: string; info?: any; shortMessage?: string } {
  return error instanceof Error && 
         typeof (error as any).code === 'string' && 
         (error.name === 'EthersError' || Object.prototype.hasOwnProperty.call(error, 'reason') || Object.prototype.hasOwnProperty.call(error, 'info'));
}

interface MusicianFormData {
  name: string;
  image: File | null;
}

const AddMusician: React.FC = () => {
  const { address, token, isMusician, updateMusicianStatus } = useSharedState();
  
  const [formData, setFormData] = useState<MusicianFormData>({
    name: "My Artist Name",
    image: null,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, image: e.target.files?.[0] || null }));
  };

  const becomeMusician = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setTransactionHash(null);

    if (!token || !address) {
      setError("You must be logged in to perform this action.");
      setIsLoading(false);
      return;
    }

    const { name, image } = formData;
    if (!name.trim() || !image) {
      setError("Please provide a musician name and select a profile image.");
      setIsLoading(false);
      return;
    }

    const apiFormData = new FormData();
    apiFormData.append("name", name.trim());
    apiFormData.append("image", image);

    try {
      const metamaskProvider = await detectEthereumProvider({ mustBeMetaMask: true });
      if (!metamaskProvider) throw new Error("MetaMask is not available.");
      const provider = new ethers.BrowserProvider(metamaskProvider as any);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();
      if (signerAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error("MetaMask account does not match logged-in user.");
      }
      
      const response = await axiosInstance.post("/user/musician/add", apiFormData, {
        headers: { "Authorization": `Bearer ${token}` },
      });

      const backendResponseData = response.data;
      if (!backendResponseData.success) {
        throw new Error(backendResponseData.error?.message || "Backend registration failed.");
      }
      if (!backendResponseData.transactionDetails) {
        throw new Error("Server did not provide transaction details.");
      }

      setSuccess("Registration processed. Please confirm the transaction in your wallet to mint your Musician NFT.");
      
      const tx = await signer.sendTransaction(backendResponseData.transactionDetails);
      setSuccess(`Transaction sent (${tx.hash.substring(0,10)}...). Waiting for confirmation...`);
      
      const receipt = await tx.wait();
      
      if (receipt && receipt.status === 1) {
        setSuccess("Congratulations! Your Musician NFT has been minted.");
        setTransactionHash(tx.hash);
        updateMusicianStatus(true);
        setFormData({ name: "", image: null });
      } else {
        throw new Error("On-chain transaction failed or was reverted.");
      }

    } catch (err: any) {
      let errorMessage = "An unknown error occurred.";
      if (err.isAxiosError && err.response?.data) {
        errorMessage = err.response.data.error?.message || "Server communication error.";
      } else if (isEthersError(err)) {
        errorMessage = `Blockchain transaction error: ${err.reason || err.shortMessage || 'Please check console for details.'}`;
        if (err.code === 'ACTION_REJECTED') errorMessage = "Transaction rejected in wallet.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(`Operation failed: ${errorMessage}`);
      console.error("Become Musician Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-300">
        <h2 className="text-2xl font-bold text-white mb-4">Connect to Continue</h2>
        <p className="text-gray-400 max-w-md">Please connect your wallet and sign in to access musician features.</p>
        {/* Placeholder for a SignInButton */}
        <div className="mt-6"><button className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-500">Sign In</button></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-2xl">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
          {isMusician ? "Your Musician Profile" : "Become a Musician"}
        </h1>
        <p className="mt-3 text-lg text-gray-400">
          {isMusician 
            ? "Thank you for being part of our community of artists." 
            : "Mint your Musician NFT to start uploading and selling your music."
          }
        </p>
      </div>

      {isMusician ? (
        <div className="bg-gray-900/50 border border-green-700/50 rounded-xl p-8 text-center">
            <UserCheck className="mx-auto h-16 w-16 text-green-400 mb-4" />
            <h3 className="text-2xl font-bold text-white">You're All Set!</h3>
            <p className="text-gray-300 mt-2">You already have a Musician NFT. You're ready to create.</p>
            <div className="mt-6 flex justify-center gap-4">
                <Link to="/song/add" className="bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-600">Add a Song</Link>
                <Link to="/album/add" className="bg-gradient-to-r from-indigo-500 to-pink-500 text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90">Create an Album</Link>
            </div>
        </div>
      ) : (
        <form onSubmit={becomeMusician} className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-8 space-y-6">
          {error && <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">{error}</div>}
          {success && (
            <div className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-lg" role="alert">
                <p className="font-bold">Success!</p>
                <p className="text-sm">{success}</p>
                {transactionHash && (
                    <p className="text-xs mt-2">
                        Tx: <a href={`https://sepolia.etherscan.io/tx/${transactionHash}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">View on Etherscan</a>
                    </p>
                )}
            </div>
          )}
          
          <InputField 
            label="Artist / Band Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            placeholder="Your stage name"
            disabled={isLoading}
          />
          
          <FileInputField
            label="Profile Image"
            name="image"
            accept="image/*"
            onChange={handleFileChange}
            required
            disabled={isLoading}
          />
          {formData.image && <p className="text-xs text-gray-500 -mt-4">Selected: {formData.image.name}</p>}

          <div className="pt-4 flex justify-end">
            <button
                type="submit"
                disabled={isLoading}
                className={`px-8 py-3 rounded-lg text-white font-semibold transition-all duration-300 ${
                    isLoading 
                    ? "bg-gray-500 cursor-not-allowed" 
                    : "bg-gradient-to-r from-indigo-500 to-pink-500 hover:shadow-lg hover:shadow-indigo-500/50"
                }`}
            >
              {isLoading ? "Processing..." : "Register & Mint NFT"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AddMusician;