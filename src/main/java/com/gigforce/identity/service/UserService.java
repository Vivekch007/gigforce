package com.gigforce.identity.service;

import com.gigforce.identity.dto.UserResponseDTO;
import org.springframework.data.domain.Page;

public interface UserService {
    UserResponseDTO getUserById(Long id);
    UserResponseDTO getUserByEmail(String email);
    Page<UserResponseDTO> getAllUsers(int page, int size, String role, String status);
    UserResponseDTO updateUser(Long id, String name, String phone);
    UserResponseDTO suspendUser(Long id);
    UserResponseDTO deactivateUser(Long id);
    UserResponseDTO activateUser(Long id);
}
