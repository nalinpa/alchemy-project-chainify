import { jest } from "@jest/globals";

const getMusicianContract = () => ({
    address: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
    balanceOf: jest.fn().mockResolvedValue(0),
  });
  
  const getAlbumContract = () => ({
    address: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
    balanceOf: jest.fn().mockResolvedValue(0),
  });
  
  export { getMusicianContract, getAlbumContract };