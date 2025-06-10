import { useEffect, createContext, useContext, useState, ReactNode } from "react";

interface SharedState {
  address: string | null;
  setAddress: (data: string | null) => void; 
  isMusician: boolean;
  setIsMusician: (isMusician: boolean) => void;
  isLoggedInMusician: boolean;
  boughtAlbumIds: string[] | null;
  token: string | null;
  setToken: (token: string | null) => void; 
  login: (address: string, token: string, isMusicianStatus: boolean, userBoughtAlbums?: string[]) => void;
  logout: () => void;
  updateMusicianStatus: (isMusicianStatus: boolean) => void; 
   addBoughtAlbumOptimistically: (albumId: string) => void;
}

const StateContext = createContext<SharedState | undefined>(undefined);

interface StateProviderProps {
  children: ReactNode;
}

export const StateProvider = ({ children }: StateProviderProps) => {
  const [address, setAddressState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') { 
      const savedAddress = localStorage.getItem("walletAddress");
      return savedAddress ? savedAddress : null;
    }
    return null;
  });

  const [token, setTokenState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("authToken");
    }
    return null;
  });

  const [isMusician, setIsMusicianState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedIsMusician = localStorage.getItem("isMusician");
      return savedIsMusician === 'true';
    }
    return false;
  });

  const [boughtAlbumIds, setBoughtAlbumIdsState] = useState<string[] | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("boughtAlbumIds");
      try {
        return saved ? JSON.parse(saved) : null;
      } catch (e) {
        console.error("Failed to parse boughtAlbumIds from localStorage", e);
        return null;
      }
    }
    return null;
  });

  const isLoggedInMusician = !!address && !!token && isMusician;

  // Effect for persisting address and handling logout side-effects
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (address) {
        localStorage.setItem("walletAddress", address);
      } else {
        // This block handles full logout (when address is set to null)
        localStorage.removeItem("walletAddress");
        localStorage.removeItem("isMusician");
        localStorage.removeItem("authToken");
        setIsMusicianState(false);
        setTokenState(null);
      }
    }
  }, [address]);

  // Effect for persisting the token
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem("authToken", token);
      } else {
        localStorage.removeItem("authToken");
      }
    }
  }, [token]);

  // Effect for persisting isMusician status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("isMusician", JSON.stringify(isMusician));
    }
  }, [isMusician]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (boughtAlbumIds) {
        console.log("[StateContext] Persisting boughtAlbumIds:", boughtAlbumIds);
        localStorage.setItem("boughtAlbumIds", JSON.stringify(boughtAlbumIds));
      } else {
        localStorage.removeItem("boughtAlbumIds");
      }
    }
  }, [boughtAlbumIds]);


  // Convenience login function
  const login = (loggedInAddress: string, newToken: string, musicianStatus: boolean, boughtAlbums?: string[] ) => {
    setAddressState(loggedInAddress);
    setTokenState(newToken);
    setIsMusicianState(musicianStatus);
    setBoughtAlbumIdsState(boughtAlbums || []);
    console.log("[StateContext] Logged in:", { loggedInAddress, tokenSet: !!newToken, musicianStatus, boughtAlbums });
  };

  // Convenience logout function
  const logout = () => {
    console.log("[StateContext] Logging out.");
    setAddressState(null); 
  };

  // Convenience function to update musician status after an action (e.g., becoming a musician)
  const updateMusicianStatus = (newMusicianStatus: boolean) => {
    setIsMusicianState(newMusicianStatus);
    console.log(`[StateContext] Musician status updated to: ${newMusicianStatus}`);
  };

  const addBoughtAlbumOptimistically = (albumId: string) => {
    setBoughtAlbumIdsState(prevIds => {
      if (prevIds && prevIds.includes(albumId)) {
        return prevIds; // Already includes it
      }
      return [...(prevIds || []), albumId];
    });
  };


  return (
    <StateContext.Provider
      value={{
        address,
        setAddress: setAddressState,
        isMusician,
        setIsMusician: setIsMusicianState,
        isLoggedInMusician, 
        token,
        boughtAlbumIds,
        setToken: setTokenState,
        login,
        logout,
        updateMusicianStatus,
        addBoughtAlbumOptimistically
      }}
    >
      {children}
    </StateContext.Provider>
  );
};

export const useSharedState = () => {
  const context = useContext(StateContext);
  if (!context) {
    throw new Error("useSharedState must be used within a StateProvider");
  }
  return context;
};