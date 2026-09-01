import api from "@/lib/axios";

/**
 * Get the current user's saved preferences.
 */
export const fetchPreferencesApi = async () => {
  return await api.get("/preferences");
};

/**
 * Save the current user's preferences.
 */
export const updatePreferencesApi = async (preferences) => {
  return await api.patch("/preferences", preferences);
};