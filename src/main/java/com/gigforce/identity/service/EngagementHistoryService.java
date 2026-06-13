package com.gigforce.identity.service;

import com.gigforce.identity.dto.EngagementFeedbackRequestDTO;
import com.gigforce.identity.dto.EngagementHistoryRequestDTO;
import com.gigforce.identity.dto.EngagementHistoryResponseDTO;

import java.util.List;

public interface EngagementHistoryService {
    EngagementHistoryResponseDTO addEngagement(String profileId, EngagementHistoryRequestDTO request);

    List<EngagementHistoryResponseDTO> getEngagementsByProfileId(String profileId);

    EngagementHistoryResponseDTO updateEngagement(String profileId, String engagementId,
            EngagementHistoryRequestDTO request);

    EngagementHistoryResponseDTO submitFeedback(String profileId, String engagementId, EngagementFeedbackRequestDTO request);

    void deleteEngagement(String profileId, String engagementId);
}
