import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

export default function AdminLeaveManagement() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [reason, setReason] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const { default: api } = await import('../services/api');
      const response = await api.get('/doctors');
      setDoctors(response.data);
    } catch (error) {
      console.error('Failed to fetch doctors', error);
    }
  };

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.createLeave({
        doctorId: selectedDoctorId,
        start: new Date(leaveStart).toISOString(),
        end: new Date(leaveEnd).toISOString(),
        reason
      });
      setToastMessage('Leave created successfully! Overlapping appointments will be cancelled by the backend.');
      setLeaveStart('');
      setLeaveEnd('');
      setReason('');
      
      // Hide toast after 5 seconds
      setTimeout(() => setToastMessage(''), 5000);
    } catch (error) {
      console.error('Failed to mark leave', error);
      setToastMessage('Error creating leave. Please try again.');
    }
  };

  return (
    <div className="p-6 bg-pink-50 min-h-screen">
      <h1 className="text-2xl font-bold text-pink-900 mb-6">Leave Management</h1>
      
      {toastMessage && (
        <div className="mb-6 p-4 rounded-md bg-pink-100 border border-pink-300 text-pink-800 shadow-sm flex items-center justify-between">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage('')} className="text-pink-600 hover:text-pink-800">
            &times;
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-pink-200 p-6 max-w-2xl">
        <h2 className="text-xl font-semibold text-pink-900 mb-4">Mark Doctor on Leave</h2>
        <form onSubmit={handleCreateLeave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-pink-700 mb-1">Select Doctor</label>
            <select 
              required
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full rounded-md border border-pink-200 p-2 focus:ring-2 focus:ring-pink-300 focus:border-pink-300 focus:outline-none bg-white text-pink-900" 
            >
              <option value="" disabled>Select a doctor...</option>
              {doctors.map(doc => (
                <option key={doc.id} value={doc.id}>
                  {doc.user?.name || 'Dr. Smith'} - {doc.specialisation}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-pink-700 mb-1">Leave Start</label>
              <input 
                type="date" 
                required
                value={leaveStart}
                onChange={(e) => setLeaveStart(e.target.value)}
                className="w-full rounded-md border border-pink-200 p-2 focus:ring-2 focus:ring-pink-300 focus:border-pink-300 focus:outline-none text-pink-900" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-pink-700 mb-1">Leave End</label>
              <input 
                type="date" 
                required
                value={leaveEnd}
                onChange={(e) => setLeaveEnd(e.target.value)}
                className="w-full rounded-md border border-pink-200 p-2 focus:ring-2 focus:ring-pink-300 focus:border-pink-300 focus:outline-none text-pink-900" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-pink-700 mb-1">Reason (Optional)</label>
            <input 
              type="text" 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Annual Leave"
              className="w-full rounded-md border border-pink-200 p-2 focus:ring-2 focus:ring-pink-300 focus:border-pink-300 focus:outline-none" 
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-pink-600 text-white py-2 px-4 rounded-md hover:bg-pink-700 focus:ring-4 focus:ring-pink-300 font-medium transition-colors mt-2"
          >
            Mark Leave
          </button>
        </form>
      </div>
    </div>
  );
}
