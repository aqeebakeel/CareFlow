import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

export default function AdminDashboard() {
  const [name, setName] = useState('');
  const [specialisation, setSpecialisation] = useState('');
  const [slotDuration, setSlotDuration] = useState(30);
  const [workingHours, setWorkingHours] = useState('09:00-17:00');
  const [doctors, setDoctors] = useState<any[]>([]);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      // Assuming a GET /doctors endpoint exists
      const { default: api } = await import('../services/api');
      const response = await api.get('/doctors');
      setDoctors(response.data);
    } catch (error) {
      console.error('Failed to fetch doctors', error);
    }
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { default: api } = await import('../services/api');
      // Create user first
      const userRes = await api.post('/users', { name, role: 'DOCTOR' });
      // Create doctor profile
      await api.post('/doctors', {
        userId: userRes.data.id,
        specialisation,
        slotDuration,
        workingHours: {
          MONDAY: workingHours,
          TUESDAY: workingHours,
          WEDNESDAY: workingHours,
          THURSDAY: workingHours,
          FRIDAY: workingHours,
        }
      });
      fetchDoctors();
      setName('');
      setSpecialisation('');
    } catch (error) {
      console.error('Failed to create doctor', error);
    }
  };

  return (
    <div className="p-6 bg-pink-50 min-h-screen">
      <h1 className="text-2xl font-bold text-pink-900 mb-6">Admin Dashboard</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-pink-200 p-6 mb-8 max-w-2xl">
        <h2 className="text-xl font-semibold text-pink-900 mb-4">Create Doctor Profile</h2>
        <form onSubmit={handleCreateDoctor} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-pink-700 mb-1">Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-pink-200 p-2 focus:ring-2 focus:ring-pink-300 focus:border-pink-300 focus:outline-none" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-pink-700 mb-1">Specialisation</label>
            <input 
              type="text" 
              required
              value={specialisation}
              onChange={(e) => setSpecialisation(e.target.value)}
              className="w-full rounded-md border border-pink-200 p-2 focus:ring-2 focus:ring-pink-300 focus:border-pink-300 focus:outline-none" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-pink-700 mb-1">Slot Duration (mins)</label>
              <input 
                type="number" 
                required
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                className="w-full rounded-md border border-pink-200 p-2 focus:ring-2 focus:ring-pink-300 focus:border-pink-300 focus:outline-none" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-pink-700 mb-1">Working Hours (Mon-Fri)</label>
              <input 
                type="text" 
                required
                placeholder="e.g. 09:00-17:00"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                className="w-full rounded-md border border-pink-200 p-2 focus:ring-2 focus:ring-pink-300 focus:border-pink-300 focus:outline-none" 
              />
            </div>
          </div>
          <button 
            type="submit"
            className="w-full bg-pink-600 text-white py-2 px-4 rounded-md hover:bg-pink-700 focus:ring-4 focus:ring-pink-300 font-medium transition-colors"
          >
            Create Profile
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-pink-200 p-6">
        <h2 className="text-xl font-semibold text-pink-900 mb-4">Existing Doctors</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-pink-100">
                <th className="pb-3 font-semibold text-pink-900">Name</th>
                <th className="pb-3 font-semibold text-pink-900">Specialisation</th>
                <th className="pb-3 font-semibold text-pink-900">Slot Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-50">
              {doctors.map((doc, i) => (
                <tr key={i} className="hover:bg-pink-50 transition-colors">
                  <td className="py-3 text-pink-800">{doc.user?.name || 'Dr. Smith'}</td>
                  <td className="py-3 text-pink-700">{doc.specialisation}</td>
                  <td className="py-3 text-pink-700">{doc.slotDuration} mins</td>
                </tr>
              ))}
              {doctors.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-pink-500">
                    No doctors found. Create one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
