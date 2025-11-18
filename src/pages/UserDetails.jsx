import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { QRCodeCanvas } from "qrcode.react";
import { toPng } from "html-to-image";
import { db } from "../firebase";
import Logo from "../images/church logo2.png";

const UserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isEditingId, setIsEditingId] = useState(false);
  const [editedId, setEditedId] = useState("");
  const cardRef = useRef();
  const buttonRef = useRef();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", id));
        if (userDoc.exists()) {
          setUser({ id: userDoc.id, ...userDoc.data() });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };
    fetchUser();
  }, [id]);

  if (!user) return <div style={styles.notFound}>User not found</div>;

  const getMedicalText = () => {
    if (!user.medicalConditions?.length) return "None";
    const conditions = user.medicalConditions.join(", ");
    return user.medicalNotes ? `${conditions} (${user.medicalNotes})` : conditions;
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    if (buttonRef.current) buttonRef.current.style.display = "none";
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, backgroundColor: "#fff" });
      const fileName = (user.participantName || user.name || "user")
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_]/g, "");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${fileName}_ID.png`;
      link.click();

      const userDocRef = doc(db, "users", id);
      await updateDoc(userDocRef, { idGenerated: true, idGeneratedAt: new Date() });
    } catch (err) {
      console.error("Error generating ID image:", err);
    } finally {
      if (buttonRef.current) buttonRef.current.style.display = "inline-block";
    }
  };

  const handlePrint = async () => {
    if (!cardRef.current) return;
    try {
      // Convert card to image to preserve QR code
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, backgroundColor: "#fff" });
      
      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
        <html>
          <head>
            <title>Print ID Card</title>
            <style>
              @page { size: A4; margin: 20mm; }
              @media print {
                body { margin: 0; padding: 20mm; }
                img.id-card { 
                  width: 7.4cm; 
                  height: 10.5cm; 
                  page-break-after: auto;
                }
              }
              body { 
                margin: 0; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                min-height: 100vh; 
                background: #f5f5f5;
              }
              img.id-card {
                width: 7.4cm;
                height: 10.5cm;
                border: 2px solid #6c3483;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" class="id-card" />
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    } catch (err) {
      console.error("Error generating print:", err);
    }
  };

  const handleEditId = () => {
    setIsEditingId(true);
    setEditedId(user.uniqueId || user.studentId || user.id);
  };

  const handleSaveId = async () => {
    if (!editedId.trim()) {
      alert("ID cannot be empty");
      return;
    }
    
    try {
      const userDocRef = doc(db, "users", id);
      await updateDoc(userDocRef, { uniqueId: editedId.trim() });
      setUser({ ...user, uniqueId: editedId.trim() });
      setIsEditingId(false);
      alert("ID updated successfully!");
    } catch (err) {
      console.error("Error updating ID:", err);
      alert("Error updating ID: " + err.message);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingId(false);
    setEditedId("");
  };

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.backButton}>
        ← Back
      </button>

      <h2 style={styles.heading}>User Details</h2>

      <div style={styles.contentWrapper}>
        {/* User Info Table */}
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <tbody>
              <tr>
                <td style={styles.tableLabel}>Name</td>
                <td style={styles.tableValue}>{user.participantName || user.name}</td>
              </tr>
              <tr>
                <td style={styles.tableLabel}>ID</td>
                <td style={styles.tableValue}>
                  {isEditingId ? (
                    <div style={{display: "flex", gap: "8px", alignItems: "center"}}>
                      <input
                        type="text"
                        value={editedId}
                        onChange={(e) => setEditedId(e.target.value)}
                        style={{padding: "4px 8px", border: "1px solid #ccc", borderRadius: "4px", flex: 1}}
                      />
                      <button onClick={handleSaveId} style={{...styles.editButton, backgroundColor: "#28a745", color: "#fff"}}>
                        Save
                      </button>
                      <button onClick={handleCancelEdit} style={{...styles.editButton, backgroundColor: "#6c757d", color: "#fff"}}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{display: "flex", gap: "8px", alignItems: "center", justifyContent: "space-between"}}>
                      <span>{user.uniqueId || user.studentId || user.id}</span>
                      <button onClick={handleEditId} style={styles.editButton}>
                        ✏️ Edit
                      </button>
                    </div>
                  )}
                </td>
              </tr>
              <tr>
                <td style={styles.tableLabel}>Date of Birth</td>
                <td style={styles.tableValue}>{user.dob || "-"}</td>
              </tr>
              <tr>
                <td style={styles.tableLabel}>Age</td>
                <td style={styles.tableValue}>{user.age || "-"}</td>
              </tr>
              <tr>
                <td style={styles.tableLabel}>Category</td>
                <td style={styles.tableValue}>{user.category || "-"}</td>
              </tr>
              <tr>
                <td style={styles.tableLabel}>Primary Contact</td>
                <td style={styles.tableValue}>{user.primaryContactNumber || user.contactFatherMobile || "-"} ({user.primaryContactRelation || "Parent"})</td>
              </tr>
              <tr>
                <td style={styles.tableLabel}>Secondary Contact</td>
                <td style={styles.tableValue}>
                  {user.secondaryContactNumber || "-"} 
                  {user.secondaryContactRelationship ? ` (${user.secondaryContactRelationship})` : ""}
                </td>
              </tr>
              <tr>
                <td style={styles.tableLabel}>Email</td>
                <td style={styles.tableValue}>{user.email || "-"}</td>
              </tr>
              <tr>
                <td style={styles.tableLabel}>Residence</td>
                <td style={styles.tableValue}>{user.residence || user.address || "-"}</td>
              </tr>
              <tr>
                <td style={styles.tableLabel}>Medical Conditions</td>
                <td style={styles.tableValue}>
                  {user.medicalConditions?.length > 0 ? user.medicalConditions.join(", ") : "None"}
                </td>
              </tr>
              <tr>
                <td style={styles.tableLabel}>Medical Notes</td>
                <td style={styles.tableValue}>{user.medicalNotes || "-"}</td>
              </tr>
              <tr>
                <td style={styles.tableLabel}>Parent Signature</td>
                <td style={styles.tableValue}>{user.parentSignature || "-"}</td>
              </tr>
              <tr>
                <td style={styles.tableLabel}>Registration Fee</td>
                <td style={styles.tableValue}>AED 100/-</td>
              </tr>
              <tr>
                <td style={styles.tableLabel}>Fee Status</td>
                <td style={styles.tableValue}>{user.feeStatus || "pending"}</td>
              </tr>
              <tr>
                <td style={styles.tableLabel}>Status</td>
                <td style={styles.tableValue}>{user.inSession ? "Online" : "Offline"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ID Card */}
        <div style={styles.cardWrapper}>
          <h3 style={styles.cardHeading}>User ID Card</h3>
          <div ref={cardRef} style={styles.card}>
            <div style={styles.logoSection}>
              <img src={Logo} alt="Logo" style={styles.logo} />
              <h3 style={styles.organization}>Deo Gratias 2025</h3>
              <p style={styles.subText}>Teens & Kids Retreat</p>
              <p style={styles.subTextSmall}>(Dec 28 – 30) | St. Mary's Church, Dubai</p>
              <p style={styles.subTextSmall}>P.O. BOX: 51200, Dubai, U.A.E</p>
            </div>

            <h2 style={styles.name}>
              {(user.participantName || user.name || "").toUpperCase()}
            </h2>
            <p style={styles.categoryLine}>
              Category: {user.category || "N/A"} | Medical: {user.medicalConditions?.length > 0 ? user.medicalConditions.join(", ") : "None"}
            </p>

            <div style={styles.qrWrapper}>
              <QRCodeCanvas value={user.uniqueId || user.studentId || user.id} size={150} />
            </div>
            <p style={styles.idText}>{user.uniqueId || user.studentId || user.id}</p>
          </div>

          <div style={styles.buttonWrapper}>
            <button ref={buttonRef} onClick={handleDownload} style={styles.downloadBtn}>
              Download ID
            </button>
            <button onClick={handlePrint} style={styles.printBtn}>
              Print ID
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------- Responsive Styles ----------
const styles = {
  container: { padding: 20, fontFamily: "Arial, sans-serif" },
  notFound: { padding: 20 },
  backButton: {
    marginBottom: 20,
    padding: "8px 16px",
    border: "1px solid #6c3483",
    borderRadius: 6,
    background: "#f5f5f5",
    cursor: "pointer",
  },
  heading: { marginBottom: 20 },
  contentWrapper: {
    display: "flex",
    flexWrap: "wrap",
    gap: 20,
    justifyContent: "center",
  },
  tableContainer: {
    flex: "1 1 300px",
    maxWidth: 400,
    minWidth: 250,
  },
  table: { width: "100%", borderCollapse: "collapse" },
  tableLabel: { border: "1px solid #ccc", padding: "8px 12px", fontWeight: "bold", background: "#f9f9f9", width: "35%" },
  tableValue: { border: "1px solid #ccc", padding: "8px 12px" },
  cardWrapper: { flex: "1 1 320px", maxWidth: 360, minWidth: 280, textAlign: "center" },
  cardHeading: { marginBottom: 15 },
  card: {
    width: "7.4cm",
    height: "10.5cm",
    padding: "8px",
    border: "2px solid #6c3483",
    borderRadius: 8,
    textAlign: "center",
    background: "#fff",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  logoSection: { marginBottom: 4 },
  logo: { maxWidth: 50, marginBottom: 2 },
  organization: { margin: "2px 0", fontSize: 12, color: "#2c3e50", fontWeight: "bold" },
  subText: { margin: "1px 0", fontSize: 9, color: "#555" },
  subTextSmall: { margin: "1px 0", fontSize: 8, color: "#777" },
  name: { margin: "4px 0", fontSize: 14, color: "#6c3483", fontWeight: "bold" },
  categoryLine: { margin: "3px 0", fontSize: 9, color: "#555", fontWeight: "500" },
  idText: { margin: "4px 0", fontWeight: "bold", fontSize: 11 },
  qrWrapper: { marginTop: 5, display: "flex", justifyContent: "center" },
  addressText: { fontSize: 12, color: "#555", marginTop: 12 },
  buttonWrapper: { marginTop: 20, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" },
  downloadBtn: { padding: "10px 20px", background: "#6c3483", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" },
  printBtn: { padding: "10px 20px", background: "#117864", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" },
  editButton: { padding: "4px 12px", border: "1px solid #6c3483", borderRadius: 4, background: "#fff", color: "#6c3483", cursor: "pointer", fontSize: "12px" },
};

export default UserDetails;
