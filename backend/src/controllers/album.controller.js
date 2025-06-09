import mongoose from "mongoose";
import { parseEther, isAddress, verifyMessage } from "ethers";

import { uploadToPinata, createAndUploadAlbumMetadata } from "../lib/ipfs.js";
import Album from "../models/album.model.js";
import Musician from "../models/musician.model.js";
import Song from "../models/song.model.js";
import User from "../models/user.model.js";
import { getAlbumContract } from "../lib/contracts.js";

import { ApiError } from "../middleware/errorHandler.middleware.js";

export const getAllAlbums = async (req, res, next) => {
  try {
    const albums = await Album.find()
      .populate('musicianId', 'name address') // Populate artist name and address
      .sort({ releaseYear: -1, createdAt: 1 })
      .lean();
      
    res.status(200).json({
      success: true,
      message: "Albums retrieved successfully.",
      count: albums.length,
      data: albums 
    });
  } catch (error) {
    console.error("[getAllAlbums] Error:", error);
    next(error);
  }
};

export const getAlbumById = async (req, res, next) => {
  try {
    const { albumId } = req.params;

    // 1. Add validation for the incoming albumId
    if (!mongoose.Types.ObjectId.isValid(albumId)) {
      throw new ApiError(400, "Invalid album ID format.", "INVALID_ID_FORMAT");
    }

    // 2. Find the album
    const album = await Album.findById(albumId)
      .populate({
        path: 'musicianId',
        select: 'name address imageUrl' 
      })
      .populate({
          path: 'songs', 
          select: 'title duration audioUrl'
      })
      .lean();

    // 3. Check if the album exists
    if (!album) {
      throw new ApiError(404, "Album not found.", "ALBUM_NOT_FOUND");
    }

    // 4. Return the album
    res.status(200).json({
      success: true,
      message: "Album retrieved successfully.",
      data: album,
    });
    
  } catch (error) {
    console.error("[getAlbumById] Error:", error);
    next(error);
  }
};

export const getAlbumsByArtist = async (req, res, next) => {
  const { address } = req.params;
  console.log(`[getAlbumByArtist] Request for published albums by musician: ${address}`);
  if(!isAddress(address)) {
      throw new ApiError(400, "Valid wallet address parameter is required.", "INVALID_ARTIST_ADDRESS_PARAM");
  }

  // 1. Find the musician
  try {
    const musician = await Musician.findOne({ address: address.toLowerCase() }).select('_id').lean();
    if (!musician) {
      throw new ApiError(404, "Musician profile not found for authenticated user.", "MUSICIAN_PROFILE_NOT_FOUND_MY_ALBUMS");
    }

    const albums = await Album.find({ 
        musicianId: musician._id, 
        isPublished: true,        
        onChainTokenId: { $ne: null, $exists: true } // Ensure it has an on-chain ID
      })
      .populate({
          path: 'songs', 
          select: 'title duration trackNumber audioUrl'
      })
      .lean();

    // 2. Return the albums
    console.log(`[getAlbumByArtist] Found ${albums.length} published albums for musician ${address}.`);
    res.status(200).json({
      success: true,
      message: "Your published albums retrieved successfully.",
      count: albums.length,
      data: albums,
    });
  } catch (error) {
    console.error("[getAlbumByArtist] Error:", error.message, error.stack);
    next(error);
  }
};



export const getFeaturedAlbums = async (req, res, next) => {
  console.log("[getFeaturedAlbums] Received request");
  try {
    const sampleSize = parseInt(req.query.size) || 4;

    const albums = await Album.aggregate([
      { 
        $match: { 
          isPublished: true, 
          onChainTokenId: { $ne: null, $exists: true } 
        } 
      },
      { $sample: { size: sampleSize } },
      { 
        $lookup: { 
            from: "musicians", 
            localField: "musicianId",
            foreignField: "_id",
            as: "musicianDetails"
        }
      },
      {
        $unwind: { 
            path: "$musicianDetails",
            preserveNullAndEmptyArrays: true // Keep album even if musician lookup fails
        }
      },
      { 
        $project: { 
          _id: 1, 
          title: 1, 
          artist: "$musicianDetails.name", 
          artistAddress: "$musicianDetails.address", 
          musicianId: 1, // Keep musicianId if needed
          imageUrl: 1, 
          releaseYear: 1,
          onChainTokenId: 1
        }
      }
    ]);
    
    console.log(`[getFeaturedAlbums] Found ${albums.length} featured albums.`);
    res.status(200).json({
      success: true,
      message: "Featured albums retrieved successfully.",
      count: albums.length,
      data: albums,
    });
  } catch (error) {
    console.error("[getFeaturedAlbums] Error:", error.message, error.stack);
    next(error);
  }
};

