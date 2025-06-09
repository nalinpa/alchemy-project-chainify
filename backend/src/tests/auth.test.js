import request from "supertest";
import { app, provider } from "./setup.js"; 
import { ethers } from "ethers";
import jwt from "jsonwebtoken"; 
import User from "../models/user.model.js";
import Musician from "../models/musician.model.js"; 


describe("Authentication API (/api/auth)", () => {
  const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const userAddressLowerCase = userAddress.toLowerCase();
  const otherUserAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const loginMessage = "Login to Music NFT Platform";

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

  describe("POST /api/auth/login", () => {
    it("should login successfully with valid signature and match snapshot", async () => {
      const signer = await provider.getSigner(userAddress);
      const signature = await signer.signMessage(loginMessage);
      const response = await request(app)
        .post("/api/auth/login")
        .send({ address: userAddress, signature: signature })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Login successful."); 
      expect(response.body.data.token).toEqual(expect.any(String));
      expect(response.body.data.address.toLowerCase()).toEqual(userAddressLowerCase);
      
      expect(response.body).toMatchSnapshot({
        data: {
          token: expect.any(String),
          pic: expect.any(String),
          userId: expect.any(String), 
          address: expect.any(String) 
        }
      });
      const user = await User.findOne({ address: userAddressLowerCase });
      expect(user).toBeTruthy();
    });

     it("should return 400 for missing address or signature and match error snapshot", async () => {
      const response = await request(app).post("/api/auth/login").send({}).expect(400);
      expect(response.body).toEqual({
        success: false,
        error: { code: "MISSING_CREDENTIALS", message: "Address and signature are required" }
      });
      expect(response.body).toMatchSnapshot();
    });

    it("should return 400 for invalid address and match error snapshot", async () => {
        const signer = await provider.getSigner(userAddress);
        const signature = await signer.signMessage(loginMessage);
        const response = await request(app).post("/api/auth/login").send({ address: "invalid_address", signature }).expect(400);
        expect(response.body).toEqual({
          success: false,
          error: { code: "INVALID_ADDRESS_FORMAT", message: "Invalid wallet address" }
        });
        expect(response.body).toMatchSnapshot();
    });

    it("should return 401 for invalid signature (malformed) and match error snapshot", async () => {
      const response = await request(app).post("/api/auth/login").send({ address: userAddress, signature: "thisisnotavalidsignature" }).expect(401);
      expect(response.body).toEqual({
        success: false,
        error: { 
          code: "SIGNATURE_VERIFICATION_ERROR", 
          message: "Invalid signature format or data.", 
          details: { originalError: expect.any(String) }
        }
      });
      expect(response.body).toMatchSnapshot({error: {details: {originalError: expect.any(String)}}});
    });

     it("should return 401 for signature from wrong address and match error snapshot", async () => {
      const signer = await provider.getSigner(otherUserAddress);
      const signatureFromOther = await signer.signMessage(loginMessage);
      const response = await request(app).post("/api/auth/login").send({ address: userAddress, signature: signatureFromOther }).expect(401);
      expect(response.body).toEqual({
        success: false,
        error: { code: "SIGNATURE_ADDRESS_MISMATCH", message: "Signature does not match the provided address."}
      });
      expect(response.body).toMatchSnapshot();
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should logout successfully and match snapshot", async () => {
      const response = await request(app).post("/api/auth/logout").send({ address: userAddress }).expect(200);
      expect(response.body).toEqual({ success: true, message: "Logged out successfully" });
      expect(response.body).toMatchSnapshot();
    });

     it("should return 400 for missing address on logout and match error snapshot", async () => {
        const response = await request(app).post("/api/auth/logout").send({}).expect(400);
        expect(response.body).toEqual({
          success: false,
          error: { code: "LOGOUT_MISSING_ADDRESS", message: "Address is required for logout" }
        });
        expect(response.body).toMatchSnapshot();
    });
  });
});
