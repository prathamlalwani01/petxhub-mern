import express from "express";
import { createPet,getMypets,getPetById,updatePets,deletePet,getAdoptablePets } from "../controllers/petController.js";
import { protect } from "../middleware/authMiddleware.js";

const router=express.Router();

router.post('/',protect,createPet);
router.get('/adoptable', protect, getAdoptablePets);
router.get('/',protect,getMypets);
router.get('/:id',protect,getPetById);
router.put('/:id',protect,updatePets);
router.delete('/:id',protect,deletePet)

export default router;
