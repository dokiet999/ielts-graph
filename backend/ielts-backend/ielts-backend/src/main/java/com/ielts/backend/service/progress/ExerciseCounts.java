package com.ielts.backend.service.progress;

import java.util.Map;
import java.util.UUID;

/**
 * Countable exercises and those completed by a user, keyed by course, section or lesson id
 * (ids are unique across the three tables, so one map holds every level).
 */
public record ExerciseCounts(Map<UUID, Integer> total, Map<UUID, Integer> completed) {

    public int total(UUID id) {
        return total.getOrDefault(id, 0);
    }

    public int completed(UUID id) {
        return completed.getOrDefault(id, 0);
    }
}
