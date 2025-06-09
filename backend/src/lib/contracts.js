import { ethers } from "ethers";
import MusicianArtifact from "../../../artifacts/contracts/Musician.sol/Musician.json" with { type: "json" };
import AlbumArtifact from "../../../artifacts/contracts/Album.sol/Album.json" with { type: "json" };
import dotenv from "dotenv";

dotenv.config();
const isTestEnvironment = process.env.NODE_ENV === "test";

const validateEnvironment = () => {
  // Test environment setup
  if (isTestEnvironment) {
    console.warn("[contracts.js] Performing minimal environment validation for TEST environment.");
    if (!process.env.MUSICIAN_CONTRACT_ADDRESS || !ethers.isAddress(process.env.MUSICIAN_CONTRACT_ADDRESS)) {
      throw new Error(`TEST ENV ERROR in contracts.js: Invalid or missing MUSICIAN_CONTRACT_ADDRESS: ${process.env.MUSICIAN_CONTRACT_ADDRESS}. This should be set by test setup (setup.js).`);
    }
    if (!process.env.ALBUM_CONTRACT_ADDRESS || !ethers.isAddress(process.env.ALBUM_CONTRACT_ADDRESS)) {
      throw new Error(`TEST ENV ERROR in contracts.js: Invalid or missing ALBUM_CONTRACT_ADDRESS: ${process.env.ALBUM_CONTRACT_ADDRESS}. This should be set by test setup (setup.js).`);
    }
    return;
  }

  // Validations for non-test environments (production, development)
  if (!ethers.isAddress(process.env.MUSICIAN_CONTRACT_ADDRESS)) {
    throw new Error(`Invalid or missing MUSICIAN_CONTRACT_ADDRESS: ${process.env.MUSICIAN_CONTRACT_ADDRESS}`);
  }
  if (!ethers.isAddress(process.env.ALBUM_CONTRACT_ADDRESS)) {
    throw new Error(`Invalid or missing ALBUM_CONTRACT_ADDRESS: ${process.env.ALBUM_CONTRACT_ADDRESS}`);
  }
  if (!process.env.ALCHEMY_API_URL) { 
    throw new Error("Provider URL is not defined in .env for live environment.");
  }
};

let providerInstance = null; 

export const getProvider = () => {
  if (!providerInstance) {
    let rpcUrl;
    if (isTestEnvironment) {
      rpcUrl = process.env.HARDHAT_NODE_URL || "http://127.0.0.1:8545"; 
      console.log(`[contracts.js getProvider] Test environment detected. Using RPC URL: ${rpcUrl}`);
    } else {
      rpcUrl = process.env.ALCHEMY_API_URL; 
      if (!rpcUrl) {
        console.error("[contracts.js getProvider] Provider URL (e.g., ALCHEMY_API_URL) is not defined for non-test environment. ", process.env.ALCHEMY_API_URL);
        throw new Error("Provider URL is not configured for non-test environment.");
      }
      console.log(`[contracts.js getProvider] Non-test environment. Using RPC URL from environment variable.`);
    }
    providerInstance = new ethers.JsonRpcProvider(rpcUrl);
  }
  return providerInstance;
};

export const getMusicianContract = () => {
  validateEnvironment(); 
  const currentProvider = getProvider();
  const contractAddress = process.env.MUSICIAN_CONTRACT_ADDRESS;

  if (!contractAddress || !ethers.isAddress(contractAddress)) {
    throw new Error(`[contracts.js getMusicianContract] MUSICIAN_CONTRACT_ADDRESS is invalid or not set in process.env. Current value: ${contractAddress}`);
  }
  if (!MusicianArtifact || !MusicianArtifact.abi) {
    throw new Error("[contracts.js getMusicianContract] Musician contract artifact (MusicianArtifact.abi) is missing or invalid.");
  }

  const musicianContractInstance = new ethers.Contract(
    contractAddress,
    MusicianArtifact.abi,
    currentProvider // For read-only operations from backend/listener. Signer needed for transactions.
  );
  console.log(`[contracts.js getMusicianContract] Instantiated for ${isTestEnvironment ? 'test' : 'non-test'} env. Address: ${contractAddress}`);
  return musicianContractInstance;
};

export const getAlbumContract = () => {
  validateEnvironment();
  const currentProvider = getProvider();
  const contractAddress = process.env.ALBUM_CONTRACT_ADDRESS;

   if (!contractAddress || !ethers.isAddress(contractAddress)) {
    throw new Error(`[contracts.js getAlbumContract] ALBUM_CONTRACT_ADDRESS is invalid or not set in process.env. Current value: ${contractAddress}`);
  }
  if (!AlbumArtifact || !AlbumArtifact.abi) {
      throw new Error("[contracts.js getAlbumContract] Album contract artifact (AlbumArtifact.abi) is missing or invalid.");
  }
  
  const albumContractInstance = new ethers.Contract(
    contractAddress,
    AlbumArtifact.abi,
    currentProvider 
  );
  console.log(`[contracts.js getAlbumContract] Instantiated for ${isTestEnvironment ? 'test' : 'non-test'} env. Address: ${contractAddress}`);
  return albumContractInstance;
};

// --- Initial Health Check  ---
if (!isTestEnvironment) {
  const checkContracts = async () => {
    console.log("[HealthCheck] Performing initial contract and network check for non-test environment...");
    try {
      const mContract = getMusicianContract(); 
      const aContract = getAlbumContract();  
      const currentProvider = getProvider();

      const network = await currentProvider.getNetwork();
      console.log(`[HealthCheck] Connected to network: ${network.name} (Chain ID: ${network.chainId})`);

      const musicianCode = await currentProvider.getCode(await mContract.getAddress());
      console.log(`[HealthCheck] Musician contract code exists at ${await mContract.getAddress()}: ${musicianCode !== "0x" && musicianCode !== "0x0"}`);
      
      const albumCode = await currentProvider.getCode(await aContract.getAddress());
      console.log(`[HealthCheck] Album contract code exists at ${await aContract.getAddress()}: ${albumCode !== "0x" && albumCode !== "0x0"}`);

    } catch (error) {
      console.error("[HealthCheck] Error during initial contract/network check:", error.message);
    }
  };
  // Call checkContracts asynchronously
  checkContracts().catch(err => console.error("Async Health Check failed:", err));
} else {
  console.warn("[HealthCheck] Skipping initial contract/network check in TEST environment.");
}
