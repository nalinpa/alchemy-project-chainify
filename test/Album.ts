import { expect } from "chai";
import { ethers } from "hardhat";
import { Album, Musician } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import "@nomicfoundation/hardhat-chai-matchers";

describe("Album NFT", function () {
  let albumNFT: Album;
  let musicianNFT: Musician;
  let owner: SignerWithAddress, musician: SignerWithAddress, listener: SignerWithAddress;
  const MINT_FEE = ethers.parseEther("0.01");
  const ALBUM_URI = "ipfs://album-metadata";
  const SONG_IDS = [1, 2, 3].map(id => BigInt(id));
  const SONG_TITLES = ["Song 1", "Song 2", "Song 3"];

  beforeEach(async function () {
    [owner, musician, listener] = await ethers.getSigners();

    const MusicianFactory = await ethers.getContractFactory("Musician");
    musicianNFT = (await MusicianFactory.deploy()) as Musician;
    await musicianNFT.waitForDeployment();

    const AlbumFactory = await ethers.getContractFactory("Album");
    albumNFT = (await AlbumFactory.deploy(musicianNFT.target)) as Album;
    await albumNFT.waitForDeployment();

    await musicianNFT.connect(musician).mint("ipfs://musician-metadata", { value: MINT_FEE });
  });

  it("Should deploy the contract with correct name and symbol", async function () {
    expect(await albumNFT.name()).to.equal("Album");
    expect(await albumNFT.symbol()).to.equal("ALB");
  });

  it("Should allow musician to publish an album", async function () {
    const tx = albumNFT.connect(musician).publishAlbum("Album One", ALBUM_URI, SONG_IDS, SONG_TITLES, {
      value: MINT_FEE,
    });

    await expect(tx)
      .to.emit(albumNFT, "Transfer")
      .withArgs(ethers.ZeroAddress, musician.address, 1)
      .and.to.emit(albumNFT, "AlbumPublished")
      .withArgs(musician.address, 1, "Album One", ALBUM_URI);

    const album = await albumNFT.getAlbumSongs(1);
    expect(album.length).to.equal(3);
    expect(album[0].songId).to.equal(SONG_IDS[0]);
    expect(await albumNFT.albumCreator(1)).to.equal(musician.address);
    expect(await albumNFT.isPublished(1)).to.be.true;
  });

  it("Should allow listener to mint a published album", async function () {
    await albumNFT.connect(musician).publishAlbum("Album One", ALBUM_URI, SONG_IDS, SONG_TITLES, {
      value: MINT_FEE,
    });

    const tx = albumNFT.connect(listener).mintAlbum(1, { value: MINT_FEE });
    await expect(tx)
      .to.emit(albumNFT, "Transfer")
      .withArgs(ethers.ZeroAddress, listener.address, 2)
      .and.to.emit(albumNFT, "AlbumMinted")
      .withArgs(listener.address, 2, "Album One");

    expect(await albumNFT.ownerOf(2)).to.equal(listener.address);
    expect(await albumNFT.tokenURI(2)).to.equal(ALBUM_URI);
  });

  it("Should refund excess Ether when minting an album", async function () {
    await albumNFT.connect(musician).publishAlbum("Album One", ALBUM_URI, SONG_IDS, SONG_TITLES, {
      value: MINT_FEE,
    });

    const overpayment = ethers.parseEther("0.02");
    await expect(
      albumNFT.connect(listener).mintAlbum(1, { value: overpayment })
    ).to.changeEtherBalances([listener, albumNFT], [-MINT_FEE, MINT_FEE]);
  });

  it("Should not allow minting unpublished album", async function () {
    await expect(
      albumNFT.connect(listener).mintAlbum(1, { value: MINT_FEE })
    ).to.be.revertedWith("Album: Album not published");
  });

  it("Should not allow non-musician to publish an album", async function () {
    await expect(
      albumNFT.connect(listener).publishAlbum("Album One", ALBUM_URI, SONG_IDS, SONG_TITLES, {
        value: MINT_FEE,
      })
    ).to.be.revertedWith("Album: Not a valid musician");
  });

  it("Should prevent musician from publishing duplicate album name", async function () {
    await albumNFT.connect(musician).publishAlbum("My Album", ALBUM_URI, SONG_IDS, SONG_TITLES, {
      value: MINT_FEE,
    });
    await expect(
      albumNFT.connect(musician).publishAlbum("My Album", ALBUM_URI, SONG_IDS, SONG_TITLES, {
        value: MINT_FEE,
      })
    ).to.be.revertedWith("Album: Album name already taken");
  });

  it("Should not allow transferring an album NFT", async function () {
    await albumNFT.connect(musician).publishAlbum("Album One", ALBUM_URI, SONG_IDS, SONG_TITLES, {
      value: MINT_FEE,
    });
    await expect(
      albumNFT.connect(musician).transferFrom(musician.address, listener.address, 1)
    ).to.be.revertedWith("Album: Token is soulbound");
  });

  it("Should not allow listener to mint the same album twice", async function () {
    await albumNFT.connect(musician).publishAlbum("Album One", ALBUM_URI, SONG_IDS, SONG_TITLES, {
      value: MINT_FEE,
    });
    await albumNFT.connect(listener).mintAlbum(1, { value: MINT_FEE });
    await expect(
      albumNFT.connect(listener).mintAlbum(1, { value: MINT_FEE })
    ).to.be.revertedWith("Album: You already own this album");
  });

  it("Should allow owner to withdraw funds", async function () {
    await albumNFT.connect(musician).publishAlbum("Album One", ALBUM_URI, SONG_IDS, SONG_TITLES, {
      value: MINT_FEE,
    });
    await albumNFT.connect(listener).mintAlbum(1, { value: MINT_FEE });

    const contractBalance = await ethers.provider.getBalance(albumNFT.target);
    await expect(albumNFT.connect(owner).withdraw()).to.changeEtherBalances(
      [albumNFT, owner],
      [-contractBalance, contractBalance]
    );
  });

  it("Should revert getAlbumSongs for non-existent token", async function () {
    await expect(albumNFT.getAlbumSongs(999)).to.be.revertedWith("Album: Token does not exist");
  });

  it("Should return correct total minted tokens", async function () {
    let total = await albumNFT.getTotalMintedTokens();
    expect(total).to.equal(0);
  
    await albumNFT.connect(musician).publishAlbum("Album One", ALBUM_URI, SONG_IDS, SONG_TITLES, { value: MINT_FEE });
    total = await albumNFT.getTotalMintedTokens();
    expect(total).to.equal(1);
  
    await albumNFT.connect(musician).publishAlbum("Album Two", ALBUM_URI, SONG_IDS, SONG_TITLES, { value: MINT_FEE });
    total = await albumNFT.getTotalMintedTokens();
    expect(total).to.equal(2);
  
    await albumNFT.connect(listener).mintAlbum(1, { value: MINT_FEE });
    total = await albumNFT.getTotalMintedTokens();
    expect(total).to.equal(3);
  });
});