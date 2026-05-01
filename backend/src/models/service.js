import mongoose from "mongoose";
const serviceSchema=new mongoose.Schema({
    name:{type:String,required:true},
    description:{type:String},
    price:{type:Number,required:true},
    duration:{type:Number},
    serviceSource:{type:String,enum:["petxhub","partner"],default:"partner"},
    fulfillmentMode:{type:String,enum:["in-store","partner-location","at-home","online"],default:"partner-location"},
    locationName:{type:String,trim:true},
    address:{type:String,trim:true},
    mapLink:{type:String,trim:true},
    imageUrl:{type:String,trim:true},
    provider:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
    isActive:{type:Boolean,default:true}

},{timestamps:true})

const Service=mongoose.model("Service",serviceSchema);
export default Service;
