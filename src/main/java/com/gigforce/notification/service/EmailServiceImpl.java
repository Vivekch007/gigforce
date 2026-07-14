package com.gigforce.notification.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
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

    public EmailServiceImpl(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Async
    @Override
    public void sendPasswordResetEmail(String toEmail, String token) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            // You can replace this link with your actual Frontend URL route
            String resetToken = token;

            helper.setTo(toEmail);
            helper.setFrom("chintakrindi.lakshmivivek@cognizant.com", "GigForce");
            helper.setSubject("Password Reset Request - Gigforce");

            // Using HTML for a cleaner presentation
            String htmlContent = "<h3>Hello,</h3>"
                    + "<p>You requested to reset your password. Use the token below to set a new password:</p>"
                    + "<p><strong>" + resetToken + "</strong></p>"
                    + "<br>"
                    + "<p><strong>Note:</strong> This token will expire in 15 minutes.</p>"
                    + "<p>If you did not make this request, please ignore this email.</p>";

            helper.setText(htmlContent, true);

            mailSender.send(message);
            logger.info("Password reset email sent successfully to {}", toEmail);
        } catch (MessagingException | UnsupportedEncodingException e) {
            logger.error("Failed to send password reset email to {}", toEmail, e);
            throw new RuntimeException("Failed to send password reset email to " + toEmail, e);
        }
    }
}
