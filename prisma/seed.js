import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create self-care categories
  const categories = [
    {
      title: "Cope with Nightmares",
      iconType: "cloud",
      count: 5,
      contentType: "EXERCISES",
      gradientStart: "#3949AB",
      gradientMiddle: "#5C6BC0",
      gradientEnd: "#7986CB",
    },
    {
      title: "For Deep Sleep",
      iconType: "moon",
      count: 8,
      contentType: "EXERCISES",
      gradientStart: "#303F9F",
      gradientMiddle: "#3F51B5",
      gradientEnd: "#5C6BC0",
    },
    {
      title: "Sleep Habit Pack",
      iconType: "cloud",
      count: 8,
      contentType: "EXERCISES",
      gradientStart: "#4527A0",
      gradientMiddle: "#00796B",
      gradientEnd: "#009688",
    },
    {
      title: "For Fresh Mornings",
      iconType: "sun",
      count: 5,
      contentType: "EXERCISES",
      gradientStart: "#00796B",
      gradientMiddle: "#009688",
      gradientEnd: "#00ACC1",
    },
    {
      title: "Remote Wellness Pack",
      iconType: "cloud",
      count: 7,
      contentType: "EXERCISES",
      gradientStart: "#3949AB",
      gradientMiddle: "#1976D2",
      gradientEnd: "#0288D1",
    },
    {
      title: "Calm your Mind",
      iconType: "feather",
      count: 10,
      contentType: "EXERCISES",
      gradientStart: "#4527A0",
      gradientMiddle: "#512DA8",
      gradientEnd: "#5E35B1",
    },
    {
      title: "Sleep Sounds",
      iconType: "cloud",
      count: 18,
      contentType: "AUDIOS",
      gradientStart: "#00796B",
      gradientMiddle: "#0097A7",
      gradientEnd: "#0288D1",
    },
    {
      title: "Sleep Stories",
      iconType: "cloud",
      count: 33,
      contentType: "STORIES",
      gradientStart: "#00796B",
      gradientMiddle: "#00838F",
      gradientEnd: "#006064",
    },
    {
      title: "Essential Wellness Pack",
      iconType: "cloud",
      count: 12,
      contentType: "EXERCISES",
      gradientStart: "#3949AB",
      gradientMiddle: "#303F9F",
      gradientEnd: "#1A237E",
    },
    {
      title: "Put Your Mind to Ease",
      iconType: "feather",
      count: 8,
      contentType: "EXERCISES",
      gradientStart: "#303F9F",
      gradientMiddle: "#283593",
      gradientEnd: "#1A237E",
    },
    {
      title: "My Favorites",
      iconType: "heart",
      count: 0,
      contentType: "EXERCISES",
      gradientStart: "#4A6FE1",
      gradientEnd: "#2C3E8C",
    },
    {
      title: "Recently Used",
      iconType: "landscape",
      count: 1,
      contentType: "EXERCISES",
      gradientStart: "#4A6FE1",
      gradientEnd: "#00BCD4",
    },
  ];

  // Create categories
  const createdCategories = {};
  for (const category of categories) {
    const created = await prisma.selfCareCategory.create({
      data: category,
    });
    createdCategories[category.title] = created;
    console.log(`Created category: ${created.title}`);
  }

  // Create exercises
  const defaultExercises = [
    {
      type: "Relaxing Exercises",
      title: "Breathe in Calm",
      duration: "7 min",
      image: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=60",
      isLocked: false,
      categoryId: createdCategories["Cope with Nightmares"].id,
      content: "This exercise guides you through a deep breathing technique to calm your mind and body before sleep.",
    },
    {
      type: "Mindfulness Exercise",
      title: "Feeling Safe",
      duration: "8 min",
      image: "https://images.unsplash.com/photo-1528715471579-d1bcf0ba5e83?w=800&auto=format&fit=crop&q=60",
      isLocked: true,
      categoryId: createdCategories["Cope with Nightmares"].id,
      content: "This guided meditation helps you create a mental safe space to retreat to when nightmares disturb your sleep.",
    },
    {
      type: "Grounding Technique",
      title: "Anchor Yourself",
      duration: "9 min",
      image: "https://images.unsplash.com/photo-1547104442-044448b73426?w=800&auto=format&fit=crop&q=60",
      isLocked: true,
      categoryId: createdCategories["For Deep Sleep"].id,
      content: "Learn to use grounding techniques to prepare your mind and body for deep, restorative sleep.",
    },
    {
      type: "Calming Breaths",
      title: "Breathe Deeply",
      duration: "4 min",
      image: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&auto=format&fit=crop&q=60",
      isLocked: true,
      categoryId: createdCategories["For Deep Sleep"].id,
      content: "A simple breathing exercise that slows your heart rate and prepares your body for deep sleep.",
    },
    {
      type: "Relaxing Exercises",
      title: "Soothe Your Mind",
      duration: "5 min",
      image: "https://images.unsplash.com/photo-1476611317561-60117649dd94?w=800&auto=format&fit=crop&q=60",
      isLocked: true,
      categoryId: createdCategories["Sleep Habit Pack"].id,
      content: "A gentle guided meditation to quiet an overactive mind before bedtime.",
    },
  ];

  for (const exercise of defaultExercises) {
    await prisma.exercise.create({
      data: exercise,
    });
    console.log(`Created exercise: ${exercise.title}`);
  }

  // Create audio tracks
  const audioTracks = [
    {
      title: "Gentle Piano",
      url: "https://file-examples.com/storage/fe8c7eef0c6364f6c9504cc/2017/11/file_example_MP3_700KB.mp3",
      duration: "3 min",
      categoryId: createdCategories["Sleep Sounds"].id,
    },
    {
      title: "Relaxing Music",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      duration: "5 min",
      categoryId: createdCategories["Sleep Sounds"].id,
    },
    {
      title: "Nature Sounds",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      duration: "4 min",
      categoryId: createdCategories["Sleep Sounds"].id,
    },
    {
      title: "Meditation Tones",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      duration: "7 min",
      categoryId: createdCategories["Sleep Sounds"].id,
    },
  ];

  for (const audio of audioTracks) {
    await prisma.audio.create({
      data: audio,
    });
    console.log(`Created audio track: ${audio.title}`);
  }

  // Create some sample stories
  const stories = [
    {
      title: "The Peaceful Forest",
      content: "Once upon a time, in a peaceful forest far away from the hustle and bustle of city life, there lived a wise old owl...",
      duration: "10 min",
      image: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=60",
      categoryId: createdCategories["Sleep Stories"].id,
    },
    {
      title: "Ocean Waves",
      content: "The gentle rhythm of ocean waves has a way of lulling us into tranquility. This story takes you on a journey along a peaceful shoreline...",
      duration: "12 min",
      image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=60",
      categoryId: createdCategories["Sleep Stories"].id,
    },
    {
      title: "Mountain Journey",
      content: "As you climb higher into the mountains, the air becomes crisp and clear. This story follows a peaceful trek through alpine meadows...",
      duration: "15 min",
      image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=60",
      categoryId: createdCategories["Sleep Stories"].id,
    },
  ];

  for (const story of stories) {
    await prisma.story.create({
      data: story,
    });
    console.log(`Created story: ${story.title}`);
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });