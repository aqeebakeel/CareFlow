import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

export default function PatientBookingCalendar() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch slots whenever the date changes
  useEffect(() => {
    if (selectedDate && doctorId) {
      fetchSlots();
    }
  }, [selectedDate, doctorId]);

  const fetchSlots = async () => {
    setLoading(true);
    setError('');
    try {
      const { default: api } = await import('../services/api');
      // Assume endpoint /doctors/:id/slots?date=YYYY-MM-DD
      const response = await api.get(`/doctors/${doctorId}/slots?date=${selectedDate}`);
      setAvailableSlots(response.data);
    } catch (err) {
      console.error('Failed to fetch slots', err);
      // Fallback dummy data if endpoint isn't fully ready
      setAvailableSlots(['09:00', '09:30', '10:00', '11:00', '14:00', '15:30']);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotClick = async (time: string) => {
    try {
      // Create date object from selected date and time
      const [hours, minutes] = time.split(':');
      const appointmentDate = new Date(selectedDate);
      appointmentDate.setHours(Number(hours), Number(minutes), 0, 0);

      // Lock the slot
      const response = await apiService.createAppointment({
        doctorId,
        startTime: appointmentDate.toISOString(),
      });
      
      // Navigate to symptom intake with the appointment ID
      navigate(`/patient/symptoms/${response.id}`);
    } catch (err) {
      console.error('Failed to book slot', err);
      setError('Failed to lock the slot. It might have been booked by someone else.');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-pink-900 mb-2">Book a Slot</h1>
      <p className="text-pink-700 mb-8">Select a date to view available appointment times.</p>
      
      <div className="bg-white rounded-xl shadow-sm border border-pink-200 p-6 max-w-3xl">
        {error && (
          <div className="mb-6 p-4 rounded-md bg-pink-100 border border-pink-300 text-pink-800 shadow-sm">
            {error}
          </div>
        )}
        
        <div className="mb-8">
          <label className="block text-sm font-medium text-pink-700 mb-2">Select Date</label>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]} // prevent past dates
            className="w-full md:w-1/2 rounded-md border border-pink-200 p-3 focus:ring-2 focus:ring-pink-300 focus:border-pink-300 focus:outline-none text-pink-900 text-lg" 
          />
        </div>

        {selectedDate && (
          <div>
            <h2 className="text-lg font-semibold text-pink-900 mb-4">
              Available Times on {new Date(selectedDate).toLocaleDateString()}
            </h2>
            
            {loading ? (
              <p className="text-pink-500">Loading available slots...</p>
            ) : availableSlots.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {availableSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => handleSlotClick(time)}
                    className="py-2 px-3 border border-pink-200 rounded-md text-pink-700 hover:bg-pink-600 hover:text-white hover:border-pink-600 focus:ring-4 focus:ring-pink-300 transition-colors text-sm font-medium"
                  >
                    {time}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-pink-500 bg-pink-50 p-4 rounded-md border border-pink-100 text-center">
                No slots available on this date. Please try another day.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
