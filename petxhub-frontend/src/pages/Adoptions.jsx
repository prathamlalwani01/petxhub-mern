import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";

function Adoptions() {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const [adoptablePets, setAdoptablePets] = useState([]);
    const [searchLocation, setSearchLocation] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [selectedPet, setSelectedPet] = useState(null);

    const fetchAdoptablePets = async (locationQuery = "") => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            let url = `${import.meta.env.VITE_API_BASE_URL}/pets/adoptable`;
            if (locationQuery) {
                url += `?location=${encodeURIComponent(locationQuery)}`;
            }

            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAdoptablePets(res.data.pets);
        } catch (error) {
            console.error("Error fetching adoptable pets", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdoptablePets();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchAdoptablePets(searchLocation);
    };

    const handleAdoptRequest = async () => {
        if (!selectedPet) return;
        
        try {
            const token = localStorage.getItem("token");
            await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/adoptions`,
                { petId: selectedPet._id, message },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert("Adoption request sent successfully!");
            setSelectedPet(null);
            setMessage("");
        } catch (error) {
            alert(error.response?.data?.message || "Failed to send request");
        }
    };

    const filteredPets = adoptablePets.filter((pet) => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return (
            !normalizedSearch ||
            pet.name?.toLowerCase().includes(normalizedSearch) ||
            pet.breed?.toLowerCase().includes(normalizedSearch) ||
            pet.location?.toLowerCase().includes(normalizedSearch)
        );
    });

    return (
        <>
            <Navbar />
            <div className="page-shell">
            <div className="container py-5">
                <div className="page-hero-card mb-4">
                    <span className="page-kicker">Adopt with confidence</span>
                    <h2 className="mb-2">Adopt a Pet</h2>
                    <p className="text-muted mb-0">Find a pet by location, review their profile, and send a thoughtful adoption request.</p>
                </div>
                
                <div className="surface-panel mb-4">
                <div className="row g-2">
                    <div className="col-md-5">
                        <form onSubmit={handleSearch} className="d-flex gap-2">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search by near location (e.g. City)"
                                value={searchLocation}
                                onChange={(e) => setSearchLocation(e.target.value)}
                            />
                            <button type="submit" className="btn btn-primary">Search</button>
                        </form>
                    </div>
                    <div className="col-md-7">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Filter loaded pets by name, breed, or location"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                </div>

                {loading ? (
                    <div className="surface-panel"><p className="mb-0">Loading pets...</p></div>
                ) : filteredPets.length === 0 ? (
                    <div className="surface-panel"><p className="mb-0">No adoptable pets found in this area.</p></div>
                ) : (
                    <div className="row">
                        {filteredPets.map((pet) => (
                            <div key={pet._id} className="col-md-4 mb-4">
                                <div className="record-card h-100">
                                        <h5 className="card-title">{pet.name}</h5>
                                        <h6 className="card-subtitle mb-2 text-muted">{pet.breed}</h6>
                                        <p className="card-text mb-3">
                                            <strong>Age:</strong> {pet.age} yrs<br/>
                                            <strong>Location:</strong> {pet.location || "Not specified"}<br/>
                                            <strong>Owner:</strong> {pet.owner?.name}
                                        </p>
                                        {pet.owner?._id === user?.id ? (
                                            <button className="btn btn-secondary" disabled>
                                                Your Pet
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className="btn btn-success"
                                                onClick={() => setSelectedPet(pet)}
                                            >
                                                Request Adoption
                                            </button>
                                        )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* Modal for Adoption Request */}
                {selectedPet && (
                    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <div className="modal-dialog">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Adopt {selectedPet.name}</h5>
                                    <button type="button" className="btn-close" onClick={() => setSelectedPet(null)}></button>
                                </div>
                                <div className="modal-body">
                                    <p>Send a message to {selectedPet.owner?.name}:</p>
                                    <textarea 
                                        className="form-control" 
                                        rows="3" 
                                        placeholder="Why would you be a great owner?"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                    ></textarea>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setSelectedPet(null)}>Cancel</button>
                                    <button type="button" className="btn btn-primary" onClick={handleAdoptRequest}>Send Request</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            </div>
        </>
    );
}

export default Adoptions;
