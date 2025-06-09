import request from "supertest";
import mongoose from "mongoose";
import { jest } from '@jest/globals';
import { ethers, parseEther } from "ethers"; 
import jwt from "jsonwebtoken"; 
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { app, provider } from "./setup.js"; 
import Album from "../models/album.model.js";
import Song from "../models/song.model.js";
import User from "../models/user.model.js";
import Musician from "../models/musician.model.js";

const __filename = fileURLToPath(import.meta.url);
const currentDir = path.dirname(__filename);

describe("Album API Endpoints", () => {
  let blockchainSnapshotId;
  const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; 
  const otherUserAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; 
  const thirdUserAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";  
  const userAddressLowerCase = userAddress.toLowerCase();
  const otherUserAddressLowerCase = otherUserAddress.toLowerCase();
  const thirdUserAddressLowerCase = thirdUserAddress.toLowerCase();
  const loginMessage = "Login to Music NFT Platform";
  const testImagePath = path.join(currentDir, 'fixtures', 'test-image.png');
  let mainUserSigner;

  beforeAll(async () => {
    const fixturesDir = path.join(currentDir, 'fixtures');
    if (!fs.existsSync(fixturesDir)) fs.mkdirSync(fixturesDir, { recursive: true });
    if (!fs.existsSync(testImagePath)) {
      const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
      fs.writeFileSync(testImagePath, testImageBuffer);
    }
    mainUserSigner = await provider.getSigner(userAddress); 
  });

  beforeEach(async () => {
    if (provider && provider.send) {
      blockchainSnapshotId = await provider.send("evm_snapshot", []);
    }
    await Album.deleteMany({});
    await Song.deleteMany({});
    await User.deleteMany({}); 
    await Musician.deleteMany({}); 
  });

  afterEach(async () => {
    if (blockchainSnapshotId && provider && provider.send) {
      await provider.send("evm_revert", [blockchainSnapshotId]);
    }
    jest.restoreAllMocks(); 
  });


  describe("GET /api/album/all", () => {

       it("should return all albums", async () => {
      const musician1 = await Musician.create({
        address: userAddressLowerCase, 
        name: "Test Artist One",
        imageUrl: "ipfs://musician1_img",
        uri: "ipfs://musician1_meta"
      });
      const musician2 = await Musician.create({
        address: otherUserAddressLowerCase, 
        name: "Test Artist Two",
        imageUrl: "ipfs://musician2_img",
        uri: "ipfs://musician2_meta"
      });

      const albumData = [
        { 
          title: "First Great Album", 
          artist: musician1.name, 
          musicianId: musician1._id, 
          publisher: "Test Publisher One",
          imageUrl: "ipfs://image_cid_1", 
          metadataUri: "ipfs://meta1",
          releaseYear: 2023, 
          songs: []
        },
        { 
          title: "Second Epic Album", 
          artist: musician2.name,
          musicianId: musician2._id,
          publisher: "Test Publisher Two",
          imageUrl: "ipfs://image_cid_2",
          metadataUri: "ipfs://meta2",
          releaseYear: 2023, 
          songs: []
        },
      ];
      await Album.insertMany(albumData);

      const response = await request(app)
        .get("/api/album/all") 
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data[0].title).toBe(albumData[0].title);
      expect(response.body.data[1].title).toBe(albumData[1].title);
      expect(response.body.data[0].musicianId._id.toString()).toBe(musician1._id.toString());
      
      expect(response.body).toMatchSnapshot({
        data: expect.arrayContaining([
          expect.objectContaining({ 
            _id: expect.any(String), 
            musicianId: expect.any(String),
            createdAt: expect.any(String), 
            updatedAt: expect.any(String) 
          }),
        ]),
      });
    });

  });

  describe("GET /api/album/:albumId", () => {
    let testAlbum;
    let testMusician;
    let song1, song2;

    beforeEach(async () => {
         testMusician = await Musician.create({
        address: userAddressLowerCase,
        name: "Specific Artist Name",
        imageUrl: "ipfs://specific_musician_img",
        uri: "ipfs://specific_musician_meta"
      });

      song1 = await Song.create({
        title: "Awesome Song 1",
        artistName: "Specific Artist",
        artistWallet: "0x123...", 
        imageUrl: "ipfs://song_image1",
        audioUrl: "ipfs://song_audio1",
        duration: 180, 
      });
      song2 = await Song.create({
        title: "Cool Track 2",
        artistName: "Specific Artist",
        artistWallet: "0x123...",
        imageUrl: "ipfs://song_image2",
        audioUrl: "ipfs://song_audio2",
        duration: 210,
      });

      testAlbum = await Album.create({
        title: "Specific Test Album With Songs",
        genre: "Electronic",
        releaseDate: new Date("2023-03-10"),
        songs: [song1._id, song2._id], 
        releaseYear: 2023,
        musicianId: testMusician._id,
        imageUrl: "ipfs://specific_image_cid", 
        publisher: "Specific Publisher",
        artist: "Specific Artist", 
        coverImageUrl: "ipfs://specific_cover",
        metadataUri: "ipfs://specific_meta"
      });

      await Song.findByIdAndUpdate(song1._id, { albumId: testAlbum._id });
      await Song.findByIdAndUpdate(song2._id, { albumId: testAlbum._id });
    });

    it("should return a specific album by its ID", async () => {
      const response = await request(app)
        .get(`/api/album/${testAlbum._id}`) 
        .expect(200);

        console.log("!!!!!!!!!", response.body);
      expect(response.body.data._id).toBe(testAlbum._id.toString());
      expect(response.body.data.title).toBe(testAlbum.title);
    });

    it("should return 404 if album not found with a valid ObjectId format", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString(); 
      const response = await request(app)
        .get(`/api/album/${nonExistentId}`) 
        .expect(404);

      expect(response.body.error.message).toEqual("Album not found.");
      expect(response.body).toMatchSnapshot();
    });

    it("should return 400 if albumId is not a valid ObjectId format", async () => {
      const invalidId = "123-invalid-id";
      const response = await request(app)
        .get(`/api/album/${invalidId}`)
        .expect(400); 

      expect(response.body).toEqual({
        success: false,
        error: {
          code: "INVALID_ID_FORMAT", 
          message: "Invalid album ID format."
        }
      });
      expect(response.body).toMatchSnapshot();
    });
  });

   describe("POST /api/album/confirm/:albumId", () => {
    let pendingAlbum;
    let musicianOwner; 
    let musicianOwnerToken;
    let otherMusicianToken;

    beforeEach(async () => {
      const signerOwner = mainUserSigner;
      const signatureOwner = await signerOwner.signMessage(loginMessage);
      await User.create({ address: userAddressLowerCase, isMusician: true });
      musicianOwner = await Musician.create({ 
        address: userAddressLowerCase, 
        name: "Album Owner", 
        imageUrl: "ipfs://ownerImgPlaceholder", 
        uri: "ipfs://ownerUriPlaceholder"
      });
      let loginResOwner = await request(app).post("/api/auth/login")
        .send({ address: userAddress, signature: signatureOwner }).expect(200);
      musicianOwnerToken = loginResOwner.body.data.token;

      // Setup Another Musician (otherUserAddress)
      const signerOther = await provider.getSigner(otherUserAddress);
      const signatureOther = await signerOther.signMessage(loginMessage);
      await User.create({ address: otherUserAddressLowerCase, isMusician: true }); // Also a musician
      await Musician.create({ 
        address: otherUserAddressLowerCase, 
        name: "Other Musician", 
        imageUrl: "ipfs://otherImgPlaceholder", 
        uri: "ipfs://otherUriPlaceholder"
      });
      let loginResOther = await request(app).post("/api/auth/login")
        .send({ address: otherUserAddress, signature: signatureOther }).expect(200);
      otherMusicianToken = loginResOther.body.data.token;

      // Create a pending album owned by musicianOwner
      pendingAlbum = await Album.create({
        title: "Album to Confirm", artist: musicianOwner.name, musicianId: musicianOwner._id,
        publisher: "Pub Confirm", imageUrl: "ipfs://confirm_img", releaseYear: 2024,
        metadataUri: `ipfs://confirm_meta_${Date.now()}`,
        isPublished: false, onChainTokenId: null 
      });
    });

    it("should successfully confirm album publication and update DB", async () => {
      const onChainTokenId = "1001";
      const txHash = "0xconfirmtxhash123";
      const albumId = pendingAlbum._id.toString();

      const response = await request(app)
        .put(`/api/album/confirm/${albumId}`)
        .set("Authorization", `Bearer ${musicianOwnerToken}`)
        .send({ onChainTokenId, transactionHash: txHash });

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Album publication confirmed and on-chain token ID saved.");
      expect(response.body.data.onChainTokenId).toBe(onChainTokenId);
      expect(response.body.data.isPublished).toBe(true);
      expect(response.body.data.publicationTxHash).toBe(txHash);

      const dbAlbum = await Album.findById(pendingAlbum._id).lean();
      expect(dbAlbum.onChainTokenId).toBe(onChainTokenId);
      expect(dbAlbum.isPublished).toBe(true);
      expect(dbAlbum.publicationTxHash).toBe(txHash);
    });

    it("should return 401 if no token is provided", async () => {
      const albumId = pendingAlbum._id.toString();
      const response = await request(app)
        .put(`/api/album/confirm/${albumId}`)
        .send({ onChainTokenId: "1002", transactionHash: "0xabc" })
        .expect(401);
      expect(response.body.error.code).toBe("NO_TOKEN_PROVIDED");
    });
    
    it("should return 403 if user is not the album's musician owner", async () => {
      const albumId = pendingAlbum._id.toString();
      const response = await request(app)
        .put(`/api/album/confirm/${albumId}`)
        .set("Authorization", `Bearer ${otherMusicianToken}`) 
        .send({ onChainTokenId: "1003", transactionHash: "0xdef" })
        .expect(403);
      expect(response.body.error.code).toBe("CONFIRM_PUB_FORBIDDEN");
    });

    it("should return 400 if onChainTokenId is missing", async () => {
      const albumId = pendingAlbum._id.toString();
      const response = await request(app)
        .put(`/api/album/confirm/${albumId}`)
        .set("Authorization", `Bearer ${musicianOwnerToken}`)
        .send({ transactionHash: "0xghi" }) // Missing onChainTokenId
        .expect(400);
      expect(response.body.error.code).toBe("MISSING_ONCHAIN_TOKEN_ID_CONFIRM_PUB");
    });
    
    it("should return 404 if album does not exist", async () => {
      const nonExistentMongoId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .put(`/api/album/confirm/${nonExistentMongoId}`)
        .set("Authorization", `Bearer ${musicianOwnerToken}`)
        .send({ onChainTokenId: "1004", transactionHash: "0xjkl" })
        .expect(404);
      expect(response.body.error.code).toBe("DB_ALBUM_NOT_FOUND_CONFIRM_PUB");
    });

     it("should return 400 if mongoAlbumId is invalid format", async () => {
      const response = await request(app)
        .put(`/api/album/confirm/invalid-id`)
        .set("Authorization", `Bearer ${musicianOwnerToken}`)
        .send({ onChainTokenId: "1005", transactionHash: "0xmno" })
        .expect(400);
      expect(response.body.error.code).toBe("INVALID_MONGO_ID_CONFIRM_PUB");
    });
  });

   describe("GET /api/album/featured", () => {
    let musician1;

    beforeEach(async () => {
      musician1 = await Musician.create({ 
        address: userAddressLowerCase, 
        name: "Featured Artist", 
        imageUrl: "ipfs://featArtistImg", 
        uri: "ipfs://featArtistUri" 
      });

      // Create a variety of albums
      const albumsToCreate = [];
      for (let i = 1; i <= 7; i++) {
        const albumEntry = { // Define base album object
          title: `Album ${i}`,
          artist: musician1.name,
          musicianId: musician1._id,
          publisher: "Featured Pub",
          imageUrl: `ipfs://img${i}`,
          releaseYear: 2020 + i,
          metadataUri: `ipfs://metaFeatured${i}-${Date.now()}`,
          isPublished: i <= 5, 
          songs: []
        };
        // Conditionally add onChainTokenId if it's meant to be set
        if (i <= 5) {
          albumEntry.onChainTokenId = `${100 + i}`; 
        }
        // If i > 5, the onChainTokenId field will be absent from the albumEntry object,
        // allowing the sparse unique index to correctly ignore these documents for uniqueness.
        albumsToCreate.push(albumEntry);
      }
      await Album.insertMany(albumsToCreate);
    });

    it("should return an empty array if no albums are eligible to be featured", async () => {
      await Album.updateMany({}, { $set: { isPublished: false } }); // Make all albums unpublished

      const response = await request(app)
        .get("/api/album/featured")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it("should return a default number of featured albums (e.g., 4) if no size is specified", async () => {
      const response = await request(app)
        .get("/api/album/featured")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(4); // Controller defaults to 4
      response.body.data.forEach(album => {
        expect(album.isPublished).toBeUndefined(); // isPublished not in $project
        expect(album.onChainTokenId).toBeDefined();
        expect(album).toHaveProperty("title");
        expect(album).toHaveProperty("artist");
        expect(album).toHaveProperty("imageUrl");
      });
    });

    it("should return the specified number of featured albums using 'size' query parameter", async () => {
      const response = await request(app)
        .get("/api/album/featured?size=2")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
    });

    it("should only return albums that are published and have an onChainTokenId", async () => {
      // All 5 published albums have onChainTokenId. If we request more, we should only get 5.
      const response = await request(app)
        .get("/api/album/featured?size=10") 
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(5); // Should only be 5 eligible albums
      response.body.data.forEach(album => {
          // From the $project stage in getFeaturedAlbums controller
          expect(album).toHaveProperty("_id");
          expect(album).toHaveProperty("title");
          expect(album).toHaveProperty("artist");
          expect(album).toHaveProperty("artistAddress");
          expect(album).toHaveProperty("musicianId");
          expect(album).toHaveProperty("imageUrl");
          expect(album).toHaveProperty("releaseYear");
          expect(album).toHaveProperty("onChainTokenId");
          expect(album.isPublished).toBeUndefined(); // Not in the projected fields
      });
    });

    it("should return projected fields correctly", async () => {
        const response = await request(app)
            .get("/api/album/featured?size=1")
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBe(1);
        const album = response.body.data[0];
        expect(Object.keys(album).sort()).toEqual([
            "_id", "artist", "artistAddress", "imageUrl", "musicianId", "onChainTokenId", "releaseYear", "title" 
        ].sort()); 
    });
  });

describe("GET /api/album/published/:albumId", () => {
    let testAlbum;
    let albumOwnerMusician; 
    let albumOwnerToken;   
    let nonMusicianToken;   

    beforeEach(async () => {
    const signerOwner = mainUserSigner;
    const signatureOwner = await signerOwner.signMessage(loginMessage);
    await User.create({ address: userAddressLowerCase, isMusician: true }); // Ensure User.isMusician is true
    albumOwnerMusician = await Musician.create({ 
        address: userAddressLowerCase, 
        name: "Status Artist Owner", 
        imageUrl: "ipfs://placeholderImgOwner", 
        uri: "ipfs://placeholderUriOwner" 
    });
    let loginResOwner = await request(app).post("/api/auth/login")
        .send({ address: userAddress, signature: signatureOwner }).expect(200);
    albumOwnerToken = loginResOwner.body.data.token;

    // Setup Non-Musician User (otherUserAddress)
    const signerNonMusician = await provider.getSigner(otherUserAddress);
    const signatureNonMusician = await signerNonMusician.signMessage(loginMessage);
    await User.create({ address: otherUserAddressLowerCase, isMusician: false }); // User.isMusician is false
    let loginResNonMusician = await request(app).post("/api/auth/login")
        .send({ address: otherUserAddress, signature: signatureNonMusician }).expect(200);
    nonMusicianToken = loginResNonMusician.body.data.token;

    testAlbum = await Album.create({
        title: "Status Check Album", 
        artist: albumOwnerMusician.name, 
        musicianId: albumOwnerMusician._id, 
        publisher: "Pub Status", 
        imageUrl: "ipfs://status_img", 
        releaseYear: 2024,
        metadataUri: `ipfs://status_meta_${Date.now()}`,
        isPublished: true, 
        onChainTokenId: "777", 
        publicationTxHash: "0x123txhash"
    });
    });

    it("should return the publication status of an existing album for the authenticated musician owner", async () => {
    const response = await request(app)
        .get(`/api/album/published/${testAlbum._id}`)
        .set("Authorization", `Bearer ${albumOwnerToken}`) // Authenticate as the musician owner
        .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.albumId).toBe(testAlbum._id.toString());
    expect(response.body.data.title).toBe("Status Check Album");
    expect(response.body.data.isPublished).toBe(true);
    expect(response.body.data.onChainTokenId).toBe("777");
    expect(response.body).toMatchSnapshot({
        data: { albumId: expect.any(String) } 
    });
    });

    it("should return 403 if accessed by a non-musician user", async () => {
    const response = await request(app)
        .get(`/api/album/published/${testAlbum._id}`)
        .set("Authorization", `Bearer ${nonMusicianToken}`) // Use non-musician token
        .expect(403);
    
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("FORBIDDEN_NOT_MUSICIAN"); 
    });
    
    it("should return 401 if no token is provided", async () => {
    const response = await request(app)
        .get(`/api/album/published/${testAlbum._id}`)
        // No Authorization header
        .expect(401);
    expect(response.body.error.code).toBe("NO_TOKEN_PROVIDED");
    });

    it("should return 404 if album not found (when authenticated as musician)", async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const response = await request(app)
        .get(`/api/album/published/${nonExistentId}`)
        .set("Authorization", `Bearer ${albumOwnerToken}`)
        .expect(404);
    expect(response.body.error.code).toBe("ALBUM_NOT_FOUND_STATUS");
    });

    it("should return 400 for invalid mongoAlbumId format (when authenticated as musician)", async () => {
    const response = await request(app)
        .get(`/api/album/published/invalid-id-format`)
        .set("Authorization", `Bearer ${albumOwnerToken}`)
        .expect(400);
    expect(response.body.error.code).toBe("INVALID_MONGO_ID_STATUS");
    });
  });

    describe("POST /api/album/add", () => {
        let musicianAuthToken;
        let createdSong1, createdSong2;
        let loginResponse;
        const musicianUserName = "Test Album Creator";

        beforeEach(async () => {
        // 1. Login user to get token
        const signer = await provider.getSigner(userAddress);
        const signature = await signer.signMessage(loginMessage);
        loginResponse = await request(app).post("/api/auth/login")
            .send({ address: userAddress, signature: signature }).expect(200);
        musicianAuthToken = loginResponse.body.data.token;

        // 2. Ensure this user has a Musician profile (as addAlbum controller fetches musician.name)
        //    and User.isMusician is true for protectRouteMusician middleware.
        await User.updateOne({ address: userAddressLowerCase }, { $set: { isMusician: true } });
        await Musician.create({
            address: userAddressLowerCase,
            name: musicianUserName,
            imageUrl: "ipfs://musician_image_setup", // Placeholder
            uri: "ipfs://musician_uri_setup"       // Placeholder
        });
        
        const finalLoginResponse = await request(app).post("/api/auth/login")
            .send({ address: userAddress, signature: signature }) 
            .expect(200);
        musicianAuthToken = finalLoginResponse.body.data.token; 
        console.log(`[AlbumAdd Test - beforeEach] Re-login successful. musicianAuthToken (first 20): ${musicianAuthToken ? musicianAuthToken.substring(0,20)+"..." : "UNDEFINED"}`);

        //  3.Verify the token payload
        const decodedToken = jwt.decode(musicianAuthToken);
        expect(decodedToken.isMusician).toBe(true); 
        console.log(`[AlbumAdd Test - beforeEach] Decoded musicianAuthToken for ${userAddress}:`, decodedToken);


        // 4. Create some songs to be added to the album
        createdSong1 = await Song.create({ title: "Song One for Album", artistName: musicianUserName, artistWallet: userAddressLowerCase, imageUrl: "ipfs://s1", audioUrl: "ipfs://a1", duration: 180 });
        createdSong2 = await Song.create({ title: "Song Two for Album", artistName: musicianUserName, artistWallet: userAddressLowerCase, imageUrl: "ipfs://s2", audioUrl: "ipfs://a2", duration: 200 });
        });

        it("should add a new album and return transaction data", async () => {
        if (!musicianAuthToken) {
            throw new Error('Musician auth token not available for add album test. Check beforeEach login.');
        }

        const songsPayloadString = JSON.stringify([
            { songId: createdSong1._id.toString(), title: createdSong1.title, trackNumber: 1 },
            { songId: createdSong2._id.toString(), title: createdSong2.title, trackNumber: 2 }
        ]);

        const newAlbumData = {
            title: "My New Awesome Album",
            publisher: "Indie Records",
            releaseYear: new Date().getFullYear(),
            genre: "Rock",
            description: "A collection of rocking tunes."
        };

        const response = await request(app)
            .post("/api/album/add") // Ensure this path matches your album.routes.js
            .set("Authorization", `Bearer ${musicianAuthToken}`)
            .field('title', newAlbumData.title)
            .field('publisher', newAlbumData.publisher)
            .field('releaseYear', newAlbumData.releaseYear.toString())
            .field('genre', newAlbumData.genre)
            .field('description', newAlbumData.description)
            .field('songs', songsPayloadString) // Send songs as a Buffer from stringified JSON
            .attach('image', testImagePath, 'album-cover.png')
            .expect(200);

        console.log("response.body for addAlbum:", JSON.stringify(response.body, null, 2));

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Album data processed. Please sign and send the transaction to publish.");
        expect(response.body.albumId).toEqual(expect.any(String)); 
        expect(response.body.transactionDetails).toEqual(expect.objectContaining({
            to: process.env.ALBUM_CONTRACT_ADDRESS, 
            data: expect.stringMatching(/^0x[0-9a-fA-F]+$/),
            value: parseEther("0.01").toString()
        }));
        expect(response.body).toMatchSnapshot({
            albumId: expect.any(String),
            transactionDetails: { to: expect.any(String), data: expect.any(String), value: expect.any(String) }
        });

        // Verify DB record
        const dbAlbum = await Album.findById(response.body.albumId).populate('songs').lean();
        expect(dbAlbum).toBeTruthy();
        expect(dbAlbum.title).toBe(newAlbumData.title);
        expect(dbAlbum.artist).toBe(musicianUserName);
        expect(dbAlbum.songs.length).toBe(2);
        expect(dbAlbum.songs[0].title).toBe(createdSong1.title);
        });

        it("should fail if cover image is missing", async () => {
        const newAlbumData = { title: "No Cover Album", publisher: "Pub", releaseYear: 2024, songs: JSON.stringify([{songId: createdSong1._id.toString(), title: "s1", trackNumber: 1}]) };
        const response = await request(app)
            .post("/api/album/add")
            .set("Authorization", `Bearer ${musicianAuthToken}`)
            .field('title', newAlbumData.title)
            .field('publisher', newAlbumData.publisher)
            .field('releaseYear', newAlbumData.releaseYear.toString())
            .field('songs', newAlbumData.songs)
            .expect(400);
        expect(response.body.error.code).toBe("MISSING_ALBUM_IMAGE");
        expect(response.body).toMatchSnapshot();
        });

        it("should fail if title is missing", async () => {
        const newAlbumData = { publisher: "Pub", releaseYear: 2024, songs: JSON.stringify([{songId: createdSong1._id.toString(), title: "s1", trackNumber: 1}]) };
        const response = await request(app)
            .post("/api/album/add")
            .set("Authorization", `Bearer ${musicianAuthToken}`)
            .attach('image', testImagePath, 'album-cover.png')
            .field('publisher', newAlbumData.publisher)
            .field('releaseYear', newAlbumData.releaseYear.toString())
            .field('songs', newAlbumData.songs)
            .expect(400);
        expect(response.body.error.code).toBe("MISSING_ALBUM_DETAILS");
        expect(response.body).toMatchSnapshot();
        });

        it("should fail if songsData is missing or empty", async () => {
        const response = await request(app)
            .post("/api/album/add")
            .set("Authorization", `Bearer ${musicianAuthToken}`)
            .attach('image', testImagePath, 'album-cover.png')
            .field('title', "Album With No Songs")
            .field('publisher', "Pub")
            .field('releaseYear', "2024")
            .expect(400);
        expect(response.body.error.code).toBe("MISSING_SONGS_DATA_STRING");
        expect(response.body).toMatchSnapshot();
        });
        
        it("should fail if songId in songsData is invalid", async () => {
        const response = await request(app)
            .post("/api/album/add")
            .set("Authorization", `Bearer ${musicianAuthToken}`)
            .attach('image', testImagePath, 'album-cover.png')
            .field('title', "Album With Invalid Song")
            .field('publisher', "Pub")
            .field('releaseYear', "2024")
            .field('songs', JSON.stringify([{ songId: "invalid-object-id", title: "Bad Song", trackNumber: 1 }]))
            .expect(400);
        expect(response.body.error.code).toBe("INVALID_SONG_DATA_FORMAT");
        expect(response.body).toMatchSnapshot();
        });
   });

    describe("GET /api/album/artist/:address", () => {
        let artistOne; 
        let artistTwo;
        let artistThreeWithNoAlbums;

        beforeEach(async () => {
        // Create musician users
        artistOne = await Musician.create({ address: userAddressLowerCase, name: "Artist Alpha", imageUrl: "ipfs://myimgA", uri: "ipfs://myuriA" });
        artistTwo = await Musician.create({ address: otherUserAddressLowerCase, name: "Artist Beta", imageUrl: "ipfs://otherimgB", uri: "ipfs://otheruriB" });
        artistThreeWithNoAlbums = await Musician.create({ address: thirdUserAddressLowerCase, name: "Artist Gamma", imageUrl: "ipfs://imgC", uri: "ipfs://uriC" });

        // Create albums for artistOne
        await Album.create({ title: "Alpha Hits Vol. 1", artist: artistOne.name, musicianId: artistOne._id, publisher: "Pub Alpha", imageUrl: "ipfs://alpha1", releaseYear: 2023, metadataUri: `ipfs://metaAlpha1-${Date.now()}`, isPublished: true, onChainTokenId: "101" });
        await Album.create({ title: "Alpha Ballads", artist: artistOne.name, musicianId: artistOne._id, publisher: "Pub Alpha", imageUrl: "ipfs://alpha2", releaseYear: 2022, metadataUri: `ipfs://metaAlpha2-${Date.now()}`, isPublished: true, onChainTokenId: "102" });
        // Unpublished album for artistOne
        await Album.create({ title: "Alpha Demos", artist: artistOne.name, musicianId: artistOne._id, publisher: "Pub Alpha", imageUrl: "ipfs://alpha3", releaseYear: 2021, metadataUri: `ipfs://metaAlpha3-${Date.now()}`, isPublished: false, onChainTokenId: "103" }); 
        
        // Album by artistTwo
        await Album.create({ title: "Beta Grooves", artist: artistTwo.name, musicianId: artistTwo._id, publisher: "Pub Beta", imageUrl: "ipfs://beta1", releaseYear: 2023, metadataUri: `ipfs://metaBeta1-${Date.now()}`, isPublished: true, onChainTokenId: "201" });
        });

        it("should return published albums for a specific artist address", async () => {
        const response = await request(app)
            .get(`/api/album/artist/${artistOne.address}`) // Fetch albums for artistOne
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBe(2); // Only the 2 published albums by artistOne
        const titles = response.body.data.map(a => a.title);
        expect(titles).toContain("Alpha Hits Vol. 1");
        expect(titles).toContain("Alpha Ballads");
        expect(titles).not.toContain("Alpha Demos");
        expect(titles).not.toContain("Beta Grooves");
        response.body.data.forEach(album => {
            expect(album.artist).toBe(artistOne.name);
            expect(album.musicianId.toString()).toBe(artistOne._id.toString());
            expect(album.isPublished).toBe(true);
            expect(album.onChainTokenId).toBeDefined();
        });
        });

        it("should return an empty array if the artist has no published albums", async () => {
        const response = await request(app)
            .get(`/api/album/artist/${artistThreeWithNoAlbums.address}`)
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual([]);
        expect(response.body.count).toBe(0);
        });
        
        it("should return an 404 if artist address is valid but no musician profile exists", async () => {
        const nonMusicianWallet = "0x1234567890123456789012345678901234567890"; // Valid format, no musician
        const response = await request(app)
            .get(`/api/album/artist/${nonMusicianWallet}`)
            .expect(404); 
        });


        it("should return 400 if artist address is not a valid Ethereum address format", async () => {
        const invalidAddress = "not-an-address";
        const response = await request(app)
            .get(`/api/album/artist/${invalidAddress}`)
            .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe("INVALID_ARTIST_ADDRESS_PARAM"); 
        expect(response.body.error.message).toBe("Valid wallet address parameter is required.");
        });
  });

  describe("POST /api/album/buy", () => {
    let existingUser;
    let existingAlbum;
    let userAuthToken;

    beforeEach(async () => {
     const signature = await mainUserSigner.signMessage(loginMessage); // mainUserSigner is for userAddress
      const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({ address: userAddress, signature: signature })
        .expect(200);
      userAuthToken = loginResponse.body.data.token; 
      
      // The login should have created the user, or we can ensure it here
      existingUser = await User.findOne({ address: userAddressLowerCase });
      if (!existingUser) {
        existingUser = await User.create({
            address: userAddressLowerCase,
            lastLoginAt: Date.now(),
            isMusician: false,
            pic: "default.png"
        });
    }

       const albumMusician = await Musician.create({
        address: otherUserAddressLowerCase, // Using a distinct address for the album's musician
        name: "Album Original Artist",
        imageUrl: "ipfs://album_artist_img",
        uri: "ipfs://album_artist_uri"
      });

      // Create an album that can be bought
      existingAlbum = await Album.create({
        title: "Buyable Album",
        artist: albumMusician.name,          
        musicianId: albumMusician._id,        
        publisher: "Seller Publisher",
        imageUrl: "ipfs://buyable_album_img",
        metadataUri: `ipfs://buyable_album_meta_${Date.now()}`, 
        releaseYear: 2024,
        onChainTokenId: "1", 
        isPublished: true,     // Album must be published to be bought
        priceEth: "0.01"       
      });
    });

    it("should successfully record album as bought and match snapshot", async () => {
      const albumIdToBuy = existingAlbum._id.toString();
      const messageToSign = `Buy album ${albumIdToBuy} for ${userAddress}`;
      const signer = await provider.getSigner(userAddress);
      const signature = await signer.signMessage(messageToSign); 

      const response = await request(app)
        .post("/api/album/buy") 
        .set("Authorization", `Bearer ${userAuthToken}`)
        .send({
          address: userAddress,
          albumId: albumIdToBuy,
          signature: signature,
        })
        .expect(200);

        console.log("Response body:", response.body);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Album purchase initiated for 'Buyable Album'. Please sign and send the transaction.");
      expect(response.body.albumId).toBe(albumIdToBuy);
      expect(response.body).toMatchSnapshot({
            albumId: expect.any(String),
            message: expect.any(String),
            success: expect.any(Boolean),
            transactionDetails: { to: expect.any(String), data: expect.any(String), value: expect.any(String) }
      });

      // Verify DB update
      const updatedUser = await User.findById(existingUser._id).lean(); // Use .lean()
      expect(updatedUser).toBeTruthy();
      expect(updatedUser.boughtAlbums).toBeInstanceOf(Array); 
      expect(updatedUser.boughtAlbums.map(id => id.toString())).toContain(albumIdToBuy);
    });

    it("should prevent buying the same album twice (idempotency in DB)", async () => {
      const albumIdToBuy = existingAlbum._id.toString();
      const messageToSign = `Buy album ${albumIdToBuy} for ${userAddress}`;
      const signer = await provider.getSigner(userAddress);
      const signature = await signer.signMessage(messageToSign);

      // First "purchase"
      await request(app)
        .post("/api/album/buy")
        .set("Authorization", `Bearer ${userAuthToken}`)
        .send({ address: userAddress, albumId: albumIdToBuy, signature: signature })
        .expect(200);

      // Attempt second "purchase"
      const response = await request(app)
        .post("/api/album/buy")
        .set("Authorization", `Bearer ${userAuthToken}`)
        .send({ address: userAddress, albumId: albumIdToBuy, signature: signature })
        .expect(200); // Still 200 as $addToSet doesn't error

      expect(response.body.success).toBe(true); // Should still be successful
      
      const updatedUser = await User.findById(existingUser._id);
      // Check that boughtAlbums array contains the ID only once
      const boughtOnce = updatedUser.boughtAlbums.filter(id => id.toString() === albumIdToBuy);
      expect(boughtOnce.length).toBe(1);
    });

    it("should return 400 for missing required fields", async () => {
      const response = await request(app)
        .post("/api/album/buy")
        .set("Authorization", `Bearer ${userAuthToken}`)
        .send({ address: userAddress, albumId: existingAlbum._id.toString() }) // Missing signature
        .expect(400);
      expect(response.body.error.code).toBe("MISSING_PARAMS");
      expect(response.body).toMatchSnapshot();
    });

    it("should return 401 for invalid signature", async () => {
      const albumIdToBuy = existingAlbum._id.toString();      
      const signer = await provider.getSigner(userAddress);
      const messageToSign = `Buy album ${albumIdToBuy} for ${userAddress}`;
      const wrongSignature = await signer.signMessage("some other message"); // Wrong message signed

      const response = await request(app)
        .post("/api/album/buy")
        .set("Authorization", `Bearer ${userAuthToken}`)
        .send({ address: userAddress, albumId: albumIdToBuy, signature: wrongSignature })
        .expect(401);
      expect(response.body.error.code).toBe("SIGNATURE_MISMATCH");
      expect(response.body).toMatchSnapshot();
    });

    it("should return 404 if album not found", async () => {
      const nonExistentAlbumId = new mongoose.Types.ObjectId().toString();
      const messageToSign = `Buy album ${nonExistentAlbumId} for ${userAddress}`;
      const signer = await provider.getSigner(userAddress);
      const signature = await signer.signMessage(messageToSign);

      const response = await request(app)
        .post("/api/album/buy")
        .set("Authorization", `Bearer ${userAuthToken}`)
        .send({ address: userAddress, albumId: nonExistentAlbumId, signature: signature })
        .expect(404);
      expect(response.body.error.code).toBe("ALBUM_NOT_FOUND");
      expect(response.body).toMatchSnapshot();
    });

     it("should return 400 for invalid albumId format", async () => {
      const invalidAlbumId = "invalid-id-format";
      const messageToSign = `Buy album ${invalidAlbumId} for ${userAddress}`;
      const signer = await provider.getSigner(userAddress);
      const signature = await signer.signMessage(messageToSign);

      const response = await request(app)
        .post("/api/album/buy")
        .set("Authorization", `Bearer ${userAuthToken}`)
        .send({ address: userAddress, albumId: invalidAlbumId, signature: signature })
        .expect(400);
      expect(response.body.error.code).toBe("INVALID_ALBUM_ID_FORMAT");
      expect(response.body).toMatchSnapshot();
    });

    it("should return 404 if the authenticated user does not exist in the DB", async () => {
      // 1. Get a valid token for your main user first.
      const signer = await provider.getSigner(userAddress);
      const signature = await signer.signMessage(loginMessage);
      const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({ address: userAddress, signature })
        .expect(200);
      const validTokenForNowDeletedUser = loginResponse.body.data.token;

      // 2. NOW, delete that user from the database.
      await User.deleteOne({ address: userAddress.toLowerCase() });

      // 3. Make the API call using the (now invalid) token.
      // The address in the token and body now match, so it will pass the first check.
      const albumIdToBuy = existingAlbum._id.toString();
      const messageToSign = `Buy album ${albumIdToBuy} for ${userAddress}`;
      const buySignature = await signer.signMessage(messageToSign);

      const response = await request(app)
        .post("/api/album/buy")
        .set("Authorization", `Bearer ${validTokenForNowDeletedUser}`)
        .send({ address: userAddress, albumId: albumIdToBuy, signature: buySignature })
        .expect(404);

      expect(response.body.error.code).toBe("BUYER_NOT_FOUND");
    });
  });
});