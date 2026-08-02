import React, { useEffect, useState } from 'react';
import Select from 'react-select';
import { Spinner, Button, Form, Table } from 'react-bootstrap';
import { getTimesheets, getTimesheetDetails, updateTimesheet, submitTimesheet, addTimesheetComment } from '../../services/timesheetService';
import { getErrorMessage } from '../../services/errorUtils';
import { useToast } from '../../context/ToastContext';
import { useConfirmation } from '../../context/ConfirmationContext';
import '../../styles/contractor.css';

function Timesheets() {
  const { addToast } = useToast();
  const { showConfirmation } = useConfirmation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // List of all timesheets for dropdown selector
  const [timesheetList, setTimesheetList] = useState([]);
  const [selectedId, setSelectedId] = useState('');

  // Currently viewed timesheet details
  const [timesheet, setTimesheet] = useState(null);
  const [linesData, setLinesData] = useState([]); // 7 elements (Mon - Sun)
  const [commentText, setCommentText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Track if current changes have been saved to enable submission
  const [isDraftSaved, setIsDraftSaved] = useState(false);

  // Helper to safely strip ISO timestamps down to YYYY-MM-DD
  const normalizeDate = (dateVal) => {
    if (!dateVal) return '';
    if (typeof dateVal === 'string') {
      return dateVal.split('T')[0];
    }
    const d = new Date(dateVal);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // 1. Initial Load: Get all timesheets for this contractor
  useEffect(() => {
    let active = true;
    const loadTimesheets = async () => {
      try {
        setLoading(true);
        setError('');
        const list = await getTimesheets();
        if (active) {
          setTimesheetList(list);
          if (list.length > 0) {
            setSelectedId(list[0].id);
          }
        }
      } catch (err) {
        if (active) {
          addToast(getErrorMessage(err), 'error');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    loadTimesheets();
    return () => { active = false; };
  }, [addToast]);

  // 2. Fetch specific timesheet details on dropdown change
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    const loadDetails = async () => {
      try {
        setLoading(true);
        setError('');
        setIsDraftSaved(false); // Reset draft saved state when switching weeks
        const details = await getTimesheetDetails(selectedId);
        if (active) {
          setTimesheet(details);
          buildWeekGrid(details);
        }
      } catch (err) {
        if (active) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    loadDetails();
    return () => { active = false; };
  }, [selectedId]);

  // Builds the 7-day visual list (Mon-Sun), preserving raw entered numbers and keeping empty defaults
  const buildWeekGrid = (ts, currentLocalLines = []) => {
    const startDateStr = normalizeDate(ts.weekStartDate);
    if (!startDateStr) return;

    const [year, month, day] = startDateStr.split('-').map(Number);
    const monday = new Date(Date.UTC(year, month - 1, day));
    const grid = [];

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    for (let i = 0; i < 7; i++) {
      const current = new Date(monday);
      current.setUTCDate(monday.getUTCDate() + i);

      const yyyy = current.getUTCFullYear();
      const mm = String(current.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(current.getUTCDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // Search backend lines matching date
      const existingLine = ts.lines?.find((line) => normalizeDate(line.workDate) === dateStr);
      const fallbackLocalLine = currentLocalLines.find((l) => l.workDate === dateStr);

      const isWeekend = i >= 5;

      let hoursWorked = '';
      let activityDesc = '';

      if (fallbackLocalLine && fallbackLocalLine.hoursWorked !== undefined && fallbackLocalLine.hoursWorked !== '') {
        hoursWorked = fallbackLocalLine.hoursWorked;
        activityDesc = fallbackLocalLine.activityDesc || '';
      } else if (existingLine) {
        const val = existingLine.hoursWorked;
        // Preserves 0 and positive numeric values when fetched back from server
        hoursWorked = (val !== null && val !== undefined && val !== '') ? String(val) : '';
        activityDesc = existingLine.activityDesc || '';
      }

      grid.push({
        dayName: dayNames[i],
        workDate: dateStr,
        hoursWorked,
        activityDesc,
        isWeekend,
        isPreGenerated: !!existingLine,
        lineId: existingLine?.id || fallbackLocalLine?.lineId || null,
      });
    }
    setLinesData(grid);
  };

  const handleLineChange = (index, field, value) => {
    const updated = [...linesData];
    updated[index] = { ...updated[index], [field]: value };
    setLinesData(updated);
    setIsDraftSaved(false); // Reset saved status if user edits inputs
  };

  // Helper to extract and validate line items
  const prepareEditLines = () => {
    // Check mandatory Weekdays (Monday through Friday)
    for (let i = 0; i < 5; i++) {
      const line = linesData[i];
      const hours = parseFloat(line.hoursWorked || '0');
      if (!line.hoursWorked || hours <= 0) {
        throw new Error(`Hours Logged is required for ${line.dayName} (${line.workDate}).`);
      }
    }

    // Process edit lines and check descriptions (includes weekends if hours > 0 or pre-existing)
    const editLines = linesData
      .filter((l) => l.isPreGenerated || parseFloat(l.hoursWorked || '0') > 0)
      .map((l) => ({
        workDate: l.workDate,
        hoursWorked: parseFloat(l.hoursWorked || '0'),
        activityDesc: (l.activityDesc || '').trim(),
      }));

    let totalHours = 0;
    for (const line of editLines) {
      totalHours += line.hoursWorked;
      if (line.hoursWorked > 0 && !line.activityDesc) {
        throw new Error(`Activity description is required for ${line.workDate} when hours are logged.`);
      }
    }
    return { editLines, totalHours };
  };

  // Saves current edits as draft
  const handleSaveDraft = async () => {
    if (!timesheet) return;

    let editLines, totalHours;
    try {
      ({ editLines, totalHours } = prepareEditLines());
    } catch (validationError) {
      addToast(validationError.message, 'error');
      return;
    }

    const confirmed = await showConfirmation({
      title: 'Save Draft',
      message: `You have logged a total of ${totalHours} hours. Are you sure you want to save this timesheet as a draft?`
    });
    if (!confirmed) return;

    setActionLoading(true);
    setError('');
    try {
      const updated = await updateTimesheet(timesheet.id, { lines: editLines });
      setTimesheet(updated);
      buildWeekGrid(updated, linesData);
      setIsDraftSaved(true); // Enable submit button upon successful save
      addToast('Success', 'Timesheet draft saved successfully!', 'success');
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Directly saves changes and submits
  const handleSubmit = async () => {
    if (!timesheet) return;

    let editLines, totalHours;
    try {
      ({ editLines, totalHours } = prepareEditLines());
    } catch (validationError) {
      addToast(validationError.message, 'error');
      return;
    }

    const confirmed = await showConfirmation({
      title: 'Submit Timesheet',
      message: `You have logged a total of ${totalHours} hours. Are you sure you want to submit this timesheet? Once submitted, it cannot be modified until reviewed.`
    });
    if (!confirmed) return;

    setActionLoading(true);
    setError('');
    try {
      // 1. Auto-save current line edits first
      await updateTimesheet(timesheet.id, { lines: editLines });

      // 2. Perform submission
      const submitted = await submitTimesheet(timesheet.id);
      setTimesheet(submitted);
      buildWeekGrid(submitted, linesData);
      setIsDraftSaved(false);
      addToast('Success', 'Timesheet submitted successfully for review!', 'success');
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Post comment on REJECTED timesheet
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setActionLoading(true);
    setError('');
    try {
      await addTimesheetComment(timesheet.id, { comment: commentText.trim() });
      setCommentText('');
      addToast('Success', 'Comment added to timesheet thread!', 'success');
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && timesheetList.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" variant="primary" />
        <span className="ms-3 text-muted">Loading timesheets dashboard...</span>
      </div>
    );
  }

  // Format timesheets for react-select dropdown options
  const dropdownOptions = timesheetList.map((ts) => ({
    value: ts.id,
    label: `Week starting: ${normalizeDate(ts.weekStartDate)} to ${normalizeDate(ts.weekEndDate)} (${ts.status})`
  }));

  const selectedOption = dropdownOptions.find((opt) => opt.value === selectedId) || null;

  // Raw sum directly computed from what the user entered across Monday - Sunday
  const computedWeekTotal = linesData
    .reduce((sum, line) => sum + (parseFloat(line.hoursWorked) || 0), 0)
    .toFixed(2);

  return (
    <div className="container-fluid">
      {/* Dynamic CSS injection to remove up/down number spin buttons */}
      <style>{`
        .no-spinners::-webkit-outer-spin-button,
        .no-spinners::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinners[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>

      {/* Title Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">Weekly Timesheets</h2>
          <p className="text-muted small mt-1 mb-0">Log daily hours worked and submit logs for review.</p>
        </div>
      </div>

      {timesheetList.length === 0 ? (
        <div className="text-center py-5 gf-card bg-white border-0" style={{ borderRadius: 'var(--gf-radius)', boxShadow: 'var(--gf-shadow)' }}>
          <i className="bi bi-calendar-x fs-1 text-muted"></i>
          <h5 className="fw-semibold mt-3 text-dark">No timesheets have been issued for you this week</h5>
          <p className="text-muted small mb-0">Please contact your Hiring Manager to generate your weekly log sheet.</p>
        </div>
      ) : (
        <>
          {/* Week Selector Dropdown Card */}
          <div className="gf-card mb-4">
            <Form.Group controlId="weekSelectDropdown">
              <Form.Label className="uppercase-label">Select Timesheet Week</Form.Label>
              <Select
                options={dropdownOptions}
                value={selectedOption}
                onChange={(selected) => setSelectedId(selected ? selected.value : '')}
                isDisabled={timesheetList.length === 0}
                placeholder="Search or select a timesheet week..."
                maxMenuHeight={220} // Caps menu height at 220px and forces a scrollbar
                isSearchable
                styles={{
                  control: (base) => ({
                    ...base,
                    borderColor: '#cbd5e1',
                    borderRadius: '0.375rem',
                    boxShadow: 'none',
                    '&:hover': { borderColor: '#94a3b8' }
                  }),
                  menuList: (base) => ({
                    ...base,
                    maxHeight: '220px', // Ensures scrollability for long lists
                  })
                }}
              />
            </Form.Group>
          </div>

          {timesheet && (
            <div>
          {/* Daily Logs Grid Sheet */}
          <div className="gf-card p-0 overflow-hidden mb-4">
            <Table responsive className="align-middle mb-0">
              <thead className="bg-light">
                <tr className="text-uppercase text-muted border-bottom" style={{ fontSize: '0.75rem' }}>
                  <th className="p-3" style={{ width: '150px' }}>Day</th>
                  <th className="p-3" style={{ width: '150px' }}>Date</th>
                  <th className="p-3" style={{ width: '140px' }}>Hours Logged <span className="text-danger">*</span></th>
                  <th className="p-3">Activity Description</th>
                </tr>
              </thead>
              <tbody>
                {linesData.map((line, idx) => {
                  const isEditable = ['DRAFT', 'REJECTED', 'REVISED'].includes(timesheet.status);
                  return (
                    <tr key={idx} className={line.isWeekend ? 'bg-light text-muted' : ''}>
                      <td className="p-3 fw-bold">
                        {line.dayName} {!line.isWeekend && <span className="text-danger">*</span>}
                      </td>
                      <td className="p-3 small">{line.workDate}</td>
                      <td className="p-3">
                        <Form.Control
                          type="number"
                          value={line.hoursWorked}
                          onChange={(e) => handleLineChange(idx, 'hoursWorked', e.target.value)}
                          disabled={!isEditable}
                          min="0"
                          max="24"
                          step="0.5"
                          placeholder={line.isWeekend ? "0.00" : "Required..."}
                          className="grid-input no-spinners"
                          style={{ maxWidth: '100px' }}
                        />
                      </td>
                      <td className="p-3">
                        <Form.Control
                          type="text"
                          value={line.activityDesc}
                          onChange={(e) => handleLineChange(idx, 'activityDesc', e.target.value)}
                          disabled={!isEditable}
                          placeholder={line.isWeekend ? "Describe activities (optional)..." : "Describe your activities (required)..."}
                          className="grid-input"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>

          {/* Status and Summaries Grid */}
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div className="gf-card mb-0 p-3 h-100 d-flex flex-column justify-content-between">
                <div>
                  <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Status</span>
                  <div className="mt-1">
                    <span className={`gf-badge badge-${timesheet.status.toLowerCase()}`}>
                      {timesheet.status}
                    </span>
                  </div>
                </div>
                <p className="text-muted small mb-0 mt-2">Current submission status</p>
              </div>
            </div>

            <div className="col-md-3">
              <div className="gf-card mb-0 p-3 h-100 d-flex flex-column justify-content-between">
                <div>
                  <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Total Hours Logged</span>
                  <h4 className="fw-black text-slate-800 mt-1 mb-0">{computedWeekTotal} hrs</h4>
                </div>
                <p className="text-muted small mb-0 mt-2">
                  Reg: {timesheet.hoursLogged ?? '0.00'}h | OT: {timesheet.overtimeLogged ?? '0.00'}h
                </p>
              </div>
            </div>

            <div className="col-md-3">
              <div className="gf-card mb-0 p-3 h-100 d-flex flex-column justify-content-between">
                <div>
                  <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Overtime Hours</span>
                  <h4 className="fw-black text-slate-800 mt-1 mb-0">{timesheet.overtimeLogged ?? '0.00'} hrs</h4>
                </div>
                <p className="text-muted small mb-0 mt-2">Hours over regular basis (40h+)</p>
              </div>
            </div>

            <div className="col-md-3">
              <div className="gf-card mb-0 p-3 h-100 d-flex flex-column justify-content-between">
                <div>
                  <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Billable Amount</span>
                  <h4 className="fw-black text-green-600 mt-1 mb-0">${timesheet.billableAmount ?? '0.00'}</h4>
                </div>
                <p className="text-muted small mb-0 mt-2">Agreed rate weight summary</p>
              </div>
            </div>
          </div>

          {/* Rejection / Correction Comment Box */}
          {timesheet.status === 'REJECTED' && (
            <div className="gf-card border-danger bg-red-light p-3 mb-4">
              <h6 className="fw-bold text-danger mb-2">Rejection Notice</h6>
              <p className="text-muted small mb-3">
                This timesheet draft has been rejected by the Hiring Manager. Please review feedback, modify your logged hours, add a comment explanation, and submit again.
              </p>

              <Form onSubmit={handleCommentSubmit} className="d-flex gap-2">
                <Form.Control
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Explain modifications / add notes..."
                  required
                />
                <Button type="submit" variant="danger" disabled={actionLoading}>
                  Add Comment
                </Button>
              </Form>
            </div>
          )}

          {/* Action Row */}
          {['DRAFT', 'REJECTED', 'REVISED'].includes(timesheet.status) && (
            <div className="d-flex justify-content-end gap-3 mt-4">
              <Button
                variant="outline-primary"
                className="btn-gf-outline px-4 py-2"
                onClick={handleSaveDraft}
                disabled={actionLoading}
              >
                Save Draft
              </Button>
              <Button
                className="btn-gf-primary px-4 py-2"
                onClick={handleSubmit}
                disabled={actionLoading || !isDraftSaved}
              >
                Submit Timesheet
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  )}
</div>
  );
}

export default Timesheets;