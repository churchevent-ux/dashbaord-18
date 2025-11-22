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
  const [sortBy, setSortBy] = useState("none");

  // Capitalize first letter of each word
  const capitalizeName = (name) =>
    name
      ? name
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      : "";

  // Fetch users from Firestore
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

  // ---------- SORT & FILTER ----------
  const filteredUsers = [...users]
    .sort((a, b) => {
      if (sortBy === "nameAsc") return (a.participantName || "").localeCompare(b.participantName || "");
      if (sortBy === "nameDesc") return (b.participantName || "").localeCompare(a.participantName || "");
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      if (sortBy === "dateNewest") return dateB - dateA;
      if (sortBy === "dateOldest") return dateA - dateB;
      return 0;
    })
    .filter((user) => {
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

  // ---------- SELECTION HANDLERS ----------
  const toggleSelectUser = (id) =>
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map((u) => u.id));
    }
  };

  // ---------- DELETE HANDLERS ----------
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
    if (!selectedUsers.length) return alert("Select at least one user to delete");
    if (!window.confirm(`Delete ${selectedUsers.length} user(s)?`)) return;
    try {
      for (const id of selectedUsers) await deleteDoc(doc(db, "users", id));
      setUsers((prev) => prev.filter((u) => !selectedUsers.includes(u.id)));
      setSelectedUsers([]);
      alert("Users deleted successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to delete some users");
    }
  };

  const formatTo12Hour = (date) => {
    return date.toLocaleString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true, // <-- this converts to 12-hour format with AM/PM
    });
  };
  
  // Example:
  const date = new Date("2025-11-22T14:45:00");
  console.log(formatTo12Hour(date)); // "Nov 22, 2025, 2:45 PM"
  

  // ---------- RENDER ----------
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>👥 Registered Users</h2>

      <div style={styles.controls}>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={styles.select}>
          <option value="none">Sort By</option>
          <option value="nameAsc">Name (A → Z)</option>
          <option value="nameDesc">Name (Z → A)</option>
          <option value="dateNewest">Registered: Newest First</option>
          <option value="dateOldest">Registered: Oldest First</option>
        </select>

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
          <button onClick={handleBulkDelete} style={{ ...styles.bulkButton, backgroundColor: "#e74c3c" }}>
            🗑️ Delete Selected ({selectedUsers.length})
          </button>
        </div>
      )}

      <div style={styles.cardsWrapper}>
        {filteredUsers.length ? (
          filteredUsers.map((user, index) => (
            <div key={user.id} style={styles.cardWrapper}>
              <input
                type="checkbox"
                checked={selectedUsers.includes(user.id)}
                onChange={() => toggleSelectUser(user.id)}
                style={styles.checkbox}
              />
        <div style={styles.card}>
  <div style={{ display: "flex", alignItems: "center", minWidth: 60 }}>
    <span style={styles.index}>#{index + 1}</span>
  </div>

  <div style={{ flex: "0 0 150px" }}>
    <h3
      style={{ ...styles.name, color: "#2980b9", cursor: "pointer", margin: 0, fontSize: 16 }}
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

  {/* Registration Date */}
  <div style={{ flex: "0 0 160px" }}>
  <p style={{ ...styles.detail, margin: 0 }}>
    {user.createdAt
      ? new Date(user.createdAt.seconds * 1000).toLocaleString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true, // 12-hour format
        })
      : "N/A"}
  </p>
</div>


  <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
    <FaEdit style={styles.editIcon} onClick={() => alert(`Edit ${user.id}`)} />
    <FaTrash style={styles.deleteIcon} onClick={() => handleDelete(user.id)} />
  </div>
</div>

            </div>
          ))
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
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 20,
  },
  index: { fontSize: 14, fontWeight: 600, color: "#7f8c8d" },
  status: { fontSize: 12, fontWeight: 600, color: "#fff", padding: "4px 10px", borderRadius: 20, textTransform: "uppercase" },
  name: { fontSize: 20, fontWeight: 700, margin: "8px 0" },
  detail: { fontSize: 14, margin: "4px 0", color: "#555" },
  editIcon: { color: "#27ae60", cursor: "pointer", fontSize: 18 },
  deleteIcon: { color: "#c0392b", cursor: "pointer", fontSize: 18 },
  noUsers: { textAlign: "center", padding: 20, color: "#7f8c8d" },
};

export default Users;
