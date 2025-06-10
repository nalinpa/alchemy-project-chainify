// components/pages/HomePage.tsx
import React from 'react';

const FeatureIcon: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex-shrink-0 bg-indigo-500/10 p-3 rounded-full text-indigo-400">
    {children}
  </div>
);

const Home: React.FC = () => {
  const sectionClass = "py-20 sm:py-24";
  const headingClass = "text-3xl sm:text-4xl font-extrabold tracking-tight text-white";
  const subHeadingClass = "mt-4 text-lg text-gray-400";
 
  return (
    <div className="bg-black text-gray-300 font-sans">

       <div className="relative isolate overflow-hidden">
        <div className="mx-auto max-w-4xl px-6 py-24 sm:py-32 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white">
            The Future of Music is 
            <span className="bg-gradient-to-r from-indigo-500 to-pink-500 text-transparent bg-clip-text"> Yours to Own.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl leading-8 text-gray-300">
            A decentralized platform where musicians connect directly with their fans. Sell your music as digital collectibles and receive crypto payments instantly. Fans can prove their support by acquiring unique, non-transferable Soulbound NFTs.
          </p>
        </div>
        <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]" aria-hidden="true">
          <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}></div>
        </div>
      </div>

      <section id="features" className={sectionClass}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className={headingClass}>A New Paradigm for Music</h2>
            <p className={subHeadingClass}>Simple steps for artists and fans to join the revolution.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
            <div className="space-y-8">
              <h3 className="text-2xl font-semibold bg-gradient-to-r from-indigo-400 to-indigo-600 text-transparent bg-clip-text">For Artists</h3>
              <div className="flex items-start gap-4">
                <FeatureIcon>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" /></svg>
                </FeatureIcon>
                <div>
                  <h4 className="font-semibold text-lg text-white">Upload Your Music</h4>
                  <p className="text-gray-400">Upload tracks and cover art to IPFS for permanent, decentralized storage. You always control your original files.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <FeatureIcon>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                </FeatureIcon>
                <div>
                  <h4 className="font-semibold text-lg text-white">Publish On-Chain</h4>
                  <p className="text-gray-400">Mint your album as an on-chain collectible. Fans can then purchase a unique Soulbound NFT to prove their support.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <FeatureIcon>
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 01-.75.75h-.75m0 0v3.75c0 .621-.504 1.125-1.125 1.125H3.375c-.621 0-1.125-.504-1.125-1.125V18.75m1.5-1.5h15" /></svg>
                </FeatureIcon>
                <div>
                  <h4 className="font-semibold text-lg text-white">Get Paid Instantly</h4>
                  <p className="text-gray-400">Receive crypto payments directly to your wallet. No intermediaries, no lengthy payout cycles. Just pure value exchange.</p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="text-2xl font-semibold bg-gradient-to-r from-pink-400 to-pink-600 text-transparent bg-clip-text">For Fans</h3>
              <div className="flex items-start gap-4">
                <FeatureIcon>
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607Z" /></svg>
                </FeatureIcon>
                <div>
                  <h4 className="font-semibold text-lg text-white">Discover Independent Artists</h4>
                  <p className="text-gray-400">Explore a growing library of music from artists who are breaking the mold and building their own communities.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <FeatureIcon>
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 21Z" /></svg>
                </FeatureIcon>
                <div>
                  <h4 className="font-semibold text-lg text-white">Support Artists Directly</h4>
                  <p className="text-gray-400">Buy an album with crypto. Your payment goes directly to the artist, empowering them to create more music.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <FeatureIcon>
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5Z" /></svg>
                </FeatureIcon>
                <div>
                  <h4 className="font-semibold text-lg text-white">Prove Your Fandom</h4>
                  <p className="text-gray-400">Receiving a Soulbound NFT proves you're a true supporter. It's a permanent, non-transferable badge of honor in your wallet.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
          <div className="container mx-auto px-4 max-w-4xl text-center">
              <h2 className={headingClass}>What is a Soulbound Token (SBT)?</h2>
              <p className={subHeadingClass}>
                  Unlike regular NFTs that can be bought and sold, Soulbound Tokens are permanently tied to your digital identity (your wallet). Think of it like a digital merit badge. It's not about financial speculation; it's about proving your genuine connection and support for an artist.
              </p>
               <div className="mt-8 inline-block bg-gray-900 border border-gray-700 p-6 rounded-xl">
                  <p className="text-pink-400 font-bold text-lg">Non-Transferable <span className="text-white font-normal mx-2">-</span> Proof of Support <span className="text-white font-normal mx-2">-</span> Direct Artist Connection</p>
              </div>
          </div>
      </section>

    </div>
  );
};

export default Home;