// components/Topbar.tsx
import React from "react";
import { Link } from "react-router-dom";
import SignInButton from "./SignInButton";
import SignOutButton from "./SignOutButton";
import { useSharedState } from "@/context/BCContext";

const Topbar: React.FC = () => {
  const { address } = useSharedState();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-gray-950/90 backdrop-blur-lg">
      <div className="container mx-auto flex h-24 items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-pink-500 text-transparent bg-clip-text">
            Chainify
          </span>
        </Link>

        <nav className="flex items-center gap-4 md:gap-6">
          <div className="w-px h-6 bg-gray-700 mx-2 hidden sm:block"></div>
          {address ? <SignOutButton /> : <SignInButton />}
        </nav>
      </div>
    </header>
  );
};

export default Topbar;