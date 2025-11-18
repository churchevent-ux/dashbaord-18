// src/pages/Volunteers.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEdit, FaTrash } from "react-icons/fa";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

const Volunteers = () => {
  const navigate = useNavigate();
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVolunteers, setSelectedVolunteers] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snap = await getDocs(collection(db, "volunteers"));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setVolunteers(data);
      } catch (err) {
        console.error("Error fetching volunteers:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this volunteer?")) return;
    try {
      await deleteDoc(doc(db, "volunteers", id));
      setVolunteers((prev) => prev.filter((v) => v.id !== id));
      setSelectedVolunteers((prev) => prev.filter((vid) => vid !== id));
    } catch (err) {
      console.error("Error deleting volunteer:", err);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedVolunteers.length) return alert("Please select at least one volunteer to delete");
    if (!window.confirm(`Are you sure you want to delete ${selectedVolunteers.length} volunteer(s)?`)) return;
    
    try {
      for (const volunteerId of selectedVolunteers) {
        await deleteDoc(doc(db, "volunteers", volunteerId));
      }
      setVolunteers((prev) => prev.filter((v) => !selectedVolunteers.includes(v.id)));
      setSelectedVolunteers([]);
      alert(`Successfully deleted ${selectedVolunteers.length} volunteer(s)`);
    } catch (err) {
      console.error("Error deleting volunteers:", err);
      alert("Failed to delete some volunteers");
    }
  };

  const toggleSelectAll = () => {
    if (selectedVolunteers.length === filteredVolunteers.length) {
      setSelectedVolunteers([]);
    } else {
      setSelectedVolunteers(filteredVolunteers.map(v => v.id));
    }
  };

  const toggleSelectVolunteer = (id) => {
    setSelectedVolunteers((prev) =>
      prev.includes(id) ? prev.filter((vid) => vid !== id) : [...prev, id]
    );
  };

  const filteredVolunteers = volunteers.filter((volunteer) => {
    const searchLower = search.toLowerCase();
    return (
      volunteer.fullName?.toLowerCase().includes(searchLower) ||
      volunteer.volunteerId?.toLowerCase().includes(searchLower) ||
      volunteer.email?.toLowerCase().includes(searchLower) ||
      volunteer.phone?.includes(search)
    );
  });

  if (loading)
    return <p style={{ textAlign: "center", marginTop: 50 }}>Loading volunteers...</p>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🤝 Volunteer List</h2>

      <div style={styles.controls}>
        <input
          type="text"
          placeholder="🔍 Search by name, ID, email or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        
        <button onClick={toggleSelectAll} style={styles.selectAllButton}>
          {selectedVolunteers.length === filteredVolunteers.length && filteredVolunteers.length > 0 ? "Deselect All" : "Select All"}
        </button>
      </div>

      {selectedVolunteers.length > 0 && (
        <div style={styles.bulkActions}>
          <button onClick={handleBulkDelete} style={{...styles.bulkButton, backgroundColor: "#e74c3c"}}>
            🗑️ Delete Selected ({selectedVolunteers.length})
          </button>
        </div>
      )}

      <div style={styles.cardsWrapper}>
        {filteredVolunteers.length ? (
          filteredVolunteers.map((volunteer, index) => {
            return (
              <div key={volunteer.id} style={styles.cardWrapper}>
                <input
                  type="checkbox"
                  checked={selectedVolunteers.includes(volunteer.id)}
                  onChange={() => toggleSelectVolunteer(volunteer.id)}
                  style={styles.checkbox}
                />

                <div style={styles.card} className="volunteer-card">
                  <div style={{ display: "flex", alignItems: "center", minWidth: 60 }}>
                    <span style={styles.index}>#{index + 1}</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 200 }}>
                    <h3 
                      style={{ 
                        ...styles.name, 
                        margin: 0, 
                        fontSize: 16,
                        color: "#2980b9",
                        cursor: "pointer"
                      }}
                      onClick={() => navigate(`/admin/volunteers/${volunteer.id}`)}
                    >
                      {volunteer.fullName}
                    </h3>
                  </div>

                  <div style={{ flex: "0 0 150px" }}>
                    <p style={{ ...styles.detail, margin: 0 }}>
                      <b>{volunteer.volunteerId || "-"}</b>
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 100 }}>
                    <button
                      onClick={() => handleDelete(volunteer.id)}
                      style={styles.deleteButton}
                      title="Delete volunteer"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={styles.noData}>No volunteers found</div>
        )}
      </div>
    </div>
  );
};

// Styles
const styles = {
  container: {
    padding: "20px",
    fontFamily: "Arial, sans-serif",
    maxWidth: "1400px",
    margin: "0 auto",
  },
  title: {
    fontSize: "26px",
    fontWeight: "bold",
    marginBottom: "20px",
    textAlign: "center",
    color: "#6c3483",
  },
  controls: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "20px",
    alignItems: "center",
  },
  searchInput: {
    flex: "1 1 300px",
    padding: "10px 15px",
    fontSize: "14px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    outline: "none",
  },
  selectAllButton: {
    padding: "10px 20px",
    fontSize: "14px",
    backgroundColor: "#3498db",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  bulkActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "20px",
    padding: "15px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    border: "2px solid #e0e0e0",
  },
  bulkButton: {
    padding: "10px 20px",
    fontSize: "14px",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  cardsWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  cardWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
    flexShrink: 0,
  },
  card: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "15px",
    backgroundColor: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    transition: "all 0.3s ease",
    overflowX: "auto",
  },
  index: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "#7f8c8d",
  },
  name: {
    color: "#2c3e50",
    fontWeight: "bold",
  },
  detail: {
    fontSize: "13px",
    color: "#555",
  },
  deleteButton: {
    padding: "8px 12px",
    backgroundColor: "#e74c3c",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
  },
  noData: {
    textAlign: "center",
    padding: "40px",
    fontSize: "16px",
    color: "#999",
    backgroundColor: "#f9f9f9",
    borderRadius: "8px",
  },
};

export default Volunteers;
