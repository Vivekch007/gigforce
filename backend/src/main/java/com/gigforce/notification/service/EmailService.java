package com.gigforce.notification.service;

public interface EmailService {
    void sendPasswordResetEmail(String to, String resetLink);
}
