package com.ielts.backend.service.profile;

import com.ielts.backend.config.LearnerProfileConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Objects;

/**
 * Pure updater for learner SubSkill mastery state (docs/learner-profile-rules.md, section 3).
 * Does not access any database.
 */
@Component
public class SkillStateUpdater {

    private final LearnerProfileConfig config;

    public SkillStateUpdater() {
        this(new LearnerProfileConfig());
    }

    @Autowired
    public SkillStateUpdater(LearnerProfileConfig config) {
        this.config = Objects.requireNonNull(config, "config must not be null");
    }

    public SkillState initialState() {
        return SkillState.initial(config.getInitialMastery());
    }

    /**
     * Applies one {@link ProfileEvent} to the given {@link SkillState} (or initial state if null).
     * <pre>
     * eta         = max(ETA_MIN, 1 / (evidence + OFFSET))
     * mastery'    = clamp(mastery + w * eta * (outcome - mastery), 0, 1)
     * evidence'   = evidence + w
     * lastUpdate' = event.time()
     * </pre>
     */
    public SkillState update(SkillState state, ProfileEvent event) {
        Objects.requireNonNull(event, "event must not be null");
        Objects.requireNonNull(event.type(), "event.type must not be null");

        SkillState current = state != null ? state : initialState();
        double w = weightOf(event.type());
        double y = clamp01(event.outcome());
        double eta = Math.max(config.getEtaMin(), 1.0 / (current.evidence() + config.getOffset()));
        double nextMastery = clamp01(current.mastery() + w * eta * (y - current.mastery()));
        double nextEvidence = current.evidence() + w;

        return new SkillState(nextMastery, nextEvidence, event.time());
    }

    public double weightOf(EventType type) {
        return switch (type) {
            case ERROR -> config.getWeightError();
            case CLEAN -> config.getWeightClean();
            case DRILL -> config.getWeightDrill();
        };
    }

    private static double clamp01(double value) {
        if (value < 0.0) {
            return 0.0;
        }
        if (value > 1.0) {
            return 1.0;
        }
        return value;
    }
}

