package com.gigforce.identity.service;

import com.gigforce.identity.dto.ContractorCertificationRequestDTO;
import com.gigforce.identity.dto.ContractorCertificationResponseDTO;

import java.util.List;

public interface ContractorCertificationService {
    ContractorCertificationResponseDTO addCertification(Long profileId, ContractorCertificationRequestDTO request);
    List<ContractorCertificationResponseDTO> getCertificationsByProfileId(Long profileId);
    ContractorCertificationResponseDTO updateCertification(Long profileId, Long certId, ContractorCertificationRequestDTO request);
    void deleteCertification(Long profileId, Long certId);
}
