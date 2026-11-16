import React, { useState, useEffect } from 'react';
import {
  Inbox,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  Mail,
  Phone,
  User,
  Calendar,
  MessageSquare,
  Trash2,
  X,
  Check,
  AlertTriangle,
  ExternalLink,
  Tag
} from 'lucide-react';
import { schoolDb } from '../../services/schoolDatabase';
import { PublicInquiry, PublicInquiryStatus } from '../../types/school';

interface AdminPublicInquiriesManagerProps {
  reviewerName?: string;
  actorUsername?: string;
}

const INQUIRY_CATEGORIES = [
  'All Categories',
  'Enrollment Inquiry',
  'Form 137 / SF10 Request',
  'Good Moral Certificate',
  'Senior High Voucher Program',
  'Parent-Teacher Consultation',
  'Other Concerns',
];

export const AdminPublicInquiriesManager: React.FC<AdminPublicInquiriesManagerProps> = ({
  reviewerName = 'System Administrator',
  actorUsername = 'Admin',
}) => {
  const [inquiries, setInquiries] = useState<PublicInquiry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | PublicInquiryStatus>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All Categories');

  // Detail modal state
  const [selectedInquiry, setSelectedInquiry] = useState<PublicInquiry | null>(null);
  const [draftStatus, setDraftStatus] = useState<PublicInquiryStatus>('In Review');
  const [draftNotes, setDraftNotes] = useState('');

  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const sync = () => {
      const list = schoolDb.getPublicInquiries();
      setInquiries(list);
      setSelectedInquiry((prev) => (prev ? list.find((i) => i.id === prev.id) || null : null));
    };
    sync();
    const unsub = schoolDb.subscribe(sync);
    return () => unsub();
  }, []);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setBannerMessage({ type, text });
    setTimeout(() => setBannerMessage(null), 5000);
  };

  const filteredInquiries = inquiries.filter((inq) => {
    if (statusFilter !== 'All' && inq.status !== statusFilter) {
      return false;
    }
    if (categoryFilter !== 'All Categories' && inq.category !== categoryFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inq.id.toLowerCase().includes(q) ||
        inq.fullName.toLowerCase().includes(q) ||
        inq.email.toLowerCase().includes(q) ||
        (inq.phone || '').toLowerCase().includes(q) ||
        inq.category.toLowerCase().includes(q) ||
        inq.message.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenDetails = (inq: PublicInquiry) => {
    setSelectedInquiry(inq);
    setDraftStatus(inq.status);
    setDraftNotes(inq.adminNotes || '');
  };

  const handleSaveInquiryUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInquiry) return;

    const ok = schoolDb.updatePublicInquiryStatus(
      selectedInquiry.id,
      draftStatus,
      draftNotes,
      reviewerName || actorUsername
    );

    if (ok) {
      showNotification(
        'success',
        `Updated ticket ${selectedInquiry.id} (${selectedInquiry.fullName}) to "${draftStatus}".`
      );
      setSelectedInquiry(null);
    } else {
      showNotification('error', 'Failed to update inquiry record.');
    }
  };

  const handleQuickMarkResolved = (inq: PublicInquiry) => {
    const ok = schoolDb.updatePublicInquiryStatus(
      inq.id,
      'Resolved',
      inq.adminNotes || 'Reviewed and addressed by Administration / Registrar.',
      reviewerName || actorUsername
    );
    if (ok) {
      showNotification('success', `Marked inquiry ${inq.id} as Resolved.`);
    }
  };

  const handleDeleteInquiry = (inq: PublicInquiry) => {
    if (!confirm(`Delete inquiry ${inq.id} from ${inq.fullName}? This cannot be undone.`)) {
      return;
    }
    const ok = schoolDb.deletePublicInquiry(inq.id, actorUsername);
    if (ok) {
      if (selectedInquiry?.id === inq.id) setSelectedInquiry(null);
      showNotification('success', `Deleted inquiry ${inq.id}.`);
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const newCount = inquiries.filter((i) => i.status === 'New').length;
  const reviewCount = inquiries.filter((i) => i.status === 'In Review').length;
  const resolvedCount = inquiries.filter((i) => i.status === 'Resolved').length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header & Summary Counters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-widest uppercase text-blue-900">
              Online Public Assistance Desk (PAD)
            </span>
            <span className="text-[10px] bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-mono font-bold">
              DepEd Citizen&apos;s Charter
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold font-crest tracking-tight text-slate-900 mt-1">
            Community &amp; Parent Inquiries Inbox
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            View and manage inquiries submitted through the Online Public Assistance Desk form on the main website.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-center">
            <div className="text-[10px] text-amber-700 font-bold uppercase">New</div>
            <div className="text-base font-bold font-mono text-amber-900">{newCount}</div>
          </div>
          <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <div className="text-[10px] text-blue-700 font-bold uppercase">In Review</div>
            <div className="text-base font-bold font-mono text-blue-900">{reviewCount}</div>
          </div>
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
            <div className="text-[10px] text-emerald-700 font-bold uppercase">Resolved</div>
            <div className="text-base font-bold font-mono text-emerald-900">{resolvedCount}</div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {bannerMessage && (
        <div
          className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 animate-fade-in ${
            bannerMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{bannerMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="cursor-pointer text-slate-500 hover:text-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[230px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search sender name, email, ticket ID, category, or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-hidden focus:border-blue-900"
            />
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-2 py-1 text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Pills */}
          <div className="flex items-center bg-white p-1 rounded-lg border border-slate-200">
            {(['All', 'New', 'In Review', 'Resolved'] as const).map((st) => (
              <button
                key={st}
                type="button"
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

          {/* Category Select */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="p-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800"
          >
            {INQUIRY_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Inquiries Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="p-3 w-36">Ticket &amp; Date</th>
              <th className="p-3">Sender Details</th>
              <th className="p-3">Category &amp; Message</th>
              <th className="p-3 text-center w-28">Status</th>
              <th className="p-3 text-right w-44">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredInquiries.map((inq) => {
              const isNew = inq.status === 'New';
              const isInReview = inq.status === 'In Review';

              return (
                <tr key={inq.id} className="hover:bg-slate-50/80 transition-colors align-top">
                  <td className="p-3">
                    <div className="font-mono font-bold text-blue-950">{inq.id}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{formatTimestamp(inq.submittedAt)}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900 text-sm">{inq.fullName}</div>
                    <div className="text-[11px] text-blue-900 font-mono flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{inq.email}</span>
                    </div>
                    {inq.phone && (
                      <div className="text-[11px] text-slate-600 font-mono flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{inq.phone}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-3 max-w-md">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold mb-1">
                      <Tag className="w-3 h-3 text-blue-900" />
                      <span>{inq.category}</span>
                    </span>
                    <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                      {inq.message}
                    </p>
                    {inq.adminNotes && (
                      <div className="mt-1.5 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded px-2 py-1">
                        <strong className="text-slate-700">Admin Note:</strong> {inq.adminNotes}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        isNew
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : isInReview
                          ? 'bg-blue-100 text-blue-900 border border-blue-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {isNew && <Inbox className="w-3 h-3 text-amber-700" />}
                      {isInReview && <Clock className="w-3 h-3 text-blue-700" />}
                      {!isNew && !isInReview && <CheckCircle2 className="w-3 h-3 text-emerald-700" />}
                      <span>{inq.status}</span>
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleOpenDetails(inq)}
                        className="px-2.5 py-1 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                        title="View complete inquiry details and update status"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-300" />
                        <span>View</span>
                      </button>

                      {inq.status !== 'Resolved' && (
                        <button
                          type="button"
                          onClick={() => handleQuickMarkResolved(inq)}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                          title="Mark inquiry as Resolved"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Resolve</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteInquiry(inq)}
                        className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete inquiry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredInquiries.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  No Public Assistance Desk inquiries match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================= */}
      {/* MODAL: Full Inquiry Details & Admin Response Workflow */}
      {/* ========================================================= */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-800 text-amber-300 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white leading-snug">
                    Public Assistance Desk Inquiry Details
                  </h4>
                  <div className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                    <span>
                      Ticket: <strong className="font-mono text-white">{selectedInquiry.id}</strong>
                    </span>
                    <span>·</span>
                    <span>{formatTimestamp(selectedInquiry.submittedAt)}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedInquiry(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-slate-50 text-slate-800">
              {/* Sender Information Card */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-900" />
                    <span className="text-sm font-bold text-slate-900">
                      {selectedInquiry.fullName}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-bold">
                    {selectedInquiry.category}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Email Address
                    </span>
                    <a
                      href={`mailto:${selectedInquiry.email}?subject=${encodeURIComponent(
                        `Re: [INHS PAD ${selectedInquiry.id}] ${selectedInquiry.category}`
                      )}`}
                      className="inline-flex items-center gap-1 font-mono font-semibold text-blue-900 hover:underline mt-0.5"
                    >
                      <span>{selectedInquiry.email}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Mobile / Phone Number
                    </span>
                    <span className="font-mono font-semibold text-slate-800 mt-0.5 block">
                      {selectedInquiry.phone || 'Not provided'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Full Inquiry Message */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
                  Submitted Message / Details
                </span>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {selectedInquiry.message}
                </div>
              </div>

              {/* Admin Resolution Form */}
              <form
                id="pad-admin-review-form"
                onSubmit={handleSaveInquiryUpdate}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs"
              >
                <div className="font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Administrative Action &amp; Internal Remarks
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Ticket Status
                    </label>
                    <select
                      value={draftStatus}
                      onChange={(e) => setDraftStatus(e.target.value as PublicInquiryStatus)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:border-blue-900 focus:outline-hidden"
                    >
                      <option value="New">New</option>
                      <option value="In Review">In Review</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>

                  {selectedInquiry.handledBy && (
                    <div className="flex flex-col justify-end text-[11px] text-slate-500">
                      <span>
                        Last updated by: <strong className="text-slate-700">{selectedInquiry.handledBy}</strong>
                      </span>
                      {selectedInquiry.handledAt && (
                        <span>{formatTimestamp(selectedInquiry.handledAt)}</span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Registrar / Admin Handling Notes
                  </label>
                  <textarea
                    rows={3}
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    placeholder="Record actions taken, email reply details, or Form 137 pickup schedule..."
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:border-blue-900 focus:outline-hidden"
                  />
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="bg-white p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <a
                href={`mailto:${selectedInquiry.email}?subject=${encodeURIComponent(
                  `Re: [INHS PAD ${selectedInquiry.id}] ${selectedInquiry.category}`
                )}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-blue-900" />
                <span>Reply via Email</span>
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedInquiry(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  form="pad-admin-review-form"
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5 text-amber-300" />
                  <span>Save Status &amp; Notes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
