import { Router } from "express";
import multer from "multer";

import { getAllAlbums, getAlbumById, addAlbum, buyAlbum,getAlbumsByArtist, confirmAlbumPublication, getAlbumPublicationStatus, getFeaturedAlbums } from "../controllers/album.controller.js";
import { authenticateToken, protectRouteMusician, protectRouteUser } from "../middleware/auth.middleware.js";

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

router.get("/all", getAllAlbums);
router.get("/featured", getFeaturedAlbums);
router.get("/:albumId", getAlbumById);
router.get("/artist/:address", getAlbumsByArtist);
router.put("/confirm/:albumId", authenticateToken, protectRouteMusician, confirmAlbumPublication);
router.get("/published/:albumId", authenticateToken, protectRouteMusician, getAlbumPublicationStatus);
router.post("/add", upload.single("image"), authenticateToken, protectRouteMusician, addAlbum);
router.post("/buy", authenticateToken, protectRouteUser, buyAlbum);


export default router;