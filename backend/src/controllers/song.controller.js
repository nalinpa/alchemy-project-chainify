import mongoose from 'mongoose';
import { isAddress } from "ethers";

import Song from "../models/song.model.js"; 
import Album from "../models/album.model.js";
import Musician from "../models/musician.model.js"; 
import { ApiError } from "../middleware/errorHandler.middleware.js"; 
import { uploadToPinata } from "../lib/ipfs.js"; 

export const getAllSongs = async (req, res, next) => {
  console.log("[getAllSongs] Received request");
  try {
    const songs = await Song.find().sort({ createdAt: -1 }).lean();
    
    console.log(`[getAllSongs] Found ${songs.length} songs.`);
    res.status(200).json({
      success: true,
      message: "Songs retrieved successfully.",
      count: songs.length,
      data: songs,
    });
  } catch (error) {
    console.error("[getAllSongs] Error:", error.message);
    next(error); 
  }
};

export const getFeaturedSongs = async (req, res, next) => {
  console.log("[getFeaturedSongs] Received request");
  try {
    const sampleSize = parseInt(req.query.size) || 5; 

    const songs = await Song.aggregate([
      { $sample: { size: sampleSize } },
      { 
        $project: { 
          _id: 1, title: 1, artistName: 1, imageUrl: 1, 
          audioUrl: 1, duration: 1, albumId: 1 
        }
      }
    ]);
    
    console.log(`[getFeaturedSongs] Found ${songs.length} featured songs.`);
    res.status(200).json({
      success: true,
      message: "Featured songs retrieved successfully.",
      count: songs.length,
      data: songs,
    });
  } catch (error) {
    console.error("[getFeaturedSongs] Error:", error.message);
    next(error);
  }
};

export const getAlbumSongs = async (req, res, next) => {
  const { albumId } = req.params; 
  console.log(`[getAlbumSongs] Received request for songs of albumId: ${albumId}`);

  try {
    if (!albumId || !mongoose.Types.ObjectId.isValid(albumId)) {
      throw new ApiError(400, "Valid albumId parameter is required.", "INVALID_ALBUM_ID_PARAM_SONGS");
    }

    const songs = await Song.find({ albumId: albumId })
                            .lean();
    
    console.log(`[getAlbumSongs] Found ${songs.length} songs for album ${albumId}.`);
    res.status(200).json({
      success: true,
      message: `Songs for album ${albumId} retrieved successfully.`,
      count: songs.length,
      data: songs,
    });
  } catch (error) {
    console.error(`[getAlbumSongs] Error for albumId ${albumId}:`, error.message);
    next(error);
  }
};

export const getSongsByArtist = async (req, res, next) => {
  const { address } = req.params;
  console.log(`[getSongsByArtist] Received request for songs by artist address: ${address}`);

  try {
    if (!address || !isAddress(address)) { 
      throw new ApiError(400, "Valid artist wallet address parameter is required.", "INVALID_ARTIST_ADDRESS_PARAM");
    }

    const lowerCaseAddress = address.toLowerCase();

    // Find songs where their artistWallet field matches the provided address
    const songs = await Song.find({ artistWallet: lowerCaseAddress })
                            .populate('albumId', 'title imageUrl')
                            .lean();
    
    console.log(`[getSongsByArtist] Found ${songs.length} songs for artist ${address}.`);
    res.status(200).json({
      success: true,
      message: `Songs by artist ${address} retrieved successfully.`,
      count: songs.length,
      data: songs,
    });

  } catch (error) {
    console.error(`[getSongsByArtist] Error for artist address ${address}:`, error.message);
    next(error);
  }
};


export const addSong = async (req, res, next) => {
  const authenticatedMusicianAddress = req.auth?.walletAddress;
  const { title, duration, albumId } = req.body; // albumId is optional

  const imageFile = req.files?.imageFile?.[0];
  const audioFile = req.files?.audioFile?.[0];

  console.log(`[addSong] Request by musician: ${authenticatedMusicianAddress}, Song title: ${title}`);

  try {
    // 1. Validate inputs
    if (!title || !duration) {
      throw new ApiError(400, "Title and duration are required.", "MISSING_SONG_DETAILS");
    }
    if (isNaN(parseFloat(duration)) || !isFinite(duration) || parseFloat(duration) <= 0) {
        throw new ApiError(400, "Duration must be a positive number.", "INVALID_SONG_DURATION");
    }
    if (!imageFile) {
      throw new ApiError(400, "Song image file (imageFile) is required.", "MISSING_SONG_IMAGE");
    }
    if (!audioFile) {
      throw new ApiError(400, "Song audio file (audioFile) is required.", "MISSING_SONG_AUDIO");
    }
    if (albumId && !mongoose.Types.ObjectId.isValid(albumId)) {
      throw new ApiError(400, "Invalid albumId format.", "INVALID_ALBUM_ID_FOR_SONG");
    }

    // 2. Get Musician's name (for artistName)
    const musician = await Musician.findOne({ address: authenticatedMusicianAddress.toLowerCase() }).lean();
    if (!musician) {
      throw new ApiError(404, "Musician profile not found for authenticated user.", "MUSICIAN_PROFILE_NOT_FOUND_SONG");
    }
    const artistName = musician.name;

    // 3. Upload files to IPFS
    console.log("[addSong] Uploading song image to IPFS...");
    const imageFileName = `song_image_${title.replace(/\s+/g, '_')}_${Date.now()}.${imageFile.originalname.split('.').pop()}`;
    const imageUrl = await uploadToPinata(imageFile.buffer, imageFileName);
    console.log(`[addSong] Song image uploaded: ${imageUrl}`);

    console.log("[addSong] Uploading song audio to IPFS...");
    const audioFileName = `song_audio_${title.replace(/\s+/g, '_')}_${Date.now()}.${audioFile.originalname.split('.').pop()}`;
    const audioUrl = await uploadToPinata(audioFile.buffer, audioFileName);
    console.log(`[addSong] Song audio uploaded: ${audioUrl}`);

    // 4. Create and save the new Song document
    const newSongData = {
      title,
      artistName,
      artistWallet: authenticatedMusicianAddress.toLowerCase(),
      imageUrl,
      audioUrl,
      duration: parseFloat(duration),
    };
    if (albumId) { 
      const albumExists = await Album.findById(albumId).lean();
      if (!albumExists) {
        throw new ApiError(404, `Album with ID ${albumId} not found.`, "ALBUM_NOT_FOUND_FOR_SONG_LINK");
      }
      // Ensure the album belongs to the authenticated musician
      if (albumExists.musicianId.toString() !== musician._id.toString()) {
          throw new ApiError(403, "Forbidden: You can only add songs to your own albums.", "ALBUM_OWNERSHIP_MISMATCH");
      }
      newSongData.albumId = albumId;
    }

    const newSong = new Song(newSongData);
    await newSong.save();
    console.log(`[addSong] Song document created in DB with ID: ${newSong._id}`);

    // 5. If albumId was provided, add this song's _id to the Album's 'songs' array
    if (albumId) {
      await Album.findByIdAndUpdate(albumId, { $addToSet: { songs: newSong._id } });
      console.log(`[addSong] Song ${newSong._id} added to album ${albumId}`);
    }

    res.status(201).json({ 
      success: true, 
      message: "Song added successfully.", 
      data: newSong.toObject() // Return the created song
    });

  } catch (error) {
    console.error("[addSong] Error:", error.message, error.stack);
    next(error);
  }
};
