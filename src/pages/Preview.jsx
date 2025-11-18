import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const MEDICAL_OPTIONS = ["N/A", "Asthma", "Diabetes", "Allergies", "Epilepsy", "Other"];

const Preview = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);

  /** Utility Functions **/
  const calculateAge = React.useCallback((dob) => {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }, []);

  const getCategory = React.useCallback((age) => {
    if (age >= 8 && age <= 12) return { label: "Kids", code: "DGK" };
    if (age >= 13 && age <= 18) return { label: "Teen", code: "DGT" };
    return { label: "Other", code: "DGX" };
  }, []);

  const getCardBackground = (categoryLabel) => {
    switch (categoryLabel) {
      case "Kids": return "#ffe6e6";
      case "Teen": return "#e6f0ff";
      default: return "#f5f5f5";
    }
  };

  /** Map Participant Data **/
  const mapParticipantData = React.useCallback((p) => {
    const age = p.age ?? (p.dob ? calculateAge(p.dob) : null);
    const { label, code } = getCategory(age);
    const medConds = Array.isArray(p.medicalConditions)
      ? p.medicalConditions
      : p.medicalConditions
      ? [p.medicalConditions]
      : []; // empty initially

    return {
      ...p, // Keep all original data including uniqueId
      participantName: p.participantName || p.name || p.siblingName || "",
      dob: p.dob || "",
      age,
      categoryLabel: label,
      categoryCode: code,
      category: p.category || label,
      primaryContactNumber: p.primaryContactNumber || "",
      primaryContactRelation: p.primaryContactRelation || "",
      secondaryContactNumber: p.secondaryContactNumber || "",
      secondaryContactRelationship: p.secondaryContactRelationship || "",
      email: p.email || "",
      medicalConditions: medConds,
      additionalMedicalNotes: p.additionalMedicalNotes || "",
    };
  }, [calculateAge, getCategory]);

  /** Load Participants **/
  useEffect(() => {
    const initializeParticipants = async () => {
      let initialParticipants = [];

      if (state?.participants?.length) {
        initialParticipants = state.participants.map(mapParticipantData);
      } else {
        setLoading(true);
        try {
          const usersRef = collection(db, "users");
          const snap = await getDocs(usersRef);
          initialParticipants = snap.docs.map((doc) => mapParticipantData(doc.data()));
        } catch (err) {
          console.error(err);
          alert("❌ Failed to fetch participants: " + err.message);
        } finally {
          setLoading(false);
        }
      }

      setParticipants(initialParticipants);
    };

    initializeParticipants();
  }, [state, mapParticipantData]);

  /** Handlers **/
  const handleChange = (index, field, value) => {
    setParticipants((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      if (field === "dob") {
        const age = calculateAge(value);
        const { label, code } = getCategory(age);
        updated[index].age = age;
        updated[index].categoryLabel = label;
        updated[index].categoryCode = code;
      }
      return updated;
    });
  };

  const handleMedicalSelect = (index, value) => {
    setParticipants((prev) => {
      const updated = [...prev];
      updated[index].medicalConditions = value ? [value] : [];
      if (value !== "Other") updated[index].additionalMedicalNotes = "";
      return updated;
    });
  };

  const validateParticipants = () => {
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      if (!p.participantName) return `Participant ${i + 1}: Name is required`;
      if (!p.age || !p.categoryCode) return `Participant ${i + 1}: Age/Category is required`;

      // Allow "N/A", just ensure something is selected
      if (!p.medicalConditions.length)
        return `Participant ${i + 1}: Please select a medical condition`;
      if (p.medicalConditions.includes("Other") && !p.additionalMedicalNotes)
        return `Participant ${i + 1}: Specify other medical condition`;

      if (!p.primaryContactNumber) return `Participant ${i + 1}: Primary contact number is required`;
      if (!p.primaryContactRelation) return `Participant ${i + 1}: Primary contact relationship is required`;
      if (!p.secondaryContactNumber) return `Participant ${i + 1}: Secondary contact number is required`;
      if (!p.secondaryContactRelationship) return `Participant ${i + 1}: Secondary contact relationship is required`;
    }
    return null;
  };

  const handleFinalSubmit = async () => {
    const error = validateParticipants();
    if (error) {
      alert("❌ " + error);
      return;
    }

    setLoading(true);
    try {
      // Data is already saved in Register.jsx with uniqueId
      // Just navigate to ID card with the existing data
      const savedDocs = participants.map(p => ({
        ...p,
        studentId: p.uniqueId || p.studentId, // Use uniqueId as studentId for display
        familyId: p.uniqueId || p.studentId,
        docId: p.uniqueId || p.id
      }));

      navigate("/id-card", { state: { formData: savedDocs[0], siblings: savedDocs.slice(1) } });
    } catch (err) {
      console.error(err);
      alert(`❌ Navigation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  /** UI **/
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2>Review Registration</h2>
        <p>Check all participant details before final submission</p>
      </header>

      {loading && <p style={{ textAlign: "center" }}>Loading participants...</p>}

      <div style={styles.cardsContainer}>
        {participants.map((p, index) => (
          <div key={index} style={{ ...styles.card, backgroundColor: getCardBackground(p.categoryLabel) }}>
            <div style={styles.cardHeader}>
              <h3>{index === 0 ? "Participant" : `Sibling ${index}`}</h3>
              <span style={styles.categoryBadge}>{p.categoryLabel}</span>
            </div>

            <div style={styles.field}>
              <label>Name</label>
              <input
                style={styles.input}
                value={p.participantName}
                onChange={(e) => handleChange(index, "participantName", e.target.value)}
              />
            </div>

            <div style={styles.field}>
              <label>Age</label>
              <input style={styles.input} value={p.age || ""} readOnly />
            </div>

            <div style={styles.field}>
              <label>Primary Contact</label>
              <input
                style={styles.input}
                value={p.primaryContactNumber}
                onChange={(e) => handleChange(index, "primaryContactNumber", e.target.value)}
              />
              <small>Relationship: {p.primaryContactRelation || "-"}</small>
            </div>

            <div style={styles.field}>
              <label>Secondary Contact</label>
              <input
                style={styles.input}
                value={p.secondaryContactNumber || ""}
                onChange={(e) => handleChange(index, "secondaryContactNumber", e.target.value)}
              />
              <small>Relationship: {p.secondaryContactRelationship || "-"}</small>
            </div>

            <div style={styles.field}>
              <label>Email</label>
              <input
                style={styles.input}
                value={p.email}
                onChange={(e) => handleChange(index, "email", e.target.value)}
              />
            </div>

            <div style={styles.field}>
              <label>Medical Condition</label>
              <select
                style={styles.select}
                value={p.medicalConditions[0] || ""}
                onChange={(e) => handleMedicalSelect(index, e.target.value)}
              >
                <option value="">Select a condition</option>
                {MEDICAL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>

              {p.medicalConditions.includes("Other") && (
                <input
                  style={styles.input}
                  placeholder="Specify other condition"
                  value={p.additionalMedicalNotes}
                  onChange={(e) =>
                    handleChange(index, "additionalMedicalNotes", e.target.value)
                  }
                />
              )}
              <small style={{ color: "#555" }}>Choose N/A if none</small>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.buttonGroup}>
        <button style={styles.backBtn} onClick={() => navigate(-1)} disabled={loading}>
          ← Back
        </button>
        <button
          style={styles.submitBtn}
          onClick={handleFinalSubmit}
          disabled={loading}
        >
          {loading ? "Submitting..." : "✅ Submit All"}
        </button>
      </div>
    </div>
  );
};

/** Styles **/
const styles = {
  container: { maxWidth: 950, margin: "0 auto", padding: 20, fontFamily: "'Poppins', sans-serif" },
  header: { textAlign: "center", marginBottom: 25 },
  cardsContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 25,
  },
  card: { borderRadius: 16, padding: 20, boxShadow: "0 6px 20px rgba(0,0,0,0.12)" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  categoryBadge: {
    background: "#6c3483",
    color: "#fff",
    padding: "4px 10px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  field: { marginBottom: 15, display: "flex", flexDirection: "column" },
  input: { padding: 12, borderRadius: 8, border: "1px solid #ccc", fontSize: 14 },
  select: { padding: 12, borderRadius: 8, border: "1px solid #ccc", fontSize: 14 },
  buttonGroup: {
    display: "flex",
    justifyContent: "center",
    gap: 15,
    marginTop: 30,
    flexWrap: "wrap",
  },
  backBtn: {
    backgroundColor: "#aaa",
    color: "#fff",
    border: "none",
    padding: "12px 20px",
    borderRadius: 8,
    cursor: "pointer",
  },
  submitBtn: {
    backgroundColor: "#6c3483",
    color: "#fff",
    border: "none",
    padding: "12px 20px",
    borderRadius: 8,
    cursor: "pointer",
  },
};

export default Preview;
