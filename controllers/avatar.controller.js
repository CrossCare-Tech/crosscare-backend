import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Image Paths Constants
const HAIRSTYLES_DIR = '/images/only_hairs/';
const OUTFITS_DIR = '/images/only_costumes/';
const AVATAR_FACE_DIR = '/images/hairs/';
const AVATAR_COSTUME_DIR = '/images/hairs/';

/**
 * Get all available hairstyles for a specific user
 */
const getUserHairstyles = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { unlockedHairstyles: true }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all hairstyles
    const allHairstyles = await prisma.hairstyle.findMany({
      orderBy: { id: 'asc' }
    });

    // Mark hairstyles as unlocked or locked based on user's level and unlocked items
    const hairstyles = allHairstyles.map(hairstyle => {
      const isUnlocked = user.level >= hairstyle.unlockLevel || 
        user.unlockedHairstyles.some(uh => uh.hairstyleId === hairstyle.id);
      
      return {
        ...hairstyle,
        locked: !isUnlocked,
        grayScale: !isUnlocked,
      };
    });

    res.json({ data: hairstyles });
  } catch (error) {
    console.error('Error getting hairstyles:', error);
    res.status(500).json({ message: 'Failed to get hairstyles' });
  }
};

/**
 * Get all available outfits for a specific user
 */
const getUserOutfits = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { unlockedOutfits: true }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all outfits
    const allOutfits = await prisma.outfit.findMany({
      orderBy: { id: 'asc' }
    });

    // Mark outfits as unlocked or locked based on user's level and unlocked items
    const outfits = allOutfits.map(outfit => {
      const isUnlocked = user.level >= outfit.unlockLevel || 
        user.unlockedOutfits.some(uo => uo.outfitId === outfit.id);
      
      return {
        ...outfit,
        locked: !isUnlocked,
        grayScale: !isUnlocked,
      };
    });

    res.json({ data: outfits });
  } catch (error) {
    console.error('Error getting outfits:', error);
    res.status(500).json({ message: 'Failed to get outfits' });
  }
};

/**
 * Get avatar combination for a specific hairstyle and outfit
 */
const getAvatarCombination = async (req, res) => {
  try {
    const { hairstyleId, outfitId } = req.query;
    
    if (!hairstyleId || !outfitId) {
      return res.status(400).json({ message: 'Both hairstyleId and outfitId are required' });
    }

    const combination = await prisma.avatarCombination.findUnique({
      where: { 
        hairstyleId_outfitId: { 
          hairstyleId: parseInt(hairstyleId),
          outfitId: parseInt(outfitId)
        }
      }
    });

    if (!combination) {
      return res.status(404).json({ message: 'Avatar combination not found' });
    }

    res.json({ data: combination });
  } catch (error) {
    console.error('Error getting avatar combination:', error);
    res.status(500).json({ message: 'Failed to get avatar combination' });
  }
};

/**
 * Get all avatar combinations
 */
const getAllAvatarCombinations = async (req, res) => {
  try {
    // Return all possible combinations of hairstyles and outfits
    const combinations = await prisma.avatarCombination.findMany();
    
    res.json({ data: combinations });
  } catch (error) {
    console.error('Error getting avatar combinations:', error);
    res.status(500).json({ message: 'Failed to get avatar combinations' });
  }
};

/**
 * Get avatar face image (for hairstyle preview with outfit)
 */
const getAvatarFaceCombination = async (req, res) => {
  try {
    const { hairstyleId, outfitId } = req.query;
    
    if (!hairstyleId || !outfitId) {
      return res.status(400).json({ message: 'Both hairstyleId and outfitId are required' });
    }
    
    // Get the face combination
    const combination = await prisma.avatarFaceCombination.findUnique({
      where: {
        hairstyleId_outfitId: {
          hairstyleId: parseInt(hairstyleId),
          outfitId: parseInt(outfitId)
        }
      }
    });

    if (!combination) {
      return res.status(404).json({ message: 'Avatar face combination not found' });
    }

    res.json({ data: combination });
  } catch (error) {
    console.error('Error getting avatar face combination:', error);
    res.status(500).json({ message: 'Failed to get avatar face combination' });
  }
};

/**
 * Update user's avatar (upload image and update avatar selection)
 */
const updateUserAvatar = async (req, res) => {
  try {
    const { userId } = req.params;
    const { hairstyleId, outfitId } = req.body;

    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate if the user has access to the selected hairstyle and outfit
    if (hairstyleId) {
      const hairstyle = await prisma.hairstyle.findUnique({ where: { id: parseInt(hairstyleId) } });
      
      if (!hairstyle) {
        return res.status(404).json({ message: 'Hairstyle not found' });
      }
      
      const userHairstyle = await prisma.userHairstyle.findUnique({
        where: { userId_hairstyleId: { userId, hairstyleId: parseInt(hairstyleId) } }
      });
      
      if (!userHairstyle && user.level < hairstyle.unlockLevel) {
        return res.status(403).json({ message: 'This hairstyle is locked for your level' });
      }
    }

    if (outfitId) {
      const outfit = await prisma.outfit.findUnique({ where: { id: parseInt(outfitId) } });
      
      if (!outfit) {
        return res.status(404).json({ message: 'Outfit not found' });
      }
      
      const userOutfit = await prisma.userOutfit.findUnique({
        where: { userId_outfitId: { userId, outfitId: parseInt(outfitId) } }
      });
      
      if (!userOutfit && user.level < outfit.unlockLevel) {
        return res.status(403).json({ message: 'This outfit is locked for your level' });
      }
    }

    // Create the URL for the uploaded file
    let avatarUrl = user.avatarUrl; // Default to current avatar URL
    
    if (req.file) {
      avatarUrl = `/uploads/avatars/${req.file.filename}`;
    }

    // Update user's avatar
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl,
        ...(hairstyleId && { hairstyleId: parseInt(hairstyleId) }),
        ...(outfitId && { outfitId: parseInt(outfitId) }),
      }
    });

    res.json({
      message: 'Avatar updated successfully',
      data: {
        avatarUrl: updatedUser.avatarUrl,
        hairstyleId: updatedUser.hairstyleId,
        outfitId: updatedUser.outfitId
      }
    });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ message: 'Failed to update avatar' });
  }
};

/**
 * Unlock a specific avatar item for a user (for in-app purchases or achievements)
 */
const unlockAvatarItem = async (req, res) => {
  try {
    const { userId } = req.params;
    const { itemType, itemId } = req.body;
    
    // Validate input
    if (!itemType || !itemId || !['hairstyle', 'outfit'].includes(itemType)) {
      return res.status(400).json({ message: 'Invalid request parameters' });
    }
    
    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Handle different item types
    if (itemType === 'hairstyle') {
      // Check if the hairstyle exists
      const hairstyle = await prisma.hairstyle.findUnique({
        where: { id: parseInt(itemId) }
      });
      
      if (!hairstyle) {
        return res.status(404).json({ message: 'Hairstyle not found' });
      }
      
      // Check if it's already unlocked
      const existing = await prisma.userHairstyle.findUnique({
        where: { 
          userId_hairstyleId: { 
            userId, 
            hairstyleId: parseInt(itemId) 
          }
        }
      });
      
      if (existing) {
        return res.status(400).json({ message: 'Hairstyle already unlocked' });
      }
      
      // Unlock the hairstyle
      await prisma.userHairstyle.create({
        data: {
          userId,
          hairstyleId: parseInt(itemId)
        }
      });
      
      res.json({ message: 'Hairstyle unlocked successfully' });
    } else if (itemType === 'outfit') {
      // Check if the outfit exists
      const outfit = await prisma.outfit.findUnique({
        where: { id: parseInt(itemId) }
      });
      
      if (!outfit) {
        return res.status(404).json({ message: 'Outfit not found' });
      }
      
      // Check if it's already unlocked
      const existing = await prisma.userOutfit.findUnique({
        where: { 
          userId_outfitId: { 
            userId, 
            outfitId: parseInt(itemId) 
          }
        }
      });
      
      if (existing) {
        return res.status(400).json({ message: 'Outfit already unlocked' });
      }
      
      // Unlock the outfit
      await prisma.userOutfit.create({
        data: {
          userId,
          outfitId: parseInt(itemId)
        }
      });
      
      res.json({ message: 'Outfit unlocked successfully' });
    }
  } catch (error) {
    console.error('Error unlocking item:', error);
    res.status(500).json({ message: 'Failed to unlock item' });
  }
};

export default {
  getUserHairstyles,
  getUserOutfits,
  updateUserAvatar,
  getAvatarCombination,
  getAllAvatarCombinations,
  getAvatarFaceCombination,
  unlockAvatarItem
};