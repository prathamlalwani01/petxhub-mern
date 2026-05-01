import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function RecommendationSection() {
  const [trending, setTrending] = useState([]);
  const [personalized, setPersonalized] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        // We can fetch trending services without auth potentially, but personalized requires it
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const resTrending = await axios.get("http://localhost:5000/api/recommendations/trending", { headers });
        let resPersonalized = { data: [] };
        
        if (token) {
           resPersonalized = await axios.get("http://localhost:5000/api/recommendations/personalized", { headers });
        }

        setTrending(resTrending.data);
        setPersonalized(resPersonalized.data);
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
        setError("Could not load recommendations at this time.");
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  const styles = {
    cardImagePlaceholder: {
      height: "140px",
      background: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      fontWeight: "bold",
      fontSize: "1.2rem",
      borderTopLeftRadius: "0.5rem",
      borderTopRightRadius: "0.5rem"
    },
    cardHover: {
      transition: "transform 0.3s ease, box-shadow 0.3s ease",
      cursor: "pointer",
      borderRadius: "0.5rem",
      border: "none",
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    },
    title: {
       background: "-webkit-linear-gradient(45deg, #FF512F, #DD2476)",
       WebkitBackgroundClip: "text",
       WebkitTextFillColor: "transparent",
       fontWeight: "800",
       marginBottom: "1rem"
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center my-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const renderServiceCard = (service) => (
    <div className="col-md-4 mb-4" key={service._id}>
      <div 
        className="card h-100" 
        style={styles.cardHover}
        onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-5px)";
            e.currentTarget.style.boxShadow = "0 10px 20px rgba(0,0,0,0.15)";
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
        }}
        // Ideally navigate to a service detail view or booking page
        onClick={() => navigate("/dashboard")}
      >
        <div style={styles.cardImagePlaceholder}>
          {service.name.substring(0, 2).toUpperCase()}
        </div>
        <div className="card-body">
          <h5 className="card-title fw-bold text-dark">{service.name}</h5>
          <p className="card-text text-muted" style={{ fontSize: "0.9rem", minHeight: "60px" }}>
             {service.description ? (service.description.length > 80 ? service.description.substring(0, 80) + "..." : service.description) : "No description available."}
          </p>
          <div className="d-flex justify-content-between align-items-center mt-3">
             <span className="badge bg-primary rounded-pill px-3 py-2 fs-6">₹{service.price}</span>
             <small className="text-secondary fw-semibold">⏱ {service.duration} mins</small>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mt-5 mb-5 ps-3 pe-3 rounded-4 shadow-sm pb-4 pt-4 bg-light">
      {error && <div className="alert alert-danger">{error}</div>}

      {personalized.length > 0 && (
        <div className="mb-5">
          <h3 style={styles.title}>✨ Recommended for Your Pets</h3>
          <p className="text-muted">Handpicked services based on your pet's needs</p>
          <div className="row mt-4">
            {personalized.map(renderServiceCard)}
          </div>
        </div>
      )}

      {trending.length > 0 && (
        <div>
          <h3 style={styles.title}>🔥 Trending & Popular Services</h3>
          <p className="text-muted">Most booked services by the PetxHub community</p>
          <div className="row mt-4">
            {trending.map(renderServiceCard)}
          </div>
        </div>
      )}
      
      {personalized.length === 0 && trending.length === 0 && !error && (
         <div className="text-center text-muted py-5">
            <p>No recommendations available right now.</p>
         </div>
      )}
    </div>
  );
}

export default RecommendationSection;
