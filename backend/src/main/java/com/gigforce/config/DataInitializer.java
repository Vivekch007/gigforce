package com.gigforce.config;

import com.gigforce.audit.service.AuditService;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.identity.enums.UserStatus;
import com.gigforce.identity.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public DataInitializer(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuditService auditService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // Seed admin user
        if (!userRepository.existsByEmail("admin@gigforce.com")) {
            User admin = User.builder()
                    .name("Admin User")
                    .email("admin@gigforce.com")
                    .password(passwordEncoder.encode("Admin@123"))
                    .phone("1234567890")
                    .role(UserRole.ADMIN)
                    .status(UserStatus.ACTIVE)
                    .build();

            User savedAdmin = userRepository.save(admin);
            System.out.println("Seeded Default Admin User: admin@gigforce.com");

            // Audit Logging
            auditService.logAction(
                    savedAdmin.getId(),
                    "USER_REGISTRATION",
                    "USER",
                    savedAdmin.getId(),
                    "System initialized default Admin user 'admin@gigforce.com' successfully"
            );
        }
    }
}
