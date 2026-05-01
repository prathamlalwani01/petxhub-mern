import Pet from '../models/pet.js';

export const createPet=async(req,res)=>{
    try{
        const{name,breed,age,gender,weight,medicalNotes,adoptionStatus,location}=req.body;

        const pet = await Pet.create({
            name,breed,age,gender,weight,medicalNotes,adoptionStatus,location,owner:req.user._id
        })

        res.status(201).json({
            message:"Pet Created Succesfully",
            pet
        });
    }catch(error){
        return res.status(500).json({
            message:error.message
        });
    }
    
} 
//fetching mypets 
export const getMypets=async(req,res)=>{
    try{
        const pets=await Pet.find({owner:req.user._id});

        res.status(200).json({
            count:pets.length,
            pets
        })
    }catch(error){
        res.status(500).json({
            message:error.message
        });
    }
}
//fetching single pet 
export const getPetById=async(req,res)=>{
    try{
        const pet = await Pet.findById(req.params.id); 

        if(!pet){
            return res.status(404).json({
                message:"Pet Not Found"
            })
        }
        res.json(pet)
    }catch(error){
        return res.status(500).json({
            message:error.message
        })
    }
}
//Update Pets 
export const updatePets=async(req,res)=>{
    try{
        const pet=await Pet.findById(req.params.id);

        if(!pet){
            return res.status(404).json({message:"Pet not found"})
        }

        //checking ownership 
        if(pet.owner.toString()!==req.user._id.toString()){
            return res.status(403).json({message:"Not authorized to update this pet"})
        }

        //updating values 
        pet.name=req.body.name ?? pet.name
        pet.breed = req.body.breed ?? pet.breed
        pet.age = req.body.age ?? pet.age
        pet.gender = req.body.gender ?? pet.gender
        pet.weight = req.body.weight ?? pet.weight
        pet.medicalNotes = req.body.medicalNotes ?? pet.medicalNotes
        pet.adoptionStatus = req.body.adoptionStatus ?? pet.adoptionStatus
        pet.location = req.body.location ?? pet.location

        const updatedPet=await pet.save()

        res.status(200).json({
            message:"Updated Successfully",
            updatedPet
        })


    }
    catch(error){
        res.status(500).json({message:error.message})
    }
}
//delete pets 
export const deletePet=async(req,res)=>{
    try{
        const pet=await Pet.findById(req.params.id);

        if(!pet){
            return res.status(404).json({message:"Pet not found"})
        }

        if(pet.owner.toString()!==req.user._id.toString()){
            return res.status(403).json({message:"Not authorized to delete this pet"})
        }

        await pet.deleteOne();
        res.status(200).json({
            message:"Deleted Successfully"
        })
    }catch(error){
        res.status(500).json({message:error.message})
    }
}

// fetching adoptable pets
export const getAdoptablePets = async (req, res) => {
    try {
        const { location } = req.query;
        let query = {
            adoptionStatus: "available",
            owner: { $ne: req.user._id }
        };
        
        if (location) {
            query.location = { $regex: location, $options: "i" }; // Case-insensitive partial match
        }

        const pets = await Pet.find(query).populate('owner', 'name email phone');

        res.status(200).json({
            count: pets.length,
            pets
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
