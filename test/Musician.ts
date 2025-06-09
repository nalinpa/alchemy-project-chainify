import { expect } from "chai";
import { ethers } from "hardhat";
import { Musician } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import "@nomicfoundation/hardhat-chai-matchers";

describe("Musician NFT", function () {
  let musician: Musician;
  let owner: SignerWithAddress, addr1: SignerWithAddress, addr2: SignerWithAddress;
  const MINT_FEE = ethers.parseEther("0.01");
  const TOKEN_URI = "ipfs://test-metadata";

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const MusicianFactory = await ethers.getContractFactory("Musician");
    musician = (await MusicianFactory.deploy()) as Musician;
    await musician.waitForDeployment();
  });

  it("Should deploy the contract with correct name and symbol", async function () {
    expect(await musician.name()).to.equal("Musician");
    expect(await musician.symbol()).to.equal("MSC");
  });

  it("Should allow minting an NFT with correct fee and emit events", async function () {
    const tx = musician.connect(addr1).mint(TOKEN_URI, { value: MINT_FEE });
    await expect(tx)
      .to.emit(musician, "Transfer")
      .withArgs(ethers.ZeroAddress, addr1.address, 1)
      .and.to.emit(musician, "MusicianMinted")
      .withArgs(addr1.address, 1, TOKEN_URI);

    expect(await musician.hasMusicianNFT(addr1.address)).to.be.true;
    expect(await musician.ownerOf(1)).to.equal(addr1.address);
    expect(await musician.tokenURI(1)).to.equal(TOKEN_URI);
  });

  it("Should refund excess Ether when overpaying the mint fee", async function () {
    const overpayment = ethers.parseEther("0.02");
    await expect(musician.connect(addr1).mint(TOKEN_URI, { value: overpayment }))
      .to.changeEtherBalances([addr1, musician], [-MINT_FEE, MINT_FEE]);

    expect(await musician.hasMusicianNFT(addr1.address)).to.be.true;
  });

  it("Should not allow minting with insufficient fee", async function () {
    await expect(
      musician.connect(addr1).mint(TOKEN_URI, { value: ethers.parseEther("0.005") })
    ).to.be.revertedWith("Musician: Insufficient minting fee");
  });

  it("Should not allow the same address to mint twice", async function () {
    await musician.connect(addr1).mint(TOKEN_URI, { value: MINT_FEE });
    await expect(musician.connect(addr1).mint(TOKEN_URI, { value: MINT_FEE }))
      .to.be.revertedWith("Musician: Address already has an NFT");
  });

  it("Should not allow transferring the NFT via safeTransferFrom", async function () {
    await musician.connect(addr1).mint(TOKEN_URI, { value: MINT_FEE });
    await expect(
      musician.connect(addr1)["safeTransferFrom(address,address,uint256)"](addr1.address, addr2.address, 1)
    ).to.be.revertedWith("Musician: Token is soulbound");
  });

  it("Should not allow transferring the NFT via transferFrom", async function () {
    await musician.connect(addr1).mint(TOKEN_URI, { value: MINT_FEE });
    await expect(
      musician.connect(addr1).transferFrom(addr1.address, addr2.address, 1)
    ).to.be.revertedWith("Musician: Token is soulbound");
  });

  it("Should allow the owner to withdraw funds", async function () {
    await musician.connect(addr1).mint(TOKEN_URI, { value: MINT_FEE });
    const contractBalance = await ethers.provider.getBalance(musician.target);

    await expect(musician.connect(owner).withdraw()).to.changeEtherBalances(
      [musician, owner],
      [-contractBalance, contractBalance]
    );
    expect(await ethers.provider.getBalance(musician.target)).to.equal(0);
  });

  it("Should not allow withdrawal when balance is zero", async function () {
    await expect(musician.connect(owner).withdraw()).to.be.revertedWith(
      "Musician: No funds to withdraw"
    );
  });

  it("Should not allow non-owner to withdraw funds", async function () {
    await musician.connect(addr1).mint(TOKEN_URI, { value: MINT_FEE });
    await expect(musician.connect(addr1).withdraw()).to.be.revertedWithCustomError(
      musician,
      "OwnableUnauthorizedAccount"
    ).withArgs(addr1.address);
  });

  
});