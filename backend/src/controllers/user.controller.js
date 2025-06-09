import { isAddress, getAddress, verifyMessage, parseEther } from "ethers";
import multer from "multer";
import dotenv from "dotenv";

import Musician from "../models/musician.model.js";
import { getMusicianContract, getAlbumContract } from "../lib/contracts.js";
import { uploadToPinata, createAndUploadMusicianMetadata } from "../lib/ipfs.js";
import User from "../models/user.model.js";

dotenv.config();

export const becomeMusician = async (req, res) => {
  console.log("Received become musician request");
  const authenticatedUserAddress = req.auth?.walletAddress;
  const { name } = req.body; 
  const image = req.file; 

  console.log(`Become Musician request for authenticated user: ${authenticatedUserAddress} with name: ${name}`);

  try {
    // 1. Validate authenticated user address (should be guaranteed by auth middleware, but good for defense)
    if (!authenticatedUserAddress || !isAddress(authenticatedUserAddress)) {
      // This should ideally be caught by auth middleware if token is invalid or address is missing
      return res.status(401).json({ error: "Unauthorized: Valid authenticated user address not found." });
    }
    const lowerCaseUserAddress = authenticatedUserAddress.toLowerCase();

    // 2. Validate other inputs (name, image)
    if (!image) {
      return res.status(400).json({ error: "Image file is required" });
    }
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ error: "Name is required and must be a non-empty string" });
    }

    // 3. Check if the user exists in your User collection (controller logic from before)
    const user = await User.findOne({ address: lowerCaseUserAddress });
    if (!user) {
      return res.status(403).json({ error: "User profile not found. Please ensure you are logged in." });
    }

    // 4. Check if the address already has a Musician NFT (on-chain check)
    const musicianContract = getMusicianContract();
    if (!musicianContract) {
        console.error("Musician contract instance is not available.");
        return res.status(500).json({ error: "Server configuration error: Musician contract not initialized." });
    }
    const balance = await musicianContract.balanceOf(lowerCaseUserAddress);
    if (Number(balance) > 0) {
      return res.status(400).json({ error: "Address already has a Musician NFT" });
    }

    // 5. Upload image to IPFS
    const imageUrl = await uploadToPinata(image.buffer, `musician_image_${lowerCaseUserAddress}_${Date.now()}.${image.originalname.split('.').pop()}`);

    // 6. Create and upload metadata JSON to IPFS
    const uri = await createAndUploadMusicianMetadata(name.trim(), lowerCaseUserAddress, imageUrl);

    // 7. Update User document in MongoDB
    await User.updateOne(
      { address: lowerCaseUserAddress },
      { $set: { isMusician: true, updatedAt: new Date() } } // Use new Date() for consistency
    );

    // 8. Create/Update Musician document in MongoDB
    await Musician.updateOne(
      { address: lowerCaseUserAddress },
      {
        $set: {
          name: name.trim(),
          imageUrl,
          uri,
          updatedAt: new Date(), 
        },
        $setOnInsert: { 
            address: lowerCaseUserAddress,
            createdAt: new Date()
        }
      },
      { upsert: true }
    );

    // 9. Prepare transaction data for the client to sign and send
    const txData = musicianContract.interface.encodeFunctionData("mint", [uri]);

    res.status(200).json({
      success: true,
      message: "Musician registration initiated. Please sign and send the transaction.",
      transactionDetails: { 
        to: await musicianContract.getAddress(), 
        data: txData,
        value: parseEther("0.01").toString(),
      }
    });

  } catch (error) {
    console.error("Become Musician error (JWT flow):", error);
    if (error.code === 'CALL_EXCEPTION') { 
        return res.status(500).json({ error: "Could not verify existing NFTs. Please try again."});
    }
    if (!res.headersSent) { 
        res.status(500).json({ error: error.message || "Failed to process musician registration." });
    }
    next(error);
  }
};

