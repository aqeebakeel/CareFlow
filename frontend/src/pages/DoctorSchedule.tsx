import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import { useAuth } from '../auth/AuthContext'; 
// Since we don't have doctor ID in AuthContext yet (only role), 
// we will assume a generic fetch for now or use a dummy doctorId

export default function DoctorSchedule() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  // const { role } = useAuth();

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const { default: api } = await import('../services/api');
      // Assume a GET /appointments endpoint or /doctors/me/appointments
      // For demo, we'll try /appointments and filter, or just use what returns
      const response = await api.get('/appointments');
      // For this demo, let's assume it returns an array of appointments
      setAppointments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch appointments', error);
      // Fallback dummy data for styling purposes if backend isn't ready
      setAppointments([
        { id: '1', startTime: new Date().toISOString(), patient: { user: { name: 'John Doe' } }, status: 'CONFIRMED' },
        { id: '2', startTime: new Date(Date.now() - 86400000).toISOString(), patient: { user: { name: 'Jane Smith' } }, status: 'COMPLETED' },
        { id: '3', startTime: new Date(Date.now() + 86400000).toISOString(), patient: { user: { name: 'Alice Jones' } }, status: 'CANCELLED_BY_DOCTOR' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'CANCELLED_BY_DOCTOR':
      case 'CANCELLED_BY_PATIENT': 
        return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-pink-50 text-pink-700 border-pink-100';
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-pink-900 mb-2">Today's Schedule</h1>
      <p className="text-pink-700 mb-8">View your upcoming appointments and manage consultations.</p>
      
      {loading ? (
        <p className="text-pink-500">Loading your schedule...</p>
      ) : appointments.length > 0 ? (
        <div className="grid gap-4">
          {appointments.map((apt) => (
            <div key={apt.id} className="bg-white rounded-xl shadow-sm border border-pink-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-lg font-semibold text-pink-900">
                    {apt.patient?.user?.name || 'Unknown Patient'}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(apt.status)}`}>
                    {apt.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-pink-600 font-medium">
                  {new Date(apt.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              
              {apt.status === 'CONFIRMED' && (
                <button 
                  onClick={() => navigate(`/doctor/consultation/${apt.id}`)}
                  className="bg-pink-600 text-white py-2 px-6 rounded-md hover:bg-pink-700 focus:ring-4 focus:ring-pink-300 font-medium transition-colors shrink-0"
                >
                  Start Consultation
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-pink-200 p-8 text-center text-pink-500 shadow-sm">
          You have no appointments scheduled at this time.
        </div>
      )}
    </div>
  );
}
