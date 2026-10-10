package com.ielts.backend.service.grading;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AnswerNormalizerTest {

    @Test
    void ignoresCaseSurroundingSpacesAndPunctuation() {
        assertThat(AnswerNormalizer.normalize("  SPONGE. ")).isEqualTo("sponge");
        assertThat(AnswerNormalizer.normalize("\"Restaurants\"!")).isEqualTo("restaurants");
    }

    @Test
    void collapsesInnerSpacesButKeepsThem() {
        // "493826" and "493 826" are listed as separate accepted answers in the data
        assertThat(AnswerNormalizer.normalize("493   826")).isEqualTo("493 826");
        assertThat(AnswerNormalizer.normalize("493826")).isEqualTo("493826");
    }

    @Test
    void unifiesCurlyQuotesAndNonBreakingSpaces() {
        assertThat(AnswerNormalizer.normalize("students’ work")).isEqualTo("students' work");
        assertThat(AnswerNormalizer.normalize("city council")).isEqualTo("city council");
    }

    @Test
    void doesNotRewriteNumbersOrSymbols() {
        assertThat(AnswerNormalizer.normalize("19th")).isEqualTo("19th");
        assertThat(AnswerNormalizer.normalize("£85")).isEqualTo("£85");
    }

    @Test
    void nullBecomesEmpty() {
        assertThat(AnswerNormalizer.normalize(null)).isEmpty();
    }
}
