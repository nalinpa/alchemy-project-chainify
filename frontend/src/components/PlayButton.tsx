import React, { useState, useEffect, useRef } from 'react';
import { useSharedState } from '@/context/BCContext'; // Adjust path

interface Song {
  _id: string;
  title: string;
  audioUrl?: string;
}

interface PlaySongButtonProps {
  song: Song;
  albumId: string;   
  artistAddress?: string;
}

// SVG Icons for Play and Pause
const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.72-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
  </svg>
);

const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0v-12a.75.75 0 0 1 .75-.75Zm9 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0v-12a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
  </svg>
);

const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
    </svg>
);


const PlayButton: React.FC<PlaySongButtonProps> = ({ song, albumId, artistAddress }) => {
  // Get authentication state and list of bought albums from context
  const { address, token, boughtAlbumIds } = useSharedState();

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Determine if the user has access to this song
  const hasAccess = (!!address && !!token && !!boughtAlbumIds && boughtAlbumIds.includes(albumId)) || artistAddress === address;
    console.log("albums bought:", boughtAlbumIds);
  // Effect to handle song ending
  useEffect(() => {
    const audioElement = audioRef.current;
    const handleSongEnd = () => setIsPlaying(false);

    if (audioElement) {
      audioElement.addEventListener('ended', handleSongEnd);
    }
    return () => {
      if (audioElement) {
        audioElement.removeEventListener('ended', handleSongEnd);
      }
    };
  }, []); 

  const togglePlayPause = () => {
    if (!hasAccess) {
      alert("You must purchase the album to play this song.");
      return;
    }

    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      setIsPlaying(true);
    }
  };

  const getButtonClasses = () => {
    if (!hasAccess) {
      return "bg-gray-300 text-gray-500 cursor-not-allowed";
    }
    if (isPlaying) {
      return "bg-orange-500 text-white hover:bg-orange-600";
    }
    return "bg-indigo-600 text-white hover:bg-indigo-700";
  };

  return (
    <>
      {song.audioUrl && (
        <audio 
          ref={audioRef} 
          src={song.audioUrl.startsWith('ipfs://') ? `https://gateway.pinata.cloud/ipfs/${song.audioUrl.substring(7)}` : song.audioUrl}
          preload="metadata"
        />
      )}

      <button
        onClick={togglePlayPause}
        disabled={!hasAccess}
        title={hasAccess ? (isPlaying ? `Pause ${song.title}` : `Play ${song.title}`) : "Purchase album to listen"}
        className={`p-2 rounded-full transition-colors ${getButtonClasses()}`}
      >
        {hasAccess ? (isPlaying ? <PauseIcon /> : <PlayIcon />) : <LockIcon />}
      </button>
    </>
  );
};

export default PlayButton;