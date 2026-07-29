import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import '../styles/confirmationDialog.css';

function ConfirmationDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
}) {
  return (
    <Modal show={isOpen} onHide={onCancel} centered>
      <Modal.Header closeButton className="border-bottom-1">
        <Modal.Title className="fw-600">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="py-4">
        <p className="mb-0 text-muted">{message}</p>
      </Modal.Body>
      <Modal.Footer className="border-top-1">
        <Button variant="outline-secondary" onClick={onCancel}>
          {cancelText}
        </Button>
        <Button
          variant={isDangerous ? 'danger' : 'primary'}
          onClick={onConfirm}
        >
          {confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ConfirmationDialog;
