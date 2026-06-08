package com.gigforce.security;

import com.gigforce.identity.entity.User;
import com.gigforce.identity.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class CurrentUserContext {

    private final UserRepository userRepository;

    public CurrentUserContext(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        if (email == null || "anonymousUser".equals(email)) {
            return null;
        }
        return userRepository.findByEmail(email).orElse(null);
    }

    public Long getCurrentUserId() {
        User user = getCurrentUser();
        return user != null ? user.getId() : null;
    }

    public String getCurrentUserRole() {
        User user = getCurrentUser();
        return user != null ? user.getRole().name() : null;
    }

    public Long getCurrentUserOrgId() {
        User user = getCurrentUser();
        return (user != null && user.getOrgUnit() != null) ? user.getOrgUnit().getId() : null;
    }

    /**
     * Validates if the current authenticated user has access to a resource belonging to the specified org ID.
     * Admins are allowed global access. Non-admins must belong to the exact same organization.
     *
     * @param resourceOrgId the organization ID associated with the target resource
     */
    public void validateTenantAccess(Long resourceOrgId) {
        if (resourceOrgId == null) {
            return;
        }
        
        boolean isAdmin = SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        
        if (isAdmin) {
            return;
        }

        Long userOrgId = getCurrentUserOrgId();
        if (userOrgId == null || !userOrgId.equals(resourceOrgId)) {
            throw new AccessDeniedException("Access Denied: You do not have permission to access resources from this organization.");
        }
    }
}
