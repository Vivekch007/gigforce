package com.gigforce.identity.mapper;

import com.gigforce.identity.entity.Organization;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.dto.OrganizationResponseDTO;
import com.gigforce.identity.dto.UserResponseDTO;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public OrganizationResponseDTO toOrganizationDto(Organization org) {
        if (org == null) {
            return null;
        }
        return OrganizationResponseDTO.builder()
                .organizationId(org.getId())
                .name(org.getName())
                .code(org.getCode())
                .status(org.getStatus())
                .createdAt(org.getCreatedAt())
                .createdBy(org.getCreatedBy())
                .build();
    }

    public UserResponseDTO toUserDto(User user) {
        if (user == null) {
            return null;
        }
        return UserResponseDTO.builder()
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole().name())
                .status(user.getStatus().name())
                .orgUnit(toOrganizationDto(user.getOrgUnit()))
                .createdAt(user.getCreatedAt())
                .createdBy(user.getCreatedBy())
                .updatedAt(user.getUpdatedAt())
                .updatedBy(user.getUpdatedBy())
                .build();
    }
}
