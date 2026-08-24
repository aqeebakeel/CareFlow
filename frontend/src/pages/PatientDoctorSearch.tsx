import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PatientDoctorSearch() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const navigate = useNavigate();

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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-pink-900 mb-2">Find a Doctor</h1>
      <p className="text-pink-700 mb-8">Search our network of specialists and book an appointment.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {doctors.map(doc => (
          <div key={doc.id} className="bg-white rounded-xl shadow-sm border border-pink-200 p-6 flex flex-col hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold text-pink-900">{doc.user?.name || 'Dr. Smith'}</h2>
            <p className="text-pink-600 font-medium mb-4">{doc.specialisation}</p>
            
            <div className="mt-auto pt-4 border-t border-pink-100">
              <p className="text-sm text-pink-500 mb-4">Slot duration: {doc.slotDuration} mins</p>
              <button 
                onClick={() => navigate(`/patient/book/${doc.id}`)}
                className="w-full bg-pink-100 text-pink-800 py-2 rounded-md hover:bg-pink-200 focus:ring-4 focus:ring-pink-300 font-medium transition-colors"
              >
                View Availability
              </button>
            </div>
          </div>
        ))}
        {doctors.length === 0 && (
          <div className="col-span-full p-8 text-center text-pink-500 bg-white rounded-xl border border-pink-200">
            No doctors available at the moment.
          </div>
        )}
      </div>
    </div>
  );
}
