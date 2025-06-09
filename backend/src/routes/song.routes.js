import { Router } from "express";
import multer from "multer";

import { authenticateToken, protectRouteMusician } from "../middleware/auth.middleware.js";

import { getAlbumSongs, getAllSongs, getFeaturedSongs, addSong, getSongsByArtist } from "../controllers/song.controller.js";

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

router.get("/all", getAllSongs);
router.get("/featured", getFeaturedSongs);
router.get("/album/:albumId", getAlbumSongs);
router.get("/artist/:address", getSongsByArtist);
router.post("/add", upload.fields([
    { name: 'imageFile', maxCount: 1 },
    { name: 'audioFile', maxCount: 1 }
  ]), authenticateToken, protectRouteMusician, addSong);

export default router;