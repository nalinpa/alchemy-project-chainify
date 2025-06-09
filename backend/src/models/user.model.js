import mongoose from "mongoose";

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: false,
    },
    address: {
        type: String,
        required: true,
        unique: true,
    },
    isMusician: {
        type: Boolean,
        required: true,
        default: false,
    },
    pic: {
        type: String,
        required: true,
        default:
            "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
    },
    boughtAlbums: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Album' 
        }],
        default: [] 
        },
    
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
export default User;