package com.gigforce.security;

import com.gigforce.identity.entity.User;
import com.gigforce.identity.repository.UserRepository;
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
}
