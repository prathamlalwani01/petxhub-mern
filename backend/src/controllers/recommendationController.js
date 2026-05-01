import Service from "../models/service.js";
import Pet from "../models/pet.js";

// Helper to extract clean keywords
const extractKeywords = (text) => {
    if (!text) return [];
    const stopWords = new Set(["the", "and", "a", "to", "of", "in", "i", "is", "that", "it", "on", "you", "this", "for", "but", "with", "are", "have", "be", "at", "or", "as", "was", "so", "if", "out", "not", "my", "your"]);
    return text.toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .split(' ')
        .filter(word => word.length > 2 && !stopWords.has(word));
};

export const getRecommendationsByPet = async (req, res) => {
    try {
        const userId = req.user._id;

        // Fetch all pets for this user
        const userPets = await Pet.find({ owner: userId });
        
        if (!userPets || userPets.length === 0) {
            return res.status(200).json([]);
        }

        // Fetch generic generic services to use as a fallback if a pet has no matches
        const genericServices = await Service.find({ isActive: true })
            .sort({ createdAt: -1 })
            .limit(4)
            .populate("provider", "name email");

        // We will build an array of { pet, services }
        const recommendationsData = [];

        for (const pet of userPets) {
            const keywords = new Set();
            
            // Extract keywords from this specific pet
            if (pet.breed) extractKeywords(pet.breed).forEach(w => keywords.add(w));
            if (pet.medicalNotes) extractKeywords(pet.medicalNotes).forEach(w => keywords.add(w));
            if (pet.age != null) {
                if (pet.age < 1) keywords.add("puppy").add("kitten").add("young");
                if (pet.age > 7) keywords.add("senior").add("older").add("joint");
            }
            
            let matchedServices = [];
            const keywordArray = Array.from(keywords);

            if (keywordArray.length > 0) {
                const regexArray = keywordArray.map(kw => new RegExp(kw, 'i'));
                matchedServices = await Service.find({
                    isActive: true,
                    $or: [
                        { name: { $in: regexArray } },
                        { description: { $in: regexArray } }
                    ]
                })
                .populate("provider", "name email")
                .limit(4);
            }

            // If no matched services, use generic ones
            const finalServices = matchedServices.length > 0 ? matchedServices : genericServices;

            recommendationsData.push({
                pet: pet,
                services: finalServices,
                isGeneric: matchedServices.length === 0
            });
        }

        res.status(200).json(recommendationsData);

    } catch (error) {
        console.error("Pet rec error:", error);
        res.status(500).json({ message: "Error fetching per-pet recommendations" });
    }
};
