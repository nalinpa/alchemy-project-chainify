import React, { useState, useEffect } from "react";
import { axiosInstance } from "../lib/axios"; 
import { useSharedState } from "@/context/BCContext";
import { Link } from "react-router-dom";

interface SongData {
  _id: string;
  title: string;
  artistName: string; 
  imageUrl?: string;
  audioUrl?: string;
  duration?: number;
  albumId?: { 
    _id: string;
    title: string;
    imageUrl?: string;
  } | null;
  createdAt: string;
}

const ArtistSongList: React.FC = () => { 
  const { token, address: authenticatedUserAddress, isMusician } = useSharedState(); 
  
  const [songs, setSongs] = useState<SongData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtistSongs = async () => {
      if (!token || !isMusician || !authenticatedUserAddress) {
        if (authenticatedUserAddress && !isMusician) {
            setError("Only musicians can view their uploaded songs.");
        } else if (!authenticatedUserAddress || !token) {
            setError("Please log in to view your songs.");
        }
        setSongs([]); 
        setIsLoading(false); 
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const response = await axiosInstance.get(`/song/artist/${authenticatedUserAddress}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (response.data.success) {
          setSongs(response.data.data || []);
        } else {
          throw new Error(response.data.error?.message || "Failed to fetch songs.");
        }
      } catch (err: any) {
        let errorMessage = "An unknown error occurred.";
        if (err.response && err.response.data && err.response.data.error) {
          errorMessage = err.response.data.error.message || err.response.data.error.code || "Failed to fetch songs.";
        } else if (err.message) {
          errorMessage = err.message;
        }
        console.error("Fetch artist songs error:", err);
        setError(errorMessage);
        setSongs([]); 
      } finally {
        setIsLoading(false);
      }
    };

    fetchArtistSongs();
  }, [token, isMusician, authenticatedUserAddress]); 

  if (!authenticatedUserAddress) {
    return <p className="text-center text-red-500 p-4">Please connect your wallet and log in.</p>;
  }
  if (!isMusician && authenticatedUserAddress) { 
    return <p className="text-center text-orange-500 p-4">This page is for musicians only. Please complete your musician profile if applicable.</p>;
  }
   if (isLoading) {
    return <p className="text-center text-gray-500 p-4">Loading your songs...</p>;
  }

  if (error && !isLoading) { 
    return <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 container mx-auto max-w-3xl" role="alert">Error fetching songs: {error}</div>;
  }


  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-3xl md:text-4xl font-bold mb-8 text-gray-800">My Uploaded Songs</h1>
      
      {songs.length === 0 && !isLoading && !error && ( 
        <p className="text-center text-gray-600">You haven't uploaded any songs yet.</p>
      )}

      {songs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {songs.map((song) => (
            <div key={song._id} className="bg-white shadow-lg rounded-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              {song.imageUrl && (
                <img 
                  src={song.imageUrl.startsWith('ipfs://') ? `https://gateway.pinata.cloud/ipfs/${song.imageUrl.substring(7)}` : song.imageUrl} 
                  alt={song.title} 
                  className="w-full h-48 object-cover"
                  onError={(e) => (e.currentTarget.src = 'https://placehold.co/600x400/gray/white?text=No+Image')}
                />
              )}
              <div className="p-5">
                <h2 className="text-xl font-semibold text-gray-900 mb-2 truncate" title={song.title}>{song.title}</h2>
                <p className="text-sm text-gray-600 mb-1">Artist: {song.artistName}</p>
                {song.albumId && song.albumId.title && (
                    <p className="text-sm text-gray-500 mb-3">
                        Album: 
                        <Link to={`/album/${song.albumId._id}`} className="text-indigo-600 hover:text-indigo-800">
                            {' '}{song.albumId.title}
                        </Link>
                    </p>
                )}
                {song.duration && <p className="text-xs text-gray-500 mb-3">Duration: {Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}</p>}
                
                {song.audioUrl && (
                  <audio controls className="w-full mt-2" src={song.audioUrl.startsWith('ipfs://') ? `https://gateway.pinata.cloud/ipfs/${song.audioUrl.substring(7)}` : song.audioUrl}>
                    Your browser does not support the audio element.
                  </audio>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArtistSongList;