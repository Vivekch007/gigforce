package com.gigforce.identity.service;

import com.gigforce.identity.dto.*;

public interface AuthService {
    UserResponseDTO register(RegisterRequestDTO request);
    LoginResponseDTO login(LoginRequestDTO request);
    void forgotPassword(ForgotPasswordRequestDTO request);
    void resetPassword(ResetPasswordRequestDTO request);
    void changePassword(String currentUsername, ChangePasswordRequestDTO request);
    void logout(String currentUsername);
    LoginResponseDTO refreshToken(RefreshTokenRequestDTO request);
}
