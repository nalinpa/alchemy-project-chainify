import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom"; 
import { axiosInstance } from "../lib/axios"; 
import { AlbumIcon, Calendar, Hash } from "lucide-react";

interface AlbumObjectData { 
  _id: string;
  title: string;
  artist: string; 
  musicianId: string; 
  imageUrl?: string;
  releaseYear?: number;
  onChainTokenId?: string | null;
}

interface ArtistAlbumsApiResponse {
  success: boolean;
  message: string;
  count: number;
  data: AlbumObjectData[];
  error?: {
    message: string;
    code?: string;
  };
}

interface ArtistAlbumListProps {
  artistAddress: string | undefined; 
}

const ArtistPublicAlbumList: React.FC<ArtistAlbumListProps> = ({ artistAddress }) => { 
  const [albums, setAlbums] = useState<AlbumObjectData[]>([]);
  const [artistDisplayName, setArtistDisplayName] = useState<string>(""); 
  const [isLoading, setIsLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtistAlbums = async () => {
      if (!artistAddress) {
        setError("Artist address not found in URL.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setAlbums([]); 

      try {
        const response = await axiosInstance.get<ArtistAlbumsApiResponse>(`/album/artist/${artistAddress.toLowerCase()}`);
        console.log("Albums response:", response.data);

        if (response.data.success && Array.isArray(response.data.data)) {
          setAlbums(response.data.data);
          if (response.data.data.length > 0) {
            setArtistDisplayName(response.data.data[0].artist); 
          }
        } else {
          throw new Error(response.data.error?.message || "Failed to fetch albums.");
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.error?.message || err.message || "An unknown error occurred.";
        console.error(`Fetch albums error for artist ${artistAddress}:`, err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArtistAlbums();
  }, [artistAddress]); 

  if (isLoading) {
    return <p className="text-center text-gray-400 p-4 animate-pulse">Loading albums...</p>;
  }

  if (error) {
    return <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-gray-800">
        <h2 className="text-2xl font-bold text-white">
          Published Albums
        </h2>
        <p className="text-gray-400">A collection of on-chain releases by this artist.</p>
      </div>
      
      {albums.length === 0 ? (
        <div className="text-center py-10 px-6 bg-gray-900/50 border border-dashed border-gray-700 rounded-xl">
            <AlbumIcon className="mx-auto h-10 w-10 text-gray-600" />
            <h3 className="mt-2 text-lg font-semibold text-white">No Published Albums Found</h3>
            <p className="mt-1 text-sm text-gray-400">This artist has not published any albums yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {albums.map((album) => (
            <div 
              key={album._id} 
              className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden md:flex transition-all duration-300 hover:border-gray-700 hover:bg-gray-800/60"
            >
              <div className="md:flex-shrink-0 md:w-40">
                <img
                  src={album.imageUrl && album.imageUrl.startsWith('ipfs://') ? `https://gateway.pinata.cloud/ipfs/${album.imageUrl.substring(7)}` : 'https://placehold.co/400x400/1F2937/9CA3AF?text=Cover'}
                  alt={album.title || 'Album cover'}
                  className="h-40 w-full object-cover md:h-full"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src='https://placehold.co/400x400/1F2937/9CA3AF?text=Error'; }}
                />
              </div>
              <div className="p-4 sm:p-6 flex flex-col justify-between flex-grow">
                <div>
                  <h3 className="text-xl font-bold text-white hover:text-indigo-400 transition-colors">
                    <Link to={`/album/${album._id}`}>
                      {album.title || "Untitled Album"}
                    </Link>
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 mt-2">
                    {album.releaseYear && <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> <span>{album.releaseYear}</span></div>}
                    {album.onChainTokenId && <div className="flex items-center gap-1.5"><Hash className="w-3 h-3" /> <span>Token ID: {album.onChainTokenId}</span></div>}
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Link 
                    to={`/album/${album._id}`} 
                    className="px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
                  >
                    View Album
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArtistPublicAlbumList;
