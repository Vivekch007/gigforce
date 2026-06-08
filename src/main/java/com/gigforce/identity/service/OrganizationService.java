package com.gigforce.identity.service;

import com.gigforce.identity.entity.Organization;

import java.util.List;
import java.util.Optional;

public interface OrganizationService {
    Organization createOrganization(String name, String code, String status);
    Organization getById(Long id);
    Optional<Organization> getByCode(String code);
    List<Organization> getAll();
    Organization updateOrganization(Long id, String name, String status);
}
