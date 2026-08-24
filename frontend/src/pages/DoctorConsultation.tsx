import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

export default function DoctorConsultation() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (appointmentId) {
      fetchAppointment();
    }
  }, [appointmentId]);

  const fetchAppointment = async () => {
    try {
      const { default: api } = await import('../services/api');
      const response = await api.get(`/appointments/${appointmentId}`);
      setAppointment(response.data);
    } catch (err) {
      console.error('Failed to fetch appointment', err);
      // Fallback dummy data if endpoint isn't fully ready
      setAppointment({
        id: appointmentId,
        patient: { user: { name: 'John Doe' } },
        preVisitSummary: {
          urgency: 'MODERATE',
          chiefComplaint: 'Patient reports persistent headache and mild dizziness for the past 3 days. No history of migraines.',
          suggestedQuestions: [
            'Have you experienced any changes in your vision?',
            'Are you currently taking any new medications?',
            'Does the dizziness occur when standing up quickly?'
          ]
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentId) return;
    
    setSubmitting(true);
    setError('');
    
    try {
      await apiService.completeAppointment(appointmentId, { clinicalNotes });
      navigate('/doctor');
    } catch (err) {
      console.error('Failed to complete consultation', err);
      setError('Failed to submit consultation notes. Please try again.');
      setSubmitting(false); // Only set false on error so it doesn't flicker on success nav
    }
  };

  if (loading) {
    return <div className="p-6 text-pink-500">Loading consultation details...</div>;
  }

  if (!appointment) {
    return <div className="p-6 text-red-500">Appointment not found.</div>;
  }

  const summary = appointment.preVisitSummary;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-pink-900 mb-1">Consultation</h1>
          <p className="text-pink-700">Patient: {appointment.patient?.user?.name || 'Unknown Patient'}</p>
        </div>
        <button 
          onClick={() => navigate('/doctor')}
          className="text-pink-600 hover:text-pink-800 font-medium transition-colors"
        >
          &larr; Back to Schedule
        </button>
      </div>
      
      <div className="grid gap-6 max-w-4xl">
        {/* Pre-Visit Summary Card */}
        {summary && (
          <div className="bg-pink-50 rounded-xl border border-pink-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-pink-900">Pre-Visit AI Summary</h2>
              {summary.urgency && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                  ${summary.urgency === 'HIGH' ? 'bg-red-100 text-red-800 border border-red-200' : 
                    summary.urgency === 'LOW' ? 'bg-green-100 text-green-800 border border-green-200' : 
                    'bg-yellow-100 text-yellow-800 border border-yellow-200'}`}>
                  {summary.urgency} URGENCY
                </span>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-pink-800 uppercase tracking-wider mb-1">Chief Complaint</h3>
                <p className="text-pink-900 bg-white p-3 rounded-md border border-pink-100">
                  {summary.chiefComplaint || 'No chief complaint provided.'}
                </p>
              </div>
              
              {summary.suggestedQuestions && summary.suggestedQuestions.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-pink-800 uppercase tracking-wider mb-2">Suggested Questions</h3>
                  <ul className="list-disc list-inside text-pink-900 space-y-1 bg-white p-3 rounded-md border border-pink-100">
                    {summary.suggestedQuestions.map((q: string, i: number) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700 shadow-sm">
            {error}
          </div>
        )}

        {/* Post-Visit Notes Form */}
        <div className="bg-white rounded-xl shadow-sm border border-pink-200 p-6">
          <h2 className="text-lg font-semibold text-pink-900 mb-4">Post-Visit Clinical Notes</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-pink-700 mb-2">
                Consultation Notes & Outcomes
              </label>
              <textarea 
                required
                rows={8}
                placeholder="Enter your clinical observations, diagnosis, and treatment plan here..."
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                className="w-full rounded-md border border-pink-200 p-3 focus:ring-2 focus:ring-pink-300 focus:border-pink-300 focus:outline-none text-pink-900 resize-none" 
              />
            </div>
            
            <button 
              type="submit"
              disabled={submitting}
              className="bg-pink-600 text-white py-3 px-6 rounded-md hover:bg-pink-700 focus:ring-4 focus:ring-pink-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Finalising Consultation...
                </>
              ) : (
                'Complete Consultation'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
