package com.ielts.backend.service.grading;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Keeps learner text inside the data tag of a prompt. The system prompts tell the LLM that only the text
 * between {@code <essay>...</essay>} (or {@code <transcript>...</transcript>}) is learner data, so learner
 * text must not be able to close that tag early and add text the LLM would read as instructions.
 */
public final class PromptSanitizer {

    private static final Map<String, Pattern> CLOSING_TAGS = new ConcurrentHashMap<>();

    private PromptSanitizer() {
    }

    /**
     * Rewrites every closing tag {@code </tag>} in the learner text (any case, spaces allowed, for example
     * {@code </ ESSAY >}) to {@code < /tag>}, which the LLM still reads as text but which no longer closes the tag.
     *
     * @param text learner text, may be null
     * @param tag  tag name without brackets, for example "essay"
     * @return the text with closing tags neutralised, never null
     */
    public static String neutralizeClosingTag(String text, String tag) {
        if (text == null || text.isEmpty()) {
            return "";
        }
        Pattern pattern = CLOSING_TAGS.computeIfAbsent(tag,
                t -> Pattern.compile("(?i)</\\s*" + Pattern.quote(t) + "\\s*>"));
        return pattern.matcher(text).replaceAll(Matcher.quoteReplacement("< /" + tag + ">"));
    }
}
