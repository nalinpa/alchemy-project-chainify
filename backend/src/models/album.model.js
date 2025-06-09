import mongoose  from "mongoose";

const albumSchema = new mongoose.Schema({
    title: {
    type: String,
    required: [true, "Album title is required."],
    trim: true
  },
  artist: { 
    type: String, 
    required: [true, "Artist display name is required."], 
    trim: true
  },
  musicianId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Musician', 
    required: [true, "Musician ID (creator of the album) is required."],
    index: true
  },
  publisher: {
    type: String, 
    required: [true, "Publisher is required."],
    trim: true
  },
   imageUrl: { // IPFS link to the primary album cover image
    type: String, 
    required: [true, "Album image URL (IPFS) is required."],
    trim: true,
    match: [/^ipfs:\/\/.+$/, "Invalid IPFS URL format for imageUrl"]
  },
  metadataUri: { // IPFS link to the album's full metadata JSON
    type: String,
    required: [true, "Album metadata URI (IPFS) is required."],
    trim: true,
    unique: true, // Metadata URI should be unique per album
    match: [/^ipfs:\/\/.+$/, "Invalid IPFS URL format for metadataUri"]
  },
  releaseYear: {
    type: Number, 
    required: [true, "Release year is required."]
  },
    songs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Song'
    }],
     onChainTokenId: {
    type: String, 
    index: true,
    sparse: true, 
    unique: true
  },
  isPublished: { 
    type: Boolean,
    default: false,
    index: true
  },
  publicationTxHash: { 
    type: String,
    trim: true
  }
}, { timestamps: true });

const Album = mongoose.model("Album", albumSchema);
export default Album;