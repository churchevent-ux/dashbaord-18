import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { QRCodeCanvas } from "qrcode.react";
import { toPng } from "html-to-image";
import { db } from "../firebase";
import Logo from "../images/church logo2.png";

const VolunteerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [volunteer, setVolunteer] = useState(null);
  const cardRef = useRef();
  const buttonRef = useRef();

  useEffect(() => {
    const fetchVolunteer = async () => {
      try {
        const volunteerDoc = await getDoc(doc(db, "volunteers", id));
        if (volunteerDoc.exists()) {
          setVolunteer({ id: volunteerDoc.id, ...volunteerDoc.data() });
        } else {
          setVolunteer(null);
        }
      } catch (err) {
        console.error("Error fetching volunteer:", err);
      }
    };
    fetchVolunteer();
  }, [id]);

  if (!volunteer) return <div style={styles.notFound}>Volunteer not found</div>;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    if (buttonRef.current) buttonRef.current.style.display = "none";
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, backgroundColor: "#fff" });
      const fileName = (volunteer.fullName || "volunteer")
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_]/g, "");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${fileName}_ID.png`;
      link.click();
    } catch (err) {
      console.error("Error generating ID image:", err);
    } finally {
      if (buttonRef.current) buttonRef.current.style.display = "inline-block";
    }
  };

  const handlePrint = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, backgroundColor: "#fff" });
      
      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Volunteer ID Card</title>
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

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.backButton}>
        ← Back
      </button>

      <h2 style={styles.heading}>Volunteer Details</h2>

      <div style={styles.contentWrapper}>
        {/* Volunteer Info Table */}
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <tbody>
              <tr>
                <td style={styles.tableLabel}>Full Name</td>
                <td style={styles.tableValue}>{volunteer.fullName}</td>
              </tr>
              <tr>
                <td style={styles.tableLabel}>Volunteer ID</td>
                <td style={styles.tableValue}>{volunteer.volunteerId || "-"}</td>
              </tr>
              <tr>
                <td style={styles.tableLabel}>Date of Birth</td>
                <td style={styles.tableValue}>{volunteer.dob || "-"}</td>
              </tr>
              <tr>
                <td style={styles.tableLabel}>Age</td>
                <td style={styles.tableValue}>{volunteer.age || "-"}</td>
              </tr>
              <tr>
                <td style={styles.tableLabel}>Email</td>
                <td style={styles.tableValue}>{volunteer.email || "-"}</td>
              </tr>
              <tr>
                <td style={styles.tableLabel}>Phone</td>
                <td style={styles.tableValue}>{volunteer.phone || "-"}</td>
              </tr>
              <tr>
                <td style={styles.tableLabel}>Preferred Role</td>
                <td style={styles.tableValue}>{volunteer.preferredRole || "-"}</td>
              </tr>
              <tr>
                <td style={styles.tableLabel}>Preferred Location</td>
                <td style={styles.tableValue}>{volunteer.preferredLocation || "-"}</td>
              </tr>
              <tr>
                <td style={styles.tableLabel}>T-Shirt Size</td>
                <td style={styles.tableValue}>{volunteer.tshirtSize || "-"}</td>
              </tr>
              <tr>
                <td style={styles.tableLabel}>Emergency Contact</td>
                <td style={styles.tableValue}>
                  {volunteer.emergencyName || "-"}<br />
                  {volunteer.emergencyPhone || "-"}
                </td>
              </tr>
              <tr>
                <td style={styles.tableLabel}>Available Dates</td>
                <td style={styles.tableValue}>
                  {volunteer.availableDates?.length > 0 
                    ? volunteer.availableDates.join(", ") 
                    : "-"}
                </td>
              </tr>
              <tr>
                <td style={styles.tableLabel}>Signature</td>
                <td style={styles.tableValue}>{volunteer.signature || "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ID Card */}
        <div style={styles.cardWrapper}>
          <h3 style={styles.cardHeading}>Volunteer ID Card</h3>
          <div ref={cardRef} style={styles.card}>
            <div style={styles.logoSection}>
              <img src={Logo} alt="Logo" style={styles.logo} />
              <h3 style={styles.organization}>Deo Gratias 2025</h3>
              <p style={styles.subText}>Teens & Kids Retreat</p>
              <p style={styles.subTextSmall}>(Dec 28 – 30) | St. Mary's Church, Dubai</p>
              <p style={styles.subTextSmall}>P.O. BOX: 51200, Dubai, U.A.E</p>
            </div>

            <h2 style={styles.name}>
              {(volunteer.fullName || "").toUpperCase()}
            </h2>
            <p style={styles.idText}>{volunteer.volunteerId || "VOL-000"}</p>
            <p style={styles.roleLine}>
              Role: {volunteer.preferredRole || "Volunteer"}
            </p>

            <div style={styles.qrWrapper}>
              <QRCodeCanvas 
                value={volunteer.volunteerId || volunteer.id} 
                size={180}
                fgColor="#6c3483"
              />
            </div>
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

// Styles
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
  tableLabel: { border: "1px solid #ccc", padding: "8px 12px", fontWeight: "bold", background: "#f9f9f9", width: "40%" },
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
    justifyContent: "flex-start",
    alignItems: "center",
  },
  logoSection: { marginBottom: 4 },
  logo: { maxWidth: 50, marginBottom: 2 },
  organization: { margin: "0", fontSize: 13, color: "#2c3e50", fontWeight: "bold" },
  subText: { margin: "1px 0", fontSize: 9.5, color: "#555" },
  subTextSmall: { margin: "1px 0", fontSize: 8.5, color: "#777" },
  name: { margin: "8px 0 1px 0", fontSize: 13.5, color: "#6c3483", fontWeight: "bold" },
  roleLine: { margin: "1px 0", fontSize: 8, color: "#555", fontWeight: "500" },
  idText: { margin: "1px 0", fontWeight: "bold", fontSize: 10.5, color: "#2c3e50" },
  qrWrapper: { marginTop: 4, flex: 1, display: "flex", justifyContent: "center", alignItems: "center" },
  buttonWrapper: { marginTop: 20, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" },
  downloadBtn: { padding: "10px 20px", background: "#6c3483", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" },
  printBtn: { padding: "10px 20px", background: "#117864", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" },
};

export default VolunteerDetails;
