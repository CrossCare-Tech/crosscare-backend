import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const submitResponse = async (req, res) => {
    const patientId = req.params.id;
    const { domainId, questionId, response, flag, timestamp = new Date() } = req.body; // Ensure UTC timestamp
  
    try {
      // Validate required fields
      if (!patientId || !domainId || !questionId || response === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: patientId, domainId, questionId, and response are required'
        });
      }
  
      // Verify patient exists
      const patientExists = await prisma.patient.findUnique({
        where: { id: patientId }
      });
  
      if (!patientExists) {
        return res.status(404).json({
          success: false,
          error: `Patient with ID ${patientId} not found`
        });
      }
  
      // Find the question from the database
      const question = await prisma.question.findFirst({
        where: { 
          questionId: questionId,
          domainId: domainId
        }
      });
  
      if (!question) {
        return res.status(404).json({
          success: false,
          error: `Question with ID ${questionId} in domain ${domainId} not found`
        });
      }
  
      // Check if the patient already responded to this question
      const existingResponse = await prisma.questionResponse.findFirst({
        where: { 
          patientId, 
          questionId: question.id 
        }
      });
  
      let savedResponse;
      if (existingResponse) {
        // Update the existing response
        savedResponse = await prisma.questionResponse.update({
          where: { id: existingResponse.id },
          data: {
            response,  // Update the response
            flag,      // Update the flag
            timestamp: new Date(timestamp)  // Update the timestamp in UTC
          }
        });
      } else {
        // Create a new response
        savedResponse = await prisma.questionResponse.create({
          data: {
            patient: { connect: { id: patientId } },
            question: { connect: { id: question.id } },
            domainId,
            response,
            flag,
            timestamp: new Date(timestamp)  // Set timestamp to UTC
          }
        });
      }
  
      return res.status(existingResponse ? 200 : 201).json({
        success: true,
        message: existingResponse ? 'Response updated successfully' : 'Response saved successfully',
        data: savedResponse,
      });
  
    } catch (error) {
      console.error('Error saving questionnaire response:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'An error occurred while saving the response'
      });
    }
  };
  
  const getAnsweredQuestions = async (req, res) => {
    const { patientId } = req.params;
    try {
  
      if (!patientId) {
        return res.status(400).json({
          success: false,
          error: 'Patient ID is required'
        });
      }
  
      const patient = await prisma.patient.findUnique({
        where: { id: patientId }
      });
  
      if (!patient) {
        return res.status(404).json({
          success: false,
          error: `Patient with ID ${patientId} not found`
        });
      }
  
      // Get all question responses for this patient without ordering by timestamp
      const questionResponses = await prisma.questionResponse.findMany({
        where: { patientId },
        include: {
          question: {
            include: {
              domain: true
            }
          }
        }
      });
  
      // Create a Map to keep track of the latest responses for each question
      // Create a Map to keep track of the latest responses for each question
        const latestResponsesMap = {};

        questionResponses.forEach(response => {
            const actualQuestionId = response.question.questionId;

        if (
            !latestResponsesMap[actualQuestionId] ||
            new Date(response.timestamp) > new Date(latestResponsesMap[actualQuestionId].timestamp)
        ) {
            latestResponsesMap[actualQuestionId] = response;
        }
        });

      
  
      // Convert the map into an array of responses (latest responses for each question)
      const latestResponses = Object.values(latestResponsesMap);
  
      // Group responses by domain
      const groupedByDomain = {};
  
      latestResponses.forEach(response => {
        const domain = response.question.domain;
  
        if (!groupedByDomain[domain.id]) {
          groupedByDomain[domain.id] = {
            id: domain.id,
            title: domain.title,
            description: domain.description,
            questions: [],
          };
        }
  
        groupedByDomain[domain.id].questions.push({
          id: response.question.questionId,
          text: response.question.text,
          response: response.response,
          flag: response.flag,
        });

        Object.values(groupedByDomain).forEach(domain => {
            domain.questions.sort((a, b) => a.id.localeCompare(b.id));
          });
      });
  
      const domainData = Object.values(groupedByDomain);
  
      return res.status(200).json({
        success: true,
        count: latestResponses.length,
        data: domainData,
      });
    } catch (error) {
      console.error('Error fetching answered questions:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'An error occurred while fetching answered questions'
      });
    }
  };
  
  
  
  
  const getQuestionnaireResponses = async (req, res) => {
    try {
      const { questionnaireId } = req.params;
  
      // Validate questionnaireId
      if (!questionnaireId) {
        return res.status(400).json({
          success: false,
          error: 'Questionnaire ID is required'
        });
      }
  
      // Check if questionnaire exists
      const questionnaire = await prisma.questionnaire.findUnique({
        where: { id: questionnaireId }
      });
  
      if (!questionnaire) {
        return res.status(404).json({
          success: false,
          error: `Questionnaire with ID ${questionnaireId} not found`
        });
      }
  
      // Get all question responses for this questionnaire
      const questionResponses = await prisma.questionResponse.findMany({
        where: { questionnaireId },
        include: {
          question: {
            include: {
              domain: true
            }
          }
        },
        orderBy: [
          {
            question: {
              domain: {
                order: 'asc'
              }
            }
          },
          {
            question: {
              order: 'asc'
            }
          }
        ]
      });
  
      // Format the response data
      const formattedResponses = questionResponses.map(response => ({
        responseId: response.id,
        questionId: response.question.questionId,
        questionText: response.question.text,
        response: response.response,
        flag: response.flag,
        timestamp: response.timestamp,
        domain: {
          id: response.question.domain.id,
          name: response.question.domain.name,
          title: response.question.domain.title,
          description: response.question.domain.description
        }
      }));
  
      return res.status(200).json({
        success: true,
        patientId: questionnaire.patientId,
        startedAt: questionnaire.startedAt,
        completedAt: questionnaire.completedAt,
        isCompleted: questionnaire.isCompleted,
        count: formattedResponses.length,
        data: formattedResponses
      });
    } catch (error) {
      console.error('Error fetching questionnaire responses:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'An error occurred while fetching questionnaire responses'
      });
    }
  };

export default {
  submitResponse,
    getAnsweredQuestions,
    getQuestionnaireResponses
};