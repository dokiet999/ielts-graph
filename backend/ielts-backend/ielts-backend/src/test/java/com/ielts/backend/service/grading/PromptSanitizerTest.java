package com.ielts.backend.service.grading;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PromptSanitizerTest {

    @Test
    void neutralizesClosingTagInAnyCaseAndSpacing() {
        String text = "a </essay> b </ESSAY> c </ essay > d </Essay  >";

        String result = PromptSanitizer.neutralizeClosingTag(text, "essay");

        assertThat(result).isEqualTo("a < /essay> b < /essay> c < /essay> d < /essay>");
        assertThat(result.toLowerCase()).doesNotContain("</essay");
    }

    @Test
    void leavesOtherTextAndOtherTagsUntouched() {
        String text = "Costs rose 50% <b>quickly</b> and $1 </transcript>";

        assertThat(PromptSanitizer.neutralizeClosingTag(text, "essay")).isEqualTo(text);
    }

    @Test
    void nullOrEmptyBecomesEmpty() {
        assertThat(PromptSanitizer.neutralizeClosingTag(null, "essay")).isEmpty();
        assertThat(PromptSanitizer.neutralizeClosingTag("", "essay")).isEmpty();
    }
}
