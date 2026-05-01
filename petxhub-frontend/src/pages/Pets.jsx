import Navbar from "../components/Navbar";
import { useState, useEffect } from "react";
import axios from "axios";

function Pets() {

    const [pets, setPets] = useState([]);
    const [name, setName] = useState("");
    const [breed, setBreed] = useState("");
    const [age, setAge] = useState("");
    const [gender, setGender] = useState("");
    const [weight, setWeight] = useState("");
    const [location, setLocation] = useState("");
    const [adoptionStatus, setAdoptionStatus] = useState("not_available");
    const [editPetId, setEditPetId] = useState(null);
    const [editName, setEditName] = useState("");
    const [editBreed, setEditBreed] = useState("");
    const [editAge, setEditAge] = useState("");
    const [editGender, setEditGender] = useState("");
    const [editLocation, setEditLocation] = useState("");
    const [editAdoptionStatus, setEditAdoptionStatus] = useState("not_available");
    const [searchTerm, setSearchTerm] = useState("");
    const [adoptionFilter, setAdoptionFilter] = useState("all");

    useEffect(() => {

        const fetchPets = async () => {

            try {

                const token = localStorage.getItem("token");

                const res = await axios.get(
                    `${import.meta.env.VITE_API_BASE_URL}/pets`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                setPets(res.data.pets);

            } catch (error) {

                console.log(error);

            }

        };

        fetchPets();

    }, []);

    const handleAddPets = async (e) => {
        e.preventDefault();

        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/pets`,
                {
                    name,
                    breed,
                    age,
                    gender,
                    weight,
                    location,
                    adoptionStatus
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            console.log("RESPONSE:", res.data);
            setPets([...pets, res.data.pet]);
            // Reset fields
            setName("");
            setBreed("");
            setAge("");
            setGender("");
            setWeight("");
            setLocation("");
            setAdoptionStatus("not_available");
        } catch (error) {
            console.error(error);
        }
    }

    const handleDeletePet = async (id) => {
        try {

            const token = localStorage.getItem("token");

            await axios.delete(
                `${import.meta.env.VITE_API_BASE_URL}/pets/${id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            // Remove pet from UI instantly
            setPets((prevPets) => prevPets.filter((pet) => pet._id !== id));

        } catch (error) {
            console.error(error);
        }
    };

    const startEditing = (pet) => {
        setEditPetId(pet._id);

        setEditName(pet.name);
        setEditBreed(pet.breed);
        setEditAge(pet.age);
        setEditGender(pet.gender || "");
        setEditLocation(pet.location || "");
        setEditAdoptionStatus(pet.adoptionStatus || "not_available");
    };

    const handleUpdatePet = async (id) => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/pets/${id}`,
                {
                    name: editName,
                    breed: editBreed,
                    age: Number(editAge),
                    gender: editGender,
                    location: editLocation,
                    adoptionStatus: editAdoptionStatus
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            console.log("Updated", res.data);
            // Update UI
            const updatedPet = res.data.updatedPet
            setPets((prevPets) =>
                prevPets.map((pet) =>
                    pet._id === id ? updatedPet : pet
                )
            );

            // Exit edit mode
            setEditPetId(null);
        } catch (error) {
            console.error(error)
        }
    }

    const filteredPets = pets.filter((pet) => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        const matchesSearch =
            !normalizedSearch ||
            pet.name?.toLowerCase().includes(normalizedSearch) ||
            pet.breed?.toLowerCase().includes(normalizedSearch) ||
            pet.location?.toLowerCase().includes(normalizedSearch);

        const matchesAdoption =
            adoptionFilter === "all" || pet.adoptionStatus === adoptionFilter;

        return matchesSearch && matchesAdoption;
    });

    return (
        <>
            <Navbar/>
            <div className="page-shell">
            <div className="container py-5">

                <div className="page-hero-card mb-4">
                    <span className="page-kicker">Pet profiles</span>
                    <h2 className="mb-2">My Pets</h2>
                    <p className="text-muted mb-0">Add, update, and manage the pets that power your bookings, reminders, and adoption flow.</p>
                </div>

                <div className="surface-panel mb-4">
                <h4>Add New Pet</h4>

                <form onSubmit={handleAddPets} className="mb-4">

                    <input
                        type="text"
                        placeholder="Pet Name"
                        className="form-control mb-2"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />

                    <input
                        type="text"
                        placeholder="Breed"
                        className="form-control mb-2"
                        value={breed}
                        onChange={(e) => setBreed(e.target.value)}
                        required
                    />

                    <input
                        type="number"
                        placeholder="Age"
                        className="form-control mb-2"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        required
                    />

            

                    <select
                        className="form-select mb-2"
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        required
                    >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                    </select>

                    <input
                        type="number"
                        placeholder="Weight"
                        className="form-control mb-2"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                    />

                    <input
                        type="text"
                        placeholder="Location (e.g. City Name)"
                        className="form-control mb-2"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                    />

                    <select 
                        className="form-select mb-3" 
                        value={adoptionStatus}
                        onChange={(e) => setAdoptionStatus(e.target.value)}
                    >
                        <option value="not_available">Not Available for Adoption</option>
                        <option value="available">Available for Adoption</option>
                    </select>

                    <button className="btn btn-primary">
                        Add Pet
                    </button>

                </form>
                </div>

                <div className="surface-panel">
                <h4>My Pets</h4>

                <div className="row g-2 mb-3">
                    <div className="col-md-8">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search by pet name, breed, or location"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="col-md-4">
                        <select
                            className="form-select"
                            value={adoptionFilter}
                            onChange={(e) => setAdoptionFilter(e.target.value)}
                        >
                            <option value="all">All adoption states</option>
                            <option value="available">Available</option>
                            <option value="not_available">Not Available</option>
                            <option value="adopted">Adopted</option>
                        </select>
                    </div>
                </div>

                {filteredPets.length === 0 ? (
                    <p>No pets found</p>
                ) : (
                    <div className="row g-3">
                    {filteredPets.map((pet) => (
                        <div key={pet._id} className="col-md-6 col-xl-4">
                        <div className="record-card mb-0 h-100">
                            {editPetId === pet._id ? (
                                <div>

                                    <input
                                        className="form-control mb-2"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                    />

                                    <input
                                        className="form-control mb-2"
                                        value={editBreed}
                                        onChange={(e) => setEditBreed(e.target.value)}
                                    />

                                    <input
                                        className="form-control mb-2"
                                        value={editAge}
                                        onChange={(e) => setEditAge(e.target.value)}
                                        placeholder="Age"
                                    />

                                    <select
                                        className="form-select mb-2"
                                        value={editGender}
                                        onChange={(e) => setEditGender(e.target.value)}
                                        required
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                    </select>

                                    <input
                                        className="form-control mb-2"
                                        value={editLocation}
                                        onChange={(e) => setEditLocation(e.target.value)}
                                        placeholder="Location"
                                    />

                                    <select 
                                        className="form-select mb-2" 
                                        value={editAdoptionStatus}
                                        onChange={(e) => setEditAdoptionStatus(e.target.value)}
                                    >
                                        <option value="not_available">Not Available</option>
                                        <option value="available">Available</option>
                                        <option value="adopted">Adopted</option>
                                    </select>

                                    <div className="d-flex flex-wrap gap-2 mb-2">
                                        <button
                                            className="btn btn-success"
                                            onClick={() => handleUpdatePet(pet._id)}
                                        >
                                            Save
                                        </button>

                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => setEditPetId(null)}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* {pet.photo ? (
                                        <div
                                            className="petx-card-media petx-pet-media"
                                            style={{ backgroundImage: `url(${pet.photo})` }}
                                        />
                                    ) : (
                                        <div className="petx-card-media petx-pet-media petx-card-media-placeholder">
                                            <span>{pet.name}</span>
                                        </div>
                                    )} */}
                                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                                        <h5 className="mb-0 mt-2">{pet.name}</h5>
                                        <span className={`badge ${pet.adoptionStatus === "available" ? "text-bg-success" : pet.adoptionStatus === "adopted" ? "text-bg-secondary" : "text-bg-light"}` } style={{ marginTop: "10px" }}>
                                            {pet.adoptionStatus === "available"
                                                ? "Available for adoption"
                                                : pet.adoptionStatus === "adopted"
                                                    ? "Adopted"
                                                    : "Not available for adoption"}
                                        </span>
                                    </div>
                                    <p className="mb-1"><strong>Breed:</strong> {pet.breed || "Not provided"}</p>
                                    <p className="mb-1"><strong>Age:</strong> {pet.age ?? "Not provided"}</p>
                                    <p className="mb-1"><strong>Gender:</strong> {pet.gender || "Not provided"}</p>
                                    <p className="mb-2"><strong>Weight:</strong> {pet.weight ? `${pet.weight} kg` : "Not provided"}</p>
                                    {pet.location && <p className="mb-3"><strong>Location:</strong> {pet.location}</p>}
                                </>
                            )}

                            <div className="d-flex gap-2 flex-wrap">
                                <button onClick={() => startEditing(pet)}
                                    className="btn btn-outline-primary btn-sm">
                                    Edit
                                </button>
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleDeletePet(pet._id)}>
                                    Delete
                                </button>
                            </div>
                        </div>
                        </div>
                    ))
                    }
                    </div>
                )}
                </div>

            </div>
            </div>
        </>

    );
}

export default Pets
