import React, { useState } from "react";
import detectEthereumProvider from "@metamask/detect-provider";
import { useSharedState } from "../context/BCContext"; 
import { axiosInstance } from "../lib/axios"; 

const SignOutButton: React.FC = () => {
  const { address, logout } = useSharedState(); 
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!address) {
        console.warn("handleLogout called but no address found in context.");
        logout(); // Call context logout to ensure state is cleared
        return;
      }

      // 1. Call backend logout endpoint (optional, as JWT logout is often client-side)
      try {
        console.log("Making axios request to /auth/logout with address:", { address });
        const response = await axiosInstance.post("/auth/logout", { address }); // Send current user's address
        const responseData = response.data;
        console.log("Logout response from backend:", responseData);

        if (!responseData.success) {
          // Even if backend logout fails, proceed with client-side logout
          console.warn("Backend logout was not successful, but proceeding with client-side logout.", responseData.error?.message || responseData.message);
        }
      } catch (apiError: any) {
        // Log backend logout error but still proceed with client-side logout
        console.error("Error calling backend logout endpoint:", apiError.response?.data || apiError.message);
      }

      // 2. Attempt to revoke MetaMask permissions (optional UX improvement)
      const provider = await detectEthereumProvider({ mustBeMetaMask: true });
      if (provider && (provider as any).isConnected && (provider as any).request) {
        try {
          // Note: 'wallet_revokePermissions' might not be supported by all wallets or
          // might not fully "disconnect" in the way users expect.
          // It typically revokes the site's permission to see accounts.
          await (provider as any).request({
            method: "wallet_revokePermissions",
            params: [{ eth_accounts: {} }],
          });
          console.log("Attempted to revoke MetaMask permissions.");
        } catch (revokeErr: any) {
          console.warn("Failed to revoke MetaMask permissions (this is often a soft error):", revokeErr.message);
        }
      } else {
        console.log("No active MetaMask provider detected or not connected; skipping permission revocation.");
      }

      // 3. Clear client-side authentication state using the context's logout function
      logout(); //
      
      console.log("Logged out successfully on client-side.");
      // Optionally: redirect user to login page or homepage

    } catch (err: any) {
      const errorMessage = err.message || "An unknown error occurred during logout.";
      setError(errorMessage);
      console.error("Error in handleLogout general catch block:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Only show the logout button if the user is actually logged in (address is present)
  if (!address) {
    return <p className="text-gray-500 text-sm">Not connected.</p>; // Or null, or a login button
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-green-600 text-sm">
        Connected: {address.slice(0, 6)}...{address.slice(-4)}
      </p>
      <button
        onClick={handleLogout}
        disabled={isLoading}
        className={`bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors ${
          isLoading ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {isLoading ? "Logging out..." : "Sign Out"}
      </button>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
};

export default SignOutButton;