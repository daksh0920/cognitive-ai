import apiClient from "../../../lib/apiClient";

export async function generateFlashcardSet(documentId, count = 10) {
  const response = await apiClient.post(`/documents/${documentId}/flashcard-sets`, { count });
  return response.data.data;
}

export async function getFlashcardSets(documentId) {
  const response = await apiClient.get(`/documents/${documentId}/flashcard-sets`);
  return response.data.data;
}

export async function getFlashcardSet(documentId, setId) {
  const response = await apiClient.get(`/documents/${documentId}/flashcard-sets/${setId}`);
  return response.data.data;
}

// Requires DELETE /api/v1/documents/:documentId/flashcard-sets/:setId.
export async function deleteFlashcardSet(documentId, setId) {
  const response = await apiClient.delete(`/documents/${documentId}/flashcard-sets/${setId}`);
  return response.data.data;
}
