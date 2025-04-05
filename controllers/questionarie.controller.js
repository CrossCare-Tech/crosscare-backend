import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const submitResponse = async (req, res) => {

    const patientId = req.params.id;
    console.log('Patient ID:', patientId); // Log the patient ID for debugging
    const { 
        domainId, 
        questionId, 
        response, 
        flag, 
        timestamp = new Date() 
      } = req.body;

      console.log('Request body:', req.body); // Log the request body for debugging
  try {
    

    // Validate required fields
    if (!patientId || !domainId || !questionId || response === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: patientId, domainId, questionId, and response are required'
      });
    }

    // IMPORTANT: First verify the patient exists
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
      where: { questionId }
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        error: `Question with ID ${questionId} not found`
      });
    }

    // Find or create an active questionnaire for this patient
    let questionnaire = await prisma.questionnaire.findFirst({
      where: {
        patientId,
        isActive: true,
        isCompleted: false
      }
    });

    if (!questionnaire) {
      try {
        questionnaire = await prisma.questionnaire.create({
          data: {
            patientId,
            isActive: true,
            startedAt: new Date(timestamp)
          }
        });
        console.log(`Created new questionnaire with ID: ${questionnaire.id}`);
      } catch (error) {
        console.error('Error creating questionnaire:', error);
        return res.status(500).json({
          success: false,
          error: `Failed to create questionnaire: ${error.message}`
        });
      }
    }

    // Create the question response
    const savedResponse = await prisma.questionResponse.create({
      data: {
        patientId,
        questionId: question.id,
        domainId: question.domainId,
        response,
        flag,
        timestamp: new Date(timestamp),
        questionnaireId: questionnaire.id
      }
    });

    // Get complete question details for the response
    const questionDetails = await prisma.question.findUnique({
      where: { id: question.id },
      include: {
        domain: true
      }
    });

    // Return detailed response
    res.status(201).json({
      success: true,
      message: 'Response saved successfully',
      data: savedResponse,
      questionAnswered: {
        questionId: questionId,
        questionText: questionDetails.text,
        domain: {
          id: questionDetails.domain.name,
          title: questionDetails.domain.title,
          description: questionDetails.domain.description
        }
      }
    });
  } catch (error) {
    console.error('Error saving questionnaire response:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while saving the response'
    });
  }
};

const getAnsweredQuestions = async (req, res) => {
    const { patientId } = req.params;
    console.log('Patient ID:', patientId); // Log the patient ID for debugging
    try {
  
      // Validate patientId
      if (!patientId) {
        return res.status(400).json({
          success: false,
          error: 'Patient ID is required'
        });
      }
  
      // Check if patient exists
      const patient = await prisma.patient.findUnique({
        where: { id: patientId }
      });
  
      if (!patient) {
        return res.status(404).json({
          success: false,
          error: `Patient with ID ${patientId} not found`
        });
      }
  
      // Get all question responses for this patient
      const questionResponses = await prisma.questionResponse.findMany({
        where: { patientId },
        include: {
          question: {
            include: {
              domain: true
            }
          }
        },
        orderBy: {
          timestamp: 'desc'
        }
      });
  
      // Format the response data
      const formattedResponses = questionResponses.map(response => ({
        responseId: response.id,
        questionId: response.question.questionId,
        id: response.question.domain.id,
        title: response.question.domain.title,
        questionText: response.question.text,
        flag: response.flag,
        response: response.response,
        description: response.question.domain.description,
        timestamp: response.timestamp,
      }));
  
      return res.status(200).json({
        success: true,
        count: formattedResponses.length,
        data: formattedResponses
      });
    } catch (error) {
      console.error('Error fetching answered questions:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'An error occurred while fetching answered questions'
      });
    }
  };
  
  /**
   * Get all questions answered in a specific questionnaire
   */
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