#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies for the root (for Hardhat)
npm install

# Compile the smart contracts, which will create the 'artifacts' directory
npx hardhat compile

# Navigate into the backend directory
cd backend

# Install dependencies for the backend server
npm install