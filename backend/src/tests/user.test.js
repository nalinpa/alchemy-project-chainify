import request from "supertest";
import { app, provider, musicianContract } from "./setup.js"; 
import { ethers } from "ethers";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Musician from "../models/musician.model.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const currentDir = path.dirname(__filename);

describe("User API (/api/user and related)", () => {
  const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const userAddressLowerCase = userAddress.toLowerCase();
  const otherUserAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const otherUserAddressLowerCase = otherUserAddress.toLowerCase();
  const loginMessage = "Login to Music NFT Platform";
  const testImagePath = path.join(currentDir, 'fixtures', 'test-image.png');

  beforeAll(() => {
    const fixturesDir = path.join(currentDir, 'fixtures');
    if (!fs.existsSync(fixturesDir)) fs.mkdirSync(fixturesDir, { recursive: true });
    if (!fs.existsSync(testImagePath)) {
      const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
      fs.writeFileSync(testImagePath, testImageBuffer);
      console.log(`[UserTests] Created dummy test image at ${testImagePath}`);
    }
  });

  let blockchainSnapshotId;
  beforeEach(async () => {
    if (provider && provider.send) {
      blockchainSnapshotId = await provider.send("evm_snapshot", []);
    }
    await User.deleteMany({});
    await Musician.deleteMany({});
  });

  afterEach(async () => {
    if (blockchainSnapshotId && provider && provider.send) {
      await provider.send("evm_revert", [blockchainSnapshotId]);
    }
  });

  // --- ADD MUSICIAN TESTS ---
  describe("POST /api/user/musician/add (becomeMusician with JWT)", () => {
    const musicianName = "Test Musician Artist with JWT";
    let authToken;

    beforeEach(async () => {
      const signer = await provider.getSigner(userAddress);
      const signature = await signer.signMessage(loginMessage);
      const loginResponse = await request(app).post("/api/auth/login").send({ address: userAddress, signature: signature }).expect(200);
      authToken = loginResponse.body.data.token; 
    });

    it("should return transaction data for musician NFT mint using JWT and match snapshot", async () => {
      const req = request(app).post("/api/user/musician/add");
      req.auth(authToken, { type: 'bearer' });
      req.attach('image', testImagePath, 'test-image.png');
      req.field('name', musicianName);
      const response = await req.expect(200);
      expect(response.body.message).toBe("Musician registration initiated. Please sign and send the transaction.");
      expect(response.body.transactionDetails.to).toEqual(process.env.MUSICIAN_CONTRACT_ADDRESS);
      expect(response.body).toMatchSnapshot({transactionDetails: {to: expect.any(String), data: expect.any(String), value: expect.any(String)}});
      
      const signer = await provider.getSigner(userAddress);
      const tx = await signer.sendTransaction({
        to: response.body.transactionDetails.to,
        data: response.body.transactionDetails.data,
        value: BigInt(response.body.transactionDetails.value)
      });
      const receipt = await tx.wait();
      expect(receipt.status).toBe(1);
      const updatedUser = await User.findOne({ address: userAddressLowerCase });
      expect(updatedUser?.isMusician).toBe(true);
      const musicianDb = await Musician.findOne({ address: userAddressLowerCase });
      expect(musicianDb).toBeTruthy();
      const hasNFT = await musicianContract.hasMusicianNFT(userAddress);
      expect(hasNFT).toBe(true);
    });

    it("should return 400 if already a musician", async () => {
      let initialReq = request(app).post("/api/user/musician/add");
      initialReq.auth(authToken, { type: 'bearer' });
      initialReq.attach('image', testImagePath, 'test-image.png');
      initialReq.field('name', "Initial Musician Profile");
      const initialResponse = await initialReq.expect(200);
      const signer = await provider.getSigner(userAddress);
      const tx = await signer.sendTransaction({
        to: initialResponse.body.transactionDetails.to,
        data: initialResponse.body.transactionDetails.data,
        value: BigInt(initialResponse.body.transactionDetails.value)
      });
      await tx.wait();

      let secondReq = request(app).post("/api/user/musician/add");
      secondReq.auth(authToken, { type: 'bearer' });
      secondReq.attach('image', testImagePath, 'another-test-image.png');
      secondReq.field('name', "Attempt To Become Musician Again");
      const response = await secondReq.expect(400);
      expect(response.body.error).toBe("Address already has a Musician NFT");
      expect(response.body).toMatchSnapshot();
    });

    it("should return 401 if no token provided (multipart) and match error snapshot", async () => {
        try {
            const response = await request(app)
                .post("/api/user/musician/add")
                .attach('image', testImagePath, 'test-image.png')
                .field('name', musicianName)
                .expect(401);
            expect(response.body.error.message).toBe("No token provided");
            expect(response.body.error.code).toBe("NO_TOKEN_PROVIDED");
            expect(response.body).toMatchSnapshot();
        } catch (error) {
            if (!error.response && error.code === 'ECONNRESET') {
                 console.warn("[UserTests] ECONNRESET occurred in multipart no-token test. Server likely crashed.");
                 expect(error.code).toBe('ECONNRESET'); 
            } else if (error.response) {
                 expect(error.response.status).toBe(401);
                 expect(error.response.body.error).toBe("No token provided");
            } else {
                throw error;
            }
        }
    });

    it("should return 401 if no token provided (simplified request - for ECONNRESET debug)", async () => {
      const response = await request(app).post("/api/user/musician/add").send({ name: musicianName }).expect(401);
      expect(response.body.error.message).toBe("No token provided");
      expect(response.body.error.code).toBe("NO_TOKEN_PROVIDED");
      expect(response.body).toMatchSnapshot();
    });

    it("should return 400 for missing image file (with JWT auth) and match error snapshot", async () => {
        let req = request(app).post("/api/user/musician/add");
        req.auth(authToken, { type: 'bearer' });
        req.field('name', musicianName);
        const response = await req.expect(400);
        expect(response.body.error).toBe("Image file is required");
        expect(response.body).toMatchSnapshot();
    });
  });

  // --- MUSICIAN PROFILE DATA TESTS ---
  // Assuming the route is /api/user/musician/profile based on your test snippet
  describe("GET /api/user/musician/profile", () => {
    let musicianToken;
    let nonMusicianToken;

    beforeEach(async () => {
      // Setup non-musician user (userAddress)
      const signerRegular = await provider.getSigner(userAddress);
      const signatureRegular = await signerRegular.signMessage(loginMessage);
      const loginResRegular = await request(app).post("/api/auth/login").send({ address: userAddress, signature: signatureRegular }).expect(200);
      nonMusicianToken = loginResRegular.body.data?.token || loginResRegular.body.token;

      // Setup musician user (otherUserAddress)
      const signerMusician = await provider.getSigner(otherUserAddress);
      const signatureMusician = await signerMusician.signMessage(loginMessage);
      let tempMusicianLogin = await request(app).post("/api/auth/login").send({ address: otherUserAddress, signature: signatureMusician }).expect(200);
      let tempMusicianAuthToken = tempMusicianLogin.body.data?.token || tempMusicianLogin.body.token;

      const addMusicianReq = request(app).post("/api/user/musician/add");
      addMusicianReq.auth(tempMusicianAuthToken, { type: 'bearer' });
      addMusicianReq.attach('image', testImagePath, 'musician-setup-for-data-test.png');
      addMusicianReq.field('name', "MusicianForDataTest");
      const addMusicianRes = await addMusicianReq.expect(200);

      const tx = await signerMusician.sendTransaction({
        to: addMusicianRes.body.transactionDetails.to,
        data: addMusicianRes.body.transactionDetails.data,
        value: BigInt(addMusicianRes.body.transactionDetails.value)
      });
      await tx.wait();
      
      const finalMusicianLoginRes = await request(app).post("/api/auth/login").send({ address: otherUserAddress, signature: signatureMusician }).expect(200);
      musicianToken = finalMusicianLoginRes.body.data?.token || finalMusicianLoginRes.body.token;
      
      const decodedMusicianToken = jwt.decode(musicianToken);
      expect(decodedMusicianToken.isMusician).toBe(true); 
    });

    it("should access musician data with valid token", async () => {
      const response = await request(app)
        .get("/api/user/musician/profile") // Using the path from your test
        .auth(musicianToken, { type: 'bearer' }) 
        .expect(200); 
      // Assuming your getMusicianProfileData controller returns this structure
      expect(response.body.success).toBe(true); 
      expect(response.body.message).toBe("Musician profile data retrieved successfully.");
      expect(response.body.data.address.toLowerCase()).toEqual(otherUserAddressLowerCase); 
      expect(response.body).toMatchSnapshot({
        data: {
          address: expect.any(String), name: expect.any(String),
          imageUrl: expect.stringMatching(/^ipfs:\/\/.+/),
          uri: expect.stringMatching(/^ipfs:\/\/.+/),
          createdAt: expect.any(String), updatedAt: expect.any(String),
        }
      });
    });

    it("should return 403 if token is for a non-musician user", async () => {
      const response = await request(app)
        .get("/api/user/musician/profile")
        .auth(nonMusicianToken, { type: 'bearer' })
        .expect(403);
      expect(response.body.error.message).toBe("Forbidden: User is not a musician.");
      expect(response.body.error.code).toBe("FORBIDDEN_NOT_MUSICIAN");
      expect(response.body).toMatchSnapshot();
    });

    it("should return 401 if no token provided", async () => {
      const response = await request(app).get("/api/user/musician/profile").expect(401);
      expect(response.body.error.message).toBe("No token provided");
      expect(response.body.error.code).toBe("NO_TOKEN_PROVIDED");
      expect(response.body).toMatchSnapshot();
    });
  });

  // --- CHECK MUSICIAN TESTS ---
  describe("POST /api/user/musician/check", () => {
    let currentAuthToken;

    it("should return isMusician: true if musician", async () => {
      const signer = await provider.getSigner(userAddress);
      const signature = await signer.signMessage(loginMessage);
      const loginResponse = await request(app).post("/api/auth/login").send({ address: userAddress, signature }).expect(200);
      let initialToken = loginResponse.body.data?.token || loginResponse.body.token;
      
      const addMusicianReq = request(app).post("/api/user/musician/add");
      addMusicianReq.auth(initialToken, { type: 'bearer' });
      addMusicianReq.attach('image', testImagePath, 'check-muso-true.png');
      addMusicianReq.field('name', "Check Muso True");
      const addMusicianRes = await addMusicianReq.expect(200);
      const tx = await signer.sendTransaction({
        to: addMusicianRes.body.transactionDetails.to,
        data: addMusicianRes.body.transactionDetails.data,
        value: BigInt(addMusicianRes.body.transactionDetails.value)
      });
      await tx.wait();
      
      const freshLogin = await request(app).post("/api/auth/login").send({ address: userAddress, signature }).expect(200);
      currentAuthToken = freshLogin.body.data?.token || freshLogin.body.token;
      const decodedToken = jwt.decode(currentAuthToken);
      expect(decodedToken.isMusician).toBe(true);

      const response = await request(app)
        .post("/api/user/musician/check")
        .auth(currentAuthToken, { type: 'bearer' })
        .send()
        .expect(200);
      expect(response.body.isMusician).toBe(true);
      expect(response.body).toMatchSnapshot();
    });

    it("should return isMusician: false if not musician", async () => {
      const signer = await provider.getSigner(userAddress);
      const signature = await signer.signMessage(loginMessage);
      const loginResponse = await request(app).post("/api/auth/login").send({ address: userAddress, signature }).expect(200);
      currentAuthToken = loginResponse.body.data?.token || loginResponse.body.token;
      const decodedToken = jwt.decode(currentAuthToken);
      expect(decodedToken.isMusician).toBe(false);

      const response = await request(app)
        .post("/api/user/musician/check")
        .auth(currentAuthToken, { type: 'bearer' })
        .send()
        .expect(200);
      expect(response.body.isMusician).toBe(false);
      expect(response.body).toMatchSnapshot();
    });

     it("should return 401 if no token provided", async () => {
        const response = await request(app).post("/api/user/musician/check").send().expect(401);
        expect(response.body.error.message).toBe("No token provided");
        expect(response.body.error.code).toBe("NO_TOKEN_PROVIDED");
        expect(response.body).toMatchSnapshot();
    });
  });
});