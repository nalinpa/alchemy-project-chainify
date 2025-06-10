import React, { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { ethers, EthersError, Interface } from "ethers"; 
import detectEthereumProvider from "@metamask/detect-provider";
import { Link } from "react-router-dom";

import { axiosInstance } from "../lib/axios"; 
import { useSharedState } from "@/context/BCContext"; 
import AlbumContractABI from "../contracts/Album.sol/Album.json";

// Helper components for UI consistency
const InputField = ({ label, ...props }: { label: React.ReactNode, [key: string]: any }) => (
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

const FileInputField = ({ label, ...props }: { label: React.ReactNode, [key: string]: any }) => (
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


const albumInterface = new Interface(AlbumContractABI.abi);

interface AlbumFormData {
  title: string;
  releaseYear: string;
  coverImageFile: File | null;
}

interface SongInAlbum {
  songId: string; 
  title: string;
  trackNumber: number;
}

interface AvailableSong {
  _id: string;
  title: string;
  artistName: string;
}

function isEthersError(error: any): error is EthersError & { code: string; reason?: string; info?: any; shortMessage?: string } {
  return error instanceof Error && 
         typeof (error as any).code === 'string' && 
         error.name === 'EthersError';
}

const AddAlbum: React.FC = () => {
  const { token, address, isMusician } = useSharedState(); 
  
  const [formData, setFormData] = useState<AlbumFormData>({
    title: "",
    releaseYear: new Date().getFullYear().toString(),
    coverImageFile: null,
  });

  const [songsForAlbum, setSongsForAlbum] = useState<SongInAlbum[]>([]);
  const [availableSongs, setAvailableSongs] = useState<AvailableSong[]>([]);
  const [selectedSongToAdd, setSelectedSongToAdd] = useState<AvailableSong | null>(null);
  const [currentTrackNumber, setCurrentTrackNumber] = useState<string>("");

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  useEffect(() => {
    const fetchMusicianSongs = async () => {
      if (token && isMusician && address) {
        setIsLoadingSongs(true);
        setError(null);
        try {
          const response = await axiosInstance.get(`/song/artist/${address}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.data.success) {
            setAvailableSongs(response.data.data || []);
          } else {
            throw new Error(response.data.error?.message || "Failed to fetch your songs.");
          }
        } catch (err: any) {
          console.error("Fetch musician songs error:", err);
          setError(err.message || "Could not load your songs.");
        } finally {
          setIsLoadingSongs(false);
        }
      } else {
        setAvailableSongs([]); 
      }
    };
    fetchMusicianSongs();
  }, [token, isMusician, address]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files.length > 0) {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSelectSongForAlbum = (song: AvailableSong) => {
    if (songsForAlbum.some(s => s.songId === song._id)) {
      setError(`Song "${song.title}" is already in the list.`);
      return;
    }
    setSelectedSongToAdd(song); 
    setCurrentTrackNumber(""); 
    setError(null);
  };
  
  const confirmAddSongToList = () => {
    if (!selectedSongToAdd || !currentTrackNumber.trim()) {
      setError("Please select a song and enter a track number.");
      return;
    }
    const trackNumber = parseInt(currentTrackNumber);
    if (isNaN(trackNumber) || trackNumber <= 0) {
      setError("Track number must be a positive integer.");
      return;
    }
    if (songsForAlbum.some(s => s.trackNumber === trackNumber)) {
      setError(`Track number ${trackNumber} is already assigned. Please use a unique track number.`);
      return;
    }
    if (songsForAlbum.some(s => s.songId === selectedSongToAdd._id)) {
        setError(`Song ID ${selectedSongToAdd._id} is already added.`);
        return;
    }

    setSongsForAlbum(prev => [...prev, { 
      songId: selectedSongToAdd._id, 
      title: selectedSongToAdd.title, 
      trackNumber 
    }].sort((a, b) => a.trackNumber - b.trackNumber)); 
    
    setSelectedSongToAdd(null); 
    setCurrentTrackNumber("");
    setError(null);
  };


  const removeSongFromList = (songIdToRemove: string) => {
    setSongsForAlbum(prev => prev.filter(song => song.songId !== songIdToRemove));
  };


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setTransactionHash(null);

    if (!token) {
      setError("You must be logged in to add an album.");
      setIsLoading(false);
      return;
    }
    if (!isMusician) {
      setError("Only registered musicians can add albums.");
      setIsLoading(false);
      return;
    }

    const { title, releaseYear, coverImageFile } = formData;

    if (!title.trim() || !releaseYear.trim() || !coverImageFile) {
      setError("Please fill in title, release year, and select a cover image.");
      setIsLoading(false);
      return;
    }
    if (songsForAlbum.length === 0) {
      setError("Please add at least one song to the album.");
      setIsLoading(false);
      return;
    }

    const apiFormData = new FormData();
    apiFormData.append("title", title.trim());
    apiFormData.append("publisher", "Chainify");
    apiFormData.append("releaseYear", releaseYear.trim());
    apiFormData.append("songs", JSON.stringify(songsForAlbum)); 
    apiFormData.append("image", coverImageFile); 

    try {
      console.log("Submitting new album data to backend...");
      const response = await axiosInstance.post("/album/add", apiFormData, {
        headers: { "Authorization": `Bearer ${token}` },
      });

      const backendResponseData = response.data;
      console.log("Backend response for addAlbum:", backendResponseData);

      if (!backendResponseData.success) {
        throw new Error(backendResponseData.error?.message || backendResponseData.message || "Backend indicated failure.");
      }
      if (!backendResponseData.transactionDetails || !backendResponseData.albumId) {
        console.error("Backend response successful but missing transactionDetails or albumId:", backendResponseData);
        throw new Error("Album data processed, but essential details were not provided by the server.");
      }
      
      const mongoAlbumId = backendResponseData.albumId; 
      setSuccess(`Album "${title}" data processed! MongoDB ID: ${mongoAlbumId}. Now, please confirm the transaction in your wallet to publish on-chain.`);
      
      const metamaskProvider = await detectEthereumProvider({ mustBeMetaMask: true });
      if (!metamaskProvider) {
        throw new Error("MetaMask not detected. Please install MetaMask to publish the album.");
      }
      const browserProvider = new ethers.BrowserProvider(metamaskProvider as any);
      const signer = await browserProvider.getSigner();
      
      console.log("Sending on-chain transaction with details:", backendResponseData.transactionDetails);
      const tx = await signer.sendTransaction({
          to: backendResponseData.transactionDetails.to,
          data: backendResponseData.transactionDetails.data,
          value: backendResponseData.transactionDetails.value, 
      });
      
      setSuccess(`Transaction sent (hash: ${tx.hash}). Waiting for confirmation...`);
      console.log("Transaction sent, waiting for confirmation:", tx.hash);
      const receipt = await tx.wait(); 
      
      if (receipt && receipt.status === 1) {
        setTransactionHash(tx.hash);
        console.log("Album published successfully on-chain. Receipt:", receipt);

        let onChainTokenId = null;
        if (receipt.logs) {
          for (const log of receipt.logs) {
            if (log.address.toLowerCase() === response.data.transactionDetails.to.toLowerCase()) {
              try {
                const parsedLog = albumInterface.parseLog({ topics: log.topics as string[], data: log.data });
                if (parsedLog && parsedLog.name === "AlbumPublished") {
                  onChainTokenId = parsedLog.args.tokenId.toString();
                  console.log("Parsed onChainTokenId from event:", onChainTokenId);
                  break;
                }
              } catch (e) {
                // console.warn("Could not parse a log or not the event we're looking for:", e);
              }
            }
          }
        }

        if (onChainTokenId && mongoAlbumId) {
          setSuccess(`Album "${title}" published on-chain! Token ID: ${onChainTokenId}. Tx: ${tx.hash}. Updating database...`);
          try {
            const confirmResponse = await axiosInstance.put(
              `/album/confirm/${mongoAlbumId}`, 
              { onChainTokenId: onChainTokenId, transactionHash: tx.hash },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if(confirmResponse.data.success) {
              setSuccess(`Album "${title}" fully published! On-chain Token ID: ${onChainTokenId}. Database updated.`);
              console.log("Backend confirmed on-chain publication.");
            } else {
               console.warn("Backend failed to confirm on-chain publication:", confirmResponse.data.error?.message);
               setSuccess(`Album "${title}" published on-chain (Token ID: ${onChainTokenId}, Tx: ${tx.hash}), but backend update may have failed. Please check your albums.`);
            }
          } catch (confirmError: any) {
            console.error("Error confirming publication with backend:", confirmError);
            setSuccess(`Album "${title}" published on-chain (Token ID: ${onChainTokenId}, Tx: ${tx.hash}), but failed to update backend. Error: ${confirmError.message}`);
          }
        } else {
          console.warn("Could not extract onChainTokenId from transaction receipt events.");
          setSuccess(`Album "${title}" transaction confirmed (Tx: ${tx.hash}), but on-chain Token ID could not be extracted. Backend not updated with on-chain ID.`);
        }

        setFormData({ title: "", releaseYear: new Date().getFullYear().toString(), coverImageFile: null }); 
        setSongsForAlbum([]);
      } else {
        throw new Error(`On-chain transaction failed or was reverted. Status: ${receipt?.status}`);
      }
    } catch (err: any) {
      let errorMessage = "An unknown error occurred during album submission.";
      console.error("--- Add Album Process Error ---");
      console.error("Raw error object:", err);

      if (err.isAxiosError && err.response) { 
        console.error("Axios error data:", err.response.data);
        errorMessage = err.response.data.error?.message || err.response.data.message || "Failed to communicate with server.";
      } else if (isEthersError(err)) { 
        console.error("Ethers.js error code:", err.code);
        if (err.reason) console.error("Ethers.js error reason (if revert):", err.reason);
        if (err.info) console.error("Ethers.js error info:", err.info);
        
        errorMessage = `Blockchain transaction error: ${err.reason || err.shortMessage || err.message || err.code}`;
        if (err.code === 'ACTION_REJECTED') {
            errorMessage = "Transaction rejected in wallet.";
        } else if (err.code === 'CALL_EXCEPTION') { 
             errorMessage = `Contract execution reverted: ${err.reason || "Check transaction details."}`;
        }
      } else if (err.message) { 
        errorMessage = err.message;
      }
      
      console.error("Final error message to be displayed:", errorMessage);
      setError(`Operation failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }; 

  if (!address || !isMusician) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Access Restricted</h2>
        <p className="text-gray-400 max-w-md">
          { !address 
            ? "Please connect your wallet and log in to add an album." 
            : "Only registered musicians can add albums. Please complete your musician profile first."
          }
        </p>
        {!address && <div className="mt-6"> {/* Placeholder for a SignInButton */} <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-500">Sign In</button></div>}
        {address && !isMusician && <div className="mt-6"><Link to="/musician/add" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-500">Become a Musician</Link></div>}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Create a New Album
          </h1>
          <p className="mt-3 text-lg text-gray-400">Assemble your tracks, add your artwork, and prepare to publish on-chain.</p>
      </div>
      
      {error && <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">{error}</div>}
      {success && (
        <div className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-lg relative mb-6" role="alert">
            <p className="font-bold">Success!</p>
            <p className="text-sm">{success}</p>
            {transactionHash && (
                <p className="text-xs mt-2">
                    Tx: <a href={`https://sepolia.etherscan.io/tx/${transactionHash}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">View on Etherscan</a>
                </p>
            )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Album Details Section */}
        <section className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 border-b border-gray-700 pb-3">Album Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField label="Album Title" name="title" value={formData.title} onChange={handleInputChange} required placeholder="e.g., Midnight Drive" />
                <InputField label="Release Year" name="releaseYear" type="number" value={formData.releaseYear} onChange={handleInputChange} required placeholder="e.g., 2025" />
                <div className="md:col-span-2">
                    <FileInputField label="Album Cover Image" name="coverImageFile" accept="image/*" onChange={handleFileChange} required />
                    {formData.coverImageFile && <p className="text-xs text-gray-500 mt-1">Selected: {formData.coverImageFile.name}</p>}
                </div>
            </div>
        </section>

        {/* Song Management Section */}
        <section className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 border-b border-gray-700 pb-3">Tracklist</h2>
            
            {/* List of songs added to the album */}
            <div className="mb-6">
              {songsForAlbum.length > 0 ? (
                <ul className="space-y-2">
                  {songsForAlbum.map((song) => (
                    <li key={song.songId} className="flex justify-between items-center p-2 bg-gray-800/60 rounded">
                      <span className="font-medium text-white">#{song.trackNumber}: {song.title}</span>
                      <button type="button" onClick={() => removeSongFromList(song.songId)} className="text-red-400 hover:text-red-300 text-xs font-semibold">REMOVE</button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No songs added yet. Select from your library below.</p>
              )}
            </div>

            {/* UI to select a song and assign track number */}
            <div className="mt-4">
              <h3 className="text-lg font-medium text-white mb-2">Add from Your Song Library</h3>
              {isLoadingSongs && <p className="text-sm text-gray-500">Loading your songs...</p>}
              {!isLoadingSongs && availableSongs.length === 0 && <p className="text-sm text-gray-500">You have no individual songs uploaded yet.</p>}
              
              {!isLoadingSongs && availableSongs.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-700 rounded-md p-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                  {availableSongs.map(song => (
                    <div key={song._id} className={`p-2 rounded flex justify-between items-center transition-colors ${selectedSongToAdd?._id === song._id ? 'bg-indigo-600/30' : 'hover:bg-gray-800/80'}`}>
                      <span className="text-white">{song.title}</span>
                      {!songsForAlbum.some(s => s.songId === song._id) && (
                         <button type="button" onClick={() => handleSelectSongForAlbum(song)} 
                                 className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-500">
                           Select
                         </button>
                      )}
                      {songsForAlbum.some(s => s.songId === song._id) && (
                          <span className="text-xs text-green-400 font-semibold">Added</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedSongToAdd && (
              <div className="mt-4 p-4 border border-indigo-500/50 rounded-lg bg-indigo-900/20">
                <h4 className="text-md font-semibold text-white">Assign Track Number for "{selectedSongToAdd.title}"</h4>
                <div className="flex items-center space-x-2 mt-2">
                  <input 
                    type="number" value={currentTrackNumber} onChange={(e) => setCurrentTrackNumber(e.target.value)}
                    placeholder="Track #" min="1"
                    className="w-28 block px-3 py-2 border border-gray-600 rounded-md shadow-sm sm:text-sm bg-gray-900 text-white placeholder-gray-500"
                  />
                  <button type="button" onClick={confirmAddSongToList} className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-500">Confirm</button>
                  <button type="button" onClick={() => setSelectedSongToAdd(null)} className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-500">Cancel</button>
                </div>
              </div>
            )}

        </section>

        <div className="mt-8 flex justify-end">
            <button
                type="submit"
                disabled={isLoading}
                className={`px-8 py-3 rounded-lg text-white font-semibold transition-all duration-300 ${
                    isLoading 
                    ? "bg-gray-500 cursor-not-allowed" 
                    : "bg-gradient-to-r from-indigo-500 to-pink-500 hover:shadow-lg hover:shadow-indigo-500/50"
                }`}
                >
                {isLoading ? "Processing..." : "Create Album & Publish"}
            </button>
        </div>
      </form>
    </div>
  );
};

export default AddAlbum;