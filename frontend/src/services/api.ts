import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  createAppointment: (payload: unknown) => api.post('/appointments', payload).then(res => res.data),
  confirmAppointment: (id: string, payload: unknown) => api.post(`/appointments/${id}/confirm`, payload).then(res => res.data),
  completeAppointment: (id: string, payload: unknown) => api.post(`/appointments/${id}/complete`, payload).then(res => res.data),
  createLeave: (payload: unknown) => api.post('/leaves', payload).then(res => res.data)
};

export default api;