import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Music, Album, Clock, PlusCircle } from 'lucide-react';
import { axiosInstance } from "../lib/axios";
import { useSharedState } from "@/context/BCContext";

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
  } | null;
}

interface ApiResponse {
  success: boolean;
  count: number;
  data: SongData[];
  error?: { message: string };
}

const ArtistSongList: React.FC = () => { 
  const { token, address, isMusician } = useSharedState(); 
  
  const [songs, setSongs] = useState<SongData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMySongs = async () => {
      if (!token || !isMusician || !address) {
        if (address && !isMusician) setError("Only registered musicians can view this page.");
        setSongs([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const response = await axiosInstance.get<ApiResponse>(`/song/artist/${address}`, {
          headers: { "Authorization": `Bearer ${token}` },
        });

        if (response.data.success) {
          setSongs(response.data.data || []);
        } else {
          throw new Error(response.data.error?.message || "Failed to fetch songs.");
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.error?.message || err.message || "An unknown error occurred.";
        console.error("Fetch my songs error:", err);
        setError(errorMessage);
        setSongs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMySongs();
  }, [token, isMusician, address]); 

  if (!address || !isMusician) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Access Restricted</h2>
        <p className="text-gray-400 max-w-md">
          { !address 
            ? "Please connect your wallet and log in to view your songs." 
            : "This page is for registered musicians only. Please complete your profile."
          }
        </p>
        <div className="mt-6">
          {address ? 
            <Link to="/musician/add" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-500">Become a Musician</Link> 
            : <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-500" disabled>Please Sign In</button>
          }
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <p className="text-center text-gray-400 p-10 animate-pulse">Loading Your Songs...</p>;
  }

  if (error) {
    return <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert"><strong>Error:</strong> {error}</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">My Song Library</h2>
          <p className="mt-1 text-lg text-gray-400">Manage all of your uploaded tracks.</p>
        </div>    
      </div>

      {songs.length === 0 ? (
        <div className="text-center py-16 px-6 bg-gray-900/50 border border-dashed border-gray-700 rounded-xl">
            <Music className="mx-auto h-12 w-12 text-gray-500" />
            <h3 className="mt-2 text-lg font-semibold text-white">No songs uploaded yet</h3>
            <p className="mt-1 text-sm text-gray-400">Get started by uploading your first track.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {songs.map((song) => (
            <div key={song._id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 hover:border-gray-700 transition-colors">
              <img 
                src={song.imageUrl && song.imageUrl.startsWith('ipfs://') ? `https://gateway.pinata.cloud/ipfs/${song.imageUrl.substring(7)}` : 'https://placehold.co/128x128/1F2937/9CA3AF?text=Song'} 
                alt={song.title} 
                className="w-24 h-24 md:w-16 md:h-16 object-cover rounded-md flex-shrink-0"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src='https://placehold.co/128x128/1F2937/9CA3AF?text=Error'; }}
              />
              <div className="flex-grow text-center md:text-left">
                <p className="font-bold text-lg text-white">{song.title}</p>
                {song.albumId ? (
                  <Link to={`/album/${song.albumId._id}`} className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 w-fit mx-auto md:mx-0">
                    <Album className="w-3 h-3" /> {song.albumId.title}
                  </Link>
                ) : (
                  <p className="text-xs text-gray-500">Not in an album</p>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                {song.duration && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4"/> 
                    <span>{Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}</span>
                  </div>
                )}
                {song.audioUrl && (
                  <audio 
                    controls 
                    src={song.audioUrl.startsWith('ipfs://') ? `https://gateway.pinata.cloud/ipfs/${song.audioUrl.substring(7)}` : song.audioUrl}
                    className="h-9 w-64"
                  >
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
