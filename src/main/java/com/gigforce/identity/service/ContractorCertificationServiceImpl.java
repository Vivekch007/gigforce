package com.gigforce.identity.service;

import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.CertificationNotFoundException;
import com.gigforce.exception.ContractorProfileNotFoundException;
import com.gigforce.identity.dto.ContractorCertificationRequestDTO;
import com.gigforce.identity.dto.ContractorCertificationResponseDTO;
import com.gigforce.identity.entity.ContractorCertification;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.repository.ContractorCertificationRepository;
import com.gigforce.identity.repository.ContractorProfileRepository;
import com.gigforce.identity.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ContractorCertificationServiceImpl implements ContractorCertificationService {

    private final ContractorCertificationRepository contractorCertificationRepository;
    private final ContractorProfileRepository contractorProfileRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public ContractorCertificationServiceImpl(
            ContractorCertificationRepository contractorCertificationRepository,
            ContractorProfileRepository contractorProfileRepository,
            UserRepository userRepository,
            AuditService auditService
    ) {
        this.contractorCertificationRepository = contractorCertificationRepository;
        this.contractorProfileRepository = contractorProfileRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @Override
    @Transactional
    public ContractorCertificationResponseDTO addCertification(Long profileId, ContractorCertificationRequestDTO request) {
        ContractorProfile profile = contractorProfileRepository.findById(profileId)
                .orElseThrow(() -> new ContractorProfileNotFoundException("Contractor profile not found with ID: " + profileId));

        ContractorCertification cert = ContractorCertification.builder()
                .contractorProfile(profile)
                .name(request.getName().trim())
                .issuingAuthority(request.getIssuingAuthority().trim())
                .certificateNumber(request.getCertificateNumber() != null ? request.getCertificateNumber().trim() : null)
                .issueDate(request.getIssueDate())
                .expiryDate(request.getExpiryDate())
                .build();

        ContractorCertification saved = contractorCertificationRepository.save(cert);

        // Audit Logging
        String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User actor = userRepository.findByEmail(actorEmail).orElse(null);
        Long actorId = (actor != null) ? actor.getId() : profile.getUser().getId();

        auditService.logAction(
                actorId,
                "CONTRACTOR_CERTIFICATION_ADDED",
                "ContractorProfile",
                profile.getId(),
                "Certification '" + saved.getName() + "' added to profile of user: " + profile.getUser().getEmail()
        );

        return toDto(saved);
    }

    @Override
    public List<ContractorCertificationResponseDTO> getCertificationsByProfileId(Long profileId) {
        ContractorProfile profile = contractorProfileRepository.findById(profileId)
                .orElseThrow(() -> new ContractorProfileNotFoundException("Contractor profile not found with ID: " + profileId));
        
        return contractorCertificationRepository.findByContractorProfile(profile)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ContractorCertificationResponseDTO updateCertification(Long profileId, Long certId, ContractorCertificationRequestDTO request) {
        ContractorProfile profile = contractorProfileRepository.findById(profileId)
                .orElseThrow(() -> new ContractorProfileNotFoundException("Contractor profile not found with ID: " + profileId));

        ContractorCertification cert = contractorCertificationRepository.findById(certId)
                .orElseThrow(() -> new CertificationNotFoundException("Certification not found with ID: " + certId));

        if (!cert.getContractorProfile().getId().equals(profile.getId())) {
            throw new IllegalArgumentException("Certification does not belong to the specified profile.");
        }

        cert.setName(request.getName().trim());
        cert.setIssuingAuthority(request.getIssuingAuthority().trim());
        cert.setCertificateNumber(request.getCertificateNumber() != null ? request.getCertificateNumber().trim() : null);
        cert.setIssueDate(request.getIssueDate());
        cert.setExpiryDate(request.getExpiryDate());

        ContractorCertification updated = contractorCertificationRepository.save(cert);

        // Audit Logging
        String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User actor = userRepository.findByEmail(actorEmail).orElse(null);
        Long actorId = (actor != null) ? actor.getId() : profile.getUser().getId();

        auditService.logAction(
                actorId,
                "CONTRACTOR_CERTIFICATION_UPDATED",
                "ContractorProfile",
                profile.getId(),
                "Certification '" + updated.getName() + "' updated on profile of user: " + profile.getUser().getEmail()
        );

        return toDto(updated);
    }

    @Override
    @Transactional
    public void deleteCertification(Long profileId, Long certId) {
        ContractorProfile profile = contractorProfileRepository.findById(profileId)
                .orElseThrow(() -> new ContractorProfileNotFoundException("Contractor profile not found with ID: " + profileId));

        ContractorCertification cert = contractorCertificationRepository.findById(certId)
                .orElseThrow(() -> new CertificationNotFoundException("Certification not found with ID: " + certId));

        if (!cert.getContractorProfile().getId().equals(profile.getId())) {
            throw new IllegalArgumentException("Certification does not belong to the specified profile.");
        }

        contractorCertificationRepository.delete(cert);

        // Audit Logging
        String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User actor = userRepository.findByEmail(actorEmail).orElse(null);
        Long actorId = (actor != null) ? actor.getId() : profile.getUser().getId();

        auditService.logAction(
                actorId,
                "CONTRACTOR_CERTIFICATION_REMOVED",
                "ContractorProfile",
                profile.getId(),
                "Certification '" + cert.getName() + "' removed from profile of user: " + profile.getUser().getEmail()
        );
    }

    private ContractorCertificationResponseDTO toDto(ContractorCertification cert) {
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
                .build();
    }
}
