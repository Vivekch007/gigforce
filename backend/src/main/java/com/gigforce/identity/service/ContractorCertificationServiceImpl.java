package com.gigforce.identity.service;

import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.CertificationNotFoundException;
import com.gigforce.exception.ContractorProfileNotFoundException;
import com.gigforce.identity.dto.ContractorCertificationRequestDTO;
import com.gigforce.identity.dto.ContractorCertificationResponseDTO;
import com.gigforce.identity.dto.ContractorCertificationUpdateRequestDTO;
import com.gigforce.identity.entity.ContractorCertification;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.CertificationStatus;
import com.gigforce.identity.repository.ContractorCertificationRepository;
import com.gigforce.identity.repository.ContractorProfileRepository;
import com.gigforce.identity.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

import com.gigforce.exception.BusinessValidationException;

@Service
@Transactional(readOnly = true)
public class ContractorCertificationServiceImpl implements ContractorCertificationService {

        private final ContractorCertificationRepository contractorCertificationRepository;
        private final ContractorProfileRepository contractorProfileRepository;
        private final UserRepository userRepository;
        private final AuditService auditService;
        private final ContractorProfileService contractorProfileService;

        public ContractorCertificationServiceImpl(
                        ContractorCertificationRepository contractorCertificationRepository,
                        ContractorProfileRepository contractorProfileRepository,
                        UserRepository userRepository,
                        AuditService auditService,
                        ContractorProfileService contractorProfileService) {
                this.contractorCertificationRepository = contractorCertificationRepository;
                this.contractorProfileRepository = contractorProfileRepository;
                this.userRepository = userRepository;
                this.auditService = auditService;
                this.contractorProfileService = contractorProfileService;
        }

        @Override
        @Transactional
        public ContractorCertificationResponseDTO addCertification(String profileId,
                        ContractorCertificationRequestDTO request) {
                ContractorProfile profile = contractorProfileRepository.findById(profileId)
                                .orElseThrow(() -> new ContractorProfileNotFoundException(
                                                 "Contractor profile not found with ID: " + profileId));

                if (request.getExpiryDate() != null && (request.getExpiryDate().isBefore(request.getIssueDate()) || request.getExpiryDate().isEqual(request.getIssueDate()))) {
                        throw new BusinessValidationException("Certification expiry date cannot be before issue date.");
                }

                List<ContractorCertification> existingCerts = contractorCertificationRepository
                                .findByContractorProfile(profile);
                boolean duplicateExists = existingCerts.stream()
                                .anyMatch(c -> c.getName().equalsIgnoreCase(request.getName().trim()));
                if (duplicateExists) {
                        throw new BusinessValidationException(
                                         "Certification with the same name already exists on this profile.");
                }

                CertificationStatus status = null;
                LocalDate currentDate = getCurrentDate();
                if (request.getExpiryDate() != null && request.getExpiryDate().isBefore(currentDate)) {
                        status = CertificationStatus.EXPIRED;
                } else {
                        status = CertificationStatus.VALID;
                }

                ContractorCertification cert = ContractorCertification.builder()
                                .contractorProfile(profile)
                                .name(request.getName().trim())
                                .issuingAuthority(request.getIssuingAuthority().trim())
                                .certificateNumber(request.getCertificateNumber() != null
                                                 ? request.getCertificateNumber().trim()
                                                 : null)
                                .issueDate(request.getIssueDate())
                                .expiryDate(request.getExpiryDate())
                                .certStatus(status)
                                .build();

                ContractorCertification saved = contractorCertificationRepository.save(cert);

                // Update Profile Completion
                contractorProfileService.updateProfileCompletion(profile.getId());

                // Audit Logging
                String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
                User actor = userRepository.findByEmail(actorEmail).orElse(null);
                String actorId = (actor != null) ? actor.getId() : profile.getUser().getId();

                auditService.logAction(
                                actorId,
                                "CONTRACTOR_CERTIFICATION_ADDED",
                                "ContractorProfile",
                                profile.getId(),
                                "Certification '" + saved.getName() + "' added to profile of user: "
                                                + profile.getUser().getEmail());

                return toDto(saved);
        }

        @Override
        public List<ContractorCertificationResponseDTO> getCertificationsByProfileId(String profileId) {
                ContractorProfile profile = contractorProfileRepository.findById(profileId)
                                .orElseThrow(() -> new ContractorProfileNotFoundException(
                                                "Contractor profile not found with ID: " + profileId));

                return contractorCertificationRepository.findByContractorProfile(profile)
                                .stream()
                                .map(this::toDto)
                                .collect(Collectors.toList());
        }

