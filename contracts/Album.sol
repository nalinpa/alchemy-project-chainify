// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IMusicianNFT {
    function balanceOf(address owner) external view returns (uint256);
}

contract Album is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId = 1;
    uint256 public constant MINT_FEE = 0.01 ether;
    mapping(uint256 => Song[]) public albumSongs;
    mapping(address => mapping(bytes32 => bool)) public musicianAlbumNames;
    mapping(uint256 => address) public albumCreator;
    mapping(uint256 => bool) public isPublished;
    mapping(uint256 => string) public albumNames; 
    mapping(address => mapping(uint256 => bool)) public hasMintedAlbum;

    struct Song {
        uint256 songId;
        string songTitle;
    }

    IMusicianNFT public musicianNFT;

    event AlbumPublished(address indexed musician, uint256 tokenId, string albumName, string albumURI);
    event AlbumMinted(address indexed listener, uint256 tokenId, string albumName);

    constructor(address _musicianNFT) ERC721("Album", "ALB") Ownable(msg.sender) {
        musicianNFT = IMusicianNFT(_musicianNFT);
    }

    function publishAlbum(
        string memory albumName,
        string memory albumURI,
        uint256[] memory songIds,
        string[] memory songTitles
    ) external payable {
        require(musicianNFT.balanceOf(msg.sender) > 0, "Album: Not a valid musician");
        require(msg.value >= MINT_FEE, "Album: Insufficient minting fee");
        require(songIds.length == songTitles.length, "Album: Song arrays length mismatch");

        bytes32 albumNameHash = keccak256(abi.encodePacked(albumName));
        require(!musicianAlbumNames[msg.sender][albumNameHash], "Album: Album name already taken");

        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, albumURI);

        for (uint256 i = 0; i < songIds.length; i++) {
            albumSongs[tokenId].push(Song({songId: songIds[i], songTitle: songTitles[i]}));
        }

        musicianAlbumNames[msg.sender][albumNameHash] = true;
        albumCreator[tokenId] = msg.sender;
        isPublished[tokenId] = true;
        albumNames[tokenId] = albumName; // Store the album name

        emit AlbumPublished(msg.sender, tokenId, albumName, albumURI);

        if (msg.value > MINT_FEE) {
            payable(msg.sender).transfer(msg.value - MINT_FEE);
        }
    }

    function mintAlbum(uint256 tokenId) external payable {
        require(isPublished[tokenId], "Album: Album not published");
        require(_ownerOf(tokenId) != address(0), "Album: Original album does not exist");
        require(!hasMintedAlbum[msg.sender][tokenId], "Album: You already own this album");
        require(msg.value >= MINT_FEE, "Album: Insufficient minting fee");

        uint256 newTokenId = _nextTokenId++;
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI(tokenId));
        albumNames[newTokenId] = albumNames[tokenId]; 
        hasMintedAlbum[msg.sender][tokenId] = true;

        emit AlbumMinted(msg.sender, newTokenId, albumNames[tokenId]);

        if (msg.value > MINT_FEE) {
            payable(msg.sender).transfer(msg.value - MINT_FEE);
        }
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0), "Album: Token is soulbound");
        return super._update(to, tokenId, auth);
    }

    function getAlbumSongs(uint256 tokenId) external view returns (Song[] memory) {
        require(_ownerOf(tokenId) != address(0), "Album: Token does not exist");
        return albumSongs[tokenId];
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Album: No funds to withdraw");
        (bool sent, ) = payable(owner()).call{value: balance}("");
        require(sent, "Album: Withdrawal failed");
    }

    /// @notice Get the album name for a token
    function getAlbumName(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Album: Token does not exist");
        return albumNames[tokenId];
    }

    function getTotalMintedTokens() external view returns (uint256) {
        return _nextTokenId - 1;
    }
}