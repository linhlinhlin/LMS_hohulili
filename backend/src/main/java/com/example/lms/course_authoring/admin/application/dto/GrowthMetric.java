package com.example.lms.course_authoring.admin.application.dto;

/**
 * Growth metric comparing the current window to the immediately preceding window
 * of the same length.
 *
 * <p>{@code growthRate} is the percentage change ((this - last) / last) * 100.
 * It is {@code null} when {@code lastWindow == 0 && thisWindow > 0} so the FE can
 * render an explicit "—" / "+∞" indicator instead of a misleading percentage.
 */
public record GrowthMetric(
        long thisWindow,
        long lastWindow,
        Double growthRate
) {

    public static GrowthMetric of(long thisWindow, long lastWindow) {
        return new GrowthMetric(thisWindow, lastWindow, computeGrowthRate(thisWindow, lastWindow));
    }

    private static Double computeGrowthRate(long thisWindow, long lastWindow) {
        if (lastWindow == 0L) {
            return thisWindow == 0L ? 0.0 : null;
        }
        double rate = ((double) (thisWindow - lastWindow) / (double) lastWindow) * 100.0;
        return Math.round(rate * 10.0) / 10.0;
    }
}
