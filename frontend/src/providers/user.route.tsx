import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSharedState } from "@/context/BCContext";

const ProtectedUserRoute: React.FC = () => {
  const { address } = useSharedState();

  if (!address) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedUserRoute;