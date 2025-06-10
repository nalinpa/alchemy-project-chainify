import React, { useState, useEffect } from "react";
import { axiosInstance } from "../lib/axios";
import { Link } from "react-router-dom";
import BuyAlbumButton from "./BuyAlbumButton";

interface FeaturedAlbumData {
  _id: string;
  title: string;
  artist?: string;
  artistAddress?: string;
  musicianId?: string;
  imageUrl?: string;
  releaseYear?: number;
  onChainTokenId?: string | null;
  priceEth?: string;
}

interface FeaturedAlbumsApiResponse {
  success: boolean;
  message: string;
  count: number;
  data: FeaturedAlbumData[];
  error?: {
    message: string;
    code?: string;
  };
}

const FeaturedAlbums: React.FC = () => {
  const [albums, setAlbums] = useState<FeaturedAlbumData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeaturedAlbums = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await axiosInstance.get<FeaturedAlbumsApiResponse>("/album/featured");
        if (response.data.success && Array.isArray(response.data.data)) {
          setAlbums(response.data.data);
        } else {
          throw new Error(response.data.error?.message || "Failed to fetch featured albums.");
        }
      } catch (err: any) {
        let errorMessage = "An unknown error occurred.";
        if (err.response?.data?.error?.message) {
          errorMessage = err.response.data.error.message;
        } else if (err.message) {
          errorMessage = err.message;
        }
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFeaturedAlbums();
  }, []);

  const handlePurchaseFeedback = (albumId: string, type: 'success' | 'error', message: string) => {
    console.log(`Purchase feedback for album ${albumId}: [${type}] ${message}`);
  };

  if (isLoading) {
    return <p className="text-center text-gray-400 p-4">Loading featured albums...</p>;
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (albums.length === 0) {
    return <p className="text-center text-gray-500 p-4">No featured albums available at the moment.</p>;
  }

  return (
    <div className="space-y-6">
      {albums.map((album) => (
        <div 
          key={album._id} 
          className="bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden md:flex transition-all duration-300 hover:border-gray-600 hover:bg-gray-800/60"
        >
          <div className="md:flex-shrink-0 md:w-48">
            <img
              src={album.imageUrl && album.imageUrl.startsWith('ipfs://') ? `https://gateway.pinata.cloud/ipfs/${album.imageUrl.substring(7)}` : album.imageUrl || 'https://placehold.co/400x400/171717/9ca3af?text=No+Cover'}
              alt={album.title || 'Album cover'}
              className="h-48 w-full object-cover md:h-full"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src='https://placehold.co/400x400/171717/9ca3af?text=Error'; }}
            />
          </div>
          <div className="p-6 flex flex-col justify-between flex-grow">
            <div>
              <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">
                {album.releaseYear || "Classic"}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-white truncate" title={album.title}>
                <Link to={`/album/${album._id}`} className="hover:underline">
                  {album.title || "Untitled Album"}
                </Link>
              </h2>
              {album.artist && (
                <p className="mt-1 text-md text-gray-400 truncate">
                  By:{' '}
                  {album.artistAddress ? (
                    <Link to={`/artist/${album.artistAddress}`} className="hover:text-white hover:underline">
                      {album.artist}
                    </Link>
                  ) : (
                    album.artist
                  )}
                </p>
              )}
            </div>
            <div className="mt-4">
              <BuyAlbumButton
                albumId={album._id}
                albumTitle={album.title || "Untitled Album"}
                onChainTokenId={album.onChainTokenId}
                priceEth={album.priceEth}
                onPurchaseSuccess={(id, txHash) => handlePurchaseFeedback(id, 'success', `Purchase successful! Tx: ${txHash}`)}
                onPurchaseError={(id, errMsg) => handlePurchaseFeedback(id, 'error', errMsg)}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FeaturedAlbums;