export const publishAlbum = async (req, res) => {
  const { address, albumName, albumURI, songIds, songTitles, signature } = req.body;

  try {
    if (!albumName || typeof albumName !== "string" || albumName.trim() === "") {
      res.status(400).json({ error: "Album name is required" });
      return;
    }
    if (!albumURI || !/^ipfs:\/\/.+$/.test(albumURI)) {
      res.status(400).json({ error: "Valid IPFS album URI is required" });
      return;
    }
    if (!songIds || !songTitles || songIds.length !== songTitles.length) {
      res.status(400).json({ error: "Song IDs and titles must match in length" });
      return;
    }
    if (!isAddress(address)) {
      res.status(400).json({ error: "Invalid Ethereum address" });
      return;
    }

    const message = `Publish Album for ${address} with name ${albumName} and URI ${albumURI}`;
    const signerAddress = verifyMessage(message, signature);
    if (signerAddress.toLowerCase() !== address.toLowerCase()) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    const balance = await musicianContract.balanceOf(address);
    if (Number(balance) === 0) {
      res.status(403).json({ error: "Not a musician" });
      return;
    }

    const albumContract = getAlbumContract();

    const txData = albumContract.interface.encodeFunctionData("publishAlbum", [
      albumName,
      albumURI,
      songIds,
      songTitles,
    ]);
    res.json({
      to: process.env.ALBUM_CONTRACT_ADDRESS,
      data: txData,
      value: parseEther("0.01").toString(),
    });
  } catch (error) {
    console.error("Publish Album error:", error);
    res.status(400).json({ error: error.message || "Failed to publish album" });
  }
};

export const getMusicianProfileData = async (req, res, next) => {
  const authenticatedUserAddress = req.auth?.walletAddress;

  console.log(`[getMusicianProfileData] Request for authenticated musician: ${authenticatedUserAddress}`);

  try {
    if (!req.auth?.isMusician) {
      console.error("[getMusicianProfileData] Error: User is not authenticated as a musician.");
      throw new ApiError(403, "Forbidden: Access restricted to musicians.", "NOT_A_MUSICIAN");
    }

    if (!authenticatedUserAddress) {
      console.error("[getMusicianProfileData] Error: Authenticated user address not found in req.auth.");
      throw new ApiError(401, "Unauthorized: User authentication details not found.", "AUTH_DETAILS_MISSING");
    }

    const lowerCaseUserAddress = authenticatedUserAddress.toLowerCase();

    // Fetch musician-specific data from the Musician collection
    const musicianProfile = await Musician.findOne({ address: lowerCaseUserAddress }).lean();

    if (!musicianProfile) {
      console.log(`[getMusicianProfileData] Musician profile not found in Musician collection for address: ${lowerCaseUserAddress}`);
      throw new ApiError(404, "Musician profile data not found.", "MUSICIAN_PROFILE_NOT_FOUND");
    }

    const responseData = {
      success: true,
      message: "Musician profile data retrieved successfully.",
      data: {
        address: musicianProfile.address,
        name: musicianProfile.name,
        imageUrl: musicianProfile.imageUrl,
        uri: musicianProfile.uri, 
        createdAt: musicianProfile.createdAt,
        updatedAt: musicianProfile.updatedAt,
      }
    };

    console.log(`[getMusicianProfileData] Sending data for musician: ${lowerCaseUserAddress}`);
    return res.status(200).json(responseData);

  } catch (error) {
    console.error("[getMusicianProfileData] Error retrieving musician data:", error);
    next(error); // Pass to global error handler
  }
};

export const checkMusician = async (req, res, next) => {
  const authenticatedUserAddress = req.auth?.walletAddress; 
  
  console.log(`[checkMusician Controller] Request received. Checking musician status for authenticated user: ${authenticatedUserAddress}`);

  try {
    if (!authenticatedUserAddress) {
      console.error("[checkMusician Controller] Error: Authenticated user address not found in req.auth.");
      throw new ApiError(401, "Unauthorized: User authentication details not found or token is invalid.", "AUTH_DETAILS_MISSING");
    }

    const lowerCaseUserAddress = authenticatedUserAddress.toLowerCase();

    const user = await User.findOne({ address: lowerCaseUserAddress }).lean(); 
    
    if (!user) {
      console.log(`[checkMusician Controller] User ${lowerCaseUserAddress} (from token) not found in DB.`);
      return res.status(200).json({ 
        success: true, 
        isMusician: false, 
        message: "Authenticated user not found in database, thus not a musician." 
      });
    }
    
    console.log(`[checkMusician Controller] User found. User.isMusician flag: ${user.isMusician}`);
    return res.status(200).json({ 
      success: true, 
      isMusician: !!user.isMusician 
    });

  } catch (error) {
    console.error("[checkMusician Controller] Error during status check:", error);
    next(error); 
  }
};