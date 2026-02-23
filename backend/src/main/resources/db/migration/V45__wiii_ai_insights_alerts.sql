-- =====================================================================
-- V45: Wiii AI Insights & Alerts tables
-- Sprint 175: "Cam Phich Cam" — Store AI-generated insights and alerts
-- pushed from Wiii AI service to LMS.
-- =====================================================================

-- AI insights for students (pushed by Wiii)
CREATE TABLE IF NOT EXISTS ai_insights (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL,
    insight_type    VARCHAR(50) NOT NULL,  -- recommendation, alert, summary, strength, weakness
    content         TEXT NOT NULL,
    metadata        JSONB DEFAULT '{}',
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_ai_insights_user FOREIGN KEY (student_id) REFERENCES users(id)
);

-- AI alerts for teachers/admins (pushed by Wiii)
CREATE TABLE IF NOT EXISTS ai_alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       UUID,
    alert_type      VARCHAR(50) NOT NULL,  -- at_risk_student, low_engagement, content_gap
    content         TEXT NOT NULL,
    student_ids     JSONB DEFAULT '[]',    -- affected student UUIDs
    metadata        JSONB DEFAULT '{}',
    is_resolved     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_ai_alerts_course FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- Indexes
CREATE INDEX idx_ai_insights_student_id ON ai_insights(student_id);
CREATE INDEX idx_ai_insights_type ON ai_insights(insight_type);
CREATE INDEX idx_ai_insights_created_at ON ai_insights USING BRIN(created_at);
CREATE INDEX idx_ai_alerts_course_id ON ai_alerts(course_id);
CREATE INDEX idx_ai_alerts_type ON ai_alerts(alert_type);
CREATE INDEX idx_ai_alerts_created_at ON ai_alerts USING BRIN(created_at);
