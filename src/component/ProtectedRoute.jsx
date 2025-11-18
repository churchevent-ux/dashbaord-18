import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const dashboardUser = localStorage.getItem("dashboardUser");

  if (!dashboardUser) {
    // Not logged in, redirect to login page
    return <Navigate to="/dashboard-login" replace />;
  }

  // User is logged in, render the protected component
  return children;
};

export default ProtectedRoute;
