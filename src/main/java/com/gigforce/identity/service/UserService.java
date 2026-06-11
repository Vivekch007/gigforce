package com.gigforce.identity.service;

import com.gigforce.identity.dto.UserResponseDTO;
import org.springframework.data.domain.Page;

public interface UserService {
    UserResponseDTO getUserById(String id);

    UserResponseDTO getUserByEmail(String email);

    Page<UserResponseDTO> getAllUsers(int page, int size, String role, String status);

    UserResponseDTO updateUser(String id, String name, String phone);

    UserResponseDTO suspendUser(String id);

    UserResponseDTO deactivateUser(String id);

    UserResponseDTO activateUser(String id);
}
