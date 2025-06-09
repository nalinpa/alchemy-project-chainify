import mongoose from "mongoose";

const SongSchema = mongoose.Schema({
    title: {type: String, required: true},
    artistName: {type: String, required: true},
    artistWallet: {type: String, required: true},
    imageUrl: {type: String, required: true},
    audioUrl: {type: String, required: true},
    duration: {type: Number, required: true},
    albumId: {type: mongoose.Schema.Types.ObjectId, ref: 'Album', required: false},
}, { timestamps: true });

const Song = mongoose.model("Song", SongSchema);
export default Song;