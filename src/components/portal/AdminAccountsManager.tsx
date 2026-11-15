import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  BookOpen, 
  Key, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  Copy, 
  Check, 
  Lock,
  GraduationCap,
  ShieldAlert,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { schoolDb } from '../../services/schoolDatabase';
import { UserAccount, AccountRole } from '../../types/school';
import { validatePasswordStrength, SecurityAuditEntry } from '../../utils/security';

interface AdminAccountsManagerProps {
  currentUser: UserAccount;
}

export const AdminAccountsManager: React.FC<AdminAccountsManagerProps> = ({ currentUser }) => {
  const [accounts, setAccounts] = useState<UserAccount[]>(schoolDb.getAccounts());
  const [securityLogs, setSecurityLogs] = useState<SecurityAuditEntry[]>(schoolDb.getSecurityLogs());
  const [roleFilter, setRoleFilter] = useState<'All' | AccountRole>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AccountRole>('teacher');
  const [newFullName, setNewFullName] = useState('');
  const [newDesignation, setNewDesignation] = useState('Teacher I');
  const [newDepartment, setNewDepartment] = useState('Science & Mathematics');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Feedback alerts
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Password reset modal state
  const [resetModalAccount, setResetModalAccount] = useState<UserAccount | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [showAuditLog, setShowAuditLog] = useState(true);

  const refreshAccounts = () => {
    setAccounts(schoolDb.getAccounts());
    setSecurityLogs(schoolDb.getSecurityLogs());
  };

  useEffect(() => {
    const unsub = schoolDb.subscribe(refreshAccounts);
    return () => unsub();
  }, []);

  const handleCopyUsername = (acc: UserAccount) => {
    const text = `INHS Portal Account\nUsername: ${acc.username}\nRole: ${acc.role.toUpperCase()}`;
    navigator.clipboard.writeText(text);
    setCopiedId(acc.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const newPasswordCheck = validatePasswordStrength(newPassword);
  const resetPasswordCheck = validatePasswordStrength(resetNewPassword);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newUsername.trim() || !newPassword.trim() || !newFullName.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (!newPasswordCheck.valid) {
      setErrorMessage(newPasswordCheck.errors[0] || 'Password does not meet security policy.');
      return;
    }

    setIsSubmitting(true);

    const finalDesignation = newRole === 'admin'
      ? (newDesignation.trim() || 'Administrative Officer')
      : `${newDesignation.trim() || 'Teacher I'} (${newDepartment})`;

    const res = await schoolDb.createAccountAsync(
      {
        username: newUsername.trim(),
        password: newPassword.trim(),
        role: newRole,
        fullName: newFullName.trim(),
        designation: finalDesignation,
        email: newEmail.trim() || undefined,
        phone: newPhone.trim() || undefined,
      },
      currentUser.username
    );

    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to create account.');
      return;
    }

    const successMsg = newRole === 'teacher'
      ? `Success! Account created for "${newFullName.trim()}" with PBKDF2-SHA256 credential protection.`
      : `Administrator account for "${newFullName.trim()}" (@${newUsername.trim()}) created securely!`;

    setSuccessMessage(successMsg);
    setTimeout(() => setSuccessMessage(null), 5000);

    // Reset form
    setNewUsername('');
    setNewPassword('');
    setNewFullName('');
    setNewDesignation('Teacher I');
    setNewDepartment('Science & Mathematics');
    setNewEmail('');
    setNewPhone('');
    setShowCreateModal(false);
    refreshAccounts();
  };

  const handleDeleteAccount = (acc: UserAccount) => {
    if (acc.isPrimaryAdmin || acc.username.toLowerCase() === 'admin') {
      setErrorMessage('The primary Admin account cannot be deleted.');
      return;
    }

    if (confirm(`Are you sure you want to permanently delete account "${acc.username}" (${acc.fullName})?`)) {
      const res = schoolDb.deleteAccount(acc.id, currentUser.username);
      if (res.success) {
        setSuccessMessage(`Account "${acc.username}" has been removed.`);
        setTimeout(() => setSuccessMessage(null), 3000);
        refreshAccounts();
      } else {
        setErrorMessage(res.error || 'Failed to delete account.');
      }
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (!resetModalAccount || !resetNewPassword.trim()) return;

    if (!resetPasswordCheck.valid) {
      setResetError(resetPasswordCheck.errors[0] || 'Password does not meet security requirements.');
      return;
    }

    setIsSubmitting(true);
    const res = await schoolDb.resetAccountPasswordAsync(
      resetModalAccount.id,
      resetNewPassword.trim(),
      currentUser.username
    );
    setIsSubmitting(false);

    if (!res.success) {
      setResetError(res.error || 'Failed to update password.');
      return;
    }

    setSuccessMessage(`Password for "@${resetModalAccount.username}" has been securely hashed and updated.`);
    setTimeout(() => setSuccessMessage(null), 3500);
    setResetModalAccount(null);
    setResetNewPassword('');
    refreshAccounts();
  };

  // Filter accounts
  const filteredAccounts = accounts.filter(acc => {
    if (roleFilter !== 'All' && acc.role !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        acc.username.toLowerCase().includes(q) ||
        acc.fullName.toLowerCase().includes(q) ||
        acc.designation.toLowerCase().includes(q) ||
        (acc.email && acc.email.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const defaultPassAccountsCount = accounts.filter(a => a.mustChangePassword).length;

  const renderStrengthMeter = (check: ReturnType<typeof validatePasswordStrength>, value: string) => {
    if (!value) return null;
    const barColors = ['bg-rose-600', 'bg-rose-500', 'bg-amber-500', 'bg-blue-600', 'bg-emerald-600'];
    const textColors = ['text-rose-700', 'text-rose-700', 'text-amber-700', 'text-blue-800', 'text-emerald-700'];

    return (
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-500 font-medium">Password Strength:</span>
          <span className={`font-bold ${textColors[check.score]}`}>{check.label}</span>
        </div>
        <div className="grid grid-cols-4 gap-1 h-1.5">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`rounded-full transition-colors ${
                check.score >= level ? barColors[check.score] : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
        {check.errors.length > 0 && (
          <ul className="text-[10px] text-slate-600 space-y-0.5 pt-0.5">
            {check.errors.map((err, i) => (
              <li key={i} className="flex items-center gap-1">
                <span className="text-amber-600">•</span>
                <span>{err}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
              Administrative Security Center
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              PBKDF2-SHA256 Protected
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold font-crest text-slate-900 mt-0.5">
            User Accounts & Security Governance
          </h3>
          <p className="text-xs text-slate-500">
            Provision accounts with cryptographic password hashing, enforce strong credentials, and monitor portal security audit logs.
          </p>
        </div>

        <button
          onClick={() => {
            setShowCreateModal(true);
            setErrorMessage(null);
            setNewPassword('');
          }}
          className="px-4 py-2.5 bg-blue-900 hover:bg-blue-800 active:bg-blue-950 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4 text-amber-300" />
          <span>Create New User Account</span>
        </button>
      </div>

      {/* Default Credential Advisory */}
      {defaultPassAccountsCount > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-950 text-xs rounded-xl flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
          <div>
            <div className="font-bold">Security Recommendation: Rotate Initial Credentials</div>
            <p className="text-[11px] text-amber-900 mt-0.5">
              {defaultPassAccountsCount} account(s) are still using initial setup credentials. Use the <strong>Reset</strong> button below to assign strong custom passwords.
            </p>
          </div>
        </div>
      )}

      {/* Success / Error Banners */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && !showCreateModal && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Account Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Total User Accounts</div>
          <div className="text-2xl font-bold font-mono-num text-slate-900">{accounts.length}</div>
          <div className="text-[10px] text-slate-400">Zero Plaintext Credentials</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-blue-900 uppercase">Administrator Accounts</div>
          <div className="text-2xl font-bold font-mono-num text-blue-900">
            {accounts.filter(a => a.role === 'admin').length}
          </div>
          <div className="text-[10px] text-slate-400">Full Governance Access</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-emerald-700 uppercase">Teacher & Faculty Accounts</div>
          <div className="text-2xl font-bold font-mono-num text-emerald-700">
            {accounts.filter(a => a.role === 'teacher').length}
          </div>
          <div className="text-[10px] text-slate-400">Scoped Class Encoders</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-amber-700 uppercase">Audit Events Recorded</div>
          <div className="text-2xl font-bold font-mono-num text-slate-900">{securityLogs.length}</div>
          <div className="text-[10px] text-emerald-700 font-semibold">15m Idle Auto-Lock Active</div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(['All', 'admin', 'teacher'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setRoleFilter(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                roleFilter === tab
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab === 'All' ? 'All Accounts' : tab === 'admin' ? 'Administrators' : 'Teachers & Faculty'}
            </button>
          ))}
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search username, name, or role..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-blue-900 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">User Identity & Name</th>
                <th className="p-3.5">Username</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Credential Security</th>
                <th className="p-3.5">Contact Details</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredAccounts.map((acc) => {
                const isCurrent = acc.id === currentUser.id;
                const isPrimary = acc.isPrimaryAdmin || acc.username.toLowerCase() === 'admin';

                return (
                  <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          acc.role === 'admin' 
                            ? 'bg-blue-100 text-blue-900 border border-blue-200' 
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {acc.fullName.slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{acc.fullName}</span>
                            {isCurrent && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-medium">You</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">{acc.designation}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-mono font-semibold text-blue-950 bg-slate-100 px-2 py-1 rounded inline-flex items-center gap-1.5">
                        <span>@{acc.username}</span>
                        <button
                          onClick={() => handleCopyUsername(acc)}
                          className="text-slate-400 hover:text-blue-900 cursor-pointer"
                          title="Copy username & role"
                        >
                          {copiedId === acc.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        acc.role === 'admin'
                          ? 'bg-blue-100 text-blue-900 border border-blue-200'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      }`}>
                        {acc.role === 'admin' ? <ShieldCheck className="w-3 h-3 text-blue-700" /> : <BookOpen className="w-3 h-3 text-emerald-700" />}
                        <span>{acc.role === 'admin' ? 'Administrator' : 'Faculty Teacher'}</span>
                      </span>
                    </td>

                    <td className="p-3.5">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded w-fit">
                          <Lock className="w-3 h-3 text-emerald-700" />
                          <span>PBKDF2-SHA256 Hashed</span>
                        </span>
                        {acc.mustChangePassword && (
                          <span className="text-[10px] text-amber-700 font-semibold">
                            Rotation recommended
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 text-slate-600">
                      <div>{acc.email || '—'}</div>
                      <div className="text-[11px] text-slate-400 font-mono-num">{acc.phone || ''}</div>
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setResetModalAccount(acc);
                            setResetNewPassword('');
                            setResetError(null);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                          title="Set a new password"
                        >
                          <Key className="w-3 h-3" />
                          <span>Reset</span>
                        </button>

                        <button
                          onClick={() => handleDeleteAccount(acc)}
                          disabled={isPrimary}
                          className={`p-1.5 rounded-md transition-colors ${
                            isPrimary
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-rose-600 hover:bg-rose-50 cursor-pointer'
                          }`}
                          title={isPrimary ? "Primary Admin cannot be deleted" : "Delete account"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredAccounts.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No user accounts match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Audit Log */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-900" />
            <div>
              <h4 className="text-sm font-bold text-slate-900">Portal Security Audit Trail</h4>
              <p className="text-[11px] text-slate-500">Real-time monitoring of sign-ins, failed attempts, lockouts, and credential updates.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAuditLog(!showAuditLog)}
            className="text-xs font-semibold text-blue-900 hover:underline cursor-pointer"
          >
            {showAuditLog ? 'Hide Log' : 'Show Log'}
          </button>
        </div>

        {showAuditLog && (
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs">
            {securityLogs.length === 0 ? (
              <div className="p-6 text-center text-slate-400">No security audit events recorded yet.</div>
            ) : (
              securityLogs.slice(0, 30).map((entry) => (
                <div key={entry.id} className="px-4 py-2.5 flex items-start justify-between gap-3 hover:bg-slate-50">
                  <div className="flex items-start gap-2.5">
                    {entry.severity === 'critical' ? (
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    ) : entry.severity === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-800">
                          {entry.event}
                        </span>
                        <span>@{entry.actor}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">{entry.details}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* CREATE NEW ACCOUNT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-900 text-amber-300 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Create New Portal Account</h4>
                  <span className="text-xs text-slate-500">Provide user credentials and administrative role</span>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Role *</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as AccountRole)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    <option value="teacher">Faculty / Teacher</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. maria.santos"
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:border-blue-900 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Mrs. Maria Santos-Cruz"
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:border-blue-900 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {newRole === 'admin' ? 'Position / Designation' : 'Teacher Rank / Title'}
                  </label>
                  {newRole === 'admin' ? (
                    <input
                      type="text"
                      value={newDesignation}
                      onChange={(e) => setNewDesignation(e.target.value)}
                      placeholder="e.g. Assistant Principal / Records Officer"
                      className="w-full p-2.5 rounded-lg border border-slate-300 focus:border-blue-900 focus:outline-hidden"
                    />
                  ) : (
                    <select
                      value={newDesignation}
                      onChange={(e) => setNewDesignation(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-medium"
                    >
                      <option value="Teacher I">Teacher I</option>
                      <option value="Teacher II">Teacher II</option>
                      <option value="Teacher III">Teacher III</option>
                      <option value="Master Teacher I">Master Teacher I</option>
                      <option value="Master Teacher II">Master Teacher II</option>
                      <option value="Head Teacher">Head Teacher</option>
                      <option value="Special Science Teacher">Special Science Teacher</option>
                    </select>
                  )}
                </div>

                {newRole === 'teacher' ? (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Academic Department *</label>
                    <select
                      value={newDepartment}
                      onChange={(e) => setNewDepartment(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-medium"
                    >
                      <option value="Science & Mathematics">Science & Mathematics</option>
                      <option value="Languages & Humanities">Languages & Humanities</option>
                      <option value="Senior High School - STEM">Senior High School - STEM</option>
                      <option value="Senior High School - ABM">Senior High School - ABM</option>
                      <option value="Senior High School - HUMSS">Senior High School - HUMSS</option>
                      <option value="Technical-Vocational & Livelihood">TVL / TLE (ICT, HE, EIM, EPAS)</option>
                      <option value="Araling Panlipunan & Social Sciences">Araling Panlipunan & Social Sciences</option>
                      <option value="MAPEH & Values Education">MAPEH & Values Education</option>
                      <option value="Junior High School Faculty">Junior High School General</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Department / Office</label>
                    <input
                      type="text"
                      placeholder="e.g. Office of the Principal"
                      className="w-full p-2.5 rounded-lg border border-slate-300 focus:border-blue-900 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>

              {newRole === 'teacher' && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-950 text-[11px] flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-800 shrink-0" />
                  <span>
                    <strong>Database Auto-Sync:</strong> Creating this account will automatically add this faculty member to the active <strong>Teachers & Advisers</strong> database for section assignment and gradebook encoding.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Strong Initial Password *</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 chars (A-z, 0-9, !@#)"
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:border-blue-900 focus:outline-hidden font-mono font-semibold"
                  />
                  {renderStrengthMeter(newPasswordCheck, newPassword)}
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. 0917-123-4567"
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:border-blue-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">DepEd Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. maria.santos@deped.gov.ph"
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:border-blue-900 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newPasswordCheck.valid}
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-bold shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Hashing & Creating...' : 'Create Secure Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetModalAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-500" />
                <span>Reset User Password</span>
              </h4>
              <button onClick={() => setResetModalAccount(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">✕</button>
            </div>

            <p className="text-xs text-slate-600">
              Assign a new strong password for account <strong>@{resetModalAccount.username}</strong> ({resetModalAccount.fullName}). Existing hashes cannot be viewed.
            </p>

            {resetError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Strong Password *</label>
                <input
                  type="password"
                  required
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="Min. 8 chars (A-z, 0-9, !@#)"
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono font-semibold focus:border-blue-900 focus:outline-hidden"
                />
                {renderStrengthMeter(resetPasswordCheck, resetNewPassword)}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalAccount(null)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !resetPasswordCheck.valid}
                  className="px-4 py-1.5 bg-blue-900 text-white rounded-lg font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Updating...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
