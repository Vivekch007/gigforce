package com.gigforce.identity.service;

import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.ContractorProfileNotFoundException;
import com.gigforce.exception.EngagementNotFoundException;
import com.gigforce.identity.dto.EngagementFeedbackRequestDTO;
import com.gigforce.identity.dto.EngagementHistoryRequestDTO;
import com.gigforce.identity.dto.EngagementHistoryResponseDTO;
import com.gigforce.identity.dto.EngagementHistoryUpdateRequestDTO;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.EngagementHistory;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.VerificationStatus;
import com.gigforce.identity.repository.ContractorProfileRepository;
import com.gigforce.identity.repository.EngagementHistoryRepository;
import com.gigforce.identity.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class EngagementHistoryServiceImpl implements EngagementHistoryService {

        private final EngagementHistoryRepository engagementHistoryRepository;
        private final ContractorProfileRepository contractorProfileRepository;
        private final UserRepository userRepository;
        private final AuditService auditService;

        public EngagementHistoryServiceImpl(
                        EngagementHistoryRepository engagementHistoryRepository,
                        ContractorProfileRepository contractorProfileRepository,
                        UserRepository userRepository,
                        AuditService auditService) {
                this.engagementHistoryRepository = engagementHistoryRepository;
                this.contractorProfileRepository = contractorProfileRepository;
                this.userRepository = userRepository;
                this.auditService = auditService;
        }

        @Override
        @Transactional
        public EngagementHistoryResponseDTO addEngagement(String profileId, EngagementHistoryRequestDTO request) {
                ContractorProfile profile = contractorProfileRepository.findById(profileId)
                                .orElseThrow(() -> new ContractorProfileNotFoundException(
                                                "Contractor profile not found with ID: " + profileId));

                if (request.getEndDate() != null && request.getEndDate().isBefore(request.getStartDate())) {
                        throw new IllegalArgumentException("Engagement end date cannot be before start date.");
                }
                if(request.getStartDate() != null && request.getStartDate().isAfter(LocalDate.now())) {
                        throw new IllegalArgumentException("Engagement start date cannot be in the future.");
                }

                if(request.getVerifyer_name() == null || request.getVerifyer_name().trim().isEmpty()) {
                        throw new IllegalArgumentException("Verifyer name is required.");
                }
                if(request.getVerifyer_email() == null || request.getVerifyer_email().trim().isEmpty()) {
                        throw new IllegalArgumentException("Verifyer email is required.");
                }
                if(request.getVerifyer_phone() == null || request.getVerifyer_phone().trim().isEmpty()) {
                        throw new IllegalArgumentException("Verifyer phone is required.");
                }

                EngagementHistory engagement = EngagementHistory.builder()
                                .contractorProfile(profile)
                                .clientName(request.getClientName().trim())
                                .roleTitle(request.getRoleTitle().trim())
                                .startDate(request.getStartDate())
                                .endDate(request.getEndDate())
                                .Verifyer_email(request.getVerifyer_email().trim().toLowerCase())
                                .Verifyer_phone(request.getVerifyer_phone().trim())
                                .Verifyer_name(request.getVerifyer_name().trim())
                                .Approval_status(VerificationStatus.PENDING)
                                .build();

                EngagementHistory saved = engagementHistoryRepository.save(engagement);

                // Audit Logging
                String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
                User actor = userRepository.findByEmail(actorEmail).orElse(null);
                String actorId = (actor != null) ? actor.getId() : profile.getUser().getId();

                auditService.logAction(
                                actorId,
                                "CONTRACTOR_ENGAGEMENT_CREATED",
                                "ContractorProfile",
                                profile.getId(),
                                "Engagement added at client '" + request.getClientName().trim() + "' for contractor: "
                                                + profile.getUser().getEmail());

                return toDto(saved);
        }

        @Override
        public List<EngagementHistoryResponseDTO> getEngagementsByProfileId(String profileId) {
                ContractorProfile profile = contractorProfileRepository.findById(profileId)
                                .orElseThrow(() -> new ContractorProfileNotFoundException(
                                                "Contractor profile not found with ID: " + profileId));

                return engagementHistoryRepository.findByContractorProfile(profile)
                                .stream()
                                .map(this::toDto)
                                .collect(Collectors.toList());
        }

        @Override
        @Transactional
        public EngagementHistoryResponseDTO updateEngagement(String profileId, String engagementId,
                                                             @Valid EngagementHistoryUpdateRequestDTO request) {
                ContractorProfile profile = contractorProfileRepository.findById(profileId)
                                .orElseThrow(() -> new ContractorProfileNotFoundException(
                                                "Contractor profile not found with ID: " + profileId));

                EngagementHistory engagement = engagementHistoryRepository.findById(engagementId)
                                .orElseThrow(() -> new EngagementNotFoundException(
                                                "Engagement history not found with ID: " + engagementId));

                if (request.getEndDate() != null && request.getEndDate().isBefore(request.getStartDate())) {
                        throw new IllegalArgumentException("Engagement end date cannot be before start date.");
                }

                if (!engagement.getContractorProfile().getId().equals(profile.getId())) {
                        throw new IllegalArgumentException("Engagement does not belong to the specified profile.");
                }


                engagement.setRoleTitle(request.getRoleTitle().trim());
                engagement.setStartDate(request.getStartDate());
                engagement.setEndDate(request.getEndDate());
                engagement.setApproval_status(VerificationStatus.PENDING);
                String verifyerEmail = request.getVerifyer_email().trim().toLowerCase();
                String verifyerPhone = request.getVerifyer_phone().trim().toLowerCase();
                String verifyerName = request.getVerifyer_name().trim();
                if(verifyerEmail == null || verifyerEmail.isEmpty()) {
                        engagement.setVerifyer_email(engagementHistoryRepository.findById(engagementId).get().getVerifyer_email());
                }
                else{
                        engagement.setVerifyer_email(verifyerEmail);
                }
                if(verifyerPhone == null || verifyerPhone.isEmpty()) {
                        engagement.setVerifyer_phone(engagementHistoryRepository.findById(engagementId).get().getVerifyer_phone());
                }
                else{
                        engagement.setVerifyer_phone(verifyerPhone);
                }
                if(verifyerName == null || verifyerName.isEmpty()) {
                        engagement.setVerifyer_name(engagementHistoryRepository.findById(engagementId).get().getVerifyer_name());
                }
                else{
                        engagement.setVerifyer_name(verifyerName);
                }
                engagement.setApproval_status(VerificationStatus.PENDING);
                EngagementHistory updated = engagementHistoryRepository.save(engagement);

                // Audit Logging
                String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
                User actor = userRepository.findByEmail(actorEmail).orElse(null);
                String actorId = (actor != null) ? actor.getId() : profile.getUser().getId();

                auditService.logAction(
                                actorId,
                                "CONTRACTOR_ENGAGEMENT_UPDATED",
                                "ContractorProfile",
                                profile.getId(),
                                "Engagement updated for client '" + engagement.getClientName().trim()
                                                + "' for contractor: " + profile.getUser().getEmail());

                return toDto(updated);
        }

        @Override
        @Transactional
        public void deleteEngagement(String profileId, String engagementId) {
                ContractorProfile profile = contractorProfileRepository.findById(profileId)
                                .orElseThrow(() -> new ContractorProfileNotFoundException(
                                                "Contractor profile not found with ID: " + profileId));

                EngagementHistory engagement = engagementHistoryRepository.findById(engagementId)
                                .orElseThrow(() -> new EngagementNotFoundException(
                                                "Engagement history not found with ID: " + engagementId));

                if (!engagement.getContractorProfile().getId().equals(profile.getId())) {
                        throw new IllegalArgumentException("Engagement does not belong to the specified profile.");
                }

                engagementHistoryRepository.delete(engagement);

                // Audit Logging
                String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
                User actor = userRepository.findByEmail(actorEmail).orElse(null);
                String actorId = (actor != null) ? actor.getId() : profile.getUser().getId();

                auditService.logAction(
                                actorId,
                                "CONTRACTOR_ENGAGEMENT_DELETED",
                                "ContractorProfile",
                                profile.getId(),
                                "Engagement deleted for client '" + engagement.getClientName() + "' for contractor: "
                                                + profile.getUser().getEmail());
        }
        @Override
        @Transactional
        public EngagementHistoryResponseDTO approveEngagement(String profileId, String engagementId) {
                ContractorProfile profile = contractorProfileRepository.findById(profileId)
                                .orElseThrow(() -> new ContractorProfileNotFoundException(
                                                "Contractor profile not found with ID: " + profileId));

                EngagementHistory engagement = engagementHistoryRepository.findById(engagementId)
                                .orElseThrow(() -> new EngagementNotFoundException(
                                                "Engagement history not found with ID: " + engagementId));

                if (!engagement.getContractorProfile().getId().equals(profile.getId())) {
                        throw new IllegalArgumentException("Engagement does not belong to the specified profile.");
                }

                engagement.setApproval_status(VerificationStatus.VERIFIED);
                EngagementHistory updated = engagementHistoryRepository.save(engagement);

                // Audit Logging
                String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
                User actor = userRepository.findByEmail(actorEmail).orElse(null);
                String actorId = (actor != null) ? actor.getId() : profile.getUser().getId();

                auditService.logAction(
                                actorId,
                                "CONTRACTOR_ENGAGEMENT_APPROVED",
                                "ContractorProfile",
                                profile.getId(),
                                "Engagement approved for client '" + engagement.getClientName() + "' for contractor: "
                                                + profile.getUser().getEmail());

                return toDto(updated);
        }

        @Override
        @Transactional
        public EngagementHistoryResponseDTO submitFeedback(String profileId, String engagementId, EngagementFeedbackRequestDTO request) {
                ContractorProfile profile = contractorProfileRepository.findById(profileId)
                                .orElseThrow(() -> new ContractorProfileNotFoundException(
                                                "Contractor profile not found with ID: " + profileId));

                EngagementHistory engagement = engagementHistoryRepository.findById(engagementId)
                                .orElseThrow(() -> new EngagementNotFoundException(
                                                "Engagement history not found with ID: " + engagementId));

                if (!engagement.getContractorProfile().getId().equals(profile.getId())) {
                        throw new IllegalArgumentException("Engagement does not belong to the specified profile.");
                }

                if (engagement.getEndDate() == null || engagement.getEndDate().isAfter(LocalDate.now())) {
                        throw new IllegalStateException("Feedback and rating can only be submitted after completing the assignment.");
                }

                engagement.setFeedback(request.getFeedback().trim());
                engagement.setRating(request.getRating());

                EngagementHistory updated = engagementHistoryRepository.save(engagement);

                // Audit Logging
                String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
                User actor = userRepository.findByEmail(actorEmail).orElse(null);
                String actorId = (actor != null) ? actor.getId() : profile.getUser().getId();

                auditService.logAction(
                                actorId,
                                "CONTRACTOR_ENGAGEMENT_FEEDBACK_SUBMITTED",
                                "ContractorProfile",
                                profile.getId(),
                                "Feedback and rating submitted for client '" + engagement.getClientName()
                                                + "' for contractor: " + profile.getUser().getEmail());

                return toDto(updated);
        }

        private EngagementHistoryResponseDTO toDto(EngagementHistory eng) {
                return EngagementHistoryResponseDTO.builder()
                                .id(eng.getId())
                                .contractorProfileId(eng.getContractorProfile().getId())
                                .clientName(eng.getClientName())
                                .roleTitle(eng.getRoleTitle())
                                .startDate(eng.getStartDate())
                                .endDate(eng.getEndDate())
                                .feedback(eng.getFeedback())
                                .rating(eng.getRating())
                                .createdAt(eng.getCreatedAt())
                                .updatedAt(eng.getUpdatedAt())
                                .build();
        }
}
