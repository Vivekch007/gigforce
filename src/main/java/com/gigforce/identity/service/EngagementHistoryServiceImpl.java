package com.gigforce.identity.service;

import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.ContractorProfileNotFoundException;
import com.gigforce.exception.EngagementNotFoundException;
import com.gigforce.identity.dto.EngagementHistoryRequestDTO;
import com.gigforce.identity.dto.EngagementHistoryResponseDTO;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.EngagementHistory;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.repository.ContractorProfileRepository;
import com.gigforce.identity.repository.EngagementHistoryRepository;
import com.gigforce.identity.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

                EngagementHistory engagement = EngagementHistory.builder()
                                .contractorProfile(profile)
                                .clientName(request.getClientName().trim())
                                .roleTitle(request.getRoleTitle().trim())
                                .startDate(request.getStartDate())
                                .endDate(request.getEndDate())
                                .feedback(request.getFeedback() != null ? request.getFeedback().trim() : null)
                                .rating(request.getRating())
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
                        EngagementHistoryRequestDTO request) {
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

                engagement.setClientName(request.getClientName().trim());
                engagement.setRoleTitle(request.getRoleTitle().trim());
                engagement.setStartDate(request.getStartDate());
                engagement.setEndDate(request.getEndDate());
                engagement.setFeedback(request.getFeedback() != null ? request.getFeedback().trim() : null);
                engagement.setRating(request.getRating());

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
                                "Engagement updated for client '" + request.getClientName().trim()
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
