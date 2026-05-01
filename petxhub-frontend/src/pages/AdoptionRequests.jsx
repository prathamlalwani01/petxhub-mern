import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";

function AdoptionRequests() {
    const [activeTab, setActiveTab] = useState("incoming");
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [outgoingRequests, setOutgoingRequests] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };
            
            const [incomingRes, outgoingRes] = await Promise.all([
                axios.get("http://localhost:5000/api/adoptions/incoming", { headers }),
                axios.get("http://localhost:5000/api/adoptions/outgoing", { headers })
            ]);

            setIncomingRequests(incomingRes.data.requests);
            setOutgoingRequests(outgoingRes.data.requests);
        } catch (error) {
            console.error("Error fetching adoption requests", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            const token = localStorage.getItem("token");
            await axios.put(
                `http://localhost:5000/api/adoptions/${id}/status`,
                { status },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            alert(`Request ${status} successfully`);
            fetchRequests(); // refresh the lists
        } catch (error) {
            alert(error.response?.data?.message || "Error updating request");
        }
    };

    return (
        <>
            <Navbar />
            <div className="page-shell">
            <div className="container py-5">
                <div className="page-hero-card mb-4">
                    <span className="page-kicker">Adoption pipeline</span>
                    <h2 className="mb-2">Adoption Requests</h2>
                    <p className="text-muted mb-0">Review incoming requests and keep track of the applications you have already sent.</p>
                </div>
                
                <ul className="nav nav-tabs mb-4 surface-panel">
                    <li className="nav-item">
                        <button 
                            className={`nav-link ${activeTab === 'incoming' ? 'active' : ''}`}
                            onClick={() => setActiveTab('incoming')}
                        >
                            Requests Received
                        </button>
                    </li>
                    <li className="nav-item">
                        <button 
                            className={`nav-link ${activeTab === 'outgoing' ? 'active' : ''}`}
                            onClick={() => setActiveTab('outgoing')}
                        >
                            My Requests
                        </button>
                    </li>
                </ul>

                {loading ? (
                    <div className="surface-panel"><p className="mb-0">Loading...</p></div>
                ) : activeTab === 'incoming' ? (
                    <div>
                        {incomingRequests.length === 0 ? (
                            <div className="surface-panel"><p className="mb-0">No incoming requests.</p></div>
                        ) : (
                            incomingRequests.map((req) => (
                                <div key={req._id} className="record-card mb-3">
                                    <h5>Pet: {req.pet?.name}</h5>
                                    <p><strong>From:</strong> {req.requester?.name} ({req.requester?.email})</p>
                                    <p><strong>Message:</strong> {req.message || "No message provided."}</p>
                                    <p><strong>Status:</strong> <span className={`fw-bold text-${req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'danger' : 'warning'}`}>{req.status.toUpperCase()}</span></p>
                                    
                                    {req.status === 'pending' && (
                                        <div>
                                            <button 
                                                className="btn btn-success me-2"
                                                onClick={() => handleUpdateStatus(req._id, 'approved')}
                                            >
                                                Approve
                                            </button>
                                            <button 
                                                className="btn btn-danger"
                                                onClick={() => handleUpdateStatus(req._id, 'rejected')}
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div>
                        {outgoingRequests.length === 0 ? (
                            <div className="surface-panel"><p className="mb-0">You haven't made any adoption requests.</p></div>
                        ) : (
                            outgoingRequests.map((req) => (
                                <div key={req._id} className="record-card mb-3">
                                    <h5>Pet: {req.pet?.name}</h5>
                                    <p><strong>Owner:</strong> {req.owner?.name}</p>
                                    <p><strong>Your Message:</strong> {req.message}</p>
                                    <p><strong>Status:</strong> <span className={`fw-bold text-${req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'danger' : 'warning'}`}>{req.status.toUpperCase()}</span></p>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
            </div>
        </>
    );
}

export default AdoptionRequests;
