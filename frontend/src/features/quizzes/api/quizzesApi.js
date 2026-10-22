import apiClient from "../../../lib/apiClient";

export async function getDocumentQuizzes(documentId) {
  const response = await apiClient.get(`/documents/${documentId}/quizzes`);
  return response.data.data;
}

export async function generateDocumentQuiz(documentId, questionCount = 5) {
  const response = await apiClient.post(`/documents/${documentId}/quizzes`, { questionCount });
  return response.data.data;
}

export async function getDocumentQuiz(documentId, quizId) {
  const response = await apiClient.get(`/documents/${documentId}/quizzes/${quizId}`);
  return response.data.data;
}

// The UI tracks selections by position; convert them to database question IDs.
export async function submitDocumentQuiz(documentId, quizId, answers = {}) {
  const payload = await getDocumentQuiz(documentId, quizId);
  const quiz = payload?.quiz ?? payload?.data?.quiz;
  if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    throw new Error("Unable to load the quiz questions for submission.");
  }

  const answerList = quiz.questions.map((question, index) => ({
    questionId: String(question._id),
    selectedIndex: answers[index] === undefined || answers[index] === null
      ? null
      : Number(answers[index]),
  }));

  const response = await apiClient.post(
    `/documents/${documentId}/quizzes/${quizId}/attempts`,
    { answers: answerList }
  );
  return response.data.data;
}

export async function getDocumentQuizAttempt(documentId, quizId, attemptId) {
  const [quizPayload, attemptResponse] = await Promise.all([
    getDocumentQuiz(documentId, quizId),
    apiClient.get(`/documents/${documentId}/quizzes/${quizId}/attempts/${attemptId}`),
  ]);
  const quiz = quizPayload?.quiz ?? quizPayload?.data?.quiz;
  const attempt = attemptResponse.data?.data?.attempt;
  if (!attempt) throw new Error("The saved quiz attempt could not be found.");
  return {
    quiz: { ...(quiz ?? {}), documentId, questions: attempt.answers ?? [] },
    attempt,
  };
}

// Requires DELETE /documents/:documentId/quizzes/:quizId on the backend.
export async function deleteDocumentQuiz(documentId, quizId) {
  const response = await apiClient.delete(`/documents/${documentId}/quizzes/${quizId}`);
  return response.data;
}
