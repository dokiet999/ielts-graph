package com.ielts.backend.service.grading;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Normalises free-text answers before they are compared with the answer key (SRS 2.2.2.1):
 * case, surrounding spaces, repeated spaces, surrounding punctuation and curly quotes.
 * <p>
 * It deliberately does not remove inner spaces or turn numbers into words: the data team lists
 * every accepted spelling as an alternative answer (e.g. "493826" / "493 826", "19" / "19th" / "nineteenth").
 */
public final class AnswerNormalizer {

    private static final Pattern SPACES = Pattern.compile("\\s+");
    private static final Pattern EDGE_PUNCTUATION = Pattern.compile("^[\\p{Punct}\\s]+|[\\p{Punct}\\s]+$");

    private AnswerNormalizer() {
    }

    public static String normalize(String answer) {
        if (answer == null) {
            return "";
        }
        String text = answer
                .replace('‘', '\'').replace('’', '\'')
                .replace('“', '"').replace('”', '"')
                .replace(' ', ' ');
        text = SPACES.matcher(text.trim()).replaceAll(" ");
        text = EDGE_PUNCTUATION.matcher(text).replaceAll("");
        return text.toLowerCase(Locale.ROOT);
    }
}
