import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import { jest } from "@jest/globals";
import dotenv from "dotenv";
import { ethers } from "ethers";

import { loggingMiddleware } from "../middleware/logging.middleware.js";
import { globalErrorHandler } from "../middleware/errorHandler.middleware.js";

import { startAlbumPublishedListener } from "../services/albumEventListener.js";

import authRoutes from "../routes/auth.routes.js";
import userRoutes from "../routes/user.routes.js";
import albumRoutes from "../routes/album.routes.js";
import songRoutes from "../routes/song.routes.js";

import MusicianArtifact from "../../../artifacts/contracts/Musician.sol/Musician.json" with { type: "json" };
import AlbumArtifact from "../../../artifacts/contracts/Album.sol/Album.json" with { type: "json" };

dotenv.config(); 

let mongoServer;
let provider;
let signer;   

let deployedMusicianContract;
let deployedAlbumContract;

const app = express();

process.on('uncaughtException', (error, origin) => {
  console.error('!!!!!!!! SERVER CRASH - UNCAUGHT EXCEPTION !!!!!!!!');
  console.error('Origin:', origin);
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  process.exit(1); // Exit so the test runner knows something went very wrong
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('!!!!!!!! SERVER CRASH - UNHANDLED REJECTION !!!!!!!!');
  console.error('Promise:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});


app.use(loggingMiddleware);

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Mount API routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/album", albumRoutes);
app.use("/api/song", songRoutes);
app.use(globalErrorHandler);

// Export for use in tests
export { app, mongoServer, deployedMusicianContract as musicianContract, deployedAlbumContract as albumContract, provider, signer };

// Setup MongoDB and Ethereum contracts
beforeAll(async () => {
  jest.setTimeout(60000); // Increased timeout for contract deployments

  try {
    // 1. Start MongoMemoryServer
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log(`[SETUP] MongoMemoryServer started at ${mongoUri}`);

    // 2. Connect to Hardhat node (or other test network)
    const hardhatNodeUrl = process.env.HARDHAT_NODE_URL || "http://127.0.0.1:8545";
    provider = new ethers.JsonRpcProvider(hardhatNodeUrl);
    signer = await provider.getSigner(); // Get a signer for deployments
    console.log(`[SETUP] Connected to Ethereum node at ${hardhatNodeUrl}. Signer: ${await signer.getAddress()}`);

    // 3. Deploy Musician Contract
    console.log("[SETUP] Deploying Musician contract...");
    if (!MusicianArtifact.bytecode || MusicianArtifact.bytecode === "0x") {
        throw new Error("MusicianArtifact.bytecode is missing or empty. Cannot deploy.");
    }
    const MusicianFactory = new ethers.ContractFactory(MusicianArtifact.abi, MusicianArtifact.bytecode, signer);
    const tempMusicianContract = await MusicianFactory.deploy();
    await tempMusicianContract.waitForDeployment();
    const musicianAddress = await tempMusicianContract.getAddress();
    process.env.MUSICIAN_CONTRACT_ADDRESS = musicianAddress; // Set ENV for app code
    deployedMusicianContract = tempMusicianContract; // Assign the deployed instance
    console.log(`[SETUP] Musician contract deployed to: ${musicianAddress}`);
    console.log(`[SETUP] process.env.MUSICIAN_CONTRACT_ADDRESS set to: ${process.env.MUSICIAN_CONTRACT_ADDRESS}`);

    // Verify code exists at the deployed address for Musician contract
    const musicianCode = await provider.getCode(musicianAddress);
    if (musicianCode === "0x" || musicianCode === "0x0") {
        throw new Error(`[SETUP] CRITICAL: No contract code found at deployed Musician address ${musicianAddress} after deployment.`);
    }
    console.log(`[SETUP] Verified: Code IS PRESENT at Musician address ${musicianAddress}. Length: ${musicianCode.length}`);


    // 4. Deploy Album Contract
    console.log("[SETUP] Deploying Album contract...");
    if (!AlbumArtifact.bytecode || AlbumArtifact.bytecode === "0x") {
        throw new Error("AlbumArtifact.bytecode is missing or empty. Cannot deploy.");
    }
    const AlbumFactory = new ethers.ContractFactory(AlbumArtifact.abi, AlbumArtifact.bytecode, signer);
    const tempAlbumContract = await AlbumFactory.deploy(musicianAddress); // Add constructor args if needed
    await tempAlbumContract.waitForDeployment();
    const albumAddress = await tempAlbumContract.getAddress();
    process.env.ALBUM_CONTRACT_ADDRESS = albumAddress; // Set ENV for app code
    deployedAlbumContract = tempAlbumContract; // Assign the deployed instance
    console.log(`[SETUP] Album contract deployed to: ${albumAddress}`);
    console.log(`[SETUP] process.env.ALBUM_CONTRACT_ADDRESS set to: ${process.env.ALBUM_CONTRACT_ADDRESS}`);

    // Verify code exists at the deployed address for Album contract
    const albumCode = await provider.getCode(albumAddress);
    if (albumCode === "0x" || albumCode === "0x0") {
        throw new Error(`[SETUP] CRITICAL: No contract code found at deployed Album address ${albumAddress} after deployment.`);
    }
    console.log(`[SETUP] Verified: Code IS PRESENT at Album address ${albumAddress}. Length: ${albumCode.length}`);

    console.log("[SETUP] Initiating AlbumPublished event listener for test environment...");
    await startAlbumPublishedListener(); 
    console.log("[SETUP] AlbumPublished event listener service initiated for tests.");
    
    // 5. Verify contracts are accessible (optional, but good for sanity check)
    console.log("[SETUP] Verifying deployed Musician contract accessibility via hasMusicianNFT...");
    const testAddressForNFTCheck = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // An arbitrary address
    const hasMusicianNFT = await deployedMusicianContract.hasMusicianNFT(testAddressForNFTCheck);
    console.log(`[SETUP] Musician NFT exists for ${testAddressForNFTCheck} (on fresh contract): ${hasMusicianNFT}`);

    console.log("[SETUP] Contracts successfully deployed and environment variables updated.");

  } catch (error) {
    console.error("[SETUP] Fatal error during beforeAll setup:", error);
    
  }
});

// Teardown MongoDB and disconnect
afterAll(async () => {
  jest.setTimeout(30000); // Increase timeout for teardown
  try {
    if (mongoServer) {
      await mongoose.connection.close();
      // await mongoose.disconnect(); 
      await mongoServer.stop();
      console.log("[TEARDOWN] MongoMemoryServer stopped");
       if (deployedAlbumContract) { 
        deployedAlbumContract.removeAllListeners("AlbumPublished");
        console.log("[TEARDOWN] Attempted to remove AlbumPublished listeners from test Album contract instance.");
    }
    }
  } catch (error) {
    console.error("[TEARDOWN] Error stopping MongoMemoryServer:", error);
  }
});

// Cleanup collections between tests
afterEach(async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
    
    jest.clearAllMocks();
    console.log("[CLEANUP] Database collections cleared after test.");
  } catch (error) {
    console.error("[CLEANUP] Error during collection cleanup:", error);
  }
});
