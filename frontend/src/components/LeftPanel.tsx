import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Star, Music, UserCheck, PlusCircle } from 'lucide-react';
import { useSharedState } from '@/context/BCContext';
import { cn } from '@/lib/utils';

const NavLink = ({ to, children, isActive }: { to: string; children: React.ReactNode; isActive: boolean }) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
      isActive
        ? "bg-gray-700 text-white"
        : "text-gray-400 hover:bg-gray-800/80 hover:text-white"
    )}
  >
    {children}
  </Link>
);

const LeftPanel = () => {
  const { address, isLoggedInMusician } = useSharedState();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-full max-h-screen flex-col gap-2 p-2">
      <div className="flex-1">
        <nav className="grid items-start gap-1 px-2 text-sm font-medium lg:px-4">
          <NavLink to="/" isActive={isActive('/')}>
            <Home className="h-4 w-4" />
            Home
          </NavLink>
          <NavLink to="/album/featured" isActive={isActive('/album/featured')}>
            <Star className="h-4 w-4" />
            Featured Albums
          </NavLink>

          {address && !isLoggedInMusician && (
            <NavLink to="/musician/add" isActive={isActive('/musician/add')}>
              <UserCheck className="h-4 w-4" />
              Become a Musician
            </NavLink>
          )}

          {isLoggedInMusician && (
            <>
              <NavLink to="/musician/profile" isActive={isActive('/musician/profile')}>
                <Music className="h-4 w-4" />
                My Dashboard
              </NavLink>
               <NavLink to="/song/add" isActive={isActive('/song/add')}>
                <PlusCircle className="h-4 w-4" />
                Add Song
              </NavLink>
               <NavLink to="/album/add" isActive={isActive('/album/add')}>
                <PlusCircle className="h-4 w-4" />
                Add Album
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </div>
  );
};

export default LeftPanel;