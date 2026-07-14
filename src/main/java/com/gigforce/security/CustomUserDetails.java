package com.gigforce.security;

import com.gigforce.identity.enums.UserRole;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;

import java.util.Collection;

@Getter
public class CustomUserDetails extends User {
    private final String id;
    private final UserRole role;
    private final String orgUnitId;

    public CustomUserDetails(
            String id,
            String email,
            String password,
            boolean enabled,
            UserRole role,
            String orgUnitId,
            Collection<? extends GrantedAuthority> authorities
    ) {
        super(email, password, enabled, true, true, enabled, authorities);
        this.id = id;
        this.role = role;
        this.orgUnitId = orgUnitId;
    }
}
