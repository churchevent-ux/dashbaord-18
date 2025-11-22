import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Html5QrcodeScanner } from "html5-qrcode";
import { sendPaymentEmail } from "../utils/email";

// --------- HELPERS ----------
const getDateKey = (date) => {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const Payment = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(100);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [scanner, setScanner] = useState(null);

  // Payment History
  const [historyRaw, setHistoryRaw] = useState([]);
  const [historyMode, setHistoryMode] = useState("today"); // "today" | "all" | "date"
  const [historyDate, setHistoryDate] = useState(getDateKey(new Date())); // for "Custom Date"
  const [historySearch, setHistorySearch] = useState("");
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [showHistoryPopup, setShowHistoryPopup] = useState(false);

  useEffect(() => {
    fetchUsers();
    // cleanup QR scanner on unmount
    return () => {
      if (scanner) {
        scanner.clear();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter users (for payment search)
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers([]);
      return;
    }

    const search = searchTerm.toLowerCase();

    const filtered = users.filter((user) =>
      [
        user.participantName,
        user.name,
        user.uniqueId,
        user.studentId,
        user.email,
        user.contactFatherMobile,
        user.primaryContactNumber,
        user.residence,
        user.address,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(search))
    );

    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  // Fetch Users + build history list
  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const userList = querySnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setUsers(userList);

      const history = userList
        .filter((u) => u.feeStatus === "paid")
        .map((u) => {
          let dateObj = null;

          if (u.feePaidAt) {
            if (typeof u.feePaidAt.toDate === "function") {
              // Firestore Timestamp
              dateObj = u.feePaidAt.toDate();
            } else if (u.feePaidAt.seconds) {
              // Firestore timestamp-like object
              dateObj = new Date(u.feePaidAt.seconds * 1000);
            } else if (u.feePaidAt instanceof Date) {
              dateObj = u.feePaidAt;
            }
          }

          return {
            name: u.participantName || u.name || "",
            id: u.uniqueId || u.studentId || u.id,
            amount: u.feePaidAmount || 0,
            email: u.email || "",
            dateObj,
            dateStr: dateObj ? dateObj.toLocaleString() : "—",
          };
        })
        .sort((a, b) => {
          if (!a.dateObj || !b.dateObj) return 0;
          return b.dateObj - a.dateObj;
        });

      setHistoryRaw(history);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  // ---------- QR Scanner ----------
  const startScanner = () => {
    setScannerActive(true);

    setTimeout(() => {
      const reader = document.getElementById("qr-reader");
      if (!reader) {
        console.error("QR reader element not found");
        setScannerActive(false);
        return;
      }

      const qr = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      qr.render(onScanSuccess, () => {});
      setScanner(qr);
    }, 150);
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

    const found = users.find(
      (u) =>
        u.uniqueId === decodedText ||
        u.studentId === decodedText ||
        u.id === decodedText
    );

    if (found) handleUserSelect(found);
  };

  // ---------- Payment actions ----------
  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setPaymentAmount(100);
    setShowPaymentPopup(true);
  };

  const handlePayment = async () => {
    if (!selectedUser) return;

    try {
      const userRef = doc(db, "users", selectedUser.id);
      const timestamp = new Date();

      await updateDoc(userRef, {
        feeStatus: "paid",
        feePaidAmount: paymentAmount,
        feePaidAt: timestamp,
      });

      // Send email (if email exists)
      if (selectedUser.email) {
        try {
          await sendPaymentEmail({
            toEmail: selectedUser.email,
            toName: selectedUser.participantName || selectedUser.name,
            amount: paymentAmount,
            receipt_id:
              selectedUser.uniqueId ||
              selectedUser.studentId ||
              selectedUser.id,
            date: timestamp.toLocaleString(),
          });
          alert(
            `Payment of AED ${paymentAmount}/- recorded and email sent to ${selectedUser.email}!`
          );
        } catch (err) {
          alert(
            `Payment recorded, but email sending failed: ${
              err.text || err.message
            }`
          );
        }
      } else {
        alert(
          `Payment of AED ${paymentAmount}/- recorded successfully for ${
            selectedUser.participantName || selectedUser.name
          } (No email address).`
        );
      }

      // Update local users list
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                feeStatus: "paid",
                feePaidAmount: paymentAmount,
                feePaidAt: timestamp,
              }
            : u
        )
      );

      // Update history list locally
      const dateObj = timestamp;
      setHistoryRaw((prev) => [
        ...prev,
        {
          name: selectedUser.participantName || selectedUser.name || "",
          id:
            selectedUser.uniqueId ||
            selectedUser.studentId ||
            selectedUser.id,
          amount: paymentAmount,
          email: selectedUser.email || "",
          dateObj,
          dateStr: dateObj ? dateObj.toLocaleString() : "—",
        },
      ]);

      setShowPaymentPopup(false);
      setSelectedUser(null);
      setSearchTerm("");
      setFilteredUsers([]);
    } catch (err) {
      console.error("Payment error:", err);
      alert("Failed: " + err.message);
    }
  };

  const closePaymentPopup = () => {
    setShowPaymentPopup(false);
    setSelectedUser(null);
  };

  // ---------- History filtering ----------
  const todayKey = getDateKey(new Date());

  const filteredHistory = historyRaw.filter((entry) => {
    // Date filter
    if (historyMode === "today") {
      if (!entry.dateObj) return false;
      return getDateKey(entry.dateObj) === todayKey;
    }

    if (historyMode === "date") {
      if (!entry.dateObj || !historyDate) return false;
      return getDateKey(entry.dateObj) === historyDate;
    }

    // "all"
    return true;
  });

  const filteredHistoryWithSearch = filteredHistory.filter((entry) => {
    const s = historySearch.trim().toLowerCase();
    if (!s) return true;

    return [entry.name, entry.id, entry.email]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(s));
  });

  const totalHistoryCount = filteredHistoryWithSearch.length;
  const totalHistoryAmount = filteredHistoryWithSearch.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0
  );

  const handleHistoryClick = (entry) => {
    // Just show history details, NO payment option
    setSelectedHistory(entry);
    setShowHistoryPopup(true);
  };

  const closeHistoryPopup = () => {
    setShowHistoryPopup(false);
    setSelectedHistory(null);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>💳 Payment Portal</h2>

      {/* ------------ PAYMENT SECTION ------------ */}
      <div style={styles.searchSection}>
        <div style={styles.searchBox}>
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
            <button
              onClick={stopScanner}
              style={{ ...styles.scanButton, backgroundColor: "#e74c3c" }}
            >
              ❌ Stop Scanner
            </button>
          )}
        </div>

        {scannerActive && (
          <div id="qr-reader" style={styles.scannerBox}></div>
        )}

        {filteredUsers.length > 0 && (
          <div style={styles.resultsBox}>
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                style={styles.userRow}
                onClick={() => handleUserSelect(u)}
              >
                <div>
                  <h4 style={styles.userName}>
                    {u.participantName || u.name}
                  </h4>
                  <p style={styles.userId}>
                    ID: {u.uniqueId || u.studentId || u.id}
                  </p>
                  <p style={styles.userDetail}>
                    📧 {u.email}{" "}
                    {u.contactFatherMobile || u.primaryContactNumber || u.phone
                      ? ` | 📞 ${
                          u.contactFatherMobile ||
                          u.primaryContactNumber ||
                          u.phone
                        }`
                      : ""}
                  </p>
                  <p style={styles.userDetail}>
                    📍 {u.residence || u.address || "—"}
                  </p>
                </div>

                <span
                  style={{
                    ...styles.statusBadge,
                    background:
                      u.feeStatus === "paid" ? "#28a745" : "#f1c40f",
                  }}
                >
                  {u.feeStatus === "paid" ? "Paid" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------------ PAYMENT HISTORY SECTION ------------ */}
      <div style={styles.historyContainer}>
        <h3 style={styles.historyTitle}>📜 Payment History</h3>

        <div style={styles.historyFilters}>
          <div style={styles.historyFilterGroup}>
            <label style={styles.historyLabel}>Range:</label>
            <select
              value={historyMode}
              onChange={(e) => {
                const value = e.target.value;
                setHistoryMode(value);
                if (value === "today") {
                  setHistoryDate(todayKey);
                }
              }}
              style={styles.historySelect}
            >
              <option value="today">Today</option>
              <option value="all">All Dates</option>
              <option value="date">Custom Date</option>
            </select>

            {historyMode === "date" && (
              <input
                type="date"
                value={historyDate}
                onChange={(e) => setHistoryDate(e.target.value)}
                style={styles.historyDateInput}
              />
            )}
          </div>

      

          <div style={styles.historySummary}>
            <div>Count: <strong>{totalHistoryCount}</strong></div>
            <div>
              Total:{" "}
              <strong>AED {totalHistoryAmount.toLocaleString()}</strong>
            </div>
          </div>
        </div>

        {filteredHistoryWithSearch.length === 0 ? (
          <p style={{ textAlign: "center", padding: 20 }}>
            No payment records for this filter.
          </p>
        ) : (
          <div style={styles.historyList}>
            {filteredHistoryWithSearch.map((entry, i) => (
              <div
                key={i}
                style={styles.historyRow}
                onClick={() => handleHistoryClick(entry)}
              >
                <div>
                  <strong>{entry.name || "—"}</strong>
                  <br />
                  <small>ID: {entry.id}</small>
                </div>
                <div style={styles.historyAmount}>
                  AED {Number(entry.amount || 0).toLocaleString()}
                </div>
                <div style={styles.historyEmail}>{entry.email || "—"}</div>
                <div style={styles.historyDate}>{entry.dateStr}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------------ PAYMENT POPUP ------------ */}
      {showPaymentPopup && selectedUser && (
        <div style={styles.overlay} onClick={closePaymentPopup}>
          <div
            style={styles.popup}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={styles.popupTitle}>💳 Record Payment</h3>

            <div style={styles.popupUserBox}>
              <p>
                <strong>Name:</strong>{" "}
                {selectedUser.participantName || selectedUser.name}
              </p>
              <p>
                <strong>ID:</strong>{" "}
                {selectedUser.uniqueId ||
                  selectedUser.studentId ||
                  selectedUser.id}
              </p>
              <p>
                <strong>Email:</strong> {selectedUser.email || "—"}
              </p>
              <p>
                <strong>Phone:</strong>{" "}
                {selectedUser.primaryContactNumber ||
                  selectedUser.contactFatherMobile ||
                  selectedUser.phone ||
                  "—"}
              </p>
              <p>
                <strong>Current Status:</strong>{" "}
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 12,
                    backgroundColor:
                      selectedUser.feeStatus === "paid"
                        ? "#28a745"
                        : "#f1c40f",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: "bold",
                  }}
                >
                  {selectedUser.feeStatus === "paid"
                    ? "Paid"
                    : "Pending"}
                </span>
              </p>
            </div>

            <label style={styles.label}>Payment Amount (AED)</label>
            <input
              type="number"
              value={paymentAmount}
              onChange={(e) =>
                setPaymentAmount(Number(e.target.value))
              }
              style={styles.amountInput}
            />

            <div style={styles.popupButtons}>
              <button onClick={handlePayment} style={styles.payBtn}>
                ✅ Confirm Payment
              </button>
              <button
                onClick={closePaymentPopup}
                style={styles.cancelBtn}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------ HISTORY DETAILS POPUP (READ-ONLY) ------------ */}
      {showHistoryPopup && selectedHistory && (
        <div style={styles.overlay} onClick={closeHistoryPopup}>
          <div
            style={styles.popup}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={styles.popupTitle}>📄 Payment Details</h3>
            <div style={styles.popupUserBox}>
              <p>
                <strong>Name:</strong> {selectedHistory.name || "—"}
              </p>
              <p>
                <strong>ID:</strong> {selectedHistory.id}
              </p>
              <p>
                <strong>Amount:</strong> AED{" "}
                {Number(selectedHistory.amount || 0).toLocaleString()}
              </p>
              <p>
                <strong>Date:</strong> {selectedHistory.dateStr}
              </p>
              <p>
                <strong>Email:</strong>{" "}
                {selectedHistory.email || "—"}
              </p>
            </div>

            <p style={{ marginTop: 10, fontSize: 14, color: "#555" }}>
              {selectedHistory.email
                ? `Payment confirmation email has been sent to this email: ${selectedHistory.email}.`
                : "No email address was available at the time of payment, so no email was sent."}
            </p>

            <div style={{ marginTop: 20, textAlign: "right" }}>
              <button
                onClick={closeHistoryPopup}
                style={styles.closeHistoryBtn}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ========= STYLES ========= */
const styles = {
  container: { padding: 20, maxWidth: 1200, margin: "0 auto", fontFamily: "Arial, sans-serif" },

  title: {
    textAlign: "center",
    fontSize: 28,
    marginBottom: 30,
    color: "#2c3e50",
    fontWeight: "bold",
  },

  // Search / Payment
  searchSection: {
    marginBottom: 30,
  },
  searchBox: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  searchInput: {
    flex: "1 1 280px",
    padding: "12px 16px",
    border: "2px solid #6c3483",
    borderRadius: 8,
    fontSize: 16,
    outline: "none",
  },
  scanButton: {
    padding: "12px 20px",
    background: "#6c3483",
    color: "#fff",
    border: 0,
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },
  scannerBox: {
    width: "100%",
    padding: 20,
    background: "#fafafa",
    borderRadius: 10,
    marginBottom: 20,
    border: "1px solid #ccc",
  },

  resultsBox: {
    border: "1px solid #ddd",
    borderRadius: 8,
    maxHeight: 400,
    overflowY: "auto",
    background: "#fff",
  },
  userRow: {
    padding: 15,
    borderBottom: "1px solid #eee",
    display: "flex",
    justifyContent: "space-between",
    cursor: "pointer",
    alignItems: "center",
  },
  userName: { margin: "0 0 4px 0", fontSize: 18, color: "#2c3e50" },
  userId: { margin: "2px 0", fontSize: 14, color: "#6c3483", fontWeight: 600 },
  userDetail: { margin: "2px 0", fontSize: 13, color: "#555" },
  statusBadge: {
    padding: "6px 12px",
    borderRadius: 16,
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },

  // History
  historyContainer: {
    marginTop: 20,
    padding: 20,
    border: "1px solid #ddd",
    borderRadius: 12,
    background: "#fff",
  },
  historyTitle: {
    textAlign: "center",
    fontSize: 22,
    marginBottom: 20,
    color: "#6c3483",
  },
  historyFilters: {
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    alignItems: "flex-end",
    marginBottom: 16,
  },
  historyFilterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  historyLabel: {
    fontSize: 13,
    color: "#333",
    fontWeight: "bold",
  },
  historySelect: {
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 14,
    minWidth: 130,
  },
  historyDateInput: {
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 14,
  },
  historySearchInput: {
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 14,
    minWidth: 180,
  },
  historySummary: {
    marginLeft: "auto",
    textAlign: "right",
    fontSize: 13,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxHeight: 400,
    overflowY: "auto",
  },
  historyRow: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr 1.5fr 1.3fr",
    gap: 8,
    padding: 10,
    borderBottom: "1px solid #eee",
    background: "#fafafa",
    borderRadius: 6,
    fontSize: 13,
    cursor: "pointer",
  },
  historyAmount: { fontWeight: "bold", alignSelf: "center" },
  historyEmail: { alignSelf: "center" },
  historyDate: { alignSelf: "center", fontSize: 12, color: "#555" },

  // Popups
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  popup: {
    background: "#fff",
    padding: 25,
    borderRadius: 12,
    width: "90%",
    maxWidth: 480,
    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
  },
  popupTitle: {
    textAlign: "center",
    marginBottom: 20,
    fontSize: 20,
    color: "#6c3483",
  },
  popupUserBox: {
    background: "#f7f7f7",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 14,
  },
  label: { fontWeight: "bold", fontSize: 14 },
  amountInput: {
    width: "100%",
    marginTop: 8,
    padding: 12,
    border: "2px solid #6c3483",
    borderRadius: 8,
    fontSize: 16,
    fontWeight: "bold",
    outline: "none",
  },
  popupButtons: {
    display: "flex",
    gap: 10,
    marginTop: 20,
  },
  payBtn: {
    flex: 1,
    padding: 12,
    background: "#28a745",
    color: "#fff",
    border: 0,
    borderRadius: 8,
    fontWeight: "bold",
    cursor: "pointer",
  },
  cancelBtn: {
    flex: 1,
    padding: 12,
    background: "#6c757d",
    color: "#fff",
    border: 0,
    borderRadius: 8,
    fontWeight: "bold",
    cursor: "pointer",
  },
  closeHistoryBtn: {
    padding: "8px 16px",
    borderRadius: 8,
    border: 0,
    background: "#6c3483",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 14,
  },
};

export default Payment;
