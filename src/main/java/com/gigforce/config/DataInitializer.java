package com.gigforce.config;

import com.gigforce.audit.service.AuditService;
import com.gigforce.identity.entity.Organization;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.identity.enums.UserStatus;
import com.gigforce.identity.repository.OrganizationRepository;
import com.gigforce.identity.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DataInitializer implements CommandLineRunner {

    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public DataInitializer(
            OrganizationRepository organizationRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuditService auditService
    ) {
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // Seed default organization
        Organization defaultOrg;
        if (!organizationRepository.existsByCode("GF_DEFAULT")) {
            defaultOrg = Organization.builder()
                    .name("GigForce Default Org")
                    .code("GF_DEFAULT")
                    .status("ACTIVE")
                    .build();
            defaultOrg = organizationRepository.save(defaultOrg);
            System.out.println("Seeded Default Organization: GF_DEFAULT");
        } else {
            defaultOrg = organizationRepository.findByCode("GF_DEFAULT").orElseThrow();
        }

        // Seed admin user
        if (!userRepository.existsByEmail("admin@gigforce.com")) {
            User admin = User.builder()
                    .name("Admin User")
                    .email("admin@gigforce.com")
                    .password(passwordEncoder.encode("Admin@123"))
                    .phone("1234567890")
                    .orgUnit(defaultOrg)
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