export const getAlbumPublicationStatus = async (req, res, next) => {
  const { albumId } = req.params;
  console.log(`[getAlbumPublicationStatus] Request for album ID: ${albumId}`);

  try {
    if (!mongoose.Types.ObjectId.isValid(albumId)) {
      throw new ApiError(400, "Invalid album ID format.", "INVALID_MONGO_ID_STATUS");
    }

    const album = await Album.findById(albumId)
                             .select('title artist isPublished onChainTokenId publicationTxHash metadataUri') 
                             .lean();

    if (!album) {
      throw new ApiError(404, "Album not found.", "ALBUM_NOT_FOUND_STATUS");
    }

    res.status(200).json({
      success: true,
      message: "Album publication status retrieved.",
      data: {
        albumId: album._id,
        title: album.title,
        artist: album.artist,
        isPublished: album.isPublished,
        onChainTokenId: album.onChainTokenId,
        publicationTxHash: album.publicationTxHash,
        metadataUri: album.metadataUri
      }
    });
  } catch (error) {
    console.error(`[getAlbumPublicationStatus] Error for albumId ${albumId}:`, error.message);
    next(error);
  }
};

export const confirmAlbumPublication = async (req, res, next) => {
  const { albumId } = req.params;
  const { onChainTokenId, transactionHash } = req.body;
  const authenticatedUserAddress = req.auth?.walletAddress; 

  console.log(`[confirmAlbumPublication] Request for albumId: ${albumId}, onChainTokenId: ${onChainTokenId}`);

  try {
    if (!authenticatedUserAddress) {
      throw new ApiError(401, "Unauthorized: Authentication required.", "AUTH_REQUIRED_CONFIRM_PUB");
    }
    if (!mongoose.Types.ObjectId.isValid(albumId)) {
      throw new ApiError(400, "Invalid MongoDB album ID format.", "INVALID_MONGO_ID_CONFIRM_PUB");
    }
    if (onChainTokenId === undefined || onChainTokenId === null || onChainTokenId.toString().trim() === "") {
      throw new ApiError(400, "onChainTokenId is required in the request body.", "MISSING_ONCHAIN_TOKEN_ID_CONFIRM_PUB");
    }

    const album = await Album.findById(albumId).populate('musicianId'); // Populate musicianId to check ownership
    if (!album) {
      throw new ApiError(404, "Album record not found in database.", "DB_ALBUM_NOT_FOUND_CONFIRM_PUB");
    }

     if (!album.musicianId || !album.musicianId.address || album.musicianId.address.toLowerCase() !== authenticatedUserAddress.toLowerCase()) {
      console.warn(`[confirmAlbumPublication] Unauthorized attempt by ${authenticatedUserAddress} for album ${albumId} owned by musicianId ${album.musicianId?._id} with address ${album.musicianId?.address}`);
      throw new ApiError(403, "Forbidden: You are not authorized to confirm this album's publication.", "CONFIRM_PUB_FORBIDDEN");
    }

    // Update the album document
    album.onChainTokenId = onChainTokenId.toString(); 
    album.isPublished = true; 
    if (transactionHash) {
      album.publicationTxHash = transactionHash; 
    }

    await album.save();

    console.log(`[confirmAlbumPublication] Album ${albumId} successfully confirmed with onChainTokenId: ${onChainTokenId}`);
    res.status(200).json({
      success: true,
      message: "Album publication confirmed and on-chain token ID saved.",
      data: album.toObject() 
    });

  } catch (error) {
    console.error("[confirmAlbumPublication] Error:", error.message, error.stack);
    next(error);
  }
};

