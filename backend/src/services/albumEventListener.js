import Album from "../models/album.model.js";        
import { getAlbumContract, getProvider } from "../lib/contracts.js";

export async function startAlbumPublishedListener() {
    console.log("[Event Listener] Starting 'AlbumPublished' event listener...");
  try {
    const albumContract = getAlbumContract(); // Get initialized Album contract instance
    const provider = getProvider();           // Get Ethers provider
    console.log("[Event Listener] Got contract instance and provider.", {albumContract, provider});

    if (!albumContract) {
      console.error("[Event Listener] Album contract instance not available. Cannot start listener.");
      return;
    }
    if (!provider) {
      console.error("[Event Listener] Provider not available. Cannot start listener.");
      return;
    }

    const contractAddress = await albumContract.getAddress();
    console.log(`[Event Listener] Subscribing to 'AlbumPublished' events from Album contract at: ${contractAddress}`);

    const contractAddressForListener = await albumContract.getAddress();
    console.log(`[Event Listener DEBUG] Attempting to attach listener to contract at address: ${contractAddressForListener}`);
    console.log(`[Event Listener DEBUG] This address was derived from process.env.ALBUM_CONTRACT_ADDRESS: ${process.env.ALBUM_CONTRACT_ADDRESS}`);

    // Also log the provider the contract is connected to
    if (albumContract.runner && albumContract.runner.provider) {
        const providerUrl = albumContract.runner.provider.connection ? albumContract.runner.provider.connection.url : 'Provider connection URL not available';
        console.log(`[Event Listener DEBUG] Contract is connected to provider: ${providerUrl}`);
    } else {
        console.log("[Event Listener DEBUG] Contract runner or provider not found for logging.");
    }

    albumContract.once("AlbumPublished", async (musician, tokenId, albumName, albumURI, event) => {
        console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.log("!!!!!!!! [Event Listener] CALLBACK TRIGGERED !!!!!!!!!!!");
        console.log(`!!!!!!!! Event Data: ${musician}, ${tokenId}, ${albumName}, ${albumURI}`);
        console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

      const onChainTokenId = tokenId.toString(); 
      const transactionHash = event.log.transactionHash; 

      console.log(`[Event Listener] ---- AlbumPublished Event Received ----`);
      console.log(`  Musician Address (from event): ${musician}`);
      console.log(`  On-Chain Token ID: ${onChainTokenId}`);
      console.log(`  Album Name (from event): ${albumName}`);
      console.log(`  Album URI / Metadata CID (from event): ${albumURI}`);
      console.log(`  Transaction Hash: ${transactionHash}`);
      console.log(`  Block Number: ${event.log.blockNumber}`);

      try {
        const albumInDb = await Album.findOne({ metadataUri: albumURI });

        if (albumInDb) {
          // Idempotency check: If already processed, don't process again.
          if (albumInDb.isPublished && albumInDb.onChainTokenId === onChainTokenId) {
            console.log(`[Event Listener] Album ${albumInDb._id} (URI: ${albumURI}) already confirmed with tokenId ${onChainTokenId}. Skipping update.`);
            return;
          }

          albumInDb.onChainTokenId = onChainTokenId;
          albumInDb.isPublished = true;
          albumInDb.publicationTxHash = transactionHash;

          await albumInDb.save();
          console.log(`[Event Listener] SUCCESS: Album ${albumInDb._id} (URI: ${albumURI}) updated with onChainTokenId: ${onChainTokenId} and marked as published.`);

        } else {
          console.warn(`[Event Listener] WARNING: No matching pending album found in DB for metadata URI: ${albumURI}. Musician (from event): ${musician}. This event might be for an album not initiated via your API, or there's a data mismatch.`);
        }
      } catch (dbError) {
        console.error(`[Event Listener] DB_ERROR while processing AlbumPublished event for tokenId ${onChainTokenId} (URI: ${albumURI}):`, dbError);
      }
      console.log(`[Event Listener] ---- Finished Processing Event for Token ID: ${onChainTokenId} ----`);
    });

    console.log("[Event Listener] Successfully subscribed to 'AlbumPublished' events.");

  } catch (error) {
    console.error("[Event Listener] CRITICAL: Failed to start album event listener service:", error);
  }
}
