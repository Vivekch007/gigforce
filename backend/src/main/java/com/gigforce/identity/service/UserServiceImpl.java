package com.gigforce.identity.service;

import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.UserNotFoundException;
import com.gigforce.identity.dto.UserResponseDTO;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.identity.enums.UserStatus;
import com.gigforce.identity.mapper.UserMapper;
import com.gigforce.identity.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gigforce.notification.publisher.NotificationPublisher;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final AuditService auditService;
    private final NotificationPublisher notificationPublisher;

    public UserServiceImpl(UserRepository userRepository, UserMapper userMapper, AuditService auditService, NotificationPublisher notificationPublisher) {
        this.userRepository = userRepository;
        this.userMapper = userMapper;
        this.auditService = auditService;
        this.notificationPublisher = notificationPublisher;
    }

    @Override
    public UserResponseDTO getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found with ID: " + id));
        return userMapper.toUserDto(user);
    }

    @Override
    public UserResponseDTO getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + email));
        return userMapper.toUserDto(user);
    }

    @Override
    public Page<UserResponseDTO> getAllUsers(int page, int size, String role, String status) {
        Pageable pageable = PageRequest.of(page, size);
        Specification<User> spec = Specification.where(null);

        if (role != null && !role.trim().isEmpty()) {
            try {
                UserRole roleEnum = UserRole.valueOf(role.toUpperCase());
                spec = spec.and((root, query, cb) -> cb.equal(root.get("role"), roleEnum));
            } catch (IllegalArgumentException e) {
                // Ignore invalid roles in filters
            }
        }

        if (status != null && !status.trim().isEmpty()) {
            try {
                UserStatus statusEnum = UserStatus.valueOf(status.toUpperCase());
                spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), statusEnum));
            } catch (IllegalArgumentException e) {
                // Ignore invalid statuses in filters
            }
        }

        return userRepository.findAll(spec, pageable).map(userMapper::toUserDto);
    }

    @Override
    @Transactional
    public UserResponseDTO updateUser(String id, String phone) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found with ID: " + id));


        String oldPhone = user.getPhone();

        if (phone != null && !phone.trim().isEmpty()) {
            user.setPhone(phone);
        }

        User updatedUser = userRepository.save(user);

        // Fetch current performing user email
        String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User actor = userRepository.findByEmail(actorEmail).orElse(null);
        String actorId = (actor != null) ? actor.getId() : updatedUser.getId();

        auditService.logAction(
                actorId,
                "USER_UPDATED",
                "USER",
                updatedUser.getId(),
                String.format("User details updated. Phone: '%s'->'%s'",
                        oldPhone, updatedUser.getPhone()));

        return userMapper.toUserDto(updatedUser);
    }

    @Override
    @Transactional
    public UserResponseDTO suspendUser(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found with ID: " + id));

        UserStatus oldStatus = user.getStatus();
        user.setStatus(UserStatus.SUSPENDED);
        User updatedUser = userRepository.save(user);

        String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User actor = userRepository.findByEmail(actorEmail).orElse(null);
        String actorId = (actor != null) ? actor.getId() : updatedUser.getId();

        auditService.logAction(
                actorId,
                "USER_SUSPENDED",
                "USER",
                updatedUser.getId(),
                String.format("User status changed from %s to SUSPENDED", oldStatus.name()));

        notificationPublisher.publishContractorSuspended(updatedUser);

        return userMapper.toUserDto(updatedUser);
    }

    @Override
    @Transactional
    public UserResponseDTO deactivateUser(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found with ID: " + id));

        UserStatus oldStatus = user.getStatus();
        user.setStatus(UserStatus.INACTIVE);
        User updatedUser = userRepository.save(user);

        String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User actor = userRepository.findByEmail(actorEmail).orElse(null);
        String actorId = (actor != null) ? actor.getId() : updatedUser.getId();

        auditService.logAction(
                actorId,
                "USER_DEACTIVATED",
                "USER",
                updatedUser.getId(),
                String.format("User status changed from %s to INACTIVE", oldStatus.name()));

        return userMapper.toUserDto(updatedUser);
    }

    @Override
    @Transactional
    public UserResponseDTO activateUser(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found with ID: " + id));

        UserStatus oldStatus = user.getStatus();
        user.setStatus(UserStatus.ACTIVE);
        User updatedUser = userRepository.save(user);

        String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User actor = userRepository.findByEmail(actorEmail).orElse(null);
        String actorId = (actor != null) ? actor.getId() : updatedUser.getId();

        auditService.logAction(
                actorId,
                "USER_ACTIVATED",
                "USER",
                updatedUser.getId(),
                String.format("User status changed from %s to ACTIVE", oldStatus.name()));

        notificationPublisher.publishContractorReactivated(updatedUser);

        return userMapper.toUserDto(updatedUser);
    }

    @Override
    public List<Map<String, Object>> getDistinctOrgUnits() {
        // Aggregate all users, group by orgUnitId to derive organization summaries
        List<User> allUsers = userRepository.findAll();

        // Collect distinct orgUnitIds with counts
        Map<String, Long> orgCounts = new LinkedHashMap<>();
        for (User u : allUsers) {
            String orgId = u.getOrgUnitId();
            if (orgId != null && !orgId.trim().isEmpty()) {
                orgCounts.merge(orgId.trim(), 1L, Long::sum);
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, Long> entry : orgCounts.entrySet()) {
            String orgId = entry.getKey();
            Map<String, Object> orgObj = new HashMap<>();
            orgObj.put("id", orgId);
            orgObj.put("code", orgId.toUpperCase());
            orgObj.put("userCount", entry.getValue());
            orgObj.put("status", "ACTIVE");
            orgObj.put("contact", "");
            orgObj.put("address", "");
            result.add(orgObj);
        }
        return result;
    }
}
