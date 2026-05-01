import mongoose, { Schema } from "mongoose";
const bookingSchema=new mongoose.Schema({
    user:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
    pet:{type:mongoose.Schema.Types.ObjectId,ref:"Pet",required:true},
    service:{type:mongoose.Schema.Types.ObjectId,ref:"Service"},
    bookingCategory:{type:String,enum:["service","vet","grooming"],default:"service"},
    appointmentType:{type:String,trim:true},
    appointmentMode:{type:String,enum:["in-clinic","online"],default:"in-clinic"},
    concern:{type:String,trim:true},
    groomingPackage:{type:String,trim:true},
    groomingMode:{type:String,enum:["at-home","in-salon"],default:"in-salon"},
    petSize:{type:String,enum:["small","medium","large","giant"]},
    notes:{type:String,trim:true},
    bookingDate:{type:Date,required:true},
    timeSlot:{type:String,required:true},
    status:{type:String,enum:["pending","confirmed","completed","cancelled"],default:"pending"},
    paymentMethod:{type:String,enum:["online","pay-later"],default:"online"},
    paymentStatus:{type:String,enum:["pending","paid","failed"],default:"pending"},
    amount:{type:Number,default:0},
    currency:{type:String,default:"INR"},
    paymentOrderId:{type:String,trim:true},
    paymentId:{type:String,trim:true},
    paymentSignature:{type:String,trim:true},
    paidAt:{type:Date}
},{timestamps:true})

export default mongoose.model("Booking",bookingSchema);
