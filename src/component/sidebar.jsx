import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FaHandsHelping } from "react-icons/fa";


const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setIsOpen(!mobile); // Open by default on desktop
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const links = [
    { icon: "🏠", text: "Dashboard", path: "/admin/dashboard" },
    { icon: "👥", text: "Students", path: "/admin/users" },
    { icon: "💳", text: "Payment", path: "/admin/payment" },
    { icon: "📋", text: "Attendance", path: "/admin/attendance" },
    { icon: "☕", text: "Break", path: "/admin/break" },
    // { icon: "🎯", text: "Teams", path: "/admin/Teams" },
    { icon:<FaHandsHelping />,text: "Volunteers", path: "/admin/volunteers" },
    { icon: "🔔", text: "Notifications", path: "/admin/notifications" },
    { icon: "⚙️", text: "Settings", path: "/admin/settings" },
    { icon: "💳", text: "Payment History", path: "/admin/paymenthistory" },

    // { icon: "🗂️", text: "History", path: "/admin/history" },
  ];

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("dashboardUser");
      navigate("/dashboard-login");
    }
  };

  const sidebarStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: 200,
    height: "100vh",
    backgroundColor: "#ffffff",
    color: "#1e3a8a",
    display: "flex",
    flexDirection: "column",
    padding: "20px 10px",
    boxSizing: "border-box",
    transform: isMobile
      ? isOpen
        ? "translateX(0)"
        : "translateX(-100%)"
      : "translateX(0)",
    transition: "transform 0.3s ease",
    boxShadow: isOpen && isMobile ? "2px 0 12px rgba(0,0,0,0.1)" : "none",
    zIndex: 1000,
    borderRadius: isMobile ? "0 10px 10px 0" : 0,
  };

  const linkStyle = (isActive) => ({
    color: "#1e3a8a",
    textDecoration: "none",
    fontWeight: 500,
    padding: "8px 10px",
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    fontSize: 14,
    backgroundColor: isActive ? "#f0f4ff" : "transparent",
    borderRight: isActive ? "3px solid #1e3a8a" : "3px solid transparent",
    transition: "all 0.2s ease",
  });

  return (
    <>
      {/* Hamburger */}
      {isMobile && (
        <div
          onClick={() => setIsOpen(!isOpen)}
          style={{
            position: "fixed",
            top: 15,
            left: 15,
            fontSize: 24,
            cursor: "pointer",
            zIndex: 1100,
            background: "#fff",
            color: "#1e3a8a",
            padding: "6px 10px",
            borderRadius: 6,
            boxShadow: "0 3px 8px rgba(0,0,0,0.1)",
          }}
        >
          {isOpen ? "✖" : "☰"}
        </div>
      )}

      {/* Sidebar */}
      <aside style={sidebarStyle}>
        <h2
          style={{
            fontSize: 18,
            fontWeight: "bold",
            marginBottom: 30,
            textAlign: "center",
          }}
        >
          Dashboard
        </h2>

        <nav style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          {links.map((link) => (
            <NavLink
              key={link.text}
              to={link.path}
              onClick={() => isMobile && setIsOpen(false)}
              style={({ isActive }) => linkStyle(isActive)}
            >
              <span
                style={{
                  display: "inline-flex",
                  width: 20,
                  justifyContent: "center",
                  marginRight: 10,
                  fontSize: 16,
                }}
              >
                {link.icon}
              </span>
              <span>{link.text}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            marginTop: "auto",
            padding: "10px",
            backgroundColor: "#c0392b",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: "600",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <span>🚪</span> Logout
        </button>
      </aside>

      {/* Overlay */}
      {isMobile && isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.15)",
            zIndex: 900,
          }}
        />
      )}
    </>
  );
};

export default Sidebar;
