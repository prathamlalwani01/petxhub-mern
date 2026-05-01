import mongoose from "mongoose";
const userSchema=new mongoose.Schema(
    {
        name:{
            type:String,
            required:true
        },
        email:{
            type:String,
            required:true,
            unique:true
        },
        password:{
            type:String,
            required:true
        },
        phone:{
            type:String
        },
        role:{
            type:String,
            enum:["user","provider","admin"],
        },
        accountStatus: {
            type: String,
            enum: ["active", "suspended"],
            default: "active"
        },
        isEmailVerified:{
            type:Boolean,
            default:false
        },
        emailVerificationOTP:{
            type:String
        },
        emailVerificationOTPExpires:{
            type:Date
        },
        passwordResetOTP:{
            type:String
        },
        passwordResetOTPExpires:{
            type:Date
        }
    },
    {
        timestamps:true
    }
);
const User=mongoose.model("User",userSchema);
export default User;
