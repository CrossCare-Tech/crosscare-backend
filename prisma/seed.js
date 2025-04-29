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
        questionId: "q1-a", 
        text: "Do you live alone?",
        possibleFlag: null,
        order: 1.1,
      },
      {
        questionId: "q1-b",
        text: "Do you have an elevator that works?",
        possibleFlag: null,
        order: 1.2,
      },
      {
        questionId: "q1-c",
        text: "Will anyone come stay with you once you have the baby?",
        possibleFlag: "Housing instability / temporary housing",
        order: 1.3,
      },
      {
        questionId: "q1-d",
        text: "Who else lives in the home with you?",
        possibleFlag: null,
        order: 1.4,
      },
      {
        questionId: "q1-f",
        text: "What floor do you live on?",
        possibleFlag: null,
        order: 1.5,
      },
      {
        questionId: "q1-g",
        text: "Do you have your own room?",
        possibleFlag: null,
        order: 1.6,
      },
      {
        questionId: "q1-h",
        text: "Will you and the baby share a room or will they have their own?",
        possibleFlag: null,
        order: 1.7,
      },
      {
        questionId: "q1-i",
        text: "Will you and the baby share a room or will they have their own?",
        possibleFlag: null,
        order: 1.8,
      },
      {
        questionId: "q1-smoke",
        text: "Does anyone who lives in the home or that you are around a lot smoke?",
        possibleFlag: "Smoke exposure risk",
        order: 2.1,
      },
      {
        questionId: "q1-smoke-info",
        text: "Record information, effects of second hand smoke, tips?",
        possibleFlag: "Second-hand smoke exposure - provided information",
        order: 2.2,
      },
      {
        questionId: "q1-chemicals",
        text: "Does anyone in your home or who comes to your home a lot work in a factory or with chemicals?",
        possibleFlag: "Chemical exposure risk",
        order: 2.3,
      },
      {
        questionId: "q1-chemicals-info",
        text: "Have them change their clothes, shoes, and shower before coming in the home. Do not wash their work clothes. Explain why-potential exposure to chemicals",
        possibleFlag: "Chemical exposure - provided safety information",
        order: 2.4,
      },
      {
        questionId: "q1-neighborhood",
        text: "Do you feel safe in your neighborhood?",
        possibleFlag: "Neighborhood safety assessment",
        order: 6.1,
      },
      {
        questionId: "q1-unsafe-reason",
        text: "What would make you feel safer?",
        possibleFlag: "Neighborhood safety concerns",
        order: 6.2,
      },
      {
        questionId: "q1-home-unsafe",
        text: "Does anyone in your home make you feel unsafe because of physical or verbal abuse?",
        possibleFlag: "Domestic safety concern - HIGH PRIORITY",
        order: 6.3,
      },
      {
        questionId: "q1-highway",
        text: "Do you live close to a highway or area with a lot of car and truck traffic?",
        possibleFlag: "Air quality concern - traffic",
        order: 6.4,
      },
      {
        questionId: "q1-windows",
        text: "Do you open the windows for air?",
        possibleFlag: "Air quality management",
        order: 6.5,
      },
      {
        questionId: "q1-exhaust-info",
        text: "Trucks and car exaust can put out harmful chemicals",
        possibleFlag: "Air quality education provided",
        order: 6.6,
      },
      {
        questionId: "q1-construction",
        text: "Is there construction on old homes or businesses near your home?",
        possibleFlag: "Air quality concern - construction",
        order: 6.7,
      },
      {
        questionId: "q1-lead-info",
        text: "Try to keep the windows closed so you are breathing in less dust from outside and the home. This can cause lead poisoning.",
        possibleFlag: "Lead exposure risk - provided information",
        order: 6.8,
      },
      {
        questionId: "q1-air-filter",
        text: "Do you have an air filter?",
        possibleFlag: "Air quality management",
        order: 6.9,
      },
      {
        questionId: "q1-filter-info",
        text: "Try to keep the windows closed so you are breathing in less exhaust. Keep the filter clean.",
        possibleFlag: "Air filter maintenance education provided",
        order: 6.91,
      },
      {
        questionId: "q1-no-filter-info",
        text: "Try to keep the windows closed so you are breathing in less exhaust.",
        possibleFlag: "Air quality education provided",
        order: 6.92,
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
      {
        questionId: "q2-6",
        text: "How do you get to and from work, doctor appointments, and the grocery store?",
        possibleFlag: "Transportation",
        order: 6,
      },
      {
        questionId: "q2-7",
        text: "Do you have problems getting to these places because of transportation?",
        possibleFlag: "Transportation support needed",
        order: 7,
      },
      {
        questionId: "q2-8",
        text: "Please describe the transportation issues you have",
        possibleFlag: "Transportation support needed",
        order: 8,
      },
      {
        questionId: "q2-9",
        text: "Is there anyone that helps you with transportation?",
        possibleFlag: "Transportation support needed",
        order: 9,
      },
      {
        questionId: "q2-10",
        text: "If transporatio is unreliable, she has to walk or take the bus ask if she has a plan to do something differently when the baby comes",
        possibleFlag: "Transportation support needed",
        order: 10,
      },
      {
        questionId: "q2-11",
        text:"Are there any traditions or beliefs about pregnancy in you culture?",
        possibleFlag: "Cultural beliefs",
        order: 11,
      },
      {
        questionId: "q2-12",
        text: "Activities that you should or shoulnt do during pregnancy",
        possibleFlag: "Pregnancy education",
        order: 12,
      },
      {
        questionId: "q2-13",
        text: "Any foods that you should or shouldnt eat durning pregnancy in your culture",
        possibleFlag: "Cultural",
        order: 13,
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
        questionId: "q3-10",
        text: "Do you work?",
        possibleFlag: null,
        order: 3.1,
      },
      {
        questionId: "q3-11",
        text: "Are you paid per hour or do you have a set salary",
        possibleFlag: null,
        order: 3.2,
      },
      {
        questionId: "q3-12",
        text: "Do you have any worries about money with the baby coming",
        possibleFlag: null,
        order: 3.3,
      },
      {
        questionId: "q3-13",
        text: "Will you have enough income to meet your needs while you are on maternity leave",
        possibleFlag: null,
        order: 3.4,
      },
      {
        questionId: "q3-14",
        text: "What is you plan to support yourself and the baby during maternity leave? Do you need help?",
        possibleFlag: null,
        order: 3.5,
      },
      {
        questionId: "q3-15",
        text: "Do you worry about having enough food for you and your family?",
        possibleFlag: null,
        order: 3.6,
      },
      {
        questionId: "q3-16",
        text: "Do you always have enough food for you and your family?",
        possibleFlag: "Food insecurity",
        order: 3.7,
      },
      {
        questionId: "q3-17",
        text: "Do you have problems getting food especially fresh fruits and vegetables?",
        possibleFlag: null,
        order: 3.8,
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
      {
        questionId: "q3-a",
        text: "Is this your first pregnancy?",
        possibleFlag: "First pregnancy assessment",
        order: 6.1,
      },
      {
        questionId: "q3-b",
        text: "Was this planned?",
        possibleFlag: null,
        order: 6.2,
      },
      {
        questionId: "q3-c",
        text: "What was the result of the pregnancy?",
        possibleFlag: null,
        order: 6.3,
      },
      {
        questionId: "q3-d",
        text: "How do you feel about the pregnancy and having a baby?",
        possibleFlag: null,
        order: 6.4,
      },
      {
        questionId: "q3-e",
        text: "Abortion?",
        possibleFlag: null,
        order: 6.5,
      },
      {
        questionId: "q3-f",
        text: "Is the father excited/happy?",
        possibleFlag: null,
        order: 6.6,
      },
      {
        questionId: "q3-g",
        text: "How does your family feel?",
        possibleFlag: null,
        order: 6.7,
      },
      {
        questionId: "q3-h",
        text: "Who is a part of your support system?",
        possibleFlag: null,
        order: 6.8,
      },
      {
        questionId: "q3-i",
        text: "Are there other family members that cause you stress? Why",
        possibleFlag: null,
        order: 6.9,
      },
      {
        questionId: "q3-j",
        text: "Are you still in a relationship with the baby's father?",
        possibleFlag: null,
        order: 7.0,
      },
      {
        questionId: "q3-k",
        text: "Does he have any other children? If yes is do you have any stress caused by his previous child's mother and/or family",
        possibleFlag: null,
        order: 7.1,
      },
      {
        questionId: "q3-l",
        text: "Were you able to carry the baby full term?",
        possibleFlag: null,
        order: 7.2,
      },
      {
        questionId: "q3-m",
        text: "Were there any issues during pregnancy and/or birth?",
        possibleFlag: null,
        order: 7.3,
      },
      {
        questionId: "q3-n",
        text: "What was the baby's weight, How old is your baby?",
        possibleFlag: null,
        order: 7.4,
      },
      {
        questionId: "q3-o",
        text: "Does your other child/children know that you are pregnant?",
        possibleFlag: null,
        order: 7.5,
      },
      {
        questionId: "q3-p",
        text: "What was their reaction?",
        possibleFlag: null,
        order: 7.6,
      },
      {
        questionId: "q3-q",
        text: "How did their reaction make you feel?",
        possibleFlag: null,
        order: 7.7,
      },
      {
        questionId: "q3-r",
        text: "Do you have any child care issue with your current child/children?",
        possibleFlag: null,
        order: 7.8,
      },
      {
        questionId: "q3-s",
        text: "Will having another baby cause any more stress?",
        possibleFlag: null,
        order: 7.9,
      },
      {
        questionId: "q3-t",
        text: "Do you have any stress connected to your children?",
        possibleFlag: null,
        order: 8.0,
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
      {
        questionId: "q4-5",
        text: "What is you favorite thing to eat?",
        possibleFlag: null,
        order: 4.1,
      },
      {
        questionId: "q4-6",
        text: "Are you having any cravings?",
        possibleFlag: null,
        order: 4.2,
      },
      {
        questionId: "q4-7",
        text: "Are there any foods that make you feel sick?",
        possibleFlag: null,
        order: 4.3,
      },
      {
        questionId: "q4-8",
        text: "Any foods that you should or shouldnt eat durning pregnancy in your culture?",
        possibleFlag: null,
        order: 4.4,
      },
      {
        questionId: "q4-9",
        text: "Do you have a birthing plan?",
        possibleFlag: null,
        order: 4.5,
      },
      {
        questionId: "q4-10",
        text: "Have you thought about how you want to give birth? Who will be in the room? Have you taken any classes or do you plan to?",
        possibleFlag: null,
        order: 4.6,
      },
      {
        questionId: "q4-11",
        text: "What is your perfect way to give birth? Do want pain medications? Who do you want in the room with you?",
        possibleFlag: null,
        order: 4.7,
      },
      {
        questionId: "q4-13",
        text: "Describe your birthing plan I can record it for you",
        possibleFlag: null,
        order: 4.8,
      },
      {
        questionId: "q4-14",
        text: "Prompt videos on birthing plan give the option to bookmark for later",
        possibleFlag: null,
        order: 4.9,
      },
      {
        questionId: "q4-15",
        text: "Describe your birthing plan I can record it for you",
        possibleFlag: null,
        order: 5.0,
      },
      {
        questionId: "q4-16",
        text: "Do you plan to breastfeed?",
        possibleFlag: null,
        order: 5.1,
      },
      {
        questionId: "q4-17",
        text: "Are you nervous about breastfeeding? Do you have assistance with breastfeeding?",
        possibleFlag: null,
        order: 5.2,
      },
      {
        questionId: "q4-18",
        text: "Did you breastfeed before? Did you have any trouble?",
        possibleFlag: null,
        order: 5.3,
      },
      {
        questionId: "q4-19",
        text: "Did you breastfeed before? Did you have any trouble?",
        possibleFlag: null,
        order: 5.4,
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
  {
    id: "domain-7",
    name: "domain-7",
    title: "DOMAIN VII",
    description: "Stressors",
    order: 7,
    questions:[
      {
        questionId: "q7-1",
        text: "How was your day?",
        possibleFlag: "Stressors",
        order: 1,
      },
      {
        questionId: "q7-2",
        text: "Are you having any stress?  What is stressing you?",
        possibleFlag: "Stressors",
        order: 2,
      },
      {
        questionId: "q7-3",
        text: "Who do you talk to when you are stressed?",
        possibleFlag: "Stressors",
        order: 3,
      },
      {
        questionId: "q7-4",
        text: "What do you do to deal with stress?",
        possibleFlag: "Stressors",
        order: 4,
      },
      {
        questionId: "q7-5",
        text: "Do you feel like it helps?",
        possibleFlag: "Stressors",
        order: 5,
      },
      {
        questionId: "q7-6",
        text: " How often do you feel stressed?",
        possibleFlag: "Stressors",
        order: 6,
      },
      {
        questionId: "q7-7",
        text: "Discuss why you feel stressed so often?",
        possibleFlag: "Stressors",
        order: 7,
      },
      {
        questionId: "q7-8",
        text: "Do you stress about the same thing everyday or multiple times?",
        possibleFlag: "Stressors",
        order: 8,
      },
    ]
  }
];

async function main() {
  console.log('Seeding database...');

  // Create domains and their questions
   for (const domain of QUESTIONNAIRE_DOMAINS) {
    const { questions, ...domainData } = domain;
    
    console.log(`Processing domain: ${domainData.title}`);
    
    // Process questions for domain regardless of whether domain already exists
    for (const question of questions) {
      try {
        // Check if the question already exists
        const existingQuestion = await prisma.question.findFirst({
          where: {
            questionId: question.questionId,
            domainId: domain.id,
          },
        });
        
        if (existingQuestion) {
          console.log(`Question ${question.questionId} already exists, skipping`);
        } else {
          // Create the question
          const createdQuestion = await prisma.question.create({
            data: {
              ...question,
              domainId: domain.id,
            },
          });
          console.log(`Created question: ${question.questionId}`);
        }
      } catch (error) {
        console.log(`Error processing question ${question.questionId}: ${error.message}`);
      }
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