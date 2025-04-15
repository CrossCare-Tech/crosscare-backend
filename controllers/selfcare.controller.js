// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();

// const selfcareController = {
//     // Get all self-care categories
//     getAllCategories: async (req, res) => {
//       try {
//         const categories = await prisma.selfCareCategory.findMany({
//           orderBy: {
//             title: 'asc',
//           },
//         });
  
//         // Transform to match the frontend format
//         const formattedCategories = categories.map(category => ({
//           id: category.id,
//           title: category.title,
//           iconType: category.iconType,
//           count: category.count,
//           contentType: category.contentType,
//           gradientColors: [
//             category.gradientStart,
//             category.gradientMiddle,
//             category.gradientEnd
//           ].filter(Boolean), // Remove null values
//         }));
  
//         res.status(200).json(formattedCategories);
//       } catch (error) {
//         console.error('Error fetching categories:', error);
//         res.status(500).json({ error: 'Failed to fetch categories' });
//       }
//     },
  
//     // Get category by ID
//     getCategoryById: async (req, res) => {
//       try {
//         const { id } = req.params;
  
//         const category = await prisma.selfCareCategory.findUnique({
//           where: { id },
//           include: {
//             exercises: true,
//             audioTracks: true,
//             stories: true,
//           },
//         });
  
//         if (!category) {
//           return res.status(404).json({ error: 'Category not found' });
//         }
  
//         // Format response based on contentType
//         let content = [];
//         if (category.contentType === 'EXERCISES') {
//           content = category.exercises;
//         } else if (category.contentType === 'AUDIOS') {
//           content = category.audioTracks;
//         } else if (category.contentType === 'STORIES') {
//           content = category.stories;
//         }
  
//         const response = {
//           id: category.id,
//           title: category.title,
//           iconType: category.iconType,
//           count: content.length,
//           contentType: category.contentType,
//           gradientColors: [
//             category.gradientStart,
//             category.gradientMiddle,
//             category.gradientEnd
//           ].filter(Boolean),
//           content,
//         };
  
//         res.status(200).json(response);
//       } catch (error) {
//         console.error('Error fetching category:', error);
//         res.status(500).json({ error: 'Failed to fetch category' });
//       }
//     },
  
//     // Get all exercises
//     getAllExercises: async (req, res) => {
//       try {
//         const exercises = await prisma.exercise.findMany({
//           orderBy: {
//             title: 'asc',
//           },
//         });
  
//         res.status(200).json(exercises);
//       } catch (error) {
//         console.error('Error fetching exercises:', error);
//         res.status(500).json({ error: 'Failed to fetch exercises' });
//       }
//     },
  
//     // Get exercise by ID
//     getExerciseById: async (req, res) => {
//       try {
//         const { id } = req.params;
  
//         const exercise = await prisma.exercise.findUnique({
//           where: { id },
//           include: {
//             category: true,
//           },
//         });
  
//         if (!exercise) {
//           return res.status(404).json({ error: 'Exercise not found' });
//         }
  
//         res.status(200).json(exercise);
//       } catch (error) {
//         console.error('Error fetching exercise:', error);
//         res.status(500).json({ error: 'Failed to fetch exercise' });
//       }
//     },
  
//     // Toggle favorite status for an exercise
//     toggleFavorite: async (req, res) => {
//       try {
//         const { id } = req.params;
//         const { patientId } = req.body;
  
//         if (!patientId) {
//           return res.status(400).json({ error: 'Patient ID is required' });
//         }
  
//         // Find the patient and exercise
//         const patient = await prisma.patient.findUnique({
//           where: { id: patientId },
//           include: {
//             favoriteExercises: {
//               where: { id },
//             },
//           },
//         });
  
//         if (!patient) {
//           return res.status(404).json({ error: 'Patient not found' });
//         }
  
//         const exercise = await prisma.exercise.findUnique({
//           where: { id },
//         });
  
//         if (!exercise) {
//           return res.status(404).json({ error: 'Exercise not found' });
//         }
  
//         const isFavorite = patient.favoriteExercises.length > 0;
  
