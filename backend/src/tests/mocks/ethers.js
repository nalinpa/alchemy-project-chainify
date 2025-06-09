import { jest } from "@jest/globals";

const mockContract = {
  balanceOf: jest.fn().mockResolvedValue(0),
};

const ethers = {
  isAddress: (address) => {
    console.log("Mock isAddress called with:", address);
    const result = /^0x[a-fA-F0-9]{40}$/.test(address);
    console.log("isAddress regex result:", result);
    return result;
  },
  verifyMessage: (message, signature) => {
    console.log("Mock verifyMessage called with:", { message, signature });
    if (signature === `mock_signature_${message}`) {
      return "0x742d35cc6634c0538c6ea047896c62e6749ae397";
    }
    throw new Error("Invalid signature");
  },
  providers: {
    JsonRpcProvider: class {
      async getNetwork() {
        return { name: "mock_network", chainId: 1234 };
      }
      async getCode() {
        return "0x";
      }
    },
  },
  Contract: class {
    constructor(address, abi, wallet) {
      this.address = address;
      this.abi = abi;
      this.wallet = wallet;
    }
    balanceOf = mockContract.balanceOf;
  },
};

export { ethers };