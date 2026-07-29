package com.gigforce.notification.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.UnsupportedEncodingException;

@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailServiceImpl.class);
    private final JavaMailSender mailSender;

    // Gmail rejects a From address that differs from the authenticated account,
    // so the sender must match spring.mail.username.
    @Value("${spring.mail.username}")
    private String fromAddress;

    public EmailServiceImpl(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }


    @Override
    public void sendPasswordResetEmail(String toEmail, String token) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();

            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "utf-8");

            String htmlContent = "<h3>Hello,</h3>"
                    + "<p>You requested to reset your password. Use the token below to set a new password:</p>"
                    + "<p><strong>" + token + "</strong></p>"
                    + "<br>"
                    + "<p><strong>Note:</strong> This token will expire in 15 minutes.</p>"
                    + "<p>If you did not make this request, please ignore this email.</p>";

            helper.setTo(toEmail);
            helper.setSubject("Forgot Password Token");
            helper.setText(htmlContent, true);
            mailSender.send(mimeMessage);

            logger.info("Password reset email sent successfully to {}", toEmail);
        } catch (Exception e) {
            logger.error("Failed to send password reset email to {}", toEmail, e);
            throw new RuntimeException("Failed to send password reset email to " + toEmail, e);
        }
     }
}
