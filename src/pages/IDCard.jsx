import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toPng } from "html-to-image";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { FaDownload, FaWhatsapp } from "react-icons/fa";
import JsBarcode from "jsbarcode";
import Logo from "../images/church logo2.png";

const IDCard = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [participants, setParticipants] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef();
  const barcodeRefs = useRef({});


  // Helper: calculate age from DOB
  const calculateAge = React.useCallback((dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }, []);

  // Helper: get category code based on age or dob
  const getCategoryCode = React.useCallback((age, dob) => {
    if (!age && dob) age = calculateAge(dob);
    if (age >= 8 && age <= 12) return "DGK";
    if (age >= 13 && age <= 18) return "DGT";
    return "N/A";
  }, [calculateAge]);

  // Utility: capitalize names
  const capitalizeName = (name) =>
    name
      ? name
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ")
      : "";

  // Map participants & ensure category code
  useEffect(() => {
    if (!state?.formData) return navigate("/register");

    const allParticipants = [state.formData, ...(state.siblings || [])].map((p) => {
      const displayId = p.uniqueId || p.studentId || p.id;
      console.log("Participant ID:", displayId, "Data:", p); // Debug log
      return {
        ...p,
        displayId: displayId,
        category: p.category || p.categoryLabel || getCategoryCode(p.age, p.dob),
      };
    });

    setParticipants(allParticipants);
  }, [state, navigate, getCategoryCode]);

  // Generate barcode for each participant
  useEffect(() => {
    participants.forEach((p) => {
      const svgEl = barcodeRefs.current[p.displayId];
      if (svgEl) {
        JsBarcode(svgEl, p.displayId, {
          format: "CODE128",
          displayValue: true,
          height: 50,
          lineColor: "#4b0082",
        });
      }
    });
  }, [participants]);


  // Download ID card as PNG
  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${capitalizeName(participants[0].participantName)}_ID.png`;
      link.click();

      // Update Firestore with generated ID info
      for (let p of participants) {
        if (p.docId) {
          const ref = doc(db, "users", p.docId);
          await updateDoc(ref, {
            idGenerated: true,
            generatedId: p.displayId,
            generatedAt: new Date(),
          });
        }
      }
    } catch (err) {
      console.error("Download error:", err);
    }
    setDownloading(false);
  };

  // Share IDs on WhatsApp
  const handleShareWhatsApp = () => {
    const ids = participants.map((p) => `${capitalizeName(p.participantName)}: ${p.displayId}`).join("\n");
    const message = `My registration IDs for Deo Gratias 2025 Teens & Kids Retreat:\n${ids}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
  };

  if (!participants.length) return null;
  const main = participants[0];
  const siblings = participants.slice(1);

  return (
    <div style={styles.page}>
      <div ref={cardRef} style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <img src={Logo} alt="Logo" style={styles.logo} />
          <div style={styles.headerText}>
            <h1 style={styles.title}>Deo Gratias 2025</h1>
            <p style={styles.subtitle}>Teens & Kids Retreat</p>
            <p style={styles.date}>(Dec 28 – 30) | St. Mary’s Church, Dubai</p>
            <p style={styles.date}>P.O. BOX: 51200, Dubai, U.A.E</p>
          </div>
        </div>

        <hr style={styles.divider} />

        {/* Main Participant */}
        <div style={styles.participant}>
          <h2 style={styles.name}>{capitalizeName(main.participantName)}</h2>
          <p style={styles.siblingDetail}>
            Category: {main.category} | Medical: {main.medicalConditions || "N/A"}
          </p>
          <div style={{ textAlign: "center", margin: "10px 0" }}>
            <h2 style={{ fontSize: "28px", color: "#6c3483", margin: "5px 0" }}>{main.displayId}</h2>
          </div>
          <div style={styles.barcodeWrapper}>
            <svg ref={(el) => (barcodeRefs.current[main.displayId] = el)}></svg>
          </div>
        </div>

        {/* Siblings */}
        {siblings.length > 0 && (
          <div style={styles.siblingsCard}>
            <h3 style={styles.siblingTitle}>Siblings Registered</h3>
            {siblings.map((sib, idx) => (
              <div key={idx} style={styles.siblingItem}>
                <p style={styles.siblingName}>
                  👧 {capitalizeName(sib.participantName)} ({sib.age || "N/A"} yrs)
                </p>
                <div style={{ textAlign: "center", margin: "5px 0" }}>
                  <h3 style={{ fontSize: "22px", color: "#6c3483", margin: "5px 0" }}>
                    ID: {sib.displayId}
                  </h3>
                </div>
                <p style={styles.siblingDetail}>
                  Category: {sib.category} | Medical: {sib.medicalConditions || "N/A"}
                </p>
                {sib.displayId && (
                  <div style={styles.barcodeWrapper}>
                    <svg ref={(el) => (barcodeRefs.current[sib.displayId] = el)}></svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Schedule / Notes */}
        <div style={styles.scheduleCard}>
        <p style={{ fontSize: "12px", color: "#bf524b" }}>
          <span style={{ fontWeight: "bold" }}>Note:</span> Registration is confirmed only after the payment of AED 100/- each for an applicant.
        </p>
        <h3 style={styles.scheduleTitle}>Lanyard Distribution at Church Premises</h3>
        <div style={styles.scheduleList}>
      
          <div style={{ marginBottom: "1em" }}>
            <span style={{ color: "#6c3483", fontWeight: "bold" }}>First Batch</span>
            <ul style={{ margin: "0.5em 0 0 1em" }}>
              <li>Saturday, November 22, 2025: 9:30am–1:30pm & 4:00pm–7:30pm</li>
              <li>Sunday, November 23, 2025: 9:30am–1:30pm</li>
            </ul>
          </div>
          <div style={{ marginBottom: "1em" }}>
            <span style={{ color: "#6c3483", fontWeight: "bold" }}>Second Batch</span>
            <ul style={{ margin: "0.5em 0 0 1em" }}>
              <li>Saturday, December 13, 2025: 9:30am–1:30pm & 4:00pm–7:30pm</li>
              <li>Sunday, December 14, 2025: 9:30am–1:30pm & 4:00pm–7:30pm</li>
            </ul>
          </div>
          <div style={{ marginBottom: "1em" }}>
            <span style={{ color: "#6c3483", fontWeight: "bold" }}>Final Batch</span>
            <ul style={{ margin: "0.5em 0 0 1em" }}>
              <li>Saturday, December 27, 2025: 9:30am–1:30pm & 4:00pm–7:30pm</li>
            </ul>
         
          </div>
        </div>
      </div>
      </div>

      {/* Buttons */}
      <div style={styles.buttons}>
        <button onClick={handleDownload} style={styles.download}>
          <FaDownload /> {downloading ? "Downloading..." : "Download"}
        </button>
        <button onClick={handleShareWhatsApp} style={styles.share}>
          <FaWhatsapp /> Share on WhatsApp
        </button>
      </div>
    </div>
  );
};

// --- STYLES ---
const styles = {
  page: {
    fontFamily: "'Poppins', sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "#fff",
    minHeight: "80vh",
    padding: 20,
    gap: 20,
  },
  card: {
    width: "7.4cm",
    height: "10.5cm",
    borderRadius: 8,
    background: "#fff",
    padding: "8px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    justifyContent: "space-between",
  },
  header: { display: "flex", alignItems: "center", gap: 8 },
  logo: { width: 40, height: 40, borderRadius: "50%", border: "2px solid #6c3483" },
  headerText: { display: "flex", flexDirection: "column" },
  title: { margin: 0, fontSize: 14, color: "#6c3483", fontWeight: 700 },
  subtitle: { margin: 0, fontSize: 10, color: "#555", fontWeight: "bold" },
  date: { margin: 0, fontSize: 8, color: "#333" },
  divider: { border: "1px solid #e0d4ff", margin: "5px 0" },
  participant: { textAlign: "center", padding: "5px 0" },
  name: { fontSize: 14, color: "#4b0082", margin: 0, fontWeight: "bold" },
  id: { fontSize: 11, margin: 2, color: "#6c3483", fontWeight: 600 },
  siblingDetail: { fontSize: 9, color: "#555", marginTop: 2 },
  siblingsCard: { background: "#fdf0ff", borderRadius: 15, padding: 10, boxShadow: "0 8px 20px rgba(0,0,0,0.1)" },
  siblingTitle: { fontSize: 16, fontWeight: 700, color: "#6c3483", marginBottom: 8 },
  siblingItem: { background: "#fff", borderRadius: 8, padding: "8px 10px", marginBottom: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" },
  siblingName: { fontWeight: 600, color: "#4b0082", fontSize: 14, margin: 0 },
  scheduleCard: { background: "#fdf0ff", borderRadius: 15, padding: 8, boxShadow: "0 8px 20px rgba(0,0,0,0.1)" },
  scheduleTitle: { fontSize: 16, fontWeight: 700, color: "#6c3483", marginBottom: 8 },
  scheduleList: { fontSize: 12, lineHeight: 1.5, color: "#333" },
  barcodeWrapper: { marginTop: 10, display: "flex", justifyContent: "center" },
  buttons: { display: "flex", gap: 12, marginTop: 15, justifyContent: "center" },
  download: {
    background: "#6c3483",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 15px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontWeight: 600,
  },
  share: {
    background: "#25d366",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 15px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontWeight: 600,
  },
};

export default IDCard;