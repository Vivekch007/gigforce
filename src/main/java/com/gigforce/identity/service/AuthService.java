package com.gigforce.identity.service;

import com.gigforce.identity.dto.LoginRequestDTO;
import com.gigforce.identity.dto.LoginResponseDTO;
import com.gigforce.identity.dto.RegisterRequestDTO;
import com.gigforce.identity.dto.TokenRefreshRequestDTO;
import com.gigforce.identity.dto.UserResponseDTO;

public interface AuthService {
    UserResponseDTO register(RegisterRequestDTO request);
    LoginResponseDTO login(LoginRequestDTO request);
    LoginResponseDTO refresh(TokenRefreshRequestDTO request);
}
