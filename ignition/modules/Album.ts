import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import MusicianModule from "./Musician"; // Adjust path if necessary

export default buildModule("AlbumModule", (m) => {
  const { musician } = m.useModule(MusicianModule);
  const album = m.contract("Album", [musician]);
  return { album };
});