import mongoose from "mongoose";
import { isAddress } from "ethers";

const isValidEthereumAddress = (address) => {
  return isAddress(address);
};

const musicianSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: [true, "Ethereum address is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: isValidEthereumAddress,
        message: "Invalid Ethereum address",
      },
    },
    name: {
      type: String,
      required: [true, "Musician name is required"],
      trim: true,
      minlength: [1, "Name cannot be empty"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    imageUrl: {
      type: String,
      required: [true, "Image URL is required"],
      trim: true,
      match: [/^ipfs:\/\/.+$/, "Invalid IPFS URL format"],
    },
    uri: {
      type: String,
      required: [true, "Metadata URI is required"],
      trim: true,
      match: [/^ipfs:\/\/.+$/, "Invalid IPFS URI format"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { updatedAt: "updatedAt" },
  }
);

const Musician = mongoose.model("Musician", musicianSchema);

export default Musician;