//         // Toggle favorite status
//         if (isFavorite) {
//           // Remove from favorites
//           await prisma.patient.update({
//             where: { id: patientId },
//             data: {
//               favoriteExercises: {
//                 disconnect: { id },
//               },
//             },
//           });
//         } else {
//           // Add to favorites
//           await prisma.patient.update({
//             where: { id: patientId },
//             data: {
//               favoriteExercises: {
//                 connect: { id },
//               },
//             },
//           });
//         }
  
//         res.status(200).json({ isFavorite: !isFavorite });
//       } catch (error) {
//         console.error('Error toggling favorite:', error);
//         res.status(500).json({ error: 'Failed to toggle favorite' });
//       }
//     },
  
//     // Mark exercise as recently used
//     markAsRecentlyUsed: async (req, res) => {
//       try {
//         const { id } = req.params;
//         const { patientId } = req.body;
  
//         if (!patientId) {
//           return res.status(400).json({ error: 'Patient ID is required' });
//         }
  
//         // Find the patient and exercise
//         const patient = await prisma.patient.findUnique({
//           where: { id: patientId },
//         });
  
//         if (!patient) {
//           return res.status(404).json({ error: 'Patient not found' });
//         }
  
//         const exercise = await prisma.exercise.findUnique({
//           where: { id },
//         });
  
//         if (!exercise) {
//           return res.status(404).json({ error: 'Exercise not found' });
//         }
  
//         // Add to recently used
//         await prisma.patient.update({
//           where: { id: patientId },
//           data: {
//             recentExercises: {
//               connect: { id },
//             },
//           },
//         });
  
//         res.status(200).json({ success: true });
//       } catch (error) {
//         console.error('Error marking as recently used:', error);
//         res.status(500).json({ error: 'Failed to mark as recently used' });
//       }
//     },
  
//     // Get patient's favorite exercises
//     getFavoriteExercises: async (req, res) => {
//       try {
//         const { patientId } = req.params;
  
//         const patient = await prisma.patient.findUnique({
//           where: { id: patientId },
//           include: {
//             favoriteExercises: true,
//           },
//         });
  
//         if (!patient) {
//           return res.status(404).json({ error: 'Patient not found' });
//         }
  
//         res.status(200).json(patient.favoriteExercises);
//       } catch (error) {
//         console.error('Error fetching favorite exercises:', error);
//         res.status(500).json({ error: 'Failed to fetch favorite exercises' });
//       }
//     },
  
//     // Get patient's recently used exercises
//     getRecentExercises: async (req, res) => {
//       try {
//         const { patientId } = req.params;
  
//         const patient = await prisma.patient.findUnique({
//           where: { id: patientId },
//           include: {
//             recentExercises: {
//               orderBy: {
//                 updatedAt: 'desc',
//               },
//               take: 10, // Limit to the 10 most recent
//             },
//           },
//         });
  
//         if (!patient) {
//           return res.status(404).json({ error: 'Patient not found' });
//         }
  
//         res.status(200).json(patient.recentExercises);
//       } catch (error) {
//         console.error('Error fetching recent exercises:', error);
//         res.status(500).json({ error: 'Failed to fetch recent exercises' });
//       }
//     },
  
//     // Get audio tracks
//     getAudioTracks: async (req, res) => {
//       try {
//         const { categoryId } = req.query;
  
//         const whereClause = categoryId ? { categoryId } : {};
  
//         const audioTracks = await prisma.audio.findMany({
//           where: whereClause,
//           orderBy: {
//             title: 'asc',
//           },
//           include: {
//             category: true,
//           },
//         });
  
//         res.status(200).json(audioTracks);
//       } catch (error) {
//         console.error('Error fetching audio tracks:', error);
//         res.status(500).json({ error: 'Failed to fetch audio tracks' });
//       }
//     },
  
//     // Get stories
//     getStories: async (req, res) => {
//       try {
//         const { categoryId } = req.query;
  
//         const whereClause = categoryId ? { categoryId } : {};
  
//         const stories = await prisma.story.findMany({
//           where: whereClause,
//           orderBy: {
//             title: 'asc',
//           },
//           include: {
//             category: true,
//           },
//         });
  
//         res.status(200).json(stories);
//       } catch (error) {
//         console.error('Error fetching stories:', error);
//         res.status(500).json({ error: 'Failed to fetch stories' });
//       }
//     }
//   };
  
// export default selfcareController;