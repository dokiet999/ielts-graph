package com.ielts.backend.service.llm;

/**
 * Abstraction over LLM providers (Google Gemini, OpenAI, etc.).
 */
public interface LlmClient {

    /**
     * Send a user prompt to the LLM and return raw response text.
     *
     * @param prompt prompt text
     * @return raw response string
     */
    String chat(String prompt);

    /**
     * Send a system instruction and user prompt to the LLM and return raw response text.
     *
     * @param systemInstruction system instruction text
     * @param userPrompt user prompt text
     * @return raw response string
     */
    default String chat(String systemInstruction, String userPrompt) {
        if (systemInstruction == null || systemInstruction.isBlank()) {
            return chat(userPrompt);
        }
        return chat(systemInstruction + "\n\n" + userPrompt);
    }

    /**
     * Returns the name/id of the model used, e.g. "gemini-2.5-flash".
     */
    String getModelName();
}
