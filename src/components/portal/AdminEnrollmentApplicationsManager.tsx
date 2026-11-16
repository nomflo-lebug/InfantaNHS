import React, { useState, useEffect } from 'react';
import { 
  FileCheck2, 
  Search, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  Filter, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Building2, 
  FileText, 
  Calendar, 
  Sparkles,
  AlertTriangle,
  X,
  Check,
  ChevronDown,
  ShieldCheck,
  Lock,
  Unlock,
  PauseCircle,
  PlayCircle,
  Edit3
} from 'lucide-react';
import { schoolDb } from '../../services/schoolDatabase';
import { EnrollmentApplication, SchoolClassSection, GradeLevel, EnrollmentSettings } from '../../types/school';

interface AdminEnrollmentApplicationsManagerProps {
  reviewerName?: string;
  actorUsername?: string;
}

export const AdminEnrollmentApplicationsManager: React.FC<AdminEnrollmentApplicationsManagerProps> = ({
  reviewerName = 'System Administrator',
  actorUsername = 'Admin',
}) => {
  const [applications, setApplications] = useState<EnrollmentApplication[]>([]);
  const [sections, setSections] = useState<SchoolClassSection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending Review' | 'Approved' | 'Denied'>('All');
  const [gradeFilter, setGradeFilter] = useState<string>('All');

  // Modal inspection state
  const [selectedApp, setSelectedApp] = useState<EnrollmentApplication | null>(null);
  const [actionType, setActionType] = useState<'view' | 'approve' | 'deny'>('view');
  
  // Approval Form State
  const [assignedSection, setAssignedSection] = useState<string>('');
  const [approvalNotes, setApprovalNotes] = useState<string>('');

  // Denial Form State
  const [denialCategory, setDenialCategory] = useState<string>('Incomplete documentary credentials');
  const [denialRemarks, setDenialRemarks] = useState<string>('');

  // Alerts
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Online Enrollment Gate Control State
  const [enrollmentSettings, setEnrollmentSettings] = useState<EnrollmentSettings>(() =>
    schoolDb.getEnrollmentSettings()
  );
  const [showGateEditor, setShowGateEditor] = useState(false);
  const [gateActionMode, setGateActionMode] = useState<'halt' | 'edit'>('halt');
  const [draftSchoolYear, setDraftSchoolYear] = useState(enrollmentSettings.schoolYear);
  const [draftClosedTitle, setDraftClosedTitle] = useState(enrollmentSettings.closedTitle);
  const [draftClosedReason, setDraftClosedReason] = useState(enrollmentSettings.closedReason);
  const [draftReopenSchedule, setDraftReopenSchedule] = useState(enrollmentSettings.reopenSchedule || '');

  useEffect(() => {
    const sync = () => {
      setApplications(schoolDb.getEnrollmentApplications());
      setSections(schoolDb.getSections());
      setEnrollmentSettings(schoolDb.getEnrollmentSettings());
    };
    sync();
    const unsub = schoolDb.subscribe(sync);
    return () => unsub();
  }, []);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setBannerMessage({ type, text });
    setTimeout(() => setBannerMessage(null), 5000);
  };

  const filteredApplications = applications.filter(app => {
    // Status filter
    if (statusFilter !== 'All') {
      if (statusFilter === 'Denied') {
        if (app.status !== 'Denied' && app.status !== 'Rejected') return false;
      } else if (app.status !== statusFilter) {
        return false;
      }
    }

    // Grade filter
    if (gradeFilter !== 'All' && app.targetGrade.toString() !== gradeFilter) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const fullName = `${app.firstName} ${app.middleName || ''} ${app.lastName}`.toLowerCase();
      const lrn = app.lrn || '';
      const id = app.id.toLowerCase();
      const strand = app.targetStrand.toLowerCase();
      return fullName.includes(q) || lrn.includes(q) || id.includes(q) || strand.includes(q);
    }

    return true;
  });

  const handleOpenApprove = (app: EnrollmentApplication) => {
    setSelectedApp(app);
    setActionType('approve');
    // Pre-select first matching section for target grade
    const gradeSections = sections.filter(s => s.gradeLevel === app.targetGrade);
    setAssignedSection(gradeSections[0]?.sectionName || (app.targetGrade >= 11 ? `${app.targetStrand.split(' ')[0]} - Newton` : 'Section 1'));
    setApprovalNotes('Learner submitted complete PSA birth certificate and previous SF9 card. Credentials confirmed.');
  };

  const handleOpenDeny = (app: EnrollmentApplication) => {
    setSelectedApp(app);
    setActionType('deny');
    setDenialCategory('Incomplete documentary credentials');
    setDenialRemarks('Missing original Form 138 / SF9 Report Card and Certificate of Good Moral Character.');
  };

  const handleExecuteApproval = () => {
    if (!selectedApp) return;
    if (!assignedSection.trim()) {
      alert('Please select or specify a section to assign this student.');
      return;
    }

    const res = schoolDb.approveEnrollmentApplication(
      selectedApp.id,
      assignedSection,
      approvalNotes,
      reviewerName
    );

    if (res.success) {
      showNotification('success', `Application ${selectedApp.id} for ${selectedApp.firstName} ${selectedApp.lastName} is officially APPROVED into ${assignedSection}!`);
      setSelectedApp(null);
    } else {
      showNotification('error', res.error || 'Failed to approve application.');
    }
  };

  const handleExecuteDenial = () => {
    if (!selectedApp) return;
    const finalReason = `${denialCategory}: ${denialRemarks}`.trim();

    const res = schoolDb.denyEnrollmentApplication(
      selectedApp.id,
      finalReason,
      reviewerName
    );

    if (res.success) {
      showNotification('success', `Application ${selectedApp.id} for ${selectedApp.firstName} ${selectedApp.lastName} has been marked as DENIED.`);
      setSelectedApp(null);
    } else {
      showNotification('error', res.error || 'Failed to record denial.');
    }
  };

  const handleOpenGateEditor = (mode: 'halt' | 'edit') => {
    const current = schoolDb.getEnrollmentSettings();
    setDraftSchoolYear(current.schoolYear);
    setDraftClosedTitle(current.closedTitle);
    setDraftClosedReason(current.closedReason);
    setDraftReopenSchedule(current.reopenSchedule || '');
    setGateActionMode(mode);
    setShowGateEditor(true);
  };

  const handleConfirmHaltOrSaveNotice = (e: React.FormEvent) => {
    e.preventDefault();
    const targetOpen = gateActionMode === 'halt' ? false : enrollmentSettings.isOpen;
    const updated = schoolDb.setEnrollmentStatus(
      targetOpen,
      {
        schoolYear: draftSchoolYear,
        closedTitle: draftClosedTitle,
        closedReason: draftClosedReason,
        reopenSchedule: draftReopenSchedule,
      },
      actorUsername
    );
    setEnrollmentSettings(updated);
    setShowGateEditor(false);
    showNotification(
      'success',
      targetOpen
        ? `Online Enrollment notice settings updated (Portal remains OPEN for S.Y. ${updated.schoolYear}).`
        : `Online Enrollment Portal has been CLOSED / HALTED for S.Y. ${updated.schoolYear}. Public submissions are now paused.`
    );
  };

  const handleOpenEnrollmentPortal = () => {
    const updated = schoolDb.setEnrollmentStatus(
      true,
      { schoolYear: enrollmentSettings.schoolYear },
      actorUsername
    );
    setEnrollmentSettings(updated);
    setShowGateEditor(false);
    showNotification(
      'success',
      `Online Enrollment Portal is now OPEN for S.Y. ${updated.schoolYear}! Prospective learners and parents can submit applications.`
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header & Stats Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-widest uppercase text-blue-900">
              Registrar & Admissions Governance
            </span>
            <span className="text-[10px] bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-mono font-bold">
              DepEd Order No. 03, s. 2018
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold font-crest tracking-tight text-slate-900 mt-1">
            Student Enrollment Applications & Profile Review
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate incoming Grade 7 (JHS), Grade 11 (SHS), and Transferee student profiles, and control Online Enrollment availability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-center">
            <div className="text-[10px] text-amber-700 font-bold uppercase">Pending</div>
            <div className="text-base font-bold font-mono text-amber-900">
              {applications.filter(a => a.status === 'Pending Review').length}
            </div>
          </div>
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
            <div className="text-[10px] text-emerald-700 font-bold uppercase">Approved</div>
            <div className="text-base font-bold font-mono text-emerald-900">
              {applications.filter(a => a.status === 'Approved').length}
            </div>
          </div>
          <div className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-center">
            <div className="text-[10px] text-rose-700 font-bold uppercase">Denied</div>
            <div className="text-base font-bold font-mono text-rose-900">
              {applications.filter(a => a.status === 'Denied' || a.status === 'Rejected').length}
            </div>
          </div>
        </div>
      </div>

      {/* Online Enrollment Portal Gate Control Panel */}
      <div
        className={`rounded-2xl border-2 p-4 sm:p-5 transition-colors ${
          enrollmentSettings.isOpen
            ? 'bg-emerald-50/70 border-emerald-300'
            : 'bg-rose-50/80 border-rose-300'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                enrollmentSettings.isOpen
                  ? 'bg-emerald-600 text-white'
                  : 'bg-rose-700 text-white'
              }`}
            >
              {enrollmentSettings.isOpen ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Online Enrollment Portal Control
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    enrollmentSettings.isOpen
                      ? 'bg-emerald-700 text-white'
                      : 'bg-rose-700 text-white'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      enrollmentSettings.isOpen ? 'bg-emerald-200 animate-pulse' : 'bg-rose-200'
                    }`}
                  />
                  {enrollmentSettings.isOpen ? 'OPEN FOR SUBMISSIONS' : 'CLOSED / HALTED'}
                </span>
                <span className="text-[11px] font-mono font-semibold text-slate-600 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                  S.Y. {enrollmentSettings.schoolYear}
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {enrollmentSettings.isOpen
                  ? 'Prospective learners and parents can currently submit new enrollment applications via the Online Enrollment Portal.'
                  : `Public form submissions are paused. Visitors see: "${enrollmentSettings.closedTitle}" — ${enrollmentSettings.closedReason}`}
              </p>
              {enrollmentSettings.updatedAt && (
                <div className="text-[11px] text-slate-500 font-mono">
                  Last updated by <strong>{enrollmentSettings.updatedBy || 'Admin'}</strong> on{' '}
                  {new Date(enrollmentSettings.updatedAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenGateEditor('edit')}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-600" />
              <span>Configure Closed Notice</span>
            </button>

            {enrollmentSettings.isOpen ? (
              <button
                type="button"
                onClick={() => handleOpenGateEditor('halt')}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                <PauseCircle className="w-4 h-4" />
                <span>Close / Halt Enrollment</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenEnrollmentPortal}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Open Online Enrollment</span>
              </button>
            )}
          </div>
        </div>

        {/* Inline Editor / Confirmation Panel for Closing/Halting or Configuring Notice */}
        {showGateEditor && (
          <form
            onSubmit={handleConfirmHaltOrSaveNotice}
            className="mt-4 pt-4 border-t border-slate-200/80 bg-white rounded-xl p-4 shadow-xs space-y-3 text-xs animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                {gateActionMode === 'halt' ? (
                  <>
                    <PauseCircle className="w-4 h-4 text-rose-700" />
                    <span>Close / Halt Online Enrollment &amp; Set Public Notice</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4 text-blue-800" />
                    <span>Edit Online Enrollment Notice &amp; School Year</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowGateEditor(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Target School Year
                </label>
                <input
                  type="text"
                  required
                  value={draftSchoolYear}
                  onChange={(e) => setDraftSchoolYear(e.target.value)}
                  placeholder="e.g. 2026–2027"
                  className="w-full p-2 rounded-lg border border-slate-300 focus:border-blue-900 focus:outline-hidden font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Expected Reopening / Advisory Schedule
                </label>
                <input
                  type="text"
                  value={draftReopenSchedule}
                  onChange={(e) => setDraftReopenSchedule(e.target.value)}
                  placeholder="e.g. May 2027 or To be announced"
                  className="w-full p-2 rounded-lg border border-slate-300 focus:border-blue-900 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Public Closure Notice Headline
              </label>
              <input
                type="text"
                required
                value={draftClosedTitle}
                onChange={(e) => setDraftClosedTitle(e.target.value)}
                placeholder="e.g. Online Enrollment Temporarily Halted / Closed"
                className="w-full p-2 rounded-lg border border-slate-300 focus:border-blue-900 focus:outline-hidden font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Reason / Guidance Shown to Learners &amp; Parents
              </label>
              <textarea
                rows={2}
                required
                value={draftClosedReason}
                onChange={(e) => setDraftClosedReason(e.target.value)}
                placeholder="Explain why enrollment is closed and where inquiries can be directed..."
                className="w-full p-2 rounded-lg border border-slate-300 focus:border-blue-900 focus:outline-hidden"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowGateEditor(false)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-1.5 text-white rounded-lg font-bold cursor-pointer flex items-center gap-1.5 shadow-xs ${
                  gateActionMode === 'halt'
                    ? 'bg-rose-700 hover:bg-rose-800'
                    : 'bg-blue-900 hover:bg-blue-800'
                }`}
              >
                {gateActionMode === 'halt' ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Confirm &amp; Halt Online Enrollment</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Notice Settings</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Banner Feedback */}
      {bannerMessage && (
        <div className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 animate-fade-in ${
          bannerMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          <div className="flex items-center gap-2">
            {bannerMessage.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span>{bannerMessage.text}</span>
          </div>
          <button onClick={() => setBannerMessage(null)} className="cursor-pointer text-slate-500 hover:text-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by student name, LRN, app reference, strand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-hidden focus:border-blue-900"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-2 py-1 text-slate-500 hover:text-slate-800 font-bold"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Pills */}
          <div className="flex items-center bg-white p-1 rounded-lg border border-slate-200">
            {(['All', 'Pending Review', 'Approved', 'Denied'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-blue-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Grade Level Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Grade:</span>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800"
            >
              <option value="All">All Levels (7–12)</option>
              <option value="7">Grade 7 (JHS)</option>
              <option value="8">Grade 8 (JHS)</option>
              <option value="9">Grade 9 (JHS)</option>
              <option value="10">Grade 10 (JHS)</option>
              <option value="11">Grade 11 (SHS)</option>
              <option value="12">Grade 12 (SHS)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications Roster Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="p-3 w-28">Ref #</th>
              <th className="p-3">Learner Profile</th>
              <th className="p-3">Target Level & Program</th>
              <th className="p-3">Guardian & Contacts</th>
              <th className="p-3 text-center w-28">Review Status</th>
              <th className="p-3 text-right w-48">Decision Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredApplications.map(app => {
              const isApproved = app.status === 'Approved';
              const isDenied = app.status === 'Denied' || app.status === 'Rejected';
              const isPending = app.status === 'Pending Review' || app.status === 'Requires Verification';

              return (
                <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-mono font-bold text-blue-950">
                    <div>{app.id}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{app.submissionDate}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900 text-sm">
                      {app.lastName}, {app.firstName} {app.middleName || ''} {app.extensionName || ''}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span>Sex: <strong>{app.gender}</strong></span>
                      <span>·</span>
                      <span>DOB: <strong>{app.birthDate}</strong></span>
                      <span>·</span>
                      <span>LRN: <strong className="font-mono text-slate-700">{app.lrn || 'Incoming'}</strong></span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                      Prev: {app.previousSchool || 'Infanta Central School'}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900">
                      Grade {app.targetGrade}
                    </div>
                    <div className="text-xs text-blue-900 font-medium">
                      {app.targetStrand}
                    </div>
                    <span className="inline-block text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded mt-1 font-mono">
                      {app.applicationType}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-800">{app.guardianName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{app.contactNumber}</div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{app.addressBarangay}</div>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      isApproved 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : isDenied 
                        ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {isApproved && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                      {isDenied && <XCircle className="w-3 h-3 text-rose-600" />}
                      {isPending && <Clock className="w-3 h-3 text-amber-600" />}
                      <span>{app.status}</span>
                    </span>
                    {app.assignedSection && (
                      <div className="text-[10px] font-mono font-bold text-emerald-800 mt-1">
                        Sec: {app.assignedSection}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      <button
                        onClick={() => { setSelectedApp(app); setActionType('view'); }}
                        className="p-1.5 text-slate-600 hover:text-blue-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        title="View Full Profile & Submitted Documents"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Approval Button */}
                      <button
                        onClick={() => handleOpenApprove(app)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                          isApproved 
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' 
                            : 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs'
                        }`}
                        title="Approve student enrollment"
                      >
                        <Check className="w-3 h-3" />
                        <span>{isApproved ? 'Re-assign' : 'Approve'}</span>
                      </button>

                      {/* Denial Button */}
                      <button
                        onClick={() => handleOpenDeny(app)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                          isDenied 
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200' 
                            : 'bg-rose-700 text-white hover:bg-rose-800 shadow-xs'
                        }`}
                        title="Deny student enrollment"
                      >
                        <X className="w-3 h-3" />
                        <span>{isDenied ? 'Remarks' : 'Deny'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredApplications.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  No enrollment applications match the selected status or search filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================= */}
      {/* MODAL: Full Profile Inspection / Decision Form */}
      {/* ========================================================= */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            
            {/* Modal Header */}
            <div className={`p-4 sm:p-5 flex items-center justify-between text-white shrink-0 ${
              actionType === 'approve'
                ? 'bg-emerald-900 border-b border-emerald-800'
                : actionType === 'deny'
                ? 'bg-rose-950 border-b border-rose-900'
                : 'bg-slate-900 border-b border-slate-800'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                  actionType === 'approve' ? 'bg-emerald-700 text-white' : actionType === 'deny' ? 'bg-rose-800 text-white' : 'bg-blue-800 text-amber-300'
                }`}>
                  {actionType === 'approve' ? <Check className="w-5 h-5" /> : actionType === 'deny' ? <X className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-base font-bold text-white leading-snug">
                    {actionType === 'approve' && 'Approve & Enroll Student'}
                    {actionType === 'deny' && 'Deny Student Enrollment Application'}
                    {actionType === 'view' && 'Official DepEd Learner Enrollment Profile'}
                  </h4>
                  <div className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                    <span>Ref: <strong className="font-mono text-white">{selectedApp.id}</strong></span>
                    <span>·</span>
                    <span>{selectedApp.submissionDate}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedApp(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-slate-50 text-slate-800">
              
              {/* Learner Identity Summary Card */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-900 tracking-wider">Learner Name</span>
                    <h5 className="text-lg font-bold text-slate-900 font-crest">
                      {selectedApp.lastName}, {selectedApp.firstName} {selectedApp.middleName || ''} {selectedApp.extensionName || ''}
                    </h5>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-semibold">12-Digit LRN</span>
                    <span className="font-mono font-bold text-blue-900 text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {selectedApp.lrn || 'No prior LRN (Auto-generates)'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Sex / Gender</span>
                    <span className="font-bold text-slate-800">{selectedApp.gender}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Birth Date</span>
                    <span className="font-bold text-slate-800">{selectedApp.birthDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Target Grade</span>
                    <span className="font-bold text-blue-900">Grade {selectedApp.targetGrade}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Track / Strand</span>
                    <span className="font-bold text-blue-900 truncate block">{selectedApp.targetStrand}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Residential Address</span>
                    <span className="font-medium text-slate-800">{selectedApp.addressBarangay}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Previous School Attended</span>
                    <span className="font-medium text-slate-800">{selectedApp.previousSchool || 'Not specified'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Parent / Guardian Name</span>
                    <span className="font-medium text-slate-800">{selectedApp.guardianName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Guardian Contact Phone</span>
                    <span className="font-medium text-slate-800 font-mono">{selectedApp.guardianContact || selectedApp.contactNumber}</span>
                  </div>
                </div>
              </div>

              {/* Documentary Credentials Submitted */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  Documentary Checklist Submitted:
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedApp.documentsSubmitted && selectedApp.documentsSubmitted.length > 0 ? (
                    selectedApp.documentsSubmitted.map((doc, idx) => (
                      <span key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs font-semibold">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>{doc}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-amber-700 italic">No credentials uploaded or declared yet.</span>
                  )}
                </div>
              </div>

              {/* ACTION: Approval View */}
              {actionType === 'approve' && (
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Confirm Official Enrollment & Section Assignment</span>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-emerald-950 mb-1">
                      Assign to Class Section for Grade {selectedApp.targetGrade} *
                    </label>
                    <select
                      value={assignedSection}
                      onChange={(e) => setAssignedSection(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-emerald-300 bg-white text-xs font-bold text-emerald-950 focus:outline-hidden focus:border-emerald-600 cursor-pointer"
                    >
                      {sections
                        .filter(s => s.gradeLevel === selectedApp.targetGrade)
                        .map(sec => (
                          <option key={sec.id} value={sec.sectionName}>
                            {sec.sectionName} — Adviser: {sec.adviserName} ({sec.studentIds.length}/{sec.maxCapacity} students)
                          </option>
                        ))}
                      {/* Fallback option */}
                      <option value={`${selectedApp.targetStrand.split(' ')[0]} - Section 1`}>
                        {selectedApp.targetStrand.split(' ')[0]} - Section 1 (New Section)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-950 mb-1">
                      Registrar Approval Notes / Instructions
                    </label>
                    <textarea
                      rows={2}
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="e.g. Verified original Form 138. Enrolled for S.Y. 2026-2027."
                      className="w-full p-2.5 rounded-lg border border-emerald-300 bg-white text-xs text-slate-800 focus:outline-hidden focus:border-emerald-600"
                    />
                  </div>
                </div>
              )}

              {/* ACTION: Denial View */}
              {actionType === 'deny' && (
                <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 space-y-4">
                  <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Official Denial of Enrollment Application</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-rose-950 mb-1">
                      Reason for Application Denial *
                    </label>
                    <select
                      value={denialCategory}
                      onChange={(e) => setDenialCategory(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-rose-300 bg-white text-xs font-bold text-rose-950 focus:outline-hidden focus:border-rose-600"
                    >
                      <option value="Incomplete documentary credentials">Incomplete documentary credentials (Missing PSA / Form 138)</option>
                      <option value="Did not qualify for STE screening exam">Did not qualify for STE special science screening examination</option>
                      <option value="Capacity filled for selected Senior High strand">Capacity filled for selected Senior High strand</option>
                      <option value="Discrepancy in previous academic records">Discrepancy in previous academic records</option>
                      <option value="Outside municipality catchment & quota reached">Outside municipality catchment & quota reached</option>
                      <option value="Other administrative grounds">Other administrative grounds</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-rose-950 mb-1">
                      Explanation / Registrar Remarks (Visible to Student in Status Tracker) *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={denialRemarks}
                      onChange={(e) => setDenialRemarks(e.target.value)}
                      placeholder="Provide clear guidance for the learner/parent..."
                      className="w-full p-2.5 rounded-lg border border-rose-300 bg-white text-xs text-slate-800 focus:outline-hidden focus:border-rose-600"
                    />
                  </div>
                </div>
              )}

              {/* Existing Status History (if already reviewed) */}
              {selectedApp.reviewedBy && (
                <div className="p-3 bg-slate-100 rounded-lg text-xs text-slate-600 flex items-center justify-between">
                  <span>Reviewed by: <strong>{selectedApp.reviewedBy}</strong> on {selectedApp.reviewedDate}</span>
                  {selectedApp.denialReason && <span className="text-rose-700 italic">{selectedApp.denialReason}</span>}
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="bg-white p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {actionType === 'view' ? (
                  <>
                    <button
                      onClick={() => handleOpenDeny(selectedApp)}
                      className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs"
                    >
                      Deny Application
                    </button>
                    <button
                      onClick={() => handleOpenApprove(selectedApp)}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs"
                    >
                      Approve & Enroll
                    </button>
                  </>
                ) : actionType === 'approve' ? (
                  <button
                    onClick={handleExecuteApproval}
                    className="px-6 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-md flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirm Official Approval</span>
                  </button>
                ) : (
                  <button
                    onClick={handleExecuteDenial}
                    className="px-6 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-md flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Confirm Application Denial</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
