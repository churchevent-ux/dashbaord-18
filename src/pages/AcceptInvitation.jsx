import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, googleProvider, db } from "../firebase";
import Logo from "../images/church logo2.png";

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [invitationData, setInvitationData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get invitation data from URL parameters
    const email = searchParams.get("email");
    const role = searchParams.get("role");
    const permissions = searchParams.get("permissions");

    if (email && role) {
      setInvitationData({
        email: decodeURIComponent(email),
        role: decodeURIComponent(role),
        permissions: permissions ? JSON.parse(decodeURIComponent(permissions)) : [],
      });
    } else {
      setError("Invalid invitation link");
    }
  }, [searchParams]);

  const handleAcceptInvitation = async () => {
    if (!invitationData) return;

    setError("");
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Verify email matches invitation
      if (user.email.toLowerCase() !== invitationData.email.toLowerCase()) {
        setError(`Please sign in with the invited email: ${invitationData.email}`);
        setLoading(false);
        return;
      }

      // Check if user already exists
      const q = query(
        collection(db, "dashboardUsers"),
        where("googleEmail", "==", user.email)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // User already exists, just log them in
        const userData = querySnapshot.docs[0].data();
        localStorage.setItem("dashboardUser", JSON.stringify({
          id: querySnapshot.docs[0].id,
          ...userData,
        }));
        navigate("/admin/dashboard");
        return;
      }

      // Add new user to Firestore
      const docRef = await addDoc(collection(db, "dashboardUsers"), {
        googleEmail: user.email,
        googleUid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: invitationData.role,
        permissions: invitationData.permissions,
        authMethod: "google",
        createdAt: serverTimestamp(),
      });

      // Store user session
      localStorage.setItem("dashboardUser", JSON.stringify({
        id: docRef.id,
        googleEmail: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: invitationData.role,
        permissions: invitationData.permissions,
        authMethod: "google",
      }));

      // Navigate to dashboard
      navigate("/admin/dashboard");
    } catch (err) {
      console.error("Error accepting invitation:", err);
      setError("Failed to accept invitation: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!invitationData && !error) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>Loading invitation...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoSection}>
          <img src={Logo} alt="Logo" style={styles.logo} />
          <h2 style={styles.title}>Dashboard Invitation</h2>
        </div>

        {error ? (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>{error}</p>
          </div>
        ) : (
          <>
            <div style={styles.infoBox}>
              <h3 style={styles.infoTitle}>You've been invited!</h3>
              <div style={styles.infoItem}>
                <strong>Email:</strong> {invitationData?.email}
              </div>
              <div style={styles.infoItem}>
                <strong>Role:</strong> {invitationData?.role}
              </div>
              <div style={styles.infoItem}>
                <strong>Permissions:</strong>{" "}
                {invitationData?.permissions?.length > 0
                  ? invitationData.permissions.join(", ")
                  : "None"}
              </div>
            </div>

            <button
              onClick={handleAcceptInvitation}
              disabled={loading}
              style={styles.acceptButton}
            >
              {loading ? "Processing..." : "🔐 Accept & Sign In with Google"}
            </button>

            <p style={styles.note}>
              Click the button above to sign in with your Google account and accept the
              invitation.
            </p>
          </>
        )}
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
  card: {
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
    padding: 40,
    width: "100%",
    maxWidth: 500,
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
  infoBox: {
    background: "#f8f9fa",
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
  },
  infoTitle: {
    margin: "0 0 15px 0",
    color: "#2980b9",
    fontSize: 20,
  },
  infoItem: {
    marginBottom: 10,
    fontSize: 15,
    color: "#2c3e50",
  },
  acceptButton: {
    width: "100%",
    padding: "16px",
    borderRadius: 8,
    border: "none",
    background: "#db4437",
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s",
  },
  note: {
    marginTop: 20,
    textAlign: "center",
    color: "#7f8c8d",
    fontSize: 14,
  },
  errorBox: {
    background: "#ffe5e5",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  errorText: {
    margin: 0,
    color: "#c0392b",
    fontSize: 16,
  },
};

export default AcceptInvitation;
