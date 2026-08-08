package com.gigforce.identity.repository;

import com.gigforce.identity.entity.RefreshToken;
import com.gigforce.identity.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {
    Optional<RefreshToken> findByToken(String token);
    List<RefreshToken> findAllByUserAndIsRevokedFalse(User user);
    void deleteByUser(User user);
}
