import React from 'react';
import { Link } from 'react-router-dom';
import { useSharedState } from '@/context/BCContext';
import ArtistAlbumList from '@/components/ArtistAlbumList';
import { PlusCircle, Music } from 'lucide-react';
import ArtistSongList from '@/components/ArtistSongList';

const MusicianDashboard: React.FC = () => {
  const { address } = useSharedState();

  return (
    <div className="container mx-auto p-4 md:p-6 text-white">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-10">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Dashboard
          </h1>
          <p className="mt-2 text-lg text-gray-400">
            Welcome back, <span className="font-bold text-indigo-400">{address?.slice(0, 6)}...{address?.slice(-4)}</span>!
          </p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Link
            to="/song/add"
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gray-800/80 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Add Song
          </Link>
          <Link
            to="/album/add"
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-pink-500 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Music className="w-4 h-4" />
            Add Album
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          {address ? (
            <ArtistAlbumList artistAddress={address} />
          ) : (
            <p className="text-gray-500">Loading artist information...</p>
          )}
          {address ? (
            <ArtistSongList />
          ) : (
            <p className="text-gray-500">Loading artist information...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MusicianDashboard;