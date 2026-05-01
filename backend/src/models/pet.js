import mongoose from "mongoose";

const petSchema=new mongoose.Schema({
    name:{type:String,required:true},
    breed:{type:String},
    age:{type:Number},
    gender:{type:String,enum:["male","female"],required:true},
    weight:{type:Number},
    medicalNotes:{type:String},
    adoptionStatus: {
        type: String,
        enum: ["not_available", "available", "adopted"],
        default: "not_available"
    },
    location: { type: String },
    owner:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},

},
{timestamps:true}
);

export default mongoose.model("Pet",petSchema)
