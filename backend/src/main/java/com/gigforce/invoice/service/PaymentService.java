package com.gigforce.invoice.service;

import com.gigforce.invoice.dto.PaymentCreateRequestDTO;
import com.gigforce.invoice.dto.PaymentUpdateRequestDTO;
import com.gigforce.invoice.dto.PaymentResponseDTO;

import java.util.List;

public interface PaymentService {

    PaymentResponseDTO createPayment(PaymentCreateRequestDTO request);

    PaymentResponseDTO getPaymentById(String id);

    List<PaymentResponseDTO> getAllPayments();

    PaymentResponseDTO updatePayment(String id, PaymentUpdateRequestDTO request);

    PaymentResponseDTO processPayment(String id);

    PaymentResponseDTO failPayment(String id);
}


