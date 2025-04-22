import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const QUESTIONNAIRE_DOMAINS = [
  {
    id: "domain-1",
    name: "domain-1",
    title: "DOMAIN I",
    description: "Housing & Environment",
    order: 1,
    questions: [
      {
        questionId: "q1-1",
        text: "What is your current housing situation?",
        possibleFlag: "Housing instability / temporary housing",
        order: 1,
      },
      {
        questionId: "q1-2",
        text: "Are you worried about losing your housing in the near future?",
        possibleFlag: "Housing insecurity",
        order: 2,
      },
      {
        questionId: "q1-3",
        text: "Have any utility companies threatened to shut off your services?",
        possibleFlag: "Utilities support needed",
        order: 3,
      },
      {
        questionId: "q1-4",
        text: "Any trouble getting to medical appointments or work due to transportation?",
        possibleFlag: "Transportation barrier",
        order: 4,
      },
      {
        questionId: "q1-5",
        text: "Do you feel safe where you live?",
        possibleFlag: "Home safety concern",
        order: 5,
      },
      {
        questionId: "q1-6",
        text: "Any concerns about your neighborhood, or safety?",
        possibleFlag: "Neighborhood safety concern",
        order: 6,
      },
    ],
  },
  {
    id: "domain-2",
    name: "domain-2",
    title: "DOMAIN II",
    description: "Safety & Demographics",
    order: 2,
    questions: [
      {
        questionId: "q2-1",
        text: "What race or ethnicity do you identify with?",
        possibleFlag: null,
        order: 1,
      },
      {
        questionId: "q2-2",
        text: "Are you Hispanic or Latino?",
        possibleFlag: null,
        order: 2,
      },
      {
        questionId: "q2-3",
        text: "Have you been hurt or threatened by someone in the past year?",
        possibleFlag: "Interpersonal violence",
        order: 3,
      },
      {
        questionId: "q2-4",
        text: "Have you felt afraid of your current or past partner?",
        possibleFlag: "Urgent safety referral",
        order: 4,
      },
      {
        questionId: "q2-5",
        text: "Has anyone taken money from you or withheld it unfairly?",
        possibleFlag: "Financial abuse",
        order: 5,
      },
    ],
  },
  {
    id: "domain-3",
    name: "domain-3",
    title: "DOMAIN III",
    description: "Education & Employment",
    order: 3,
    questions: [
      {
        questionId: "q3-1",
        text: "What is the highest level of education you've completed?",
        possibleFlag: null,
        order: 1,
      },
      {
        questionId: "q3-2",
        text: "What is your current work status?",
        possibleFlag: "Employment support needed",
        order: 2,
      },
      {
        questionId: "q3-3",
        text: "Is it hard to afford basic needs?",
        possibleFlag: "Financial strain",
        order: 3,
      },
      {
        questionId: "q3-4",
        text: "Would you like help finding a job?",
        possibleFlag: "Referral to workforce navigator",
        order: 4,
      },
      {
        questionId: "q3-5",
        text: "Interested in help with school or job training?",
        possibleFlag: "Education support",
        order: 5,
      },
      {
        questionId: "q3-6",
        text: "Do you need better daycare?",
        possibleFlag: "Childcare need",
        order: 6,
      },
    ],
  },
  {
    id: "domain-4",
    name: "domain-4",
    title: "DOMAIN IV",
    description: "Food & Physical Activity",
    order: 4,
    questions: [
      {
        questionId: "q4-1",
        text: "Have you worried about running out of food?",
        possibleFlag: "Food insecurity",
        order: 1,
      },
      {
        questionId: "q4-2",
        text: "Did the food you bought ever not last?",
        possibleFlag: "Food insecurity",
        order: 2,
      },
      {
        questionId: "q4-3",
        text: "Can you get enough healthy food?",
        possibleFlag: "Healthy food access",
        order: 3,
      },
      {
        questionId: "q4-4",
        text: "How often do you exercise per week?",
        possibleFlag: "Physical activity support",
        order: 4,
      },
    ],
  },
  {
    id: "domain-5",
    name: "domain-5",
    title: "DOMAIN V",
    description: "Home Environment",
    order: 5,
    questions: [
      {
        questionId: "q5-1",
        text: "Do you have any issues in your home, like mold, pests, or no heat?",
        possibleFlag: "Environmental hazard, refer to housing services",
        order: 1,
      },
    ],
  },
  {
    id: "domain-6",
    name: "domain-6",
    title: "DOMAIN VI",
    description: "Language & Communication",
    order: 6,
    questions: [
      {
        questionId: "q6-1",
        text: "What language are you most comfortable speaking?",
        possibleFlag: null,
        order: 1,
      },
      {
        questionId: "q6-2",
        text: "Do you often need help reading medical materials?",
        possibleFlag: "Health literacy / translation support",
        order: 2,
      },
    ],
  },
];

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



  // Create domains and their questions
  for (const domain of QUESTIONNAIRE_DOMAINS) {
    const { questions, ...domainData } = domain;
    
    try {
      // Find existing domain
      const existingDomain = await prisma.questionnaireDomain.findUnique({
        where: { id: domainData.id },
      });
      
      if (existingDomain) {
        console.log(`Domain ${domainData.title} already exists, skipping creation`);
        continue;
      }
      
      // Create domain data object - just use the domain data directly
      // Don't try to reference questionnaire which might not exist
      const createdDomain = await prisma.questionnaireDomain.create({
        data: domainData,
      });
      
      console.log(`Created domain: ${createdDomain.title}`);
      
      // Create questions for this domain
      for (const question of questions) {
        try {
          const createdQuestion = await prisma.question.create({
            data: {
              ...question,
              domainId: createdDomain.id,
            },
          });
          console.log(`Created question: ${createdQuestion.text.substring(0, 30)}...`);
        } catch (error) {
          console.log(`Error creating question ${question.questionId}: ${error.message}`);
        }
      }
    } catch (error) {
      console.log(`Error processing domain ${domainData.title}: ${error.message}`);
    }
  }


  console.log(`\nSeeding completed successfully!`);
}



  // Create domains and their questions

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });