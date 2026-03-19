package com.example.lms.learning_delivery.infrastructure.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@Slf4j
public class VideoPipelineStartupValidator {

    private final Environment environment;

    @Value("${cloudflare.r2.enabled:false}")
    private boolean r2Enabled;

    public VideoPipelineStartupValidator(Environment environment) {
        this.environment = environment;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void validateProductionVideoPipeline() {
        if (!environment.acceptsProfiles(Profiles.of("prod"))) {
            return;
        }

        boolean shakaAvailable = isShakaPackagerAvailable();
        if (r2Enabled && shakaAvailable) {
            log.info("[VideoPipeline] Production video stack ready: R2 private storage + Shaka Packager.");
            return;
        }

        log.warn(
                "[VideoPipeline] Production is not on the target video stack. Expected R2 + Shaka Packager, but current config is R2={}, Shaka={}. Uploads may still work, but adaptive playback will not be fully available until both are ready.",
                r2Enabled,
                shakaAvailable
        );
    }

    private boolean isShakaPackagerAvailable() {
        try {
            Process process = new ProcessBuilder("packager", "--version")
                    .redirectErrorStream(true)
                    .start();
            int exitCode = process.waitFor();
            return exitCode == 0;
        } catch (IOException ex) {
            return false;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return false;
        }
    }
}
