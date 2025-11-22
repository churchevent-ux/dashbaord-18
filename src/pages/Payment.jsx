import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Html5QrcodeScanner } from "html5-qrcode";
import { sendPaymentEmail } from "../utils/email";

const Payment = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(100);
  const [showPopup, setShowPopup] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [scanner, setScanner] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers([]);
      return;
    }

    const filtered = users.filter((user) => {
      const search = searchTerm.toLowerCase();
      return (
        user.participantName?.toLowerCase().includes(search) ||
        user.name?.toLowerCase().includes(search) ||
        user.uniqueId?.toLowerCase().includes(search) ||
        user.studentId?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search) ||
        user.contactFatherMobile?.includes(search) ||
        user.residence?.toLowerCase().includes(search) ||
        user.address?.toLowerCase().includes(search)
      );
    });

    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const userList = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setUsers(userList);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const startScanner = () => {
    setScannerActive(true);
    setTimeout(() => {
      const scannerElement = document.getElementById("qr-reader");
      if (!scannerElement) {
        console.error("QR reader element not found");
        setScannerActive(false);
        return;
      }
      const html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      html5QrcodeScanner.render(onScanSuccess, onScanFailure);
      setScanner(html5QrcodeScanner);
    }, 100);
  };

  const stopScanner = () => {
    if (scanner) {
      scanner.clear();
      setScanner(null);
    }
    setScannerActive(false);
  };

  const onScanSuccess = (decodedText) => {
    setSearchTerm(decodedText);
    stopScanner();
    const foundUser = users.find(
      (u) => u.uniqueId === decodedText || u.studentId === decodedText || u.id === decodedText
    );
    if (foundUser) {
      handleUserSelect(foundUser);
    }
  };

  const onScanFailure = (error) => {};

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setPaymentAmount(100);
    setShowPopup(true);
  };

  const handlePayment = async () => {
    if (!selectedUser) return;
    try {
      const userDocRef = doc(db, "users", selectedUser.id);
      await updateDoc(userDocRef, {
        feeStatus: "paid",
        feePaidAmount: paymentAmount,
        feePaidAt: new Date(),
      });
      // Send payment confirmation email
      if (selectedUser.email) {
        sendPaymentEmail({
          toEmail: selectedUser.email,
          toName: selectedUser.participantName || selectedUser.name,
          amount: paymentAmount,
          receipt_id: selectedUser.uniqueId || selectedUser.studentId || selectedUser.id,
          date: new Date().toLocaleString(),
        })
          .then(() => {
            alert(`Payment of AED ${paymentAmount}/- recorded and email sent to ${selectedUser.email}!`);
          })
          .catch((err) => {
            alert(`Payment recorded, but email failed: ${err.text || err.message}`);
          });
      } else {
        alert(`Payment of AED ${paymentAmount}/- recorded successfully for ${selectedUser.participantName || selectedUser.name}! (No email address)`);
      }
      setUsers(users.map(u =>
        u.id === selectedUser.id
          ? { ...u, feeStatus: "paid", feePaidAmount: paymentAmount }
          : u
      ));
      setShowPopup(false);
      setSelectedUser(null);
      setSearchTerm("");
      setFilteredUsers([]);
    } catch (err) {
      console.error("Error recording payment:", err);
      alert("Error recording payment: " + err.message);
    }
  };

  const closePopup = () => {
    setShowPopup(false);
    setSelectedUser(null);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>💳 Payment Portal</h2>

      <div style={styles.searchSection}>
      <div style={styles.searchBox} className="search-box">
      <input
            type="text"
            placeholder="🔍 Search by Name, ID, Email, Phone, or Address"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          {!scannerActive ? (
            <button onClick={startScanner} style={styles.scanButton}>
              📷 Scan QR/Barcode
            </button>
          ) : (
            <button onClick={stopScanner} style={{ ...styles.scanButton, backgroundColor: "#e74c3c" }}>
              ❌ Stop Scanner
            </button>
          )}
        </div>

        {scannerActive && (
          <div style={styles.scannerContainer}>
            <div id="qr-reader" style={styles.qrReader}></div>
          </div>
        )}

        {filteredUsers.length > 0 && (
          <div style={styles.resultsList}>
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                style={styles.userCard}
                onClick={() => handleUserSelect(user)}
              >
                <div style={styles.userInfo}>
                  <h3 style={styles.userName}>{user.participantName || user.name}</h3>
                  <p style={styles.userId}>ID: {user.uniqueId || user.studentId || user.id}</p>
                  <p style={styles.userDetail}>
                    📧 {user.email} | 📞 {user.contactFatherMobile || user.phone}
                  </p>
                  <p style={styles.userDetail}>📍 {user.residence || user.address}</p>
                </div>
                <div style={styles.feeStatus}>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: user.feeStatus === "paid" ? "#28a745" : "#ffc107"
                  }}>
                    {user.feeStatus === "paid" ? "Paid" : "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPopup && selectedUser && (
        <div style={styles.overlay} onClick={closePopup}>
          <div style={styles.popup} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.popupTitle}>💳 Record Payment</h3>
            <div style={styles.popupContent}>
              <div style={styles.popupUserInfo}>
                <div style={styles.infoRow}>
                  <strong style={styles.infoLabel}>Name:</strong>
                  <span style={styles.infoValue}>{selectedUser.participantName || selectedUser.name}</span>
                </div>
                <div style={styles.infoRow}>
                  <strong style={styles.infoLabel}>ID:</strong>
                  <span style={styles.infoValue}>{selectedUser.uniqueId || selectedUser.studentId || selectedUser.id}</span>
                </div>
                <div style={styles.infoRow}>
                  <strong style={styles.infoLabel}>Email:</strong>
                  <span style={styles.infoValue}>{selectedUser.email}</span>
                </div>
                <div style={styles.infoRow}>
                  <strong style={styles.infoLabel}>Phone:</strong>
                  <span style={styles.infoValue}>{selectedUser.primaryContactNumber || selectedUser.contactFatherMobile || selectedUser.phone}</span>
                </div>
                <div style={styles.infoRow}>
                  <strong style={styles.infoLabel}>Current Status:</strong>
                  <span style={{
                    padding: "4px 12px",
                    borderRadius: "12px",
                    backgroundColor: selectedUser.feeStatus === "paid" ? "#28a745" : "#ffc107",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: "bold"
                  }}>
                    {selectedUser.feeStatus === "paid" ? "Paid" : "Pending"}
                  </span>
                </div>
              </div>
              <div style={styles.amountSection}>
                <label style={styles.label}>Payment Amount (AED)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  style={styles.amountInput}
                />
              </div>
              <div style={styles.popupButtons}>
                <button onClick={handlePayment} style={styles.payButton}>
                  ✅ Confirm Payment
                </button>
                <button onClick={closePopup} style={styles.cancelButton}>
                  ❌ Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
const styles = {
  container: {
    padding: 20,
    fontFamily: "Arial, sans-serif",
    maxWidth: 1200,
    margin: "0 auto",
  },

  /* ---------- TITLE ---------- */
  title: {
    fontSize: 28,
    marginBottom: 30,
    color: "#2c3e50",
    textAlign: "center",
    fontWeight: "bold",
  },

  /* ---------- SEARCH SECTION ---------- */
  searchSection: {
    marginBottom: 20,
  },

  searchBox: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
    flexWrap: "wrap",              // makes it responsive
  },

  searchInput: {
    flex: "1 1 300px",
    padding: "12px 20px",
    fontSize: 16,
    border: "2px solid #6c3483",
    borderRadius: 8,
    outline: "none",
    boxSizing: "border-box",
  },

  scanButton: {
    padding: "12px 24px",
    backgroundColor: "#6c3483",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 16,
    fontWeight: "bold",
    whiteSpace: "nowrap",
    flex: "0 0 auto",
  },

  /* ---------- QR SCANNER ---------- */
  scannerContainer: {
    marginBottom: 20,
    padding: 20,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    border: "2px solid #6c3483",
  },

  qrReader: {
    width: "100%",
  },

  /* ---------- RESULTS LIST ---------- */
  resultsList: {
    maxHeight: 500,
    overflowY: "auto",
    border: "1px solid #ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
  },

  userCard: {
    padding: 16,
    borderBottom: "1px solid #eee",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    transition: "background-color 0.2s",
  },

  userInfo: {
    flex: 1,
  },

  userName: {
    margin: "0 0 8px 0",
    fontSize: 18,
    color: "#2c3e50",
    fontWeight: "bold",
  },

  userId: {
    margin: "4px 0",
    fontSize: 14,
    color: "#6c3483",
    fontWeight: 600,
  },

  userDetail: {
    margin: "4px 0",
    fontSize: 13,
    color: "#555",
  },

  feeStatus: {
    marginLeft: 16,
  },

  statusBadge: {
    padding: "6px 16px",
    borderRadius: 16,
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },

  /* ---------- POPUP OVERLAY ---------- */
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },

  popup: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 30,
    maxWidth: 500,
    width: "90%",
    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
    boxSizing: "border-box",
  },

  popupTitle: {
    fontSize: 24,
    marginBottom: 20,
    color: "#6c3483",
    textAlign: "center",
    fontWeight: "bold",
  },

  popupContent: {
    marginBottom: 20,
  },

  popupUserInfo: {
    backgroundColor: "#f9f9f9",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },

  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    fontSize: 14,
  },

  infoLabel: {
    minWidth: 120,
    color: "#2c3e50",
  },

  infoValue: {
    flex: 1,
    textAlign: "right",
    color: "#555",
  },

  /* ---------- AMOUNT INPUT ---------- */
  amountSection: {
    marginBottom: 20,
  },

  label: {
    display: "block",
    marginBottom: 8,
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
  },

  amountInput: {
    width: "100%",
    padding: "12px 16px",
    fontSize: 18,
    border: "2px solid #6c3483",
    borderRadius: 8,
    outline: "none",
    fontWeight: "bold",
    boxSizing: "border-box",
  },

  /* ---------- POPUP BUTTONS ---------- */
  popupButtons: {
    display: "flex",
    gap: 12,
  },

  payButton: {
    flex: 1,
    padding: "14px 20px",
    backgroundColor: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 16,
    fontWeight: "bold",
  },

  cancelButton: {
    flex: 1,
    padding: "14px 20px",
    backgroundColor: "#6c757d",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 16,
    fontWeight: "bold",
  },
};

export default Payment;
