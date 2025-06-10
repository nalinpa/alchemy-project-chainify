import { Route, Routes } from "react-router-dom";
import { StateProvider } from './context/BCContext.tsx';

import Home from "./pages/Home";
import MainLayout from "./layout/main.layout.tsx";
import AddMusician from "./pages/AddMusician.tsx";
import MusicianDashboard from "./pages/MusicianDashboard";
import ProtectedMusicianRoute from "./providers/musician.route.tsx";
import ProtectedUserRoute from "./providers/user.route.tsx";
import AddSong from "./pages/AddSong.tsx";
import ArtistSongs from "./pages/ArtistSongs.tsx";
import AddAlbum from "./pages/AddAlbum.tsx";
import FeaturedAlbumsDisplayPage from "./pages/FeaturedAlbums.tsx";
import AlbumDetailPage from "./pages/AlbumDisplay.tsx";

function App() {
  return (
    <StateProvider>
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/album/featured" element={<FeaturedAlbumsDisplayPage />} />
        <Route path="/album/:albumId" element={<AlbumDetailPage />} />
        <Route element={<ProtectedUserRoute />}>
          <Route path="/musician/add" element={<AddMusician />} />
        </Route>
        <Route element={<ProtectedMusicianRoute />}>
            <Route path="/musician/profile" element={<MusicianDashboard />} />
            <Route path="/song/add" element={<AddSong />} />
            <Route path="/song/artist" element={<ArtistSongs />} />
            <Route path="/album/add" element={<AddAlbum />} />
          </Route>
      </Route>
    </Routes>
    </StateProvider>
  );
}

export default App
