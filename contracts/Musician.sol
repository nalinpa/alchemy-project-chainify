// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Musician is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId = 1;
    mapping(address => bool) public hasMinted;
    uint256 public constant MINT_FEE = 0.01 ether;
    event MusicianMinted(address indexed musician, uint256 tokenId, string tokenURI);

    constructor() ERC721("Musician", "MSC") Ownable(msg.sender) {}

    /// @notice Mint a soulbound NFT for a musician (requires 0.01 ETH)
    /// @param tokenURI Metadata URI for the NFT
    function mint(string memory tokenURI) external payable {
        require(!hasMinted[msg.sender], "Musician: Address already has an NFT");
        require(msg.value >= MINT_FEE, "Musician: Insufficient minting fee");

        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);
        hasMinted[msg.sender] = true;

        emit MusicianMinted(msg.sender, tokenId, tokenURI);

        // Refund excess Ether if overpaid
        if (msg.value > MINT_FEE) {
            payable(msg.sender).transfer(msg.value - MINT_FEE);
        }
    }

    /// @notice Override to make tokens soulbound (non-transferable)
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0), "Musician: Token is soulbound");
        return super._update(to, tokenId, auth);
    }

    /// @notice Withdraw contract balance to the owner
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Musician: No funds to withdraw");
        payable(owner()).transfer(balance);
    }

    /// @notice Check if an address owns a Musician NFT
    function hasMusicianNFT(address user) external view returns (bool) {
        return hasMinted[user];
    }

    /// @notice Get the last minted token ID
    function getLastMintedTokenId() external view returns (uint256) {
        return _nextTokenId - 1;
    }
}