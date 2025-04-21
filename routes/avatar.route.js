import { Router } from "express";
import avatarController from "../controllers/avatar.controller.js";

const router = new Router();

/**
 * User-specific avatar routes
 */
// Get hairstyles for a user
router.get('/user/:userId/hairstyles', 
  avatarController.getUserHairstyles
);

// Get outfits for a user
router.get('/user/:userId/outfits', 
  avatarController.getUserOutfits
);

// Update user's avatar
router.post('/user/:userId/avatar', 
  avatarController.updateUserAvatar
);

// Unlock a hairstyle or outfit for a user
router.post('/user/:userId/unlock', 
  avatarController.unlockAvatarItem
);

/**
 * Avatar combination routes
 */
// Get a specific avatar combination
router.get('/avatarcombination', 
  avatarController.getAvatarCombination
);

// Get all avatar combinations
router.get('/avatarcombinations', 
  avatarController.getAllAvatarCombinations
);

// Get avatar face combination
router.get('/avatarface', 
  avatarController.getAvatarFaceCombination
);


export default router;