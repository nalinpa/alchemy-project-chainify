// src/tests/song.test.js
import request from "supertest";
import mongoose from "mongoose";
import { jest } from '@jest/globals';
import { ethers, parseEther } from "ethers";
import jwt from "jsonwebtoken";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { app, provider, musicianContract as testMusicianContract } from "./setup.js"; 
import Song from "../models/song.model.js";
import Album from "../models/album.model.js";
import User from "../models/user.model.js";
import Musician from "../models/musician.model.js";

const __filename = fileURLToPath(import.meta.url);
const currentDir = path.dirname(__filename);

describe("Song API Endpoints", () => {
  let blockchainSnapshotId;
  const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const userAddressLowerCase = userAddress.toLowerCase();
  const otherUserAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; 
  const otherUserAddressLowerCase = otherUserAddress.toLowerCase();
  const thirdUserAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"; // For an artist with no songs
  const thirdUserAddressLowerCase = thirdUserAddress.toLowerCase();
  const loginMessage = "Login to Music NFT Platform";
  const testImagePath = path.join(currentDir, 'fixtures', 'test-image.png'); // For song image
  const testAudioPath = path.join(currentDir, 'fixtures', 'test-audio.mp3'); // Dummy audio file

  let mainUserSigner;
  let otherUserSigner;

  beforeAll(async () => {
    const fixturesDir = path.join(currentDir, 'fixtures');
    if (!fs.existsSync(fixturesDir)) fs.mkdirSync(fixturesDir, { recursive: true });
    if (!fs.existsSync(testImagePath)) {
      const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
      fs.writeFileSync(testImagePath, testImageBuffer);
    }
    if (!fs.existsSync(testAudioPath)) {
      fs.writeFileSync(testAudioPath, Buffer.from("dummy audio content")); // Create dummy audio file
    }
    mainUserSigner = await provider.getSigner(userAddress);
    otherUserSigner = await provider.getSigner(otherUserAddress);
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

  // --- Tests for GET /api/songs/all (getAllSongs) ---
  describe("GET /api/songs/all", () => {
    it("should return an empty array if no songs exist", async () => {
      const response = await request(app).get("/api/song/all").expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it("should return all songs sorted by createdAt descending", async () => {
      const song1 = await Song.create({ title: "Song A", artistName: "Artist X", artistWallet: userAddressLowerCase, imageUrl: "ipfs://imgA", audioUrl: "ipfs://audioA", duration: 180, createdAt: new Date("2023-01-01T10:00:00.000Z") });
      const song2 = await Song.create({ title: "Song B", artistName: "Artist Y", artistWallet: otherUserAddress.toLowerCase(), imageUrl: "ipfs://imgB", audioUrl: "ipfs://audioB", duration: 200, createdAt: new Date("2023-01-01T12:00:00.000Z") });
      
      const response = await request(app).get("/api/song/all").expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data[0].title).toBe("Song B"); // Song2 created later
      expect(response.body.data[1].title).toBe("Song A");
    });
  });

  // --- Tests for GET /api/songs/featured (getFeaturedSongs) ---
  describe("GET /api/songs/featured", () => {
    it("should return an empty array if no songs exist", async () => {
      const response = await request(app).get("/api/song/featured").expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it("should return up to 5 random songs if songs exist", async () => {
      for (let i = 0; i < 10; i++) {
        await Song.create({ title: `Featured Song ${i}`, artistName: `Artist ${i}`, artistWallet: userAddressLowerCase, imageUrl: `ipfs://imgF${i}`, audioUrl: `ipfs://audioF${i}`, duration: 180 + i });
      }
      const response = await request(app).get("/api/song/featured").expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty("title");
        expect(response.body.data[0]).toHaveProperty("artistName");
        expect(response.body.data[0]).not.toHaveProperty("artistWallet"); // Check $project
      }
    });
     it("should return correct number of songs if 'size' query param is used", async () => {
      for (let i = 0; i < 7; i++) {
        await Song.create({ title: `Sized Song ${i}`, artistName: `Artist ${i}`, artistWallet: userAddressLowerCase, imageUrl: `ipfs://imgS${i}`, audioUrl: `ipfs://audioS${i}`, duration: 190 + i });
      }
      const response = await request(app).get("/api/song/featured?size=3").expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(3);
    });
  });

  // --- Tests for GET /api/songs/by-album/:albumId (getAlbumSongs) ---
  describe("GET /api/songs/album/:albumId", () => {
    let testAlbum, testMusician, song1, song2, songFromOtherAlbum;

    beforeEach(async () => {
      testMusician = await Musician.create({ address: userAddressLowerCase, name: "Album Artist", imageUrl: "ipfs://img", uri: "ipfs://uri" });
      testAlbum = await Album.create({ title: "Songs Album", artist: testMusician.name, musicianId: testMusician._id, publisher: "Pub", imageUrl: "ipfs://img", releaseYear: 2023, metadataUri: `ipfs://meta-album-${Date.now()}` });
      
      song1 = await Song.create({ title: "Song Alpha", albumId: testAlbum._id, artistName: testMusician.name, artistWallet: testMusician.address, imageUrl: "ipfs://sA", audioUrl: "ipfs://aA", duration: 100 });
      song2 = await Song.create({ title: "Song Beta", albumId: testAlbum._id, artistName: testMusician.name, artistWallet: testMusician.address, imageUrl: "ipfs://sB", audioUrl: "ipfs://aB", duration: 110 });
      songFromOtherAlbum = await Song.create({ title: "Song Gamma", albumId: new mongoose.Types.ObjectId(), artistName: "Other Artist", artistWallet: otherUserAddress.toLowerCase(), imageUrl: "ipfs://sG", audioUrl: "ipfs://aG", duration: 120 });
    });

    it("should return all songs for a specific albumId", async () => {
      const response = await request(app).get(`/api/song/album/${testAlbum._id}`).expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data.map(s => s.title)).toEqual(expect.arrayContaining(["Song Alpha", "Song Beta"]));
    });

    it("should return an empty array if album has no songs", async () => {
      const emptyAlbum = await Album.create({ title: "Empty Album", artist: testMusician.name, musicianId: testMusician._id, publisher: "Pub", imageUrl: "ipfs://imgEmpty", releaseYear: 2023, metadataUri: `ipfs://meta-empty-${Date.now()}` });
      const response = await request(app).get(`/api/song/album/${emptyAlbum._id}`).expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it("should return 400 if albumId is invalid format", async () => {
      const response = await request(app).get("/api/song/album/invalid-id").expect(400);
      expect(response.body.error.code).toBe("INVALID_ALBUM_ID_PARAM_SONGS");
    });
  });

  describe("GET /api/song/artist/:address", () => {
    let artist1, artist2; // Musician documents
    let songByArtist1_1, songByArtist1_2, songByArtist2_1;
    let albumByArtist1;

    beforeEach(async () => {
      artist1 = await Musician.create({ address: userAddressLowerCase, name: "Artist One", imageUrl: "ipfs://a1img", uri: "ipfs://a1uri" });
      artist2 = await Musician.create({ address: otherUserAddressLowerCase, name: "Artist Two", imageUrl: "ipfs://a2img", uri: "ipfs://a2uri" });
      // Artist with no songs
      await Musician.create({ address: thirdUserAddressLowerCase, name: "Artist Three (No Songs)", imageUrl: "ipfs://a3img", uri: "ipfs://a3uri" });


      albumByArtist1 = await Album.create({
        title: "Album by Artist One", artist: artist1.name, musicianId: artist1._id,
        publisher: "Pub One", imageUrl: "ipfs://album1img", releaseYear: 2024, metadataUri: `ipfs://album1meta-${Date.now()}`
      });

      songByArtist1_1 = await Song.create({ title: "Artist One - Song 1", artistName: artist1.name, artistWallet: artist1.address, imageUrl: "ipfs://s11", audioUrl: "ipfs://a11", duration: 180, albumId: albumByArtist1._id });
      songByArtist1_2 = await Song.create({ title: "Artist One - Song 2", artistName: artist1.name, artistWallet: artist1.address, imageUrl: "ipfs://s12", audioUrl: "ipfs://a12", duration: 200 });
      songByArtist2_1 = await Song.create({ title: "Artist Two - Song 1", artistName: artist2.name, artistWallet: artist2.address, imageUrl: "ipfs://s21", audioUrl: "ipfs://a21", duration: 220 });
    });

    it("should return all songs by a specific artist's wallet address", async () => {
      const response = await request(app)
        .get(`/api/song/artist/${userAddressLowerCase}`) // Fetch songs by Artist One
        .expect(200);

        console.log("[getSongsByArtist] Response:", response.body);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(2);
      const titles = response.body.data.map(s => s.title);
      expect(titles).toContain("Artist One - Song 1");
      expect(titles).toContain("Artist One - Song 2");
      expect(response.body.data[0].artistWallet).toBe(userAddressLowerCase);
    });

    it("should return an empty array if the artist has no songs", async () => {
      const response = await request(app)
        .get(`/api/song/artist/${thirdUserAddressLowerCase}`) // Artist Three has no songs
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });
    
    it("should return 400 if artistWalletAddress is not a valid Ethereum address format", async () => {
      const invalidAddress = "not-an-address";
      const response = await request(app)
        .get(`/api/song/artist/${invalidAddress}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("INVALID_ARTIST_ADDRESS_PARAM");
      expect(response.body.error.message).toBe("Valid artist wallet address parameter is required.");
    });
  });

//  // --- Tests for POST /api/songs/add (addSong) ---
  describe("POST /api/song/add", () => {
    let musicianAuthToken;
    let testMusician;
    let testAlbumForSong;

    beforeEach(async () => {
      const signer = await provider.getSigner(userAddress);
      const signature = await signer.signMessage(loginMessage);
      await request(app).post("/api/auth/login").send({ address: userAddress, signature }).expect(200); // Initial login to create User

      await User.updateOne({ address: userAddressLowerCase }, { $set: { isMusician: true } });
      testMusician = await Musician.create({ address: userAddressLowerCase, name: "Song Creator Musician", imageUrl: "ipfs://mcImg", uri: "ipfs://mcUri" });
      
      const finalLoginResponse = await request(app).post("/api/auth/login").send({ address: userAddress, signature }).expect(200);
      musicianAuthToken = finalLoginResponse.body.data.token;

      testAlbumForSong = await Album.create({
        title: "Album For New Songs", artist: testMusician.name, musicianId: testMusician._id,
        publisher: "Test Pub", imageUrl: "ipfs://albumForSong", releaseYear: 2024, metadataUri: `ipfs://meta-albumForSong-${Date.now()}`
      });
    });

    it("should add a new song without linking to an album", async () => {
      const response = await request(app)
        .post("/api/song/add")
        .set("Authorization", `Bearer ${musicianAuthToken}`)
        .field("title", "Standalone Song")
        .field("duration", "240")
        .attach("imageFile", testImagePath, "song-cover.png")
        .attach("audioFile", testAudioPath, "song-audio.mp3")
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Song added successfully.");
      expect(response.body.data.title).toBe("Standalone Song");
      expect(response.body.data.artistName).toBe(testMusician.name);
      expect(response.body.data.albumId).toBeUndefined();
      expect(response.body.data.imageUrl).toMatch(/^ipfs:\/\/.+/);
      expect(response.body.data.audioUrl).toMatch(/^ipfs:\/\/.+/);
    });

    it("should add a new song and link it to an existing album", async () => {
      const response = await request(app)
        .post("/api/song/add")
        .set("Authorization", `Bearer ${musicianAuthToken}`)
        .field("title", "Song For Album")
        .field("duration", "190")
        .field("albumId", testAlbumForSong._id.toString())
        .attach("imageFile", testImagePath, "song-cover-album.png")
        .attach("audioFile", testAudioPath, "song-audio-album.mp3")
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe("Song For Album");
      expect(response.body.data.albumId.toString()).toBe(testAlbumForSong._id.toString());

      const albumInDb = await Album.findById(testAlbumForSong._id).populate('songs');
      expect(albumInDb.songs.length).toBe(1);
      expect(albumInDb.songs[0]._id.toString()).toBe(response.body.data._id);
    });

    it("should return 401 if no token is provided", async () => {
      const response = await request(app)
        .post("/api/song/add")
        .field("title", "Unauthorized Song")
        .field("duration", "180")
        .attach("imageFile", testImagePath)
        .attach("audioFile", testAudioPath)
        .expect(401);
      expect(response.body.error.message).toBe("No token provided");
    });
    
    it("should return 400 if title is missing", async () => {
      const response = await request(app)
        .post("/api/song/add")
        .set("Authorization", `Bearer ${musicianAuthToken}`)
        .field("duration", "180")
        .attach("imageFile", testImagePath)
        .attach("audioFile", testAudioPath)
        .expect(400);
      expect(response.body.error.code).toBe("MISSING_SONG_DETAILS");
    });
  });
});
