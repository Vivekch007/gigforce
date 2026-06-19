package com.gigforce.invoice.service;

import com.gigforce.invoice.dto.PaymentRequestDTO;
import com.gigforce.invoice.dto.PaymentResponseDTO;

import java.util.List;

public interface PaymentService {

    PaymentResponseDTO createPayment(PaymentRequestDTO request);

    PaymentResponseDTO getPaymentById(String id);

    List<PaymentResponseDTO> getAllPayments();

    PaymentResponseDTO processPayment(String id);

    PaymentResponseDTO failPayment(String id);
}
