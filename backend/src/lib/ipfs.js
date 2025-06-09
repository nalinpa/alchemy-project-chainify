import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";

dotenv.config();

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;


export async function uploadToPinata(fileBuffer, fileName) {
  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    console.error("Pinata API Key or Secret Key is missing from environment variables.");
    throw new Error("Pinata API Key or Secret Key is not configured.");
  }

  const formData = new FormData();
  formData.append("file", fileBuffer, { filename: fileName });

  const metadata = JSON.stringify({
    name: fileName
  });
  formData.append('pinataMetadata', metadata);

  try {
    console.log(`[uploadToPinata] Uploading '${fileName}' to Pinata...`);
    const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
      maxBodyLength: Infinity, 
      headers: {
        ...formData.getHeaders(), // Gets the correct Content-Type for multipart/form-data
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY,
      },
    });
    console.log(`[uploadToPinata] Successfully uploaded '${fileName}'. IPFS Hash: ${response.data.IpfsHash}`);
    return `ipfs://${response.data.IpfsHash}`;
  } catch (error) {
    console.error("[uploadToPinata] Pinata upload error for file:", fileName);
    if (error.response) {
      console.error("[uploadToPinata] Error Data:", error.response.data);
      console.error("[uploadToPinata] Error Status:", error.response.status);
      console.error("[uploadToPinata] Error Headers:", error.response.headers);
    } else if (error.request) {
      console.error("[uploadToPinata] No response received:", error.request);
    } else {
      console.error("[uploadToPinata] Error Message:", error.message);
    }
    throw new Error(`Failed to upload '${fileName}' to Pinata. Reason: ${error.message}`);
  }
}

export async function createAndUploadMusicianMetadata(name, address, imageUrl) {
  console.log(`[createAndUploadMusicianMetadata] Creating metadata for musician: ${name}, address: ${address}`);
  const metadata = {
    name: name, // ERC721 metadata standard: name
    description: `Musician NFT profile for ${name}. Wallet Address: ${address}`,
    image: imageUrl, // IPFS URI of the musician's image
    external_url: "", // Optional: link to a musician's website or social media
    attributes: [
      { trait_type: "Type", value: "Musician Profile" },
      { trait_type: "Wallet Address", value: address },
      // You can add more attributes like genre, location, etc.
    ],
  };

  const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2)); // Pretty print JSON
  const metadataFileName = `musician_metadata_${address}_${Date.now()}.json`;

  try {
    console.log(`[createAndUploadMusicianMetadata] Uploading metadata for ${name}...`);
    const metadataIpfsUri = await uploadToPinata(metadataBuffer, metadataFileName);
    console.log(`[createAndUploadMusicianMetadata] Successfully uploaded metadata for ${name}. IPFS URI: ${metadataIpfsUri}`);
    return metadataIpfsUri;
  } catch (error) {
    console.error(`[createAndUploadMusicianMetadata] Error uploading metadata for ${name}:`, error.message);
    // Re-throw the error so the calling function can handle it
    throw new Error(`Failed to create and upload musician metadata for ${name}. Reason: ${error.message}`);
  }
}

export async function createAndUploadAlbumMetadata({
  albumTitle,
  artistName,
  albumCoverIpfsUrl,
  releaseYear,
  publisher, 
  songsOnAlbum = [] 
}) {
  console.log(`[createAndUploadAlbumMetadata] Creating metadata for album: ${albumTitle} by ${artistName}`);
  const metadata = {
    name: albumTitle,
    description:`Album '${albumTitle}' by ${artistName}.`,
    image: albumCoverIpfsUrl,
    attributes: [
      { trait_type: "Artist", value: artistName },
      ...(publisher ? [{ trait_type: "Publisher", value: publisher }] : []),
      ...(releaseYear ? [{ trait_type: "Release Year", value: releaseYear.toString() }] : []),
      { trait_type: "Track Count", value: songsOnAlbum.length.toString() },
    ],
    songs_on_album: songsOnAlbum, 
  };

  const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2));
  const metadataFileName = `album_metadata_${albumTitle.replace(/\s+/g, '_')}_${Date.now()}.json`;

  try {
    console.log(`[createAndUploadAlbumMetadata] Uploading metadata for ${albumTitle}...`);
    const metadataIpfsUri = await uploadToPinata(metadataBuffer, metadataFileName);
    console.log(`[createAndUploadAlbumMetadata] Successfully uploaded album metadata for ${albumTitle}. IPFS URI: ${metadataIpfsUri}`);
    return metadataIpfsUri;
  } catch (error) {
    console.error(`[createAndUploadAlbumMetadata] Error uploading album metadata for ${albumTitle}:`, error.message);
    throw new Error(`Failed to create and upload album metadata for ${albumTitle}. Reason: ${error.message}`);
  }
}
