import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MusicianModule", (m) => {
  const musician = m.contract("Musician");

  return { musician };
});
