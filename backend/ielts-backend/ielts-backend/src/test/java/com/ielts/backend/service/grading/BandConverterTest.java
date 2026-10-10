package com.ielts.backend.service.grading;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Moved from ListeningGradingServiceTest together with the table. */
class BandConverterTest {

    private final BandConverter converter = new BandConverter();

    @Test
    void listening_standardScales() {
        assertThat(converter.listening(40, 40)).isEqualTo(9.0);
        assertThat(converter.listening(39, 40)).isEqualTo(9.0);
        assertThat(converter.listening(37, 40)).isEqualTo(8.5);
        assertThat(converter.listening(35, 40)).isEqualTo(8.0);
        assertThat(converter.listening(32, 40)).isEqualTo(7.5);
        assertThat(converter.listening(30, 40)).isEqualTo(7.0);
        assertThat(converter.listening(26, 40)).isEqualTo(6.5);
        assertThat(converter.listening(23, 40)).isEqualTo(6.0);
        assertThat(converter.listening(18, 40)).isEqualTo(5.5);
        assertThat(converter.listening(16, 40)).isEqualTo(5.0);
        assertThat(converter.listening(10, 40)).isEqualTo(4.0);
        assertThat(converter.listening(0, 40)).isEqualTo(0.0);
    }

    @Test
    void listening_scaledFor10Questions() {
        // 10 out of 10 -> scaled 40 -> Band 9.0
        assertThat(converter.listening(10, 10)).isEqualTo(9.0);
        // 8 out of 10 -> scaled 32 -> Band 7.5
        assertThat(converter.listening(8, 10)).isEqualTo(7.5);
        // 5 out of 10 -> scaled 20 -> Band 5.5
        assertThat(converter.listening(5, 10)).isEqualTo(5.5);
    }
}
