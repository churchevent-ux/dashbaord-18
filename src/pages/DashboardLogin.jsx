import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, googleProvider, db } from "../firebase";
import Logo from "../images/church logo2.png";

const DashboardLogin = () => {
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Email/Phone Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Temporary admin bypass - Remove this in production!
      if (emailOrPhone === "admin" && password === "admin123") {
        localStorage.setItem("dashboardUser", JSON.stringify({
          id: "temp-admin",
          emailOrPhone: "admin",
          role: "Admin",
          permissions: ["dashboard", "users", "attendance", "break", "teams", "notifications", "settings", "messages", "history"],
        }));
        navigate("/admin/dashboard");
        return;
      }

      // Check if user exists in dashboardUsers collection
      const q = query(
        collection(db, "dashboardUsers"),
        where("emailOrPhone", "==", emailOrPhone),
        where("password", "==", password)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("Invalid credentials. Please contact admin.");
        setLoading(false);
        return;
      }

      // Get user data
      const userData = querySnapshot.docs[0].data();
      
      // Store user session
      localStorage.setItem("dashboardUser", JSON.stringify({
        id: querySnapshot.docs[0].id,
        ...userData,
      }));

      // Navigate to dashboard
      navigate("/admin/dashboard");
    } catch (err) {
      console.error(err);
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user exists in dashboardUsers with this Google account
      const q = query(
        collection(db, "dashboardUsers"),
        where("googleEmail", "==", user.email)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("Your Google account is not authorized. Please contact admin.");
        setLoading(false);
        return;
      }

      // Get user data
      const userData = querySnapshot.docs[0].data();

      // Store user session
      localStorage.setItem("dashboardUser", JSON.stringify({
        id: querySnapshot.docs[0].id,
        ...userData,
      }));

      // Navigate to dashboard
      navigate("/admin/dashboard");
    } catch (err) {
      console.error("Google Sign-In Error:", err);
      let errorMessage = "Google sign-in failed. ";
      
      if (err.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign-in popup was closed. Please try again.";
      } else if (err.code === "auth/popup-blocked") {
        errorMessage = "Sign-in popup was blocked by browser. Please allow popups.";
      } else if (err.code === "auth/unauthorized-domain") {
        errorMessage = "This domain is not authorized. Please contact admin to add this domain in Firebase Console.";
      } else if (err.code === "auth/operation-not-allowed") {
        errorMessage = "Google Sign-In is not enabled. Please contact admin to enable it in Firebase Console.";
      } else {
        errorMessage += err.message || "Please try again.";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginCard}>
        <div style={styles.logoSection}>
          <img src={Logo} alt="Logo" style={styles.logo} />
          <h2 style={styles.title}>Dashboard Login</h2>
          <p style={styles.subtitle}>Deo Gratias 2025 - Admin Portal</p>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email or Phone</label>
            <input
              type="text"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              style={styles.input}
              placeholder="Enter your email or phone"
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            style={{...styles.button, ...styles.loginButton}}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerText}>OR</span>
        </div>

        <button
          onClick={handleGoogleSignIn}
          style={{...styles.button, ...styles.googleButton}}
          disabled={loading}
        >
          <span style={styles.googleIcon}>🔐</span>
          Sign in with Google
        </button>

        <p style={styles.footer}>
          Don't have access? Contact your administrator.<br />
          <small style={{ color: "#95a5a6", marginTop: 8, display: "block" }}>
            Temporary access: Email: <strong>admin</strong> | Password: <strong>admin123</strong>
          </small>
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    fontFamily: "Arial, sans-serif",
    padding: 20,
  },
  loginCard: {
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
    padding: 40,
    width: "100%",
    maxWidth: 420,
  },
  logoSection: {
    textAlign: "center",
    marginBottom: 30,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 15,
  },
  title: {
    margin: 0,
    color: "#2c3e50",
    fontSize: 28,
    fontWeight: "bold",
  },
  subtitle: {
    margin: "8px 0 0 0",
    color: "#7f8c8d",
    fontSize: 14,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
  },
  input: {
    padding: 12,
    border: "2px solid #e0e0e0",
    borderRadius: 8,
    fontSize: 16,
    transition: "border-color 0.3s",
    outline: "none",
  },
  button: {
    padding: "14px 24px",
    borderRadius: 8,
    border: "none",
    fontSize: 16,
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loginButton: {
    background: "#6c3483",
    color: "#fff",
  },
  googleButton: {
    background: "#db4437",
    color: "#fff",
  },
  error: {
    padding: 12,
    background: "#ffe5e5",
    color: "#c0392b",
    borderRadius: 8,
    fontSize: 14,
    textAlign: "center",
  },
  divider: {
    position: "relative",
    textAlign: "center",
    margin: "30px 0",
  },
  dividerText: {
    background: "#fff",
    padding: "0 15px",
    color: "#7f8c8d",
    fontSize: 14,
    position: "relative",
    zIndex: 1,
  },
  googleIcon: {
    fontSize: 20,
  },
  footer: {
    textAlign: "center",
    marginTop: 25,
    color: "#7f8c8d",
    fontSize: 13,
  },
};

export default DashboardLogin;
