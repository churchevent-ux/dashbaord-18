import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaEdit, FaTrash } from "react-icons/fa";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { toPng } from "html-to-image";
import { QRCodeSVG } from "qrcode.react";
import { createRoot } from "react-dom/client";
import jsPDF from "jspdf";
import Logo from "../images/church logo2.png";

const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Capitalize first letter of each word
  const capitalizeName = (name) =>
    name
      ? name
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      : "";

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, "users"));
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setUsers(data);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
    fetchUsers();
  }, []);

  const handleEdit = (id) => alert(`Edit user with ID ${id}`);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteDoc(doc(db, "users", id));
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setSelectedUsers((prev) => prev.filter((uid) => uid !== id));
    } catch (err) {
      console.error("Error deleting user:", err);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedUsers.length) return alert("Please select at least one user to delete");
    if (!window.confirm(`Are you sure you want to delete ${selectedUsers.length} user(s)?`)) return;
    
    try {
      for (const userId of selectedUsers) {
        await deleteDoc(doc(db, "users", userId));
      }
      setUsers((prev) => prev.filter((u) => !selectedUsers.includes(u.id)));
      setSelectedUsers([]);
      alert(`Successfully deleted ${selectedUsers.length} user(s)`);
    } catch (err) {
      console.error("Error deleting users:", err);
      alert("Failed to delete some users");
    }
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  const toggleSelectUser = (id) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };

  const getMedicalText = (user) => {
    if (!user.medicalConditions?.length) return null;
    const conditions = user.medicalConditions.join(", ");
    return user.medicalNotes ? `${conditions} (${user.medicalNotes})` : conditions;
  };

  const filteredUsers = users.filter((user) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "online" && user.inSession) ||
      (filter === "offline" && !user.inSession);
    
    const matchesCategory =
      categoryFilter === "all" ||
      (categoryFilter === "kids" && user.category === "Kids") ||
      (categoryFilter === "teen" && user.category === "Teen");
    
    const matchesSearch =
      user.participantName?.toLowerCase().includes(search.toLowerCase()) ||
      user.uniqueId?.toString().includes(search) ||
      user.studentId?.toString().includes(search);
    
    return matchesFilter && matchesCategory && matchesSearch;
  });

  const handleBulkPrint = async () => {
    const selected = users.filter((u) => selectedUsers.includes(u.id) && (u.uniqueId || u.studentId));
    if (!selected.length) return alert("Please select at least one user with a valid ID");

    try {
      const dataUrls = [];

      for (let user of selected) {
        const card = document.createElement("div");
        Object.assign(card.style, {
          width: "7.4cm",
          height: "10.5cm",
          padding: "8px",
          border: "2px solid #6c3483",
          borderRadius: "8px",
          textAlign: "center",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        });

        const displayId = user.uniqueId || user.studentId || user.id;

        card.innerHTML = `
          <div>
            <img src="${Logo}" alt="Logo" style="max-width:50px;margin-bottom:2px"/>
            <h3 style="margin:2px 0;font-size:12px;color:#2c3e50;font-weight:bold">Deo Gratias 2025</h3>
            <p style="margin:1px 0;font-size:9px;color:#555">Teens & Kids Retreat</p>
            <p style="margin:1px 0;font-size:8px;color:#777">(Dec 28 – 30) | St. Mary's Church, Dubai</p>
            <p style="margin:1px 0;font-size:8px;color:#777">P.O. BOX: 51200, Dubai, U.A.E</p>
          </div>
          <div>
            <h2 style="margin:4px 0;font-size:14px;color:#6c3483;font-weight:bold">${capitalizeName(user.participantName || user.name)}</h2>
            <p style="margin:3px 0;font-size:9px;color:#555">Category: ${user.category || "N/A"} | Medical: ${user.medicalConditions?.length > 0 ? user.medicalConditions.join(", ") : "None"}</p>
          </div>
          <div style="display:flex;flex-direction:column;align-items:center">
            <div id="qr-${user.id}"></div>
            <p style="margin:4px 0;font-weight:bold;font-size:11px">${displayId}</p>
          </div>
        `;

        document.body.appendChild(card);

        // Render QR Code using React 18 createRoot
        const qrDiv = card.querySelector(`#qr-${user.id}`);
        if (qrDiv) {
          const root = createRoot(qrDiv);
          root.render(<QRCodeSVG value={displayId} size={150} />);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
        const dataUrl = await toPng(card);
        dataUrls.push(dataUrl);
        document.body.removeChild(card);
      }

      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
        <html>
          <head>
            <title>Print ID Cards</title>
            <style>
              @page { size: A4; margin: 15mm; }
              @media print {
                body { margin: 0; padding: 0; }
                .card-container { 
                  display: flex; 
                  flex-wrap: wrap; 
                  gap: 10mm;
                  justify-content: flex-start;
                }
                img.id-card { 
                  width: 7.4cm; 
                  height: 10.5cm;
                  page-break-inside: avoid;
                }
              }
              body { 
                margin: 15mm;
                padding: 0;
              }
              .card-container {
                display: flex;
                flex-wrap: wrap;
                gap: 10mm;
                justify-content: flex-start;
              }
              img.id-card {
                width: 7.4cm;
                height: 10.5cm;
              }
            </style>
          </head>
          <body>
            <div class="card-container">
              ${dataUrls.map((url) => `<img src="${url}" class="id-card"/>`).join("")}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    } catch (err) {
      console.error("Error generating bulk print:", err);
    }
  };

  const handleBulkDownload = async () => {
    const selected = users.filter((u) => selectedUsers.includes(u.id) && (u.uniqueId || u.studentId));
    if (!selected.length) return alert("Please select at least one user with a valid ID");

    alert(`Generating PDF for ${selected.length} ID cards. Please wait...`);

    try {
      const dataUrls = [];

      for (let user of selected) {
        const card = document.createElement("div");
        Object.assign(card.style, {
          width: "7.4cm",
          height: "10.5cm",
          padding: "8px",
          border: "2px solid #6c3483",
          borderRadius: "8px",
          textAlign: "center",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        });

        const displayId = user.uniqueId || user.studentId || user.id;

        card.innerHTML = `
          <div>
            <img src="${Logo}" alt="Logo" style="max-width:50px;margin-bottom:2px"/>
            <h3 style="margin:2px 0;font-size:12px;color:#2c3e50;font-weight:bold">Deo Gratias 2025</h3>
            <p style="margin:1px 0;font-size:9px;color:#555">Teens & Kids Retreat</p>
            <p style="margin:1px 0;font-size:8px;color:#777">(Dec 28 – 30) | St. Mary's Church, Dubai</p>
            <p style="margin:1px 0;font-size:8px;color:#777">P.O. BOX: 51200, Dubai, U.A.E</p>
          </div>
          <div>
            <h2 style="margin:4px 0;font-size:14px;color:#6c3483;font-weight:bold">${capitalizeName(user.participantName || user.name)}</h2>
            <p style="margin:3px 0;font-size:9px;color:#555">Category: ${user.category || "N/A"} | Medical: ${user.medicalConditions?.length > 0 ? user.medicalConditions.join(", ") : "None"}</p>
          </div>
          <div style="display:flex;flex-direction:column;align-items:center">
            <div id="qr-${user.id}"></div>
            <p style="margin:4px 0;font-weight:bold;font-size:11px">${displayId}</p>
          </div>
        `;

        document.body.appendChild(card);

        // Render QR Code using React 18 createRoot
        const qrDiv = card.querySelector(`#qr-${user.id}`);
        if (qrDiv) {
          const root = createRoot(qrDiv);
          root.render(<QRCodeSVG value={displayId} size={150} />);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
        const dataUrl = await toPng(card);
        dataUrls.push(dataUrl);
        document.body.removeChild(card);
      }

      // Create PDF with jsPDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const cardWidthMM = 74; // 7.4cm
      const cardHeightMM = 105; // 10.5cm
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 15;
      const gap = 10;

      let x = margin;
      let y = margin;
      let isFirstCard = true;

      for (let i = 0; i < dataUrls.length; i++) {
        // Check if we need a new page
        if (y + cardHeightMM > pageHeight - margin) {
          pdf.addPage();
          x = margin;
          y = margin;
          isFirstCard = true;
        }

        // Add the card image
        if (!isFirstCard) {
          // Check if we need to move to next row
          if (x + cardWidthMM > pageWidth - margin) {
            x = margin;
            y += cardHeightMM + gap;
            
            // Check again if we need a new page after moving to next row
            if (y + cardHeightMM > pageHeight - margin) {
              pdf.addPage();
              x = margin;
              y = margin;
            }
          }
        }

        pdf.addImage(dataUrls[i], "PNG", x, y, cardWidthMM, cardHeightMM);
        
        // Move to next position
        x += cardWidthMM + gap;
        isFirstCard = false;

        // If we've filled the width, move to next row
        if (x + cardWidthMM > pageWidth - margin) {
          x = margin;
          y += cardHeightMM + gap;
        }
      }

      // Download the PDF
      const filename = `ID_Cards_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      alert(`PDF downloaded successfully: ${filename}`);
    } catch (err) {
      console.error("Error generating bulk download:", err);
      alert(`Error generating PDF: ${err.message}`);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>👥 Registered Users</h2>

      <div style={styles.controls}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={styles.select}>
          <option value="all">All Status</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
        
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={styles.select}>
          <option value="all">All Categories</option>
          <option value="kids">Kids (DGK)</option>
          <option value="teen">Teen (DGT)</option>
        </select>
        
        <input
          type="text"
          placeholder="🔍 Search by name or ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        
        <button onClick={toggleSelectAll} style={styles.selectAllButton}>
          {selectedUsers.length === filteredUsers.length && filteredUsers.length > 0 ? "Deselect All" : "Select All"}
        </button>
      </div>

      {selectedUsers.length > 0 && (
        <div style={styles.bulkActions}>
          <button onClick={handleBulkPrint} style={{...styles.bulkButton, backgroundColor: "#6c3483"}}>
            🖨️ Print Selected ({selectedUsers.length})
          </button>
          <button onClick={handleBulkDownload} style={{...styles.bulkButton, backgroundColor: "#3498db"}}>
            📥 Download as PDF ({selectedUsers.length})
          </button>
          <button onClick={handleBulkDelete} style={{...styles.bulkButton, backgroundColor: "#e74c3c"}}>
            🗑️ Delete Selected ({selectedUsers.length})
          </button>
        </div>
      )}

      <div style={styles.cardsWrapper}>
        {filteredUsers.length ? (
          filteredUsers.map((user, index) => {
            return (
              <div key={user.id} style={styles.cardWrapper}>
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => toggleSelectUser(user.id)}
                  style={styles.checkbox}
                />

                <div
                  style={styles.card}
                  className="user-card"
                >
                  <div style={{ display: "flex", alignItems: "center", minWidth: 60 }}>
                    <span style={styles.index}>#{index + 1}</span>
                  </div>

                  <div style={{ flex: "0 0 150px" }}>
                    <h3
                      style={{
                        ...styles.name,
                        color: "#2980b9",
                        cursor: "pointer",
                        margin: 0,
                        fontSize: 16,
                      }}
                      onClick={() => navigate(`/admin/users/${user.id}`)}
                    >
                      {capitalizeName(user.participantName)}
                    </h3>
                  </div>

                  <div style={{ flex: "0 0 100px" }}>
                    <p style={{ ...styles.detail, margin: 0 }}>
                      <b>{user.uniqueId || user.studentId}</b>
                    </p>
                  </div>

                  <div style={{ flex: "0 0 70px" }}>
                    <span
                      style={{
                        ...styles.status,
                        backgroundColor: user.inSession ? "#27ae60" : "#7f8c8d",
                        padding: "3px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                      }}
                    >
                      {user.inSession ? "Online" : "Offline"}
                    </span>
                  </div>

                  <div style={{ flex: 1, minWidth: 180 }}>
                    <p style={{ ...styles.detail, margin: 0 }}>{user.email}</p>
                  </div>

                  <div style={{ flex: "0 0 130px" }}>
                    <p style={{ ...styles.detail, margin: 0 }}>{user.contactFatherMobile || user.primaryContactNumber}</p>
                  </div>

                  <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
                    <FaEdit style={styles.editIcon} onClick={() => handleEdit(user.id)} />
                    <FaTrash style={styles.deleteIcon} onClick={() => handleDelete(user.id)} />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={styles.noUsers}>No users found.</div>
        )}
      </div>
    </div>
  );
};

// ---------- Styles ----------
const styles = {
  container: { padding: 20, fontFamily: "'Arial', sans-serif", background: "#f9f9f9" },
  title: { marginBottom: 20, fontSize: 24, fontWeight: 700, color: "#2c3e50" },
  controls: { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" },
  select: { padding: 8, fontSize: 14, borderRadius: 6, border: "1px solid #ccc", minWidth: 140 },
  searchInput: { padding: 8, fontSize: 14, borderRadius: 6, border: "1px solid #ccc", flex: 1, minWidth: 200 },
  selectAllButton: { padding: "8px 16px", backgroundColor: "#3498db", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 },
  bulkActions: { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" },
  bulkButton: { padding: "8px 16px", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 },
  cardsWrapper: { display: "flex", flexDirection: "column", gap: 12 },
  cardWrapper: { position: "relative", paddingLeft: 28 },
  checkbox: { position: "absolute", top: 20, left: 0, width: 18, height: 18, cursor: "pointer" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    border: "1px solid #e0e0e0",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 20,
  },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  index: { fontSize: 14, fontWeight: 600, color: "#7f8c8d" },
  status: { fontSize: 12, fontWeight: 600, color: "#fff", padding: "4px 10px", borderRadius: 20, textTransform: "uppercase" },
  name: { fontSize: 20, fontWeight: 700, margin: "8px 0" },
  detail: { fontSize: 14, margin: "4px 0", color: "#555" },
  healthBadge: { marginTop: 8, padding: "6px 10px", backgroundColor: "#e74c3c", color: "#fff", borderRadius: 6, fontSize: 14, fontWeight: 600 },
  actions: { display: "flex", gap: 12, marginTop: 12 },
  editIcon: { color: "#27ae60", cursor: "pointer", fontSize: 18 },
  deleteIcon: { color: "#c0392b", cursor: "pointer", fontSize: 18 },
  noUsers: { textAlign: "center", padding: 20, color: "#7f8c8d" },
};

export default Users;
