import apiClient from "../../../lib/apiClient";

export async function generateSummary(documentId) {
  const response = await apiClient.post(`/documents/${documentId}/summary`);
  return response.data.data;
}

export async function explainConcept(documentId, topic) {
  const response = await apiClient.post(`/documents/${documentId}/explain`, { topic });
  return response.data.data;
}
