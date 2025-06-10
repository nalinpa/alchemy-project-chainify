import React, { useState, useEffect } from 'react';
import { useParams, Link } from "react-router-dom";
import { axiosInstance } from '../lib/axios';
import BuyAlbumButton from '../components/BuyAlbumButton';
import PlayButton from '../components/PlayButton'; 
import { Music, Calendar, Hash, ChevronRight } from 'lucide-react';

// Interfaces for data shapes
interface AlbumSong {
  _id: string;
  title: string;
  duration?: number;
  audioUrl?: string;
}

interface AlbumDetailsData {
  _id: string;
  title: string;
  artist: string;
  musicianId: { _id: string; name: string; address: string; } | string;
  publisher?: string;
  imageUrl?: string;
  metadataUri: string;
  releaseYear?: number;
  genre?: string;
  description?: string;
  onChainTokenId?: string | null;
  isPublished: boolean;
  songs: AlbumSong[];
  priceEth?: string;
}

interface AlbumDetailApiResponse {
  success: boolean;
  data?: AlbumDetailsData;
  error?: { message: string; };
}

interface AlbumDetailPageUrlParams extends Record<string, string | undefined> {
  albumId: string;
}

const AlbumDetailPage: React.FC = () => {
  const { albumId } = useParams<AlbumDetailPageUrlParams>();
  const [album, setAlbum] = useState<AlbumDetailsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlbumDetails = async () => {
      if (!albumId) {
        setError("Album ID not found in URL.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const response = await axiosInstance.get<AlbumDetailApiResponse>(`/album/${albumId}`);
        console.log("Album details response:", response.data);
        if (response.data.data && response.data.success) {
          setAlbum(response.data.data);
        } else {
          throw new Error(response.data.error?.message || "Failed to fetch album details.");
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.error?.message || err.message || "An unknown error occurred.";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlbumDetails();
  }, [albumId]);

  if (isLoading) {
    return <p className="text-center text-gray-400 p-10 text-xl animate-pulse">Loading Album...</p>;
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 text-center">
        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">
          <strong>Error:</strong> {error}
        </div>
        <Link to="/" className="mt-4 inline-block text-indigo-400 hover:text-indigo-300">&larr; Go Home</Link>
      </div>
    );
  }

  if (!album) {
    return <p className="text-center text-gray-500 p-10 text-xl">Album not found.</p>;
  }

  const artistName = typeof album.musicianId === 'object' ? album.musicianId.name : album.artist;
const artistPageAddress = (album.musicianId && typeof album.musicianId === 'object') ? album.musicianId.address : undefined;

return (
    <div className="album-detail-page bg-black text-gray-300 min-h-screen">
      <div className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          <div className="lg:col-span-1 space-y-6 h-max-36">
            {album.imageUrl ? (
              <img
                src={album.imageUrl.startsWith('ipfs://') ? `https://gateway.pinata.cloud/ipfs/${album.imageUrl.substring(7)}` : album.imageUrl}
                alt={album.title}
                className="w-fit h-64 lg:w-full lg:h-auto lg:aspect-square mx-auto rounded-xl shadow-2xl shadow-indigo-500/10 object-cover"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://placehold.co/600x600/1F2937/9CA3AF?text=Cover'; }}
              />
            ) : (
              <div className="w-full aspect-square bg-gray-800 flex items-center justify-center rounded-xl">
                <p className="text-gray-500">No Cover Image</p>
              </div>
            )}
            
            {album.isPublished && album.onChainTokenId && (
              <div className="w-full">
                <BuyAlbumButton
                  albumId={album._id}
                  albumTitle={album.title}
                  onChainTokenId={album.onChainTokenId}
                  priceEth={album.priceEth}
                  albumArtistAddress={artistPageAddress}
                />
              </div>
            )}
            {!album.isPublished && (
              <div className="text-center p-3 bg-yellow-900/40 border border-yellow-700 rounded-lg">
                <p className="text-sm text-yellow-300">This album is not yet published on-chain.</p>
              </div>
            )}
          </div>
          
          <div className="lg:col-span-2">
            <div className="mb-6">
              <p className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">{album.genre || "Album"}</p>
              <h1 className="text-4xl lg:text-5xl font-extrabold text-white mt-1">{album.title}</h1>
              <div className="mt-2 text-xl text-gray-400">
                by{' '}
                {artistPageAddress ? (
                  <Link to={`/artist/${artistPageAddress}`} className="font-bold text-gray-200 hover:text-indigo-400 transition-colors">
                    {artistName}
                  </Link>
                ) : (
                  <span className="font-bold text-gray-200">{artistName}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm mb-8">
              {album.releaseYear && <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-500" /> <span>{album.releaseYear}</span></div>}
              {album.onChainTokenId && <div className="flex items-center gap-2"><Hash className="w-4 h-4 text-gray-500" /> <span>Token ID: {album.onChainTokenId}</span></div>}
              {album.songs?.length > 0 && <div className="flex items-center gap-2"><Music className="w-4 h-4 text-gray-500" /> <span>{album.songs.length} Tracks</span></div>}
            </div>

            {album.description && <p className="text-gray-300 mb-8">{album.description}</p>}

            <div className="space-y-2">
              <h3 className="text-2xl font-semibold text-white mb-3 border-b border-gray-800 pb-2">Tracklist</h3>
              {album.songs && album.songs.length > 0 ? (
                album.songs
                .map((song) => (
                    <div key={song._id} className="flex items-center justify-between p-3 bg-gray-900/50 hover:bg-gray-800/70 rounded-lg transition-colors">
                      <div className="flex items-center gap-4">
                        <PlayButton song={song} albumId={album._id} artistAddress={artistPageAddress} />
                        <div>
                          <p className="font-medium text-white">{song.title}</p>
                          {song.duration && <p className="text-xs text-gray-400">{Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}</p>}
                        </div>
                      </div>
                      <Link to={`/song/${song._id}`} className="text-gray-500 hover:text-white">
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>
                  ))
              ) : (
                <p className="text-gray-500">No songs have been added to this album yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlbumDetailPage;