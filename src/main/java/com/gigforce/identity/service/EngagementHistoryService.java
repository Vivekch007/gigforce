package com.gigforce.identity.service;

import com.gigforce.identity.dto.EngagementFeedbackRequestDTO;
import com.gigforce.identity.dto.EngagementHistoryRequestDTO;
import com.gigforce.identity.dto.EngagementHistoryResponseDTO;
import com.gigforce.identity.dto.EngagementHistoryUpdateRequestDTO;
import jakarta.validation.Valid;

import java.util.List;

public interface EngagementHistoryService {
    EngagementHistoryResponseDTO addEngagement(String profileId, EngagementHistoryRequestDTO request);

    List<EngagementHistoryResponseDTO> getEngagementsByProfileId(String profileId);

    EngagementHistoryResponseDTO updateEngagement(String profileId, String engagementId,
                                                  @Valid EngagementHistoryUpdateRequestDTO request);

    void deleteEngagement(String profileId, String engagementId);
    EngagementHistoryResponseDTO approveEngagement(String profileId, String engagementId);
}
