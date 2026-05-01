import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const ASSET_IMAGE_MODULES = import.meta.glob("../assets/*.{png,jpg,jpeg,webp,avif}", {
  eager: true,
  import: "default",
});

const normalizeText = (value = "") =>
  value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]/g, "");

const SERVICE_IMAGE_BY_NAME = Object.entries(ASSET_IMAGE_MODULES).reduce((acc, [path, src]) => {
  const fileName = path.split("/").pop() || "";
  const baseName = fileName.replace(/\.(png|jpe?g|webp|avif)$/i, "");
  acc[normalizeText(baseName)] = src;
  return acc;
}, {});

const SERVICE_IMAGE_ALIASES = {
  [normalizeText("Haircut & Styling")]: normalizeText("haircut1"),
  [normalizeText("Paw & Nail Care")]: normalizeText("nailcare"),
};

const getAutoImageForServiceName = (serviceName = "") => {
  const normalizedName = normalizeText(serviceName);
  if (!normalizedName) return "";

  const directOrAliasKey = SERVICE_IMAGE_ALIASES[normalizedName] || normalizedName;
  if (SERVICE_IMAGE_BY_NAME[directOrAliasKey]) {
    return SERVICE_IMAGE_BY_NAME[directOrAliasKey];
  }

  const fuzzyMatchKey = Object.keys(SERVICE_IMAGE_BY_NAME).find(
    (key) => key.includes(normalizedName) || normalizedName.includes(key)
  );

  return fuzzyMatchKey ? SERVICE_IMAGE_BY_NAME[fuzzyMatchKey] : "";
};

function PetRecommendations({ visibleServiceNames = [] }) {
  const [recommendationGroups, setRecommendationGroups] = useState([]);
  const [servicesCatalog, setServicesCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }

        const [recommendationRes, servicesRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/recommendations/pets`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE_URL}/services`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setRecommendationGroups(Array.isArray(recommendationRes.data) ? recommendationRes.data : []);
        setServicesCatalog(Array.isArray(servicesRes.data?.services) ? servicesRes.data.services : []);
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
        setError("Could not load recommendations right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  const mergedRecommendations = useMemo(() => {
    const merged = new Map();
    const hasVisibleFilter = Array.isArray(visibleServiceNames) && visibleServiceNames.length > 0;
    const visibleNameSet = new Set((visibleServiceNames || []).map((name) => name.toLowerCase()));
    const allPetNames = Array.from(
      new Set(
        recommendationGroups
          .map((group) => group?.pet?.name)
          .filter(Boolean)
      )
    );

    recommendationGroups.forEach((group) => {
      const petName = group?.pet?.name || "Pet";
      const services = Array.isArray(group?.services) ? group.services : [];

      services.forEach((service) => {
        if (!service?._id) {
          return;
        }

        if (hasVisibleFilter && !visibleNameSet.has((service.name || "").toLowerCase())) {
          return;
        }

        if (!merged.has(service._id)) {
          merged.set(service._id, {
            ...service,
            petNames: new Set([petName]),
            sourceCount: 1,
          });
        } else {
          const existing = merged.get(service._id);
          existing.petNames.add(petName);
          existing.sourceCount += 1;
        }
      });
    });

    const mergedList = Array.from(merged.values()).map((service) => ({
      ...service,
      petNames: Array.from(service.petNames),
      imageUrl: service.imageUrl || getAutoImageForServiceName(service.name) || "",
    }));

    if (hasVisibleFilter) {
      const catalogByName = new Map(
        servicesCatalog.map((service) => [(service.name || "").toLowerCase(), service])
      );

      return visibleServiceNames.map((serviceName) => {
        const normalizedName = (serviceName || "").toLowerCase();
        const recommendedItem = mergedList.find(
          (service) => (service.name || "").toLowerCase() === normalizedName
        );

        if (recommendedItem) {
          return recommendedItem;
        }

        const catalogItem = catalogByName.get(normalizedName);
        if (catalogItem) {
          return {
            ...catalogItem,
            petNames: allPetNames,
            sourceCount: 0,
            imageUrl: catalogItem.imageUrl || getAutoImageForServiceName(catalogItem.name) || "",
          };
        }

        return {
          _id: `fallback-${normalizedName}`,
          name: serviceName,
          description: "Service details will appear here once synced from the service catalog.",
          duration: "-",
          price: "-",
          petNames: allPetNames,
          sourceCount: 0,
          imageUrl: getAutoImageForServiceName(serviceName) || "",
        };
      });
    }

    return mergedList.sort((a, b) => b.sourceCount - a.sourceCount || a.name.localeCompare(b.name));
  }, [recommendationGroups, servicesCatalog, visibleServiceNames]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center my-4">
        <div className="spinner-border text-info" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  if (!mergedRecommendations.length) {
    return null;
  }

  return (
    <div className="mt-4 mb-5">
      <div className="mb-3">
        <h3 className="mb-1">Recommended Services For Your Pets</h3>
        <p className="text-muted mb-0">Common recommendations merged across all your pet profiles.</p>
      </div>

      <div className="row">
        {mergedRecommendations.map((service) => (
          <div className="col-md-3 mb-4" key={service._id || service.name}>
            <div
              className="card h-100"
              style={{
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                cursor: "pointer",
                borderRadius: "0.8rem",
                border: "1px solid rgba(226,232,240,0.9)",
                boxShadow: "0 8px 18px rgba(15,23,42,0.07)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 14px 24px rgba(15,23,42,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 18px rgba(15,23,42,0.07)";
              }}
              onClick={() => navigate("/services")}
            >
              {service.imageUrl ? (
                <div
                  style={{
                    height: "120px",
                    borderTopLeftRadius: "0.8rem",
                    borderTopRightRadius: "0.8rem",
                    backgroundImage: `url(${service.imageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              ) : (
                <div
                  style={{
                    height: "120px",
                    background: "linear-gradient(135deg, #0ea5e9, #14b8a6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: "800",
                    fontSize: "1.1rem",
                    borderTopLeftRadius: "0.8rem",
                    borderTopRightRadius: "0.8rem",
                  }}
                >
                  {service.name.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="card-body p-3">
                <h6 className="card-title fw-bold text-dark">{service.name}</h6>
                <p className="card-text text-muted" style={{ fontSize: "0.9rem", minHeight: "52px" }}>
                  {service.description
                    ? service.description.length > 70
                      ? `${service.description.slice(0, 70)}...`
                      : service.description
                    : "No description"}
                </p>
                <p className="mb-2" style={{ fontSize: "0.8rem", color: "#475569" }}>
                  <strong>Recommended for:</strong> {service.petNames?.length ? service.petNames.join(", ") : "All pets"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PetRecommendations;
