import React, { useEffect, useMemo, useState } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  CheckCircle2,
  ExternalLink,
  Building,
  Navigation
} from 'lucide-react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  APILoadingStatus
} from '@vis.gl/react-google-maps';
import { schoolDb } from '../services/schoolDatabase';
import { PublicInquiry } from '../types/school';

const INHS_COORDINATES = { lat: 14.7429743, lng: 121.6483008 };
const INHS_INITIAL_CENTER = { lat: 14.74335, lng: 121.6483008 };
const INHS_MAPS_SHORT_URL = 'https://maps.app.goo.gl/Jx8pFBHyieh2E3kB8';
const INHS_DIRECTIONS_URL =
  'https://www.google.com/maps/dir/?api=1&destination=14.7429743,121.6483008';
const MAP_LIBRARIES: ('marker')[] = ['marker'];

function getGoogleMapsApiKey(): string {
  return (
    (globalThis as unknown as { GOOGLE_MAPS_API_KEY?: string }).GOOGLE_MAPS_API_KEY ||
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    ''
  );
}

const CampusMapFallback: React.FC = () => (
  <div className="h-72 sm:h-80 rounded-lg bg-blue-950 text-white p-4 relative flex flex-col justify-between overflow-hidden">
    <div className="text-[11px] text-amber-300 font-semibold tracking-wider uppercase">
      Infanta, Quezon Pacific Coastway
    </div>

    <div className="space-y-1.5 z-10">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-amber-400 border-2 border-white" />
        <span className="text-xs font-bold text-white">Infanta National High School</span>
      </div>
      <div className="text-[11px] text-slate-200 leading-relaxed">
        Purok 1, Barangay Poblacion 38, Infanta, Quezon 4336 · Accessible via F. Gurango Sr. Avenue, 5 mins from Infanta Town Plaza.
      </div>
      <a
        href={INHS_MAPS_SHORT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-md bg-amber-400 hover:bg-amber-300 text-blue-950 text-[11px] font-bold transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        <span>View on Google Maps</span>
      </a>
    </div>

    <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
  </div>
);

interface CampusInteractiveMapContentProps {
  externalFailure: boolean;
}

const CampusInteractiveMapContent: React.FC<CampusInteractiveMapContentProps> = ({ externalFailure }) => {
  const loadingStatus = useApiLoadingStatus();
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [infoWindowOpen, setInfoWindowOpen] = useState(true);
  const [tilesLoaded, setTilesLoaded] = useState(false);

  if (
    externalFailure ||
    loadingStatus === APILoadingStatus.FAILED ||
    loadingStatus === APILoadingStatus.AUTH_FAILURE
  ) {
    return <CampusMapFallback />;
  }

  const isLoading =
    !tilesLoaded &&
    (loadingStatus === APILoadingStatus.NOT_LOADED || loadingStatus === APILoadingStatus.LOADING);

  return (
    <div className="h-72 sm:h-80 w-full rounded-lg overflow-hidden border border-slate-200 relative bg-slate-200">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/90 text-slate-600 text-xs font-medium pointer-events-none">
          Loading campus map...
        </div>
      )}
      <GoogleMap
        mapId="DEMO_MAP_ID"
        defaultCenter={INHS_INITIAL_CENTER}
        defaultZoom={16}
        gestureHandling="cooperative"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
        onTilesLoaded={() => setTilesLoaded(true)}
      >
        <AdvancedMarker
          ref={markerRef}
          position={INHS_COORDINATES}
          title="Infanta National High School"
          onClick={() => setInfoWindowOpen((prev) => !prev)}
        >
          <Pin background="#1e3a8a" borderColor="#f59e0b" glyphColor="#fde68a" />
        </AdvancedMarker>

        {infoWindowOpen && marker && (
          <InfoWindow
            anchor={marker}
            maxWidth={220}
            pixelOffset={[0, -4]}
            onCloseClick={() => setInfoWindowOpen(false)}
          >
            <div className="pr-1 text-slate-800 space-y-1">
              <div className="text-xs font-bold text-blue-950 leading-tight">
                Infanta National High School
              </div>
              <div className="text-[11px] text-slate-600 leading-snug">
                Barangay Poblacion 38, Infanta, Quezon 4336
              </div>
              <a
                href={INHS_MAPS_SHORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-800 hover:text-blue-950 underline pt-0.5"
              >
                <span>Open in Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

export const ContactSection: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('Enrollment Inquiry');
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [submittedInquiry, setSubmittedInquiry] = useState<PublicInquiry | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [mapAuthFailed, setMapAuthFailed] = useState(false);
  const mapsApiKey = useMemo(() => getGoogleMapsApiKey(), []);

  useEffect(() => {
    const handleMapAuthFailure = () => setMapAuthFailed(true);
    window.addEventListener('gmp-map-auth-failure', handleMapAuthFailure);
    return () => window.removeEventListener('gmp-map-auth-failure', handleMapAuthFailure);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!name.trim() || !email.trim() || !message.trim()) {
      setSubmitError('Please fill in your full name, email address, and message details.');
      return;
    }

    try {
      const saved = schoolDb.submitPublicInquiry({
        fullName: name,
        email,
        phone,
        category: subject,
        message,
      });
      setSubmittedInquiry(saved);
      setIsSent(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to submit inquiry. Please verify your entries.');
    }
  };

  return (
    <section id="contact" className="py-10 sm:py-12 bg-white border-b border-slate-200 scroll-mt-36 sm:scroll-mt-40 lg:scroll-mt-44">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-6 sm:mb-8">
          <span className="text-xs font-bold tracking-widest uppercase text-blue-900">
            Get In Touch
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-crest tracking-tight text-slate-900 mt-1">
            Contact Infanta National High School
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
            Have questions regarding admissions, Form 137 requests, graduation credentials, or teacher consultations? Our administrative office is ready to assist you.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
          
          {/* Institutional Contact Info & Map Guide */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-5">
              <h3 className="text-base font-bold font-crest text-slate-900 border-b border-slate-200 pb-2">
                Official Directory & Office Hours
              </h3>

              <div className="space-y-4 text-xs sm:text-sm text-slate-700">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-blue-900 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-slate-900">School Address:</strong>
                    <span>Purok 1, Barangay Poblacion 38, Infanta, Quezon 4336, Philippines</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-blue-900 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-slate-900">Telephone / Mobile:</strong>
                    <span className="font-mono-num">(042) 535-2144 / +63 917 889 1240</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-900 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-slate-900">Official DepEd Email:</strong>
                    <span className="font-mono text-blue-900">301332@deped.gov.ph</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-blue-900 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-slate-900">Registrar & Cashier Hours:</strong>
                    <span>Monday to Friday: 8:00 AM – 5:00 PM (No Noon Break Policy)</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building className="w-5 h-5 text-blue-900 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-slate-900">Supervising Division:</strong>
                    <span>SDO Quezon · DepEd Region IV-A CALABARZON</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Campus Location Landmark with Google Maps */}
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-100 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Campus Location Landmark</span>
                <span className="text-[11px] text-slate-500">Poblacion 38, Infanta</span>
              </div>

              {mapsApiKey && !mapAuthFailed ? (
                <APIProvider
                  apiKey={mapsApiKey}
                  libraries={MAP_LIBRARIES}
                  language="en"
                  region="PH"
                  onError={() => setMapAuthFailed(true)}
                >
                  <CampusInteractiveMapContent externalFailure={mapAuthFailed} />
                </APIProvider>
              ) : (
                <CampusMapFallback />
              )}

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <a
                  href={INHS_MAPS_SHORT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-[11px] font-semibold transition-colors shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
                  <span>Open in Google Maps</span>
                </a>
                <a
                  href={INHS_DIRECTIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-[11px] font-semibold transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5 text-blue-900" />
                  <span>Get Directions</span>
                </a>
              </div>

              <div className="text-[11px] text-slate-500 leading-relaxed">
                Accessible via F. Gurango Sr. Avenue, 5 mins from Infanta Town Plaza. Visitors are requested to log with the School Security at Gate 1 and present a valid government or student ID.
              </div>
            </div>
          </div>

          {/* Interactive Inquiry Form */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            {isSent ? (
              <div className="py-10 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold font-crest text-slate-900">
                  Salamat! Your Message Has Been Sent
                </h3>
                {submittedInquiry && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-mono font-bold">
                    <span>Reference Ticket:</span>
                    <span>{submittedInquiry.id}</span>
                  </div>
                )}
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                  Thank you for reaching out to Infanta National High School. Your inquiry has been logged directly with our Administration &amp; Registrar desk and will be reviewed within 1 to 2 school days.
                </p>
                {submittedInquiry && (
                  <div className="max-w-md mx-auto text-left bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-600 space-y-1">
                    <div>
                      <strong className="text-slate-800">Sender:</strong> {submittedInquiry.fullName} ({submittedInquiry.email})
                    </div>
                    <div>
                      <strong className="text-slate-800">Category:</strong> {submittedInquiry.category}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => {
                    setIsSent(false);
                    setSubmittedInquiry(null);
                    setSubmitError(null);
                    setMessage('');
                    setName('');
                    setEmail('');
                    setPhone('');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold font-crest text-slate-900">
                    Online Public Assistance Desk (PAD)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Submit public inquiries, record requests, or schedule guidance consultations.
                  </p>
                </div>

                {submitError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                    {submitError}
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Flordeliza Santos"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-blue-900 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-blue-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Mobile / Phone Number</label>
                    <input
                      type="tel"
                      placeholder="0917-000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-blue-900 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Inquiry Category *</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:border-blue-900 focus:outline-hidden"
                    >
                      <option value="Enrollment Inquiry">Enrollment & Admissions</option>
                      <option value="Form 137 / SF10 Request">Form 137 / SF10 Permanent Record Request</option>
                      <option value="Good Moral Certificate">Certificate of Good Moral Character</option>
                      <option value="Senior High Voucher Program">SHS Voucher Program & ESC Assistance</option>
                      <option value="Parent-Teacher Consultation">Parent-Teacher Conference Scheduling</option>
                      <option value="Other Concerns">General Community Concerns</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Message / Details *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide details of your inquiry, including student's LRN and grade level if applicable..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-blue-900 focus:outline-hidden"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-500">
                  Data Privacy Note: Personal information collected is strictly governed by Republic Act 10173 (Data Privacy Act of 2012) and DepEd Citizen's Charter.
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4 text-amber-300" />
                  <span>Transmit Inquiry to Registrar</span>
                </button>
              </form>
            )}
          </div>

        </div>

      </div>
    </section>
  );
};
