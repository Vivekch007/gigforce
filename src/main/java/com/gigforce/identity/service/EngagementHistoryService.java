package com.gigforce.identity.service;

import com.gigforce.identity.dto.EngagementHistoryRequestDTO;
import com.gigforce.identity.dto.EngagementHistoryResponseDTO;

import java.util.List;

public interface EngagementHistoryService {
    EngagementHistoryResponseDTO addEngagement(Long profileId, EngagementHistoryRequestDTO request);
    List<EngagementHistoryResponseDTO> getEngagementsByProfileId(Long profileId);
    EngagementHistoryResponseDTO updateEngagement(Long profileId, Long engagementId, EngagementHistoryRequestDTO request);
    void deleteEngagement(Long profileId, Long engagementId);
}
