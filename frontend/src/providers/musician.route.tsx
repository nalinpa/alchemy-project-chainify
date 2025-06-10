import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSharedState } from "@/context/BCContext";

const ProtectedMusicianRoute: React.FC = () => {
  const { address, isMusician, isLoggedInMusician } = useSharedState();

  console.log("ProtectedMusicianRoute check:", { address, isMusician, isLoggedInMusician });

  if (!isLoggedInMusician) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedMusicianRoute;