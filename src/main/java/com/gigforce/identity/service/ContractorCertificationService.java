package com.gigforce.identity.service;

import com.gigforce.identity.dto.ContractorCertificationRequestDTO;
import com.gigforce.identity.dto.ContractorCertificationResponseDTO;

import java.util.List;

public interface ContractorCertificationService {
    ContractorCertificationResponseDTO addCertification(String profileId, ContractorCertificationRequestDTO request);

    List<ContractorCertificationResponseDTO> getCertificationsByProfileId(String profileId);

    ContractorCertificationResponseDTO updateCertification(String profileId, String certId,
            ContractorCertificationRequestDTO request);

    void deleteCertification(String profileId, String certId);
}
