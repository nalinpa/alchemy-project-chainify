import { ethers, isAddress, verifyMessage } from "ethers";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Musician from "../models/musician.model.js";
import { ApiError } from "../middleware/errorHandler.middleware.js";

export const authLogin = async (req, res, next) => {
  console.log("Received login request");
  const { address: userAddress, signature } = req.body;
  console.log("Received login request with:", { userAddress, signature });

  try {
    if (!userAddress || !signature) {
      console.log("Missing address or signature");
      throw new ApiError(400, "Address and signature are required", "MISSING_CREDENTIALS");
    }

    console.log("Checking address validity...");
    if (!isAddress(userAddress)) {
      console.log("Invalid address");
      throw new ApiError(400, "Invalid wallet address", "INVALID_ADDRESS_FORMAT");
    }

    const message = "Login to Music NFT Platform";

    console.log("Verifying signature...");
    let signerAddress;
    try {
      signerAddress = verifyMessage(message, signature);
    } catch (e) {
      if (e.code === 'INVALID_ARGUMENT' && e.argument && e.argument.includes('signature')) {
        console.log("Signature verification failed (malformed or invalid signature format):", e.message);
        throw new ApiError(401, "Invalid signature format or data.", "SIGNATURE_VERIFICATION_ERROR", { originalError: e.message });
      }
      console.error("Unexpected error during verifyMessage:", e);
      throw new ApiError(500, "Signature verification process failed.", "UNEXPECTED_SIGNATURE_ERROR", { originalError: e.message });
    }
    console.log("Signer address:", signerAddress);

    console.log("Comparing addresses...");
    if (signerAddress.toLowerCase() !== userAddress.toLowerCase()) {
      console.log("Signature verification failed (address mismatch)");
      throw new ApiError(401, "Signature does not match the provided address.", "SIGNATURE_ADDRESS_MISMATCH");
    }

    const now = Date.now();
    const walletAddress = userAddress.toLowerCase();
    let userDoc = await User.findOne({ address: walletAddress });
    console.log("User found in DB (initial lookup):", userDoc ? JSON.stringify(userDoc.toObject()) : null);

    if (!userDoc) {
      console.log("Creating new user...");
      userDoc = await User.create({
        address: walletAddress,
        lastLoginAt: now,
        isMusician: false,
        boughtAlbums: [],
        pic: "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
      });
      console.log("User created:", JSON.stringify(userDoc.toObject()));
    } else {
      console.log("Updating user (lastLoginAt)...");
      userDoc.lastLoginAt = now; 
      await userDoc.save(); 
      console.log("User updated:", JSON.stringify(userDoc.toObject()));
    }

    // Ensure 'user' is a plain object for subsequent operations, derived from userDoc
    const user = userDoc.toObject ? userDoc.toObject() : userDoc;

    if (!user || !user.address || !user._id) { 
      console.error("CRITICAL: User object is invalid or missing key fields before building response. User:", JSON.stringify(user));
      throw new ApiError(500, "Failed to retrieve valid user data after login/registration.", "USER_DATA_INVALID_STATE");
    }

    const musician = await Musician.findOne({ address: walletAddress }).lean();
    const isMusician = !!musician; 
    console.log(`Is user (${user.address}) a musician (Musician doc exists?): ${isMusician}`);
    
    console.log(`User model isMusician flag: ${user.isMusician}`);


    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        console.error("JWT_SECRET is not defined! Cannot sign token.");
        throw new ApiError(500, "Server configuration error: JWT secret missing.", "JWT_CONFIG_ERROR");
    }
    
    const isMusicianForToken = user.isMusician;
    const boughtAlbumIds = user.boughtAlbums ? user.boughtAlbums.map(id => id.toString()) : [];

    const tokenPayload = { 
        walletAddress: user.address,
        isMusician: isMusicianForToken, 
        userId: user._id.toString(),
        boughtAlbums: boughtAlbumIds        
    };
    console.log("Preparing token payload:", JSON.stringify(tokenPayload));
    const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: "1h" });
    console.log("Token generated.");

    console.log("--- Preparing responseData ---");
    console.log("user.address for response:", user.address);
    console.log("isMusicianForToken for response:", isMusicianForToken);
    console.log("user.pic for response:", user.pic);
    console.log("user._id for response (raw):", user._id);
    console.log("token for response:", token ? "Token vorhanden" : "Token ist null/undefined");

    const responseData = {
      success: true,
      message: "Login successful.", 
      data: {
        address: user.address, 
        isMusician: isMusicianForToken, 
        pic: user.pic || "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
        userId: user._id.toString(),
        boughtAlbums: boughtAlbumIds,
        token,
      }
    };
    
    console.log("Constructed responseData for login success:", JSON.stringify(responseData, null, 2));
    console.log("Sending login success response (res.json)...", responseData);
    return res.status(200).json(responseData); 

  } catch (error) {
    console.error("Error in authLogin controller (passed to next):", error.name, error.message, error.errorCode);
    next(error); 
  }
};


export const authLogout = async (req, res, next) => {
  console.log("Received logout request");
  const { address: userAddress } = req.body;

  try {
    if (!userAddress) {
      throw new ApiError(400, "Address is required for logout", "LOGOUT_MISSING_ADDRESS");
    }
    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Error in authLogout controller:", error.message);
    next(error); 
  }
};
