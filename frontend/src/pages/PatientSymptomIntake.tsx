import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

export default function PatientSymptomIntake() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // 5 minute countdown (300 seconds)
  const [timeLeft, setTimeLeft] = useState(300);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timerId = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timerId);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentId) return;
    
    setLoading(true);
    setError('');
    
    try {
      await apiService.confirmAppointment(appointmentId, { symptoms });
      setSuccess(true);
    } catch (err) {
      console.error('Failed to confirm appointment', err);
      setError('Failed to confirm your appointment. The hold may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-6 max-w-2xl mx-auto mt-12">
        <div className="bg-white rounded-xl shadow-sm border border-pink-200 p-8 text-center">
          <div className="w-16 h-16 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-pink-900 mb-2">Booking Confirmed!</h1>
          <p className="text-pink-700 mb-6">
            Your appointment has been successfully scheduled. We are analysing your symptoms and preparing a summary for the doctor.
          </p>
          <button 
            onClick={() => navigate('/patient')}
            className="bg-pink-600 text-white py-2 px-6 rounded-md hover:bg-pink-700 font-medium transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-pink-900 mb-2">Complete Your Booking</h1>
      <p className="text-pink-700 mb-6">Please provide your symptoms to confirm the appointment.</p>
      
      <div className="bg-white rounded-xl shadow-sm border border-pink-200 p-6 max-w-2xl">
        <div className="bg-pink-50 border border-pink-200 rounded-md p-4 mb-6 flex justify-between items-center">
          <span className="text-pink-800 font-medium">Your slot is held. Please confirm to secure it.</span>
          <span className={`font-mono text-lg font-bold ${timeLeft < 60 ? 'text-red-500' : 'text-pink-600'}`}>
            {formatTime(timeLeft)}
          </span>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 text-red-700 shadow-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-pink-700 mb-2">
              Describe your symptoms
            </label>
            <textarea 
              required
              rows={5}
              placeholder="Please describe what you're experiencing, when it started, and any other relevant details..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="w-full rounded-md border border-pink-200 p-3 focus:ring-2 focus:ring-pink-300 focus:border-pink-300 focus:outline-none text-pink-900 resize-none" 
            />
          </div>
          
          <button 
            type="submit"
            disabled={loading || timeLeft <= 0}
            className="w-full bg-pink-600 text-white py-3 px-4 rounded-md hover:bg-pink-700 focus:ring-4 focus:ring-pink-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Confirming...
              </>
            ) : (
              'Confirm Appointment'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
