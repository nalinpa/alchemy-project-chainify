import React from 'react';
import FeaturedAlbums from '../components/FeaturedAlbums'; 

const FeaturedAlbumsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-gray-300">
      <div className="container mx-auto px-4 py-8 md:py-12">
      
        <div className="text-center mb-10 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Discover Music
          </h1>
          <p className="mt-3 text-lg text-gray-400 max-w-2xl mx-auto">
            Explore featured albums from independent artists building the future of music on-chain.
          </p>
        </div>
        <main>
          <FeaturedAlbums />
        </main>
        
      </div>
    </div>
  );
};

export default FeaturedAlbumsPage;
