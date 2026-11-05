package com.ielts.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Parameters for the learner skill profile update formula (docs/learner-profile-rules.md, section 3).
 */
@Configuration
@ConfigurationProperties(prefix = "app.profile")
@Getter
@Setter
public class LearnerProfileConfig {

    /** Start mastery value of a new learner (default 0.5). */
    private double initialMastery = 0.5;

    /** Minimum learning rate so the profile never becomes frozen (default 0.10). */
    private double etaMin = 0.10;

    /** Denominator offset in eta = max(etaMin, 1 / (evidence + offset)) (default 3.0). */
    private double offset = 3.0;

    /** Weight of an ERROR event (default 1.0). */
    private double weightError = 1.0;

    /** Weight of a CLEAN event (default 0.3). */
    private double weightClean = 0.3;

    /** Weight of a DRILL event (default 1.0). */
    private double weightDrill = 1.0;
}