export const addAlbum = async (req, res, next) => {
  const authenticatedMusicianAddress = req.auth?.walletAddress;
  const imageFile = req.file;
  const { 
    title, 
    publisher, 
    releaseYear, 
    genre, 
    description, 
    songs 
  } = req.body;

  console.log(`[addAlbum] Request for musician: ${authenticatedMusicianAddress}, Album title: ${title}`);

  try {
    // 1. Validate inputs
    if (!imageFile) {
      throw new ApiError(400, "Album cover image is required.", "MISSING_ALBUM_IMAGE");
    }
    if (!title || !publisher || !releaseYear) {
      throw new ApiError(400, "Title, publisher, and release year are required.", "MISSING_ALBUM_DETAILS");
    }
     if (typeof songs !== 'string' || songs.trim() === "") { 
        console.log("[addAlbum] Missing or empty songs data string.", songs);
        throw new ApiError(400, "Songs data (as a JSON string) is required and must not be empty.", "MISSING_SONGS_DATA_STRING");
    }
     if (songs === undefined || songs === null || typeof songs !== 'string' || songs.trim() === "") { 
        console.log("[addAlbum] songs is missing or not a valid string.");
        throw new ApiError(400, "Songs data (as a non-empty JSON string) is required.", "MISSING_OR_INVALID_SONGS_STRING");
    }

    const songsData = JSON.parse(songs);

    for (const song of songsData) {
      if (!song.songId || !mongoose.Types.ObjectId.isValid(song.songId) || !song.title || typeof song.trackNumber !== 'number') {
        throw new ApiError(400, "Each song must have a valid songId (ObjectId), title (string), and trackNumber (number).", "INVALID_SONG_DATA_FORMAT");
      }
    }

    // 2. Get Musician's name (artist name for the album)
    const musician = await Musician.findOne({ address: authenticatedMusicianAddress.toLowerCase() }).lean();
    if (!musician) {
      throw new ApiError(404, "Musician profile not found for authenticated user.", "MUSICIAN_PROFILE_MISSING");
    }
    const artistName = musician.name;
    const musicianId = musician._id;

    // 3. Upload album cover image to IPFS
    console.log("[addAlbum] Uploading album cover to IPFS...");
    const coverImageFileName = `album_cover_${authenticatedMusicianAddress}_${Date.now()}.${imageFile.originalname.split('.').pop()}`;
    const coverImageUrl = await uploadToPinata(imageFile.buffer, coverImageFileName);
    console.log(`[addAlbum] Album cover uploaded: ${coverImageUrl}`);

    // 4. Prepare song data for metadata and smart contract
    const songObjectIdsForDb = songsData.map(s => s.songId);
    const songTrackNumbersForContract = songsData.map(s => s.trackNumber);
    const songTitlesForContract = songsData.map(s => s.title);
    
    // Verify all provided song ObjectIds exist in the DB 
    const existingSongs = await Song.find({ '_id': { $in: songObjectIdsForDb } }).lean();
    if (existingSongs.length !== songObjectIdsForDb.length) {
        const foundIds = existingSongs.map(s => s._id.toString());
        const missingIds = songObjectIdsForDb.filter(id => !foundIds.includes(id.toString()));
        throw new ApiError(404, `One or more songs not found in database: ${missingIds.join(', ')}`, "SONG_NOT_FOUND");
    }

    // 5. Create Album Metadata JSON
    console.log("[addAlbum] Creating album metadata JSON...");
    const albumMetadata = await createAndUploadAlbumMetadata({
      albumTitle: title,
      artistName,
      albumCoverIpfsUrl: coverImageUrl,
      description,
      genre,
      releaseYear,
      publisher,
      songsOnAlbum: songsData.map(s => ({ track: s.trackNumber, title: s.title }))
    });

    // 6. Create Album document in MongoDB
    console.log("[addAlbum] Creating Album document in database...");
    const newAlbum = new Album({
      title,
      artist: artistName, 
      publisher,
      releaseYear,
      genre,
      musicianId,
      imageUrl: coverImageUrl,
      songs: songObjectIdsForDb,
      metadataUri: albumMetadata, // IPFS URI of the album's metadata JSON
    });
    await newAlbum.save();
    console.log(`[addAlbum] Album document created in DB with ID: ${newAlbum._id}`);

    // 7. Prepare transaction data for Album.publishAlbum()
    const albumContract = getAlbumContract();
    if (!albumContract) {
      throw new ApiError(500, "Album contract not available.", "CONTRACT_UNAVAILABLE");
    }
    
    const albumNameForContract = title; // Name for the contract function
    const albumURIForContract = albumMetadata; // IPFS URI for the contract

    console.log("[addAlbum] Preparing transaction data for smart contract...");
    const txData = albumContract.interface.encodeFunctionData("publishAlbum", [
      albumNameForContract,
      albumURIForContract,
      songTrackNumbersForContract,
      songTitlesForContract
    ]);
    
    const contractAddress = await albumContract.getAddress();
    const mintFee = parseEther("0.01").toString(); // As defined in Album.sol

    // 8. Return transaction data to the client
    const transactionDetails = {
      to: contractAddress,
      data: txData,
      value: mintFee,
    };
    console.log("[addAlbum] Sending transaction details to client:", transactionDetails);
    res.status(200).json({
      success: true,
      message: "Album data processed. Please sign and send the transaction to publish.",
      albumId: newAlbum._id, // Send back the DB id of the created album
      transactionDetails,
    });

  } catch (error) {
    console.error("[addAlbum] Error:", error);
    next(error); 
  }
};

