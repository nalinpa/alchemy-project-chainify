import mongoose from "mongoose";
import { ethers, parseEther } from "ethers";
import { jest } from '@jest/globals';

import { app, provider, signer as defaultTestSigner, musicianContract, albumContract as deployedAlbumContractForTestEmission } from "./setup.js"; // From setup.js
import { startAlbumPublishedListener } from "../services/albumEventListener.js";
import { getAlbumContract } from "../lib/contracts.js";
import Album from "../models/album.model.js";
import User from "../models/user.model.js"; 
import Musician from "../models/musician.model.js"; 

describe("Album Event Listener Service", () => {
  let listenerContractInstance; 
  let testSigner; 
  let blockchainSnapshotId;
  const MUSICIAN_NFT_MINT_FEE = parseEther("0.01");

  beforeAll(async () => {
    testSigner = defaultTestSigner; 
    console.log("[EventListenerTests - beforeAll] Listener and signer initialized.");
  });

  beforeEach(async () => {
    console.log("[EventListenerTests - beforeEach] Attempting to take EVM snapshot.");
    if (provider && typeof provider.send === 'function') { 
      try {
        blockchainSnapshotId = await provider.send("evm_snapshot", []);
        console.log(`[EventListenerTests - beforeEach] EVM snapshot taken: ID ${blockchainSnapshotId}`);
      } catch (snapshotError) {
        console.error("[EventListenerTests - beforeEach] ERROR taking EVM snapshot:", snapshotError);
        blockchainSnapshotId = null; // Ensure it's null if snapshot fails
      }
    } else {
      console.warn("[EventListenerTests - beforeEach] Provider for EVM snapshot not available or provider.send is not a function.");
      blockchainSnapshotId = null;
    }

    await Album.deleteMany({});
    await User.deleteMany({});
    await Musician.deleteMany({});
    console.log("[EventListenerTests - beforeEach] DB collections cleared.");

     const contractInstanceForListener = getAlbumContract(); // Get the instance the listener will use
    if (contractInstanceForListener) {
        contractInstanceForListener.removeAllListeners("AlbumPublished");
        console.log("[EventListenerTests - beforeEach] Removed any existing 'AlbumPublished' listeners from contract used by service.");
    }
    
    // Start the listener fresh for each test
    console.log("[EventListenerTests - beforeEach] Starting AlbumPublished event listener...");
    await startAlbumPublishedListener(); 
    console.log("[EventListenerTests - beforeEach] AlbumPublished event listener started.");

  });

  afterEach(async () => {
      console.log(`[EventListenerTests - afterEach] Cleaning up after test. Attempting to revert EVM snapshot ID: ${blockchainSnapshotId}`);
    
    const contractInstanceForListener = getAlbumContract(); // Get the instance the listener used
    if (contractInstanceForListener) {
        contractInstanceForListener.removeAllListeners("AlbumPublished");
        console.log("[EventListenerTests - afterEach] Removed 'AlbumPublished' listeners from contract used by service.");
    }

    console.log(`[EventListenerTests - afterEach] Attempting to revert EVM snapshot ID: ${blockchainSnapshotId}`);
    if (blockchainSnapshotId && provider && typeof provider.send === 'function') {
      try {
        const revertResult = await provider.send("evm_revert", [blockchainSnapshotId]);
        console.log(`[EventListenerTests - afterEach] EVM snapshot reverted: Result ${revertResult}`);
      } catch (revertError) {
        console.error("[EventListenerTests - afterEach] ERROR reverting EVM snapshot:", revertError);
      }
    } else {
      console.warn(`[EventListenerTests - afterEach] EVM snapshot ID missing or provider.send unavailable, cannot revert. Snapshot ID: ${blockchainSnapshotId}`);
    }
    jest.restoreAllMocks(); 
    console.log("[EventListenerTests - afterEach] Mocks restored.");
  });

  afterAll(async () => {
    if (listenerContractInstance) {
      listenerContractInstance.removeAllListeners("AlbumPublished");
      console.log("[EventListenerTests - afterAll] Removed AlbumPublished listeners.");
    }
  });

    it("should update album in DB with onChainTokenId and isPublished when AlbumPublished event is received", async () => {
    const musicianAddress = await testSigner.getAddress();
    const albumNameForEvent = "Event Test Album";
    const metadataUriForEvent = `ipfs://unique-metadata-uri-for-event-test-${Date.now()}`; 
    const albumPublishMintFee = parseEther("0.01"); 

    console.log(`[Test 1] Minting Musician NFT for ${musicianAddress} with fee: ${ethers.formatEther(MUSICIAN_NFT_MINT_FEE)} ETH`);
    const musicianNftMintTx = await musicianContract.connect(testSigner).mint(
      "ipfs://musician-meta-for-event-test", 
      { value: MUSICIAN_NFT_MINT_FEE } 
    );
    await musicianNftMintTx.wait();
    console.log(`[Test 1] Musician NFT minted for ${musicianAddress}`);

    const pendingAlbum = await Album.create({
      title: albumNameForEvent,
      artist: "Event Test Artist", 
      musicianId: new mongoose.Types.ObjectId(), 
      publisher: "Event Test Publisher",
      imageUrl: "ipfs://event-test-image",
      metadataUri: metadataUriForEvent, 
      releaseYear: 2024,
      isPublished: false,
      onChainTokenId: null,
    });
    console.log(`[Test 1] Pending album created in DB with _id: ${pendingAlbum._id} and metadataUri: ${metadataUriForEvent}`);

    console.log(`[Test 1] Calling publishAlbum on contract for URI: ${metadataUriForEvent}`);
    const publishTx = await deployedAlbumContractForTestEmission.connect(testSigner).publishAlbum(
      albumNameForEvent,
      metadataUriForEvent,
      [ethers.toBigInt(1)], 
      ["Event Song 1"], 
      { value: albumPublishMintFee } 
    );
    const receipt = await publishTx.wait();
    console.log(`[Test 1] publishAlbum transaction mined: ${publishTx.hash}`);

    let emittedTokenId;
    let eventMusicianAddress;
    // Ensure receipt.logs is not null or undefined before iterating
    const logs = receipt?.logs || [];
    for (const log of logs) { 
        try {
            const parsedLog = deployedAlbumContractForTestEmission.interface.parseLog(log);
            if (parsedLog && parsedLog.name === "AlbumPublished") {
                emittedTokenId = parsedLog.args.tokenId.toString();
                eventMusicianAddress = parsedLog.args.musician;
                console.log(`[Test] AlbumPublished event emitted from tx: tokenId=${emittedTokenId}, musician=${eventMusicianAddress}, uri=${parsedLog.args.albumURI}`);
                break;
            }
        } catch (e) { 
            console.error(`[Test] ERROR parsing AlbumPublished event log: ${e}`);
        }
    }
    expect(emittedTokenId).toBeDefined();
    expect(eventMusicianAddress.toLowerCase()).toBe(musicianAddress.toLowerCase());

    await new Promise(resolve => setTimeout(resolve, 4000)); 

    const updatedAlbumInDb = await Album.findById(pendingAlbum._id).lean();
    console.log("[Test 1] Fetched album from DB after event:", updatedAlbumInDb);

    expect(updatedAlbumInDb).toBeTruthy();
    expect(updatedAlbumInDb.isPublished).toBe(true);
    expect(updatedAlbumInDb.onChainTokenId).toBe(emittedTokenId);
    expect(updatedAlbumInDb.publicationTxHash).toBe(publishTx.hash);
    expect(updatedAlbumInDb.metadataUri).toBe(metadataUriForEvent); 
  });

  it("should log a warning if no matching album is found in DB for an event", async () => {
    const musicianAddress = await testSigner.getAddress();
    const nonExistentMetadataUri = `ipfs://non-existent-uri-${Date.now()}`;
    const consoleWarnSpy = jest.spyOn(console, 'warn');
     console.log(`[Test 2] Minting Musician NFT for ${await testSigner.getAddress()}`);
    

    // 1. Make the signer a musician
    await musicianContract.connect(testSigner).mint("ipfs://musician-meta-for-no-match-test", { value: MUSICIAN_NFT_MINT_FEE });
    await new Promise(resolve => setTimeout(resolve, 200)); // Small delay for chain state
 console.log(`[Test 2] Calling publishAlbum for non-existent URI: ${nonExistentMetadataUri}`);
    
    // 2. Trigger an event for which there's no DB record
    const publishTx = await deployedAlbumContractForTestEmission.connect(testSigner).publishAlbum(
      "Album With No DB Record",
      nonExistentMetadataUri,
      [1], ["Song X"],
      { value: parseEther("0.01") }
    );
    await publishTx.wait();
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 3. Check console.warn was called (implementation detail, but shows listener logic)
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining(`[Event Listener] WARNING: No matching pending album found in DB for metadata URI: ${nonExistentMetadataUri}`)
    );
    consoleWarnSpy.mockRestore();
  });

  it("should skip update if album is already published with the same onChainTokenId", async () => {
    const musicianAddress = await testSigner.getAddress();
    const metadataUriForTest = `ipfs://already-published-uri-${Date.now()}`;
    const albumNameForTest = "Already Published Album";
    const existingOnChainTokenId = "99"; // Some pre-existing token ID

    // 1. Make the signer a musician
    await musicianContract.connect(testSigner).mint("ipfs://musician-meta-for-already-published", { value: MUSICIAN_NFT_MINT_FEE });
    await new Promise(resolve => setTimeout(resolve, 200));

    // 2. Create an album in DB that's already "published"
    const publishedAlbum = await Album.create({
      title: albumNameForTest, artist: "Test Artist", musicianId: new mongoose.Types.ObjectId(),
      publisher: "Test Publisher", imageUrl: "ipfs://test-image", metadataUri: metadataUriForTest,
      releaseYear: 2024, isPublished: true, onChainTokenId: existingOnChainTokenId,
      publicationTxHash: "0xalreadyprocessedtx"
    });

    const albumSaveSpy = jest.spyOn(Album.prototype, 'save'); // Spy on the save method

    // 3. Trigger the event again with the same details
    const mockEventObject = { log: { transactionHash: "0xneweventtx", blockNumber: 12345 } };
    await deployedAlbumContractForTestEmission.emit("AlbumPublished", 
        musicianAddress, 
        ethers.toBigInt(existingOnChainTokenId), 
        albumNameForTest, 
        metadataUriForTest, 
        mockEventObject
    );
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. Verify save was NOT called again
    expect(albumSaveSpy).not.toHaveBeenCalled();
    albumSaveSpy.mockRestore();

    const dbCheck = await Album.findById(publishedAlbum._id).lean();
    expect(dbCheck.publicationTxHash).toBe("0xalreadyprocessedtx"); // Should not have updated
  });
});