package com.example.lms.identity.application.dto;

public record DiscoverAuthOptionsResponse(
        String email,
        String displayName,
        boolean accountExists,
        boolean passwordLoginAvailable,
        boolean googleSignInAvailable,
        String nextStep,
        String googleUnavailableMessage
) {
    public static DiscoverAuthOptionsResponse password(String email, String displayName) {
        return new DiscoverAuthOptionsResponse(
                email,
                displayName,
                true,
                true,
                false,
                "PASSWORD",
                null
        );
    }

    public static DiscoverAuthOptionsResponse google(String email, String displayName) {
        return new DiscoverAuthOptionsResponse(
                email,
                displayName,
                true,
                false,
                true,
                "GOOGLE",
                null
        );
    }

    public static DiscoverAuthOptionsResponse register(String email) {
        return new DiscoverAuthOptionsResponse(
                email,
                null,
                false,
                false,
                false,
                "REGISTER",
                null
        );
    }
}
