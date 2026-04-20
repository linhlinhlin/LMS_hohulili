package com.example.lms.identity.application.port;

import com.example.lms.identity.application.dto.VerifiedGoogleIdentity;

public interface GoogleIdentityVerifierPort {

    VerifiedGoogleIdentity verifyIdToken(String idToken);
}