export const buyAlbum = async (req, res, next) => {
  const { address, albumId, signature } = req.body; 

  try {
    if (!address || !albumId || !signature) {
      throw new ApiError(400, "Address, albumId, and signature are required.", "MISSING_PARAMS");
    }
    if (!isAddress(address)) {
        throw new ApiError(400, "Invalid buyer Ethereum address format.", "INVALID_BUYER_ADDRESS");
    }
    if (!mongoose.Types.ObjectId.isValid(albumId)) {
        throw new ApiError(400, "Invalid albumId format.", "INVALID_ALBUM_ID_FORMAT");
    }

    const message = `Buy album ${albumId} for ${address}`; // Ensure client signs this exact message
    const signerAddress = verifyMessage(message, signature);
    if (signerAddress.toLowerCase() !== address.toLowerCase()) {
      throw new ApiError(401, "Invalid signature. Signer does not match provided address.", "SIGNATURE_MISMATCH");
    }

    const buyer = await User.findOne({ address: address.toLowerCase() });
    if (!buyer) {
      throw new ApiError(404, "Buyer user profile not found.", "BUYER_NOT_FOUND");
    }

    const albumToBuy = await Album.findById(albumId);
    if (!albumToBuy) {
      throw new ApiError(404, "Album not found.", "ALBUM_NOT_FOUND");
    }

    const albumContract = getAlbumContract();
    if (!albumContract) {
        throw new ApiError(500, "Album contract service not available.", "CONTRACT_SERVICE_UNAVAILABLE");
    }

    const onChainAlbumTokenIdToPurchase = albumToBuy.onChainTokenId; // EXAMPLE: You need to define how this ID is sourced

    if (onChainAlbumTokenIdToPurchase === undefined) { // Check if it's defined
        throw new ApiError(500, "Album on-chain token ID is missing for purchase.", "MISSING_ONCHAIN_TOKEN_ID");
    }


    const txData = albumContract.interface.encodeFunctionData("mintAlbum", [onChainAlbumTokenIdToPurchase]);
    const contractAddress = await albumContract.getAddress();
    const mintFee = albumToBuy.priceEth ? parseEther(albumToBuy.priceEth.toString()) : parseEther("0.01"); // Get price from album or default

    // Off-chain record update.
    await User.updateOne(
      { address: address.toLowerCase() },
      { $addToSet: { boughtAlbums: albumToBuy._id }, $set: { updatedAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      message: `Album purchase initiated for '${albumToBuy.title}'. Please sign and send the transaction.`,
      albumId: albumToBuy._id,
      transactionDetails: {
        to: contractAddress,
        data: txData,
        value: mintFee.toString(),
      }
    });

  } catch (error) {
    console.error("Buy album error:", error);
    next(error);
  }
};