        @Override
        @Transactional
        public ContractorCertificationResponseDTO updateCertification(String profileId, String certId,
                                                                      ContractorCertificationUpdateRequestDTO request) {

                if (profileId == null) {
                        throw new BusinessValidationException("Profile ID cannot be null");
                }
                ContractorProfile profile = contractorProfileRepository.findById(profileId)
                                .orElseThrow(() -> new ContractorProfileNotFoundException(
                                                 "Contractor profile not found with ID: " + profileId));

                ContractorCertification cert = contractorCertificationRepository.findById(certId)
                                .orElseThrow(() -> new CertificationNotFoundException(
                                                 "Certification not found with ID: " + certId));

                if (!cert.getContractorProfile().getId().equals(profile.getId())) {
                        throw new BusinessValidationException("Certification does not belong to the specified profile.");
                }

                // Partial update: only touch expiry when the request supplies it (avoid wiping existing value).
                if (request.getExpiryDate() != null) {
                        if (request.getExpiryDate().isBefore(cert.getIssueDate()) || request.getExpiryDate().isEqual(cert.getIssueDate())) {
                                throw new BusinessValidationException("Certification expiry date cannot be before issue date.");
                        }
                        cert.setExpiryDate(request.getExpiryDate());
                }

                // Only override status when explicitly provided; otherwise keep the current one.
                if (request.getCertStatus() != null && !request.getCertStatus().trim().isEmpty()) {
                        try {
                                cert.setCertStatus(CertificationStatus.valueOf(request.getCertStatus().trim().toUpperCase()));
                        } catch (IllegalArgumentException e) {
                                throw new BusinessValidationException("certStatus must be one of: valid, expired, revoked");
                        }
                }

                // Keep status consistent with the expiry date unless it was explicitly revoked.
                if (cert.getCertStatus() != CertificationStatus.REVOKED) {
                        if (cert.getExpiryDate() != null && cert.getExpiryDate().isBefore(getCurrentDate())) {
                                cert.setCertStatus(CertificationStatus.EXPIRED);
                        } else if (cert.getCertStatus() == null) {
                                cert.setCertStatus(CertificationStatus.VALID);
                        }
                }

                ContractorCertification updated = contractorCertificationRepository.save(cert);

                // Update Profile Completion
                contractorProfileService.updateProfileCompletion(profile.getId());

                // Audit Logging
                String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
                User actor = userRepository.findByEmail(actorEmail).orElse(null);
                String actorId = (actor != null) ? actor.getId() : profile.getUser().getId();

                auditService.logAction(
                                actorId,
                                "CONTRACTOR_CERTIFICATION_UPDATED",
                                "ContractorProfile",
                                profile.getId(),
                                "Certification '" + updated.getName() + "' updated on profile of user: "
                                                + profile.getUser().getEmail());

                return toDto(updated);
        }

        @Override
        @Transactional
        public void deleteCertification(String profileId, String certId) {
                ContractorProfile profile = contractorProfileRepository.findById(profileId)
                                .orElseThrow(() -> new ContractorProfileNotFoundException(
                                                 "Contractor profile not found with ID: " + profileId));

                ContractorCertification cert = contractorCertificationRepository.findById(certId)
                                .orElseThrow(() -> new CertificationNotFoundException(
                                                 "Certification not found with ID: " + certId));

                if (!cert.getContractorProfile().getId().equals(profile.getId())) {
                        throw new BusinessValidationException("Certification does not belong to the specified profile.");
                }

                contractorCertificationRepository.delete(cert);

                // Update Profile Completion
                contractorProfileService.updateProfileCompletion(profile.getId());

                // Audit Logging
                String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
                User actor = userRepository.findByEmail(actorEmail).orElse(null);
                String actorId = (actor != null) ? actor.getId() : profile.getUser().getId();

                auditService.logAction(
                                actorId,
                                "CONTRACTOR_CERTIFICATION_REMOVED",
                                "ContractorProfile",
                                profile.getId(),
                                "Certification '" + cert.getName() + "' removed from profile of user: "
                                                + profile.getUser().getEmail());
        }

        private LocalDate getCurrentDate() {
                return LocalDate.now();
        }

        private ContractorCertificationResponseDTO toDto(ContractorCertification cert) {
                CertificationStatus status = cert.getCertStatus();
                if (cert.getExpiryDate() != null && getCurrentDate().isAfter(cert.getExpiryDate())) {
                        status = CertificationStatus.EXPIRED;
                }
                return ContractorCertificationResponseDTO.builder()
                                .id(cert.getId())
                                .contractorProfileId(cert.getContractorProfile().getId())
                                .name(cert.getName())
                                .issuingAuthority(cert.getIssuingAuthority())
                                .certificateNumber(cert.getCertificateNumber())
                                .issueDate(cert.getIssueDate())
                                .expiryDate(cert.getExpiryDate())
                                .createdAt(cert.getCreatedAt())
                                .updatedAt(cert.getUpdatedAt())
                                .certStatus(status != null ? status.name().toLowerCase() : null)
                                .build();
        }
}
