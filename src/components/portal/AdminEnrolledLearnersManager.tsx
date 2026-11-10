import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Printer, 
  Download, 
  Edit3, 
  Trash2, 
  Eye, 
  Building2, 
  GraduationCap, 
  Award, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Check, 
  RefreshCw,
  Phone,
  MapPin,
  Calendar,
  Layers,
  ChevronRight,
  BookOpen,
  UserCheck,
  UserX,
  FileText
} from 'lucide-react';
import { schoolDb, calculateSubjectFinal, calculateGeneralAverage } from '../../services/schoolDatabase';
import { 
  StudentProfile, 
  SchoolClassSection, 
  GradeLevel, 
  TrackType, 
  StrandType, 
  EnrollmentStatus,
  INFANTA_BARANGAYS,
  SubjectGrade
} from '../../types/school';
import { APP_ASSETS } from '../../assets';

export const AdminEnrolledLearnersManager: React.FC = () => {
  const [students, setStudents] = useState<StudentProfile[]>(schoolDb.getStudents());
  const [sections, setSections] = useState<SchoolClassSection[]>(schoolDb.getSections());

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<'All' | GradeLevel>('All');
  const [sectionFilter, setSectionFilter] = useState<string>('All');
  const [strandFilter, setStrandFilter] = useState<string>('All');
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');
  const [honorsFilter, setHonorsFilter] = useState<'All' | 'Honors' | 'Non-Honors'>('All');
  const [assignmentFilter, setAssignmentFilter] = useState<'All' | 'Assigned' | 'Unassigned'>('All');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'lrn' | 'grade' | 'gpa_desc' | 'section'>('name_asc');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);
  const [viewingStudent, setViewingStudent] = useState<StudentProfile | null>(null);
  const [reassigningStudent, setReassigningStudent] = useState<StudentProfile | null>(null);
  const [reassignTargetSectionId, setReassignTargetSectionId] = useState<string>('');

  // Alerts
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Student Form State
  const [newFirstName, setNewFirstName] = useState('');
  const [newMiddleName, setNewMiddleName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newExtension, setNewExtension] = useState('');
  const [newLrn, setNewLrn] = useState('');
  const [newGender, setNewGender] = useState<'Male' | 'Female'>('Male');
  const [newBirthDate, setNewBirthDate] = useState('2010-06-15');
  const [newAge, setNewAge] = useState(15);
  const [newBarangay, setNewBarangay] = useState<string>('Barangay Poblacion 38');
  const [newContact, setNewContact] = useState('0917-123-4567');
  const [newGuardian, setNewGuardian] = useState('');
  const [newRelationship, setNewRelationship] = useState('Mother');
  const [newGuardianContact, setNewGuardianContact] = useState('0917-987-6543');
  const [newGradeLevel, setNewGradeLevel] = useState<GradeLevel>(7);
  const [newTrack, setNewTrack] = useState<TrackType>('Junior High School');
  const [newStrand, setNewStrand] = useState<StrandType>('Regular JHS');
  const [newSectionId, setNewSectionId] = useState<string>('');

  // Edit Student Form State
  const [editFirstName, setEditFirstName] = useState('');
  const [editMiddleName, setEditMiddleName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editExtension, setEditExtension] = useState('');
  const [editLrn, setEditLrn] = useState('');
  const [editGender, setEditGender] = useState<'Male' | 'Female'>('Male');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editAge, setEditAge] = useState(15);
  const [editBarangay, setEditBarangay] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editGuardian, setEditGuardian] = useState('');
  const [editRelationship, setEditRelationship] = useState('Mother');
  const [editGuardianContact, setEditGuardianContact] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [editStatus, setEditStatus] = useState<EnrollmentStatus>('Enrolled');

  // Real-time sync with schoolDb
  const refreshData = () => {
    setStudents(schoolDb.getStudents());
    setSections(schoolDb.getSections());
  };

  useEffect(() => {
    const unsub = schoolDb.subscribe(refreshData);
    return () => unsub();
  }, []);

  // Update track & strand defaults when grade changes for new student
  const handleNewGradeChange = (g: GradeLevel) => {
    setNewGradeLevel(g);
    setNewAge(12 + (g - 7));
    if (g <= 10) {
      setNewTrack('Junior High School');
      setNewStrand('Regular JHS');
    } else {
      setNewTrack('Academic Track');
      setNewStrand('STEM');
    }
    setNewSectionId('');
  };

  // Generate random valid 12-digit LRN starting with 1098
  const generateRandomLrn = () => {
    const random8 = Math.floor(10000000 + Math.random() * 90000000);
    return `1098${random8}`;
  };

  // Metrics computation
  const metrics = useMemo(() => {
    const total = students.length;
    const jhs = students.filter(s => s.gradeLevel <= 10).length;
    const shs = students.filter(s => s.gradeLevel >= 11).length;
    const male = students.filter(s => s.gender === 'Male').length;
    const female = students.filter(s => s.gender === 'Female').length;
    const unassigned = students.filter(s => !s.section || s.section === 'Unassigned').length;
    const assigned = total - unassigned;
    const honors = students.filter(s => s.honors !== null).length;
    return { total, jhs, shs, male, female, unassigned, assigned, honors };
  }, [students]);

  // Filter & Sort Logic
  const filteredStudents = useMemo(() => {
    return students
      .filter(st => {
        // Search text
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = `${st.firstName} ${st.middleName} ${st.lastName} ${st.extensionName || ''}`.toLowerCase().includes(q);
          const matchLrn = st.lrn.includes(q);
          const matchBrgy = (st.barangay || '').toLowerCase().includes(q);
          const matchSection = (st.section || '').toLowerCase().includes(q);
          const matchGuardian = (st.guardianName || '').toLowerCase().includes(q);
          const matchContact = (st.contactNumber || '').includes(q);
          if (!matchName && !matchLrn && !matchBrgy && !matchSection && !matchGuardian && !matchContact) {
            return false;
          }
        }

        // Grade level
        if (gradeFilter !== 'All' && st.gradeLevel !== gradeFilter) return false;

        // Section
        if (sectionFilter !== 'All') {
          if (sectionFilter === 'Unassigned') {
            if (st.section && st.section !== 'Unassigned') return false;
          } else {
            if (st.section !== sectionFilter) return false;
          }
        }

        // Strand
        if (strandFilter !== 'All' && st.strand !== strandFilter) return false;

        // Gender
        if (genderFilter !== 'All' && st.gender !== genderFilter) return false;

        // Honors
        if (honorsFilter === 'Honors' && !st.honors) return false;
        if (honorsFilter === 'Non-Honors' && st.honors) return false;

        // Assignment
        if (assignmentFilter === 'Assigned' && (!st.section || st.section === 'Unassigned')) return false;
        if (assignmentFilter === 'Unassigned' && st.section && st.section !== 'Unassigned') return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') {
          return a.lastName.localeCompare(b.lastName);
        }
        if (sortBy === 'name_desc') {
          return b.lastName.localeCompare(a.lastName);
        }
        if (sortBy === 'lrn') {
          return a.lrn.localeCompare(b.lrn);
        }
        if (sortBy === 'grade') {
          if (a.gradeLevel !== b.gradeLevel) return a.gradeLevel - b.gradeLevel;
          return a.lastName.localeCompare(b.lastName);
        }
        if (sortBy === 'gpa_desc') {
          const gpaA = a.generalAverage ?? 0;
          const gpaB = b.generalAverage ?? 0;
          return gpaB - gpaA;
        }
        if (sortBy === 'section') {
          const secA = a.section || 'ZZZ';
          const secB = b.section || 'ZZZ';
          return secA.localeCompare(secB);
        }
        return 0;
      });
  }, [students, searchQuery, gradeFilter, sectionFilter, strandFilter, genderFilter, honorsFilter, assignmentFilter, sortBy]);

  // Unique Strands & Sections for filter dropdowns
  const availableStrands = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.strand) set.add(s.strand);
    });
    return Array.from(set).sort();
  }, [students]);

  const availableSections = useMemo(() => {
    return sections.sort((a, b) => a.gradeLevel - b.gradeLevel || a.sectionName.localeCompare(b.sectionName));
  }, [sections]);

  // Register New Learner Handler
  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newFirstName.trim() || !newLastName.trim()) {
      setErrorMessage('First and Last names are mandatory.');
      return;
    }

    const cleanLrn = newLrn.trim() || generateRandomLrn();
    if (cleanLrn.length !== 12 || !/^\d+$/.test(cleanLrn)) {
      setErrorMessage('DepEd Learner Reference Number (LRN) must be exactly 12 digits.');
      return;
    }

    // Check duplicate LRN
    const existing = schoolDb.getStudentByLrn(cleanLrn);
    if (existing) {
      setErrorMessage(`A learner with LRN ${cleanLrn} already exists in the registry (${existing.firstName} ${existing.lastName}).`);
      return;
    }

    // Find section if selected
    const targetSection = sections.find(s => s.id === newSectionId);

    const newStudent: StudentProfile = {
      id: `stud-${Date.now().toString().slice(-6)}`,
      lrn: cleanLrn,
      firstName: newFirstName.trim(),
      middleName: newMiddleName.trim() || '',
      lastName: newLastName.trim(),
      extensionName: newExtension.trim() || undefined,
      gender: newGender,
      birthDate: newBirthDate,
      age: Number(newAge) || 15,
      barangay: newBarangay,
      municipality: 'Infanta',
      province: 'Quezon',
      contactNumber: newContact.trim() || '0917-000-0000',
      guardianName: newGuardian.trim() || 'Parent / Legal Guardian',
      guardianRelationship: newRelationship || 'Mother',
      guardianContact: newGuardianContact.trim() || '0917-000-0000',
      gradeLevel: targetSection ? targetSection.gradeLevel : newGradeLevel,
      section: targetSection ? targetSection.sectionName : 'Unassigned',
      track: targetSection ? targetSection.track : newTrack,
      strand: targetSection ? targetSection.strand : newStrand,
      adviserId: targetSection ? targetSection.adviserId : 't-101',
      adviserName: targetSection ? targetSection.adviserName : 'Faculty Staff',
      schoolYear: '2026–2027',
      enrollmentStatus: 'Enrolled',
      grades: [],
      generalAverage: null,
      honors: null,
      attendance: [
        { month: 'Aug', schoolDays: 21, daysPresent: 21, daysAbsent: 0 },
        { month: 'Sep', schoolDays: 22, daysPresent: 22, daysAbsent: 0 },
        { month: 'Oct', schoolDays: 21, daysPresent: 20, daysAbsent: 1 },
      ],
      coreValues: [
        { id: 'cv-1', coreValue: 'Maka-Diyos', behaviorStatement: 'Expresses one’s spiritual beliefs while respecting others', term1: 'AO', term2: 'AO', term3: 'AO' },
        { id: 'cv-2', coreValue: 'Makatao', behaviorStatement: 'Demonstrates sensitive and caring attitude towards others', term1: 'SO', term2: 'AO', term3: 'AO' },
        { id: 'cv-3', coreValue: 'Makakalikasan', behaviorStatement: 'Cares for the environment and utilizes resources wisely', term1: 'AO', term2: 'AO', term3: 'AO' },
        { id: 'cv-4', coreValue: 'Makabansa', behaviorStatement: 'Shows pride in being a Filipino, upholds the law and democracy', term1: 'AO', term2: 'AO', term3: 'AO' },
      ],
      adviserRemarks: 'Learner officially registered into S.Y. 2026–2027 master roster.',
    };

    schoolDb.saveStudent(newStudent);

    // If section assigned, add student to section
    if (targetSection) {
      schoolDb.addStudentToSection(targetSection.id, newStudent.id);
    }

    setSuccessMessage(`Learner "${newStudent.lastName}, ${newStudent.firstName}" (LRN: ${newStudent.lrn}) successfully enrolled in S.Y. 2026–2027!`);
    setTimeout(() => setSuccessMessage(null), 4500);

    // Reset Form
    setNewFirstName('');
    setNewMiddleName('');
    setNewLastName('');
    setNewExtension('');
    setNewLrn('');
    setNewGuardian('');
    setNewSectionId('');
    setShowAddModal(false);
    refreshData();
  };

  // Open Edit Modal
  const handleOpenEdit = (st: StudentProfile) => {
    setEditingStudent(st);
    setEditFirstName(st.firstName);
    setEditMiddleName(st.middleName || '');
    setEditLastName(st.lastName);
    setEditExtension(st.extensionName || '');
    setEditLrn(st.lrn);
    setEditGender(st.gender);
    setEditBirthDate(st.birthDate || '2010-06-15');
    setEditAge(st.age || 15);
    setEditBarangay(st.barangay || 'Barangay Poblacion 38');
    setEditContact(st.contactNumber || '');
    setEditGuardian(st.guardianName || '');
    setEditRelationship(st.guardianRelationship || 'Mother');
    setEditGuardianContact(st.guardianContact || '');
    setEditRemarks(st.adviserRemarks || '');
    setEditStatus(st.enrollmentStatus || 'Enrolled');
    setErrorMessage(null);
  };

  // Save Edit Handler
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    if (!editFirstName.trim() || !editLastName.trim()) {
      setErrorMessage('First and Last names are required.');
      return;
    }

    const updated: StudentProfile = {
      ...editingStudent,
      firstName: editFirstName.trim(),
      middleName: editMiddleName.trim() || '',
      lastName: editLastName.trim(),
      extensionName: editExtension.trim() || undefined,
      lrn: editLrn.trim(),
      gender: editGender,
      birthDate: editBirthDate,
      age: Number(editAge) || 15,
      barangay: editBarangay,
      contactNumber: editContact.trim(),
      guardianName: editGuardian.trim(),
      guardianRelationship: editRelationship,
      guardianContact: editGuardianContact.trim(),
      adviserRemarks: editRemarks.trim(),
      enrollmentStatus: editStatus,
    };

    schoolDb.saveStudent(updated);
    setSuccessMessage(`Updated profile records for "${updated.lastName}, ${updated.firstName}"`);
    setTimeout(() => setSuccessMessage(null), 3500);

    setEditingStudent(null);
    refreshData();
  };

  // Open Reassign Section Modal
  const handleOpenReassign = (st: StudentProfile) => {
    setReassigningStudent(st);
    const currSec = sections.find(s => s.sectionName === st.section && s.gradeLevel === st.gradeLevel);
    setReassignTargetSectionId(currSec ? currSec.id : '');
  };

  // Submit Section Reassignment
  const handleSaveReassign = () => {
    if (!reassigningStudent) return;

    if (!reassignTargetSectionId || reassignTargetSectionId === 'unassign') {
      // Unassign student
      const prevSec = sections.find(s => s.sectionName === reassigningStudent.section);
      if (prevSec) {
        schoolDb.removeStudentFromSection(prevSec.id, reassigningStudent.id);
      } else {
        const stud = schoolDb.getStudentById(reassigningStudent.id);
        if (stud) {
          stud.section = 'Unassigned';
          schoolDb.saveStudent(stud);
        }
      }
      setSuccessMessage(`Learner "${reassigningStudent.firstName} ${reassigningStudent.lastName}" has been marked as Unassigned.`);
    } else {
      const targetSec = sections.find(s => s.id === reassignTargetSectionId);
      if (targetSec) {
        schoolDb.addStudentToSection(targetSec.id, reassigningStudent.id);
        setSuccessMessage(`Learner "${reassigningStudent.firstName} ${reassigningStudent.lastName}" reassigned to ${targetSec.sectionName} (Grade ${targetSec.gradeLevel} · Adviser: ${targetSec.adviserName}).`);
      }
    }

    setTimeout(() => setSuccessMessage(null), 4000);
    setReassigningStudent(null);
    refreshData();
  };

  // Delete / Unenroll Learner from Master Registry
  const handleDeleteStudent = (st: StudentProfile) => {
    if (confirm(`Are you sure you want to completely remove "${st.lastName}, ${st.firstName}" (LRN: ${st.lrn}) from the school database? This will delete all demographic and SF9 records.`)) {
      schoolDb.deleteStudent(st.id);
      setSuccessMessage(`Learner record "${st.lastName}, ${st.firstName}" permanently removed.`);
      setTimeout(() => setSuccessMessage(null), 3500);
      refreshData();
    }
  };

  // Export to CSV Function
  const handleExportCSV = () => {
    const headers = [
      'LRN',
      'Last Name',
      'First Name',
      'Middle Name',
      'Ext',
      'Gender',
      'Birth Date',
      'Age',
      'Grade Level',
      'Track',
      'Strand',
      'Section',
      'Adviser',
      'Barangay',
      'Guardian Name',
      'Guardian Contact',
      'Student Contact',
      'General Average',
      'Honors',
      'Enrollment Status',
      'School Year'
    ];

    const rows = filteredStudents.map(st => [
      `"${st.lrn}"`,
      `"${st.lastName}"`,
      `"${st.firstName}"`,
      `"${st.middleName || ''}"`,
      `"${st.extensionName || ''}"`,
      `"${st.gender}"`,
      `"${st.birthDate || ''}"`,
      `"${st.age || ''}"`,
      `"${st.gradeLevel}"`,
      `"${st.track}"`,
      `"${st.strand}"`,
      `"${st.section || 'Unassigned'}"`,
      `"${st.adviserName || ''}"`,
      `"${st.barangay || ''}"`,
      `"${st.guardianName || ''}"`,
      `"${st.guardianContact || ''}"`,
      `"${st.contactNumber || ''}"`,
      `"${st.generalAverage !== null ? st.generalAverage.toFixed(2) : ''}"`,
      `"${st.honors || ''}"`,
      `"${st.enrollmentStatus || 'Enrolled'}"`,
      `"${st.schoolYear || '2026–2027'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `INHS_Enrolled_Learners_SY2026_2027_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setGradeFilter('All');
    setSectionFilter('All');
    setStrandFilter('All');
    setGenderFilter('All');
    setHonorsFilter('All');
    setAssignmentFilter('All');
    setSortBy('name_asc');
  };

  const isFilterActive = searchQuery || gradeFilter !== 'All' || sectionFilter !== 'All' || strandFilter !== 'All' || genderFilter !== 'All' || honorsFilter !== 'All' || assignmentFilter !== 'All';

  return (
    <div className="space-y-6">
      
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
              Department of Education · Division of Quezon
            </span>
            <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-mono font-bold">
              School ID: 301332
            </span>
          </div>
          <h3 className="text-xl font-bold font-crest text-slate-900 mt-0.5">
            Manage Enrolled Learners · S.Y. 2026–2027
          </h3>
          <p className="text-xs text-slate-500">
            Official Master Directory of all active Junior and Senior High School learners across all tracks, strands, and sections.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Enroll New Learner</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer no-print transition-colors"
            title="Print Official Master List of Learners"
          >
            <Printer className="w-4 h-4" />
            <span>Print Master List</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer no-print transition-colors"
            title="Export full learners registry to CSV spreadsheet"
          >
            <Download className="w-4 h-4 text-blue-800" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold rounded-xl flex items-center gap-2.5 animate-fade-in shadow-xs">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2.5 animate-fade-in shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-blue-900" />
            <span>Total Enrolled</span>
          </div>
          <div className="text-2xl font-bold font-mono-num text-slate-900">{metrics.total}</div>
          <div className="text-[10px] text-slate-400">Learners registered</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-700" />
            <span>JHS (Gr 7–10)</span>
          </div>
          <div className="text-2xl font-bold font-mono-num text-indigo-950">{metrics.jhs}</div>
          <div className="text-[10px] text-slate-400">{((metrics.jhs / (metrics.total || 1)) * 100).toFixed(0)}% of student body</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5 text-teal-700" />
            <span>SHS (Gr 11–12)</span>
          </div>
          <div className="text-2xl font-bold font-mono-num text-teal-950">{metrics.shs}</div>
          <div className="text-[10px] text-slate-400">{((metrics.shs / (metrics.total || 1)) * 100).toFixed(0)}% of student body</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Gender Balance</div>
          <div className="text-base font-bold font-mono-num text-slate-800">
            {metrics.male} <span className="text-xs text-slate-400 font-normal">M</span> · {metrics.female} <span className="text-xs text-slate-400 font-normal">F</span>
          </div>
          <div className="text-[10px] text-slate-400">
            {((metrics.male / (metrics.total || 1)) * 100).toFixed(0)}% Male · {((metrics.female / (metrics.total || 1)) * 100).toFixed(0)}% Female
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>Section Status</span>
          </div>
          <div className="text-base font-bold font-mono-num text-slate-800">
            <span className="text-emerald-700">{metrics.assigned} Assigned</span>
          </div>
          <div className="text-[10px] text-amber-700 font-medium">
            {metrics.unassigned > 0 ? `⚠ ${metrics.unassigned} Unassigned` : 'All assigned'}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-amber-600" />
            <span>Honor Students</span>
          </div>
          <div className="text-2xl font-bold font-mono-num text-amber-600">{metrics.honors}</div>
          <div className="text-[10px] text-slate-400">GPA &ge; 90.00% & no &lt; 80%</div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by learner full name, 12-digit LRN, barangay, guardian, or section..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-900 bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Grade Filters */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 text-xs font-semibold">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider pr-1 shrink-0">Grade:</span>
            {(['All', 7, 8, 9, 10, 11, 12] as const).map(g => (
              <button
                key={g}
                onClick={() => setGradeFilter(g)}
                className={`px-2.5 py-1.5 rounded-lg text-xs transition-colors shrink-0 cursor-pointer ${
                  gradeFilter === g
                    ? 'bg-blue-900 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {g === 'All' ? 'All Grades' : `Gr ${g}`}
              </button>
            ))}
          </div>

        </div>

        {/* Secondary Filter Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          
          {/* Section Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Section</label>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="w-full p-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium"
            >
              <option value="All">All Sections</option>
              <option value="Unassigned">● Unassigned Only</option>
              {availableSections.map(s => (
                <option key={s.id} value={s.sectionName}>
                  Gr {s.gradeLevel} · {s.sectionName}
                </option>
              ))}
            </select>
          </div>

          {/* Strand Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Strand / Track</label>
            <select
              value={strandFilter}
              onChange={(e) => setStrandFilter(e.target.value)}
              className="w-full p-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium"
            >
              <option value="All">All Strands</option>
              {availableStrands.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Gender Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Gender</label>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as any)}
              className="w-full p-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium"
            >
              <option value="All">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          {/* Academic Standing Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Honors Standing</label>
            <select
              value={honorsFilter}
              onChange={(e) => setHonorsFilter(e.target.value as any)}
              className="w-full p-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium"
            >
              <option value="All">All Academic Standings</option>
              <option value="Honors">★ With Honors Only</option>
              <option value="Non-Honors">Regular Standing</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full p-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium"
            >
              <option value="name_asc">Name: A to Z</option>
              <option value="name_desc">Name: Z to A</option>
              <option value="lrn">LRN (Ascending)</option>
              <option value="grade">Grade Level</option>
              <option value="gpa_desc">Gen. Average (Highest First)</option>
              <option value="section">Section Name</option>
            </select>
          </div>

          {/* Filter Reset Button */}
          <div className="flex items-end">
            {isFilterActive ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="w-full py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            ) : (
              <div className="text-[11px] text-slate-400 py-1.5 px-2 text-center w-full">
                Filters clear
              </div>
            )}
          </div>

        </div>

        {/* Filter Summary Results */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <div>
            Showing <strong>{filteredStudents.length}</strong> of <strong>{students.length}</strong> enrolled learners
            {isFilterActive && <span className="text-blue-900 font-semibold ml-1">(filtered)</span>}
          </div>
          <div className="text-[11px] text-slate-400">
            S.Y. 2026–2027 Official Student Registry
          </div>
        </div>

      </div>

      {/* Main Enrolled Learners Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3 w-10">#</th>
                <th className="p-3">Learner Name & LRN</th>
                <th className="p-3">Grade & Section</th>
                <th className="p-3">Track & Strand</th>
                <th className="p-3">Class Adviser</th>
                <th className="p-3">Address & Guardian</th>
                <th className="p-3">Gen. Average</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredStudents.map((st, idx) => (
                <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                  
                  {/* Name & LRN */}
                  <td className="p-3">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{st.lastName}, {st.firstName} {st.middleName ? `${st.middleName[0]}.` : ''} {st.extensionName || ''}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[11px] text-blue-900 font-semibold">{st.lrn}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                        st.gender === 'Female' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {st.gender}
                      </span>
                      <span className="text-slate-400 text-[10px]">{st.age || 15} yrs old</span>
                    </div>
                  </td>

                  {/* Grade & Section */}
                  <td className="p-3">
                    <div className="font-bold text-slate-800">
                      Grade {st.gradeLevel}
                    </div>
                    <div className="text-[11px] mt-0.5">
                      {st.section && st.section !== 'Unassigned' ? (
                        <span className="font-semibold text-blue-950 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {st.section}
                        </span>
                      ) : (
                        <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          ● Unassigned
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Track & Strand */}
                  <td className="p-3">
                    <div className="text-slate-900 font-medium">{st.strand}</div>
                    <div className="text-[10px] text-slate-500">{st.track}</div>
                  </td>

                  {/* Class Adviser */}
                  <td className="p-3 text-slate-700">
                    <div>{st.adviserName || 'Not assigned'}</div>
                    <div className="text-[10px] text-slate-400">Adviser In-Charge</div>
                  </td>

                  {/* Address & Guardian */}
                  <td className="p-3 text-slate-600">
                    <div className="flex items-center gap-1 text-[11px]">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[150px]">{st.barangay || 'Infanta, Quezon'}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[150px]">
                      {st.guardianName} ({st.guardianRelationship || 'Parent'})
                    </div>
                  </td>

                  {/* Gen. Average & Honors */}
                  <td className="p-3">
                    {st.generalAverage !== null ? (
                      <div className="space-y-0.5">
                        <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded inline-block ${
                          st.generalAverage >= 90
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : st.generalAverage >= 85
                            ? 'bg-blue-100 text-blue-900'
                            : st.generalAverage >= 75
                            ? 'bg-slate-100 text-slate-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {st.generalAverage.toFixed(2)}%
                        </span>
                        {st.honors && (
                          <div className="text-[10px] font-bold text-amber-700 flex items-center gap-0.5">
                            <span>★</span>
                            <span className="truncate max-w-[120px]">{st.honors}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">No rating yet</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      <span>Enrolled</span>
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="p-3 text-right no-print">
                    <div className="flex items-center justify-end gap-1">
                      
                      {/* View Record / SF9 */}
                      <button
                        onClick={() => setViewingStudent(st)}
                        className="p-1.5 text-blue-900 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                        title="View Full Student Record & SF9 Progress Report Card"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Reassign Section */}
                      <button
                        onClick={() => handleOpenReassign(st)}
                        className="p-1.5 text-indigo-700 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                        title="Change or Assign Class Section"
                      >
                        <Building2 className="w-4 h-4" />
                      </button>

                      {/* Edit Profile */}
                      <button
                        onClick={() => handleOpenEdit(st)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                        title="Edit Learner Profile & Demographics"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Delete / Unenroll */}
                      <button
                        onClick={() => handleDeleteStudent(st)}
                        className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                        title="Remove learner record from registry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                    </div>
                  </td>
                </tr>
              ))}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400 space-y-3">
                    <Users className="w-10 h-10 mx-auto text-slate-300" />
                    <p className="text-sm font-semibold text-slate-600">No enrolled learners found matching your filter criteria.</p>
                    <button
                      onClick={handleClearFilters}
                      className="px-4 py-2 bg-blue-900 text-white rounded-lg text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reset All Filters</span>
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. REGISTER NEW LEARNER MODAL */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-4 my-auto animate-scale-up">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-700" />
                  <span>Register & Enroll New Learner</span>
                </h4>
                <p className="text-xs text-slate-500">
                  School Year 2026–2027 · Official DepEd Form 1 (SF1) Learner Profile Registration
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
              
              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="e.g. Juan"
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={newMiddleName}
                    onChange={(e) => setNewMiddleName(e.target.value)}
                    placeholder="e.g. Santos"
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="e.g. Dela Cruz"
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              {/* LRN & Extension */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">
                      12-Digit DepEd LRN *
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewLrn(generateRandomLrn())}
                      className="text-[10px] text-blue-900 font-bold hover:underline cursor-pointer"
                    >
                      + Generate LRN
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    value={newLrn}
                    onChange={(e) => setNewLrn(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 109823456789"
                    className="w-full p-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Extension Name</label>
                  <input
                    type="text"
                    value={newExtension}
                    onChange={(e) => setNewExtension(e.target.value)}
                    placeholder="e.g. Jr., III"
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              {/* Gender, Birthdate, Age */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gender *</label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value as any)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Birth Date *</label>
                  <input
                    type="date"
                    required
                    value={newBirthDate}
                    onChange={(e) => setNewBirthDate(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Age</label>
                  <input
                    type="number"
                    min={11}
                    max={25}
                    value={newAge}
                    onChange={(e) => setNewAge(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              {/* Barangay & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Residential Barangay (Infanta) *</label>
                  <select
                    value={newBarangay}
                    onChange={(e) => setNewBarangay(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    {INFANTA_BARANGAYS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Learner Contact Number</label>
                  <input
                    type="text"
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value)}
                    placeholder="0917-000-0000"
                    className="w-full p-2 rounded-lg border border-slate-300 font-mono-num"
                  />
                </div>
              </div>

              {/* Guardian Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Parent / Guardian Name *</label>
                  <input
                    type="text"
                    required
                    value={newGuardian}
                    onChange={(e) => setNewGuardian(e.target.value)}
                    placeholder="e.g. Maria Santos Dela Cruz"
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Relationship</label>
                  <select
                    value={newRelationship}
                    onChange={(e) => setNewRelationship(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Legal Guardian">Legal Guardian</option>
                    <option value="Grandparent">Grandparent</option>
                    <option value="Sibling">Sibling of Legal Age</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Guardian Contact</label>
                  <input
                    type="text"
                    value={newGuardianContact}
                    onChange={(e) => setNewGuardianContact(e.target.value)}
                    placeholder="0917-000-0000"
                    className="w-full p-2 rounded-lg border border-slate-300 font-mono-num"
                  />
                </div>
              </div>

              {/* Grade Level, Track & Section Assignment */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="font-bold text-slate-800 text-xs">
                  Academic Placement & Section Assignment
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Grade Level *</label>
                    <select
                      value={newGradeLevel}
                      onChange={(e) => handleNewGradeChange(Number(e.target.value) as GradeLevel)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white font-bold"
                    >
                      <option value={7}>Grade 7 (JHS)</option>
                      <option value={8}>Grade 8 (JHS)</option>
                      <option value={9}>Grade 9 (JHS)</option>
                      <option value={10}>Grade 10 (JHS)</option>
                      <option value={11}>Grade 11 (SHS)</option>
                      <option value={12}>Grade 12 (SHS)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Curriculum Strand</label>
                    <input
                      type="text"
                      disabled
                      value={newStrand}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Section Assignment</label>
                    <select
                      value={newSectionId}
                      onChange={(e) => setNewSectionId(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white font-medium text-blue-900"
                    >
                      <option value="">-- Leave Unassigned for now --</option>
                      {sections
                        .filter(s => s.gradeLevel === newGradeLevel)
                        .map(sec => (
                          <option key={sec.id} value={sec.id}>
                            {sec.sectionName} (Adviser: {sec.adviserName})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm cursor-pointer"
                >
                  Register Learner
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EDIT LEARNER PROFILE MODAL */}
      {/* ========================================================================= */}
      {editingStudent && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-4 my-auto animate-scale-up">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Edit Learner Profile: {editingStudent.firstName} {editingStudent.lastName}
                </h4>
                <div className="text-xs text-slate-500 font-mono">
                  LRN: {editingStudent.lrn} · Grade {editingStudent.gradeLevel} ({editingStudent.section || 'Unassigned'})
                </div>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={editMiddleName}
                    onChange={(e) => setEditMiddleName(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">12-Digit LRN *</label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    value={editLrn}
                    onChange={(e) => setEditLrn(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gender *</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as any)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Extension</label>
                  <input
                    type="text"
                    value={editExtension}
                    onChange={(e) => setEditExtension(e.target.value)}
                    placeholder="e.g. Jr."
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Birth Date</label>
                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={editAge}
                    onChange={(e) => setEditAge(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Enrollment Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as EnrollmentStatus)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Enrolled">Officially Enrolled</option>
                    <option value="Pending Review">Pending Review</option>
                    <option value="Transferred In">Transferred In</option>
                    <option value="Graduated">Graduated</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Barangay (Infanta) *</label>
                  <select
                    value={editBarangay}
                    onChange={(e) => setEditBarangay(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {INFANTA_BARANGAYS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={editContact}
                    onChange={(e) => setEditContact(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Guardian Name</label>
                  <input
                    type="text"
                    value={editGuardian}
                    onChange={(e) => setEditGuardian(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Relationship</label>
                  <select
                    value={editRelationship}
                    onChange={(e) => setEditRelationship(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Legal Guardian">Legal Guardian</option>
                    <option value="Grandparent">Grandparent</option>
                    <option value="Sibling">Sibling</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Guardian Contact</label>
                  <input
                    type="text"
                    value={editGuardianContact}
                    onChange={(e) => setEditGuardianContact(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adviser & Administrative Remarks</label>
                <textarea
                  rows={2}
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300"
                  placeholder="Official student notes or remarks..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-bold shadow-sm cursor-pointer"
                >
                  Save Changes
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. REASSIGN SECTION MODAL */}
      {/* ========================================================================= */}
      {reassigningStudent && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-up">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Assign / Reassign Section
                </h4>
                <p className="text-xs text-slate-500">
                  {reassigningStudent.lastName}, {reassigningStudent.firstName} (Grade {reassigningStudent.gradeLevel})
                </p>
              </div>
              <button
                onClick={() => setReassigningStudent(null)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 leading-relaxed">
                Currently enrolled in: <strong>{reassigningStudent.section || 'Unassigned'}</strong> (Grade {reassigningStudent.gradeLevel} · {reassigningStudent.strand})
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Destination Section for Grade {reassigningStudent.gradeLevel} *
                </label>
                <select
                  value={reassignTargetSectionId}
                  onChange={(e) => setReassignTargetSectionId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-900"
                >
                  <option value="unassign">-- Mark as Unassigned --</option>
                  {sections
                    .filter(s => s.gradeLevel === reassigningStudent.gradeLevel)
                    .map(sec => {
                      const count = students.filter(st => st.section === sec.sectionName).length;
                      return (
                        <option key={sec.id} value={sec.id}>
                          {sec.sectionName} · Room {sec.roomNumber} ({count}/{sec.maxCapacity || 45} learners) — Adviser: {sec.adviserName}
                        </option>
                      );
                    })}
                </select>
              </div>

              <div className="text-[11px] text-slate-500 italic">
                * Assigning updates the learner's official section, curriculum strand, and teacher adviser records automatically.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReassigningStudent(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveReassign}
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-bold shadow-sm cursor-pointer"
                >
                  Update Placement
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VIEW FULL LEARNER RECORD & SF9 MODAL */}
      {/* ========================================================================= */}
      {viewingStudent && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-scale-up">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-blue-950 border border-blue-700 text-amber-300 px-2 py-0.5 rounded font-mono">
                    LRN: {viewingStudent.lrn}
                  </span>
                  <span className="text-slate-400 text-xs">
                    Grade {viewingStudent.gradeLevel} · {viewingStudent.section || 'Unassigned'}
                  </span>
                </div>
                <h3 className="text-xl font-bold font-crest text-white">
                  {viewingStudent.lastName}, {viewingStudent.firstName} {viewingStudent.middleName ? `${viewingStudent.middleName[0]}.` : ''} {viewingStudent.extensionName || ''}
                </h3>
                <p className="text-xs text-slate-300">
                  Strand: <strong>{viewingStudent.strand}</strong> · Adviser: <strong>{viewingStudent.adviserName}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer no-print"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Record</span>
                </button>
                <button
                  onClick={() => setViewingStudent(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              
              {/* Demographics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Gender & Age</div>
                  <div className="font-semibold text-slate-900">{viewingStudent.gender} · {viewingStudent.age || 15} yrs</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Birth Date</div>
                  <div className="font-semibold text-slate-900">{viewingStudent.birthDate || 'Not specified'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Barangay Residence</div>
                  <div className="font-semibold text-slate-900">{viewingStudent.barangay || 'Infanta, Quezon'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Contact Number</div>
                  <div className="font-semibold text-slate-900 font-mono-num">{viewingStudent.contactNumber || 'N/A'}</div>
                </div>
              </div>

              {/* Guardian Info */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900">Parent / Guardian:</span>
                  <span className="font-bold text-slate-900 ml-1.5">{viewingStudent.guardianName}</span>
                  <span className="text-slate-500 ml-1">({viewingStudent.guardianRelationship || 'Guardian'})</span>
                </div>
                <div className="text-slate-700 font-mono-num">
                  Emergency Contact: <strong>{viewingStudent.guardianContact || viewingStudent.contactNumber}</strong>
                </div>
              </div>

              {/* Academic Performance (SF9 Form) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-blue-900" />
                    <span>Report On Learning Progress & Achievement (SF9 · 3 Terms)</span>
                  </h4>
                  {viewingStudent.generalAverage !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">General Average:</span>
                      <span className="font-mono font-bold text-sm bg-blue-900 text-white px-2 py-0.5 rounded">
                        {viewingStudent.generalAverage.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Learning Areas / Subjects</th>
                        <th className="p-2.5 text-center w-20">Term 1</th>
                        <th className="p-2.5 text-center w-20">Term 2</th>
                        <th className="p-2.5 text-center w-20">Term 3</th>
                        <th className="p-2.5 text-center w-24">Final Rating</th>
                        <th className="p-2.5 text-center w-24">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {viewingStudent.grades && viewingStudent.grades.length > 0 ? (
                        viewingStudent.grades.map((g) => (
                          <tr key={g.subjectId} className="hover:bg-slate-50">
                            <td className="p-2.5 font-medium text-slate-900">
                              <div>{g.subjectTitle}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{g.subjectCode}</div>
                            </td>
                            <td className="p-2.5 text-center font-mono">{g.term1 ?? g.q1 ?? '—'}</td>
                            <td className="p-2.5 text-center font-mono">{g.term2 ?? g.q2 ?? '—'}</td>
                            <td className="p-2.5 text-center font-mono">{g.term3 ?? g.q3 ?? '—'}</td>
                            <td className="p-2.5 text-center font-mono font-bold text-blue-950">
                              {g.finalRating !== null ? g.finalRating : '—'}
                            </td>
                            <td className="p-2.5 text-center">
                              {g.remarks ? (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  g.remarks === 'Passed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {g.remarks}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                            No subject grades encoded yet for this learner.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Attendance Record */}
              {viewingStudent.attendance && viewingStudent.attendance.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Attendance Record (School Days)</span>
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {viewingStudent.attendance.map((m) => (
                      <div key={m.month} className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-center">
                        <div className="font-bold text-slate-700">{m.month}</div>
                        <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">{m.daysPresent} present</div>
                        <div className="text-[10px] text-slate-400">{m.schoolDays} school days</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Adviser Remarks */}
              {viewingStudent.adviserRemarks && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Adviser Remarks</div>
                  <div className="text-slate-700 italic">{viewingStudent.adviserRemarks}</div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span>DepEd Form 137 / 138 / SF9 Official Permanent Record</span>
              <button
                onClick={() => setViewingStudent(null)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-900 cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. PRINT-ONLY MASTER LIST DOCUMENT */}
      {/* ========================================================================= */}
      <div id="printable-masterlist-document" className="hidden print:block print:p-0">
        
        {/* DepEd Letterhead */}
        <div className="flex items-center gap-4 border-b-2 border-slate-900 pb-3 mb-4">
          <div className="w-14 h-14 shrink-0 rounded-full overflow-hidden flex items-center justify-center border border-slate-300 bg-blue-900">
            <img
              src={APP_ASSETS.logo}
              alt="INHS Official Seal"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = APP_ASSETS.publicLogo;
              }}
              className="w-full h-full object-cover scale-[1.04] rounded-full"
            />
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase font-bold text-blue-950 tracking-wider">
              Republic of the Philippines · Department of Education
            </div>
            <div className="text-[10px] text-slate-600 font-medium">
              Region IV-A CALABARZON · Division of Quezon · District of Infanta
            </div>
            <h2 className="text-base font-extrabold font-crest text-slate-900 leading-tight">
              INFANTA NATIONAL HIGH SCHOOL
            </h2>
            <div className="text-[10px] font-mono text-slate-700 flex flex-wrap gap-x-3">
              <span>School ID: <strong>301332</strong></span>
              <span>Official Master Registry of Enrolled Learners</span>
              <span>School Year: <strong>2026–2027</strong></span>
            </div>
          </div>
          <div className="text-right text-[11px] font-mono border-l pl-3 border-slate-300">
            <div className="font-bold text-sm text-slate-900">{filteredStudents.length} Learners</div>
            <div>Generated: {new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            <div className="text-slate-600">Classification: Official</div>
          </div>
        </div>

        {/* Master List Table */}
        <div className="rounded border border-slate-400 overflow-hidden">
          <table className="w-full text-left text-[10px]">
            <thead className="bg-slate-200 text-slate-900 font-bold border-b border-slate-400">
              <tr>
                <th className="p-1.5 w-6">#</th>
                <th className="p-1.5">Learner Reference Number (LRN)</th>
                <th className="p-1.5">Full Name (Last, First, Middle)</th>
                <th className="p-1.5">Gender</th>
                <th className="p-1.5">Grade</th>
                <th className="p-1.5">Section</th>
                <th className="p-1.5">Track / Strand</th>
                <th className="p-1.5">Adviser</th>
                <th className="p-1.5">Barangay Residence</th>
                <th className="p-1.5">General Avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 bg-white">
              {filteredStudents.map((st, idx) => (
                <tr key={st.id}>
                  <td className="p-1.5 font-mono text-slate-500">{idx + 1}</td>
                  <td className="p-1.5 font-mono font-semibold">{st.lrn}</td>
                  <td className="p-1.5 font-bold">
                    {st.lastName}, {st.firstName} {st.middleName ? `${st.middleName[0]}.` : ''} {st.extensionName || ''}
                  </td>
                  <td className="p-1.5">{st.gender}</td>
                  <td className="p-1.5 font-bold">Gr {st.gradeLevel}</td>
                  <td className="p-1.5">{st.section || 'Unassigned'}</td>
                  <td className="p-1.5">{st.strand}</td>
                  <td className="p-1.5">{st.adviserName || '—'}</td>
                  <td className="p-1.5">{st.barangay || 'Infanta'}</td>
                  <td className="p-1.5 font-mono font-bold">
                    {st.generalAverage !== null ? `${st.generalAverage.toFixed(2)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* DepEd Signature Block */}
        <div className="grid grid-cols-2 gap-8 pt-8 text-xs text-center mt-6 break-inside-avoid">
          <div>
            <div className="border-b border-black w-56 mx-auto pb-1 font-bold text-slate-900">
              Administrative Registrar
            </div>
            <div className="text-[10px] text-slate-600 mt-1 uppercase tracking-wider font-semibold">
              School Records In-Charge
            </div>
            <div className="text-[9px] text-slate-500 font-mono">Date Certified: {new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          </div>
          <div>
            <div className="border-b border-black w-56 mx-auto pb-1 font-bold text-slate-900">
              Dr. Restituto M. Hernandez, EdD
            </div>
            <div className="text-[10px] text-slate-600 mt-1 uppercase tracking-wider font-semibold">
              Secondary School Principal IV
            </div>
            <div className="text-[9px] text-slate-500 font-mono">Official Master Registry (S.Y. 2026–2027)</div>
          </div>
        </div>

      </div>

    </div>
  );
};
