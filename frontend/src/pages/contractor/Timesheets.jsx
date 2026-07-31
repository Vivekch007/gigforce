import React, { useEffect, useState } from 'react';
import { Spinner, Alert, Button, Form, Table, Card } from 'react-bootstrap';
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
            // Select the first one (typically latest or active draft)
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
  }, []);

  // 2. Fetch specific timesheet details on dropdown change
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    const loadDetails = async () => {
      try {
        setLoading(true);
        setError('');
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

  // Builds the 7-day visual list (Mon-Sun) aligning with pre-generated lines
  const buildWeekGrid = (ts) => {
    const monday = new Date(ts.weekStartDate);
    const grid = [];
    
    // Day names array
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    for (let i = 0; i < 7; i++) {
      const current = new Date(monday);
      current.setDate(monday.getDate() + i);
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // Search if this date exists in the backend lines (which usually only contain Mon-Fri)
      const existingLine = ts.lines?.find((line) => line.workDate === dateStr);
      
      const isWeekend = i >= 5; // Saturday/Sunday

      grid.push({
        dayName: dayNames[i],
        workDate: dateStr,
        hoursWorked: existingLine ? String(existingLine.hoursWorked) : '0.00',
        activityDesc: existingLine ? (existingLine.activityDesc || '') : '',
        isWeekend,
        isPreGenerated: !!existingLine,
        lineId: existingLine?.id || null,
      });
    }
    setLinesData(grid);
  };

  const handleLineChange = (index, field, value) => {
    const updated = [...linesData];
    updated[index] = { ...updated[index], [field]: value };
    setLinesData(updated);
  };

  // Saves current edits as draft
  const handleSaveDraft = async () => {
    if (!timesheet) return;
    setActionLoading(true);
    setError('');
    try {
      // Include weekdays, and weekends only if user entered hours > 0
      const editLines = linesData
        .filter((l) => l.isPreGenerated || parseFloat(l.hoursWorked || '0') > 0)
        .map((l) => ({
          workDate: l.workDate,
          hoursWorked: parseFloat(l.hoursWorked || '0'),
          activityDesc: (l.activityDesc || '').trim(),
        }));

      // Validate activity description if hours are entered
      let totalHours = 0;
      for (const line of editLines) {
        totalHours += line.hoursWorked;
        if (line.hoursWorked > 0 && !line.activityDesc) {
          throw new Error(`Activity description is required for ${line.workDate} when hours are logged.`);
        }
      }

      const confirmed = await showConfirmation({
        title: 'Save Draft',
        message: `You have logged a total of ${totalHours} hours. Are you sure you want to save this timesheet as a draft?`
      });
      if (!confirmed) {
        setActionLoading(false);
        return;
      }

      const updated = await updateTimesheet(timesheet.id, { lines: editLines });
      setTimesheet(updated);
      buildWeekGrid(updated);
      addToast('Success', 'Timesheet draft saved successfully!', 'success');
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Submits the timesheet (Save + Submit)
  const handleSubmit = async () => {
    if (!timesheet) return;
    
    // Calculate total hours first to show in confirmation
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
    }

    const confirmed = await showConfirmation({
      title: 'Submit Timesheet',
      message: `You have logged a total of ${totalHours} hours. Are you sure you want to submit this timesheet? Once submitted, it cannot be modified until reviewed.`
    });
    if (!confirmed) return;
    setActionLoading(true);
    setError('');
    try {

      // Validate activity description
      for (const line of editLines) {
        if (line.hoursWorked > 0 && !line.activityDesc) {
          throw new Error(`Activity description is required for ${line.workDate} when hours are logged.`);
        }
      }

      await updateTimesheet(timesheet.id, { lines: editLines });

      // 2. Submit timesheet
      const submitted = await submitTimesheet(timesheet.id);
      setTimesheet(submitted);
      buildWeekGrid(submitted);
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

  return (
    <div className="container-fluid">
      {/* Title Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">Weekly Timesheets</h2>
          <p className="text-muted small mt-1 mb-0">Log daily hours worked and submit logs for review.</p>
        </div>
      </div>


      {/* Week Selector Selector Card */}
      <div className="gf-card">
        <Form.Group controlId="weekSelectDropdown">
          <Form.Label className="uppercase-label">Select Timesheet Week</Form.Label>
          <Form.Select 
            value={selectedId} 
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={timesheetList.length === 0}
          >
            {timesheetList.length === 0 ? (
              <option>No timesheets initialized...</option>
            ) : (
              timesheetList.map((ts) => (
                <option key={ts.id} value={ts.id}>
                  Week starting: {ts.weekStartDate} to {ts.weekEndDate} ({ts.status})
                </option>
              ))
            )}
          </Form.Select>
        </Form.Group>
      </div>

      {timesheet && (
        <div>
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
                  <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Regular Hours</span>
                  <h4 className="fw-black text-slate-800 mt-1 mb-0">{timesheet.hoursLogged ?? '0.00'}</h4>
                </div>
                <p className="text-muted small mb-0 mt-2">Standard regular log (Max 40h)</p>
              </div>
            </div>

            <div className="col-md-3">
              <div className="gf-card mb-0 p-3 h-100 d-flex flex-column justify-content-between">
                <div>
                  <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Overtime Hours</span>
                  <h4 className="fw-black text-slate-800 mt-1 mb-0">{timesheet.overtimeLogged ?? '0.00'}</h4>
                </div>
                <p className="text-muted small mb-0 mt-2">Hours over regular basis</p>
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

          {/* Daily Logs Grid Sheet */}
          <div className="gf-card p-0 overflow-hidden mb-4">
            <Table responsive className="align-middle mb-0">
              <thead className="bg-light">
                <tr className="text-uppercase text-muted border-bottom" style={{ fontSize: '0.75rem' }}>
                  <th className="p-3" style={{ width: '150px' }}>Day</th>
                  <th className="p-3" style={{ width: '150px' }}>Date</th>
                  <th className="p-3" style={{ width: '120px' }}>Hours Logged</th>
                  <th className="p-3">Activity Description</th>
                </tr>
              </thead>
              <tbody>
                {linesData.map((line, idx) => {
                  const isEditable = ['DRAFT', 'REJECTED', 'REVISED'].includes(timesheet.status);
                  return (
                    <tr key={idx} className={line.isWeekend ? 'bg-light text-muted' : ''}>
                      <td className="p-3 fw-bold">{line.dayName}</td>
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
                          className="grid-input"
                          style={{ maxWidth: '90px' }}
                        />
                      </td>
                      <td className="p-3">
                        <Form.Control
                          type="text"
                          value={line.activityDesc}
                          onChange={(e) => handleLineChange(idx, 'activityDesc', e.target.value)}
                          disabled={!isEditable}
                          placeholder="Describe your activities..."
                          className="grid-input"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>

          {/* Rejection / Correction Comment Box */}
          {timesheet.status === 'REJECTED' && (
            <div className="gf-card border-danger bg-red-light p-3">
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
                disabled={actionLoading}
              >
                Submit Timesheet
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Timesheets;
