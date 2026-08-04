import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Card, Row, Col, Spinner, Tab, Tabs } from 'react-bootstrap';
import { getAssignments } from '../../services/managerAssignmentService';
import { createTimesheet, generateMonthlyTimesheets } from '../../services/timesheetService';
import { getErrorMessage } from '../../services/errorUtils';

function CreateTimesheet() {
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('single');

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Single Week Form State
  const [assignmentId, setAssignmentId] = useState('');
  const [weekStartDate, setWeekStartDate] = useState('');

  // Monthly Form State
  const [monthlyAssignmentId, setMonthlyAssignmentId] = useState('');
  const [monthYear, setMonthYear] = useState('');

  const showToast = (message, type = 'danger') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'danger' }), 5000);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingInitial(true);
        const data = await getAssignments({ status: 'ACTIVE' });
        const list = data.content || data || [];
        setAssignments(list);
        if (list.length > 0) {
          setAssignmentId(list[0].id);
          setMonthlyAssignmentId(list[0].id);
        }
      } catch (err) {
        showToast('Failed to load assignments.', 'danger');
      } finally {
        setLoadingInitial(false);
      }
    };
    loadData();
  }, []);

  // Validate week start date selection
  const handleWeekStartDateChange = (e) => {
    const selectedDate = e.target.value;
    setWeekStartDate(selectedDate);

    if (selectedDate) {
      const start = new Date(selectedDate);
      if (start.getDay() !== 1) { // 1 = Monday
        showToast('Week Start Date must be a Monday.', 'danger');
      }
    }
  };

  const validateSingleForm = () => {
    if (!assignmentId) return 'Please select an assignment.';
    if (!weekStartDate) return 'Please select a Week Start Date.';

    const start = new Date(weekStartDate);
    if (start.getDay() !== 1) return 'Week Start Date must be a Monday.';

    return '';
  };

  const handleSingleSubmit = async () => {
    const validationError = validateSingleForm();
    if (validationError) {
      showToast(validationError, 'danger');
      return;
    }

    try {
      setSubmitting(true);

      const createPayload = { assignmentId, weekStartDate };
      await createTimesheet(createPayload);

      showToast('Timesheet shell created successfully.', 'success');
      setTimeout(() => {
        navigate('/manager/timesheet-approvals');
      }, 2000);

    } catch (err) {
      showToast(getErrorMessage(err), 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const validateMonthlyForm = () => {
    if (!monthlyAssignmentId) return 'Please select an assignment.';
    if (!monthYear) return 'Please select a Month and Year.';
    return '';
  };

  const handleMonthlySubmit = async () => {
    const validationError = validateMonthlyForm();
    if (validationError) {
      showToast(validationError, 'danger');
      return;
    }

    try {
      setSubmitting(true);
      const [year, month] = monthYear.split('-');

      const payload = {
        assignmentId: monthlyAssignmentId,
        month: parseInt(month, 10),
        year: parseInt(year, 10)
      };

      const response = await generateMonthlyTimesheets(payload);

      if (response.truncated) {
        showToast(`Timesheets created successfully up to the assignment end date: ${response.finalEffectiveEndDate}.`, 'success');
      } else {
        showToast(`${response.weeksCreated} timesheet(s) successfully generated for the month.`, 'success');
      }

      setTimeout(() => {
        navigate('/manager/timesheet-approvals');
      }, 3000);

    } catch (err) {
      showToast(getErrorMessage(err), 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-fluid position-relative">
      {toast.show && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          minWidth: '340px', maxWidth: '450px',
          backgroundColor: toast.type === 'danger' ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${toast.type === 'danger' ? '#fecaca' : '#bbf7d0'}`,
          borderRadius: '12px', padding: '16px 20px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div className="d-flex align-items-center gap-2">
            <i className={`bi ${toast.type === 'danger' ? 'bi-exclamation-triangle-fill text-danger' : 'bi-check-circle-fill text-success'}`}></i>
            <span className={`small fw-semibold ${toast.type === 'danger' ? 'text-danger' : 'text-dark'}`}>{toast.message}</span>
          </div>
          <button onClick={() => setToast({ show: false })} className="btn p-0 border-0 bg-transparent text-muted">&times;</button>
        </div>
      )}

      <div className="mb-4">
        <h2 className="fw-black text-slate-800 mb-0">Create Timesheet </h2>
        <p className="text-muted small mt-1 mb-0">Generate blank weekly or monthly timesheet containers for contractors to log their hours.</p>
      </div>

      <Card className="gf-card p-4 border-0">
        <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
          <Tab eventKey="single" title="Create Single Week Shell">
            <Form onSubmit={(e) => e.preventDefault()}>
              <Row className="g-3 mb-4">
                <Col md={6}>
                  <Form.Group controlId="assignmentId">
                    <Form.Label className="uppercase-label">Assignment <span className="text-danger">*</span></Form.Label>
                    {loadingInitial ? (
                      <div className="py-2"><Spinner animation="border" size="sm" /></div>
                    ) : (
                      <Form.Select
                        value={assignmentId}
                        onChange={e => setAssignmentId(e.target.value)}
                        disabled={submitting}
                      >
                        <option value="">Select Assignment</option>
                        {assignments.map(a => (
                          <option key={a.id} value={a.id}>
                            Assignment ID: {a.id} - {a.contractorName}
                          </option>
                        ))}
                      </Form.Select>
                    )}
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group controlId="weekStartDate">
                    <Form.Label className="uppercase-label">Week Start Date (Monday) <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="date"
                      value={weekStartDate}
                      onChange={handleWeekStartDateChange}
                      disabled={submitting}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <div className="alert alert-info">
                <strong>Note:</strong> Creating a timesheet instantiates a blank record for the selected week. The contractor can then log in to populate their daily hours and activity descriptions.
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4">
                <Button
                  variant="outline-secondary"
                  onClick={() => navigate('/manager/timesheet-approvals')}
                  disabled={submitting}
                  className="py-2 px-4"
                >
                  Cancel
                </Button>
                <Button
                  className="btn-enterprise-primary py-2 px-4"
                  onClick={handleSingleSubmit}
                  disabled={submitting || !weekStartDate || !assignmentId}
                >
                  {submitting ? <Spinner animation="border" size="sm" /> : 'Create Timesheet'}
                </Button>
              </div>
            </Form>
          </Tab>

          <Tab eventKey="monthly" title="Generate Monthly Drafts">
            <Form onSubmit={(e) => e.preventDefault()}>
              <Row className="g-3 mb-4">
                <Col md={6}>
                  <Form.Group controlId="monthlyAssignmentId">
                    <Form.Label className="uppercase-label">Assignment <span className="text-danger">*</span></Form.Label>
                    {loadingInitial ? (
                      <div className="py-2"><Spinner animation="border" size="sm" /></div>
                    ) : (
                      <Form.Select
                        value={monthlyAssignmentId}
                        onChange={e => setMonthlyAssignmentId(e.target.value)}
                        disabled={submitting}
                      >
                        <option value="">Select Assignment</option>
                        {assignments.map(a => (
                          <option key={a.id} value={a.id}>
                            Assignment ID: {a.id} - {a.contractorName}
                          </option>
                        ))}
                      </Form.Select>
                    )}
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group controlId="monthYear">
                    <Form.Label className="uppercase-label">Target Month <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="month"
                      value={monthYear}
                      onChange={e => setMonthYear(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <div className="alert alert-info">
                <strong>Note:</strong> Bulk generation will create weekly timesheet drafts aligned to Mondays for the entire selected month. 
                If the assignment ends mid-month, generation will stop at the assignment end date. Existing timesheets will be skipped.
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4">
                <Button
                  variant="outline-secondary"
                  onClick={() => navigate('/manager/timesheet-approvals')}
                  disabled={submitting}
                  className="py-2 px-4"
                >
                  Cancel
                </Button>
                <Button
                  className="btn-enterprise-primary py-2 px-4"
                  onClick={handleMonthlySubmit}
                  disabled={submitting || !monthYear || !monthlyAssignmentId}
                >
                  {submitting ? <Spinner animation="border" size="sm" /> : 'Generate Drafts'}
                </Button>
              </div>
            </Form>
          </Tab>
        </Tabs>
      </Card>
    </div>
  );
}

export default CreateTimesheet;