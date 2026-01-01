import axios from 'axios';

/*
Centralized API configuration and service definitions for all backend interactions.

Axios Configuration:
   - Base URL setup for local development
   - Request/Response interceptors for debugging
   - Consistent headers and error handling

API Services:
   - Patient API: CRUD operations for patient management
   - Assessment API: Overweight and general assessment endpoints
   - Vitals API: Vital signs recording and retrieval

Endpoint Organization:
   - Logical grouping by domain (patients, assessments, vitals)
   - Consistent parameter naming
   - Clear separation of concerns

*/

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      data: config.data,
      params: config.params,
    });
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error('API Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

export const patientApi = {
  getPatients: () => api.get('/patients/'),
  createPatient: (data: any) => api.post('/patients/', data),
  getPatient: (id: string) => api.get(`/patients/${id}/`),
  updatePatient: (id: string, data: any) => api.put(`/patients/${id}/`, data),
  deletePatient: (id: string) => api.delete(`/patients/${id}/`),
  getPatientByPatientId: (patientId: string) => 
    api.get('/patients/', { params: { patient_id: patientId } }),
  
  getPatientWithDetails: (id: string) => 
    api.get(`/patients/${id}/with-details/`),
};

export const assessmentApi = {
  createOverweightAssessment: (data: any) => 
    api.post('/overweight-assessments/', data),
  
  getPatientOverweightAssessments: (patientId: string) => 
    api.get(`/overweight-assessments/`, { params: { patient: patientId } }),
  
  getAllOverweightAssessments: () => 
    api.get('/overweight-assessments/'),
  
  createGeneralAssessment: (data: any) => 
    api.post('/general-assessments/', data),
  
  getPatientGeneralAssessments: (patientId: string) => 
    api.get(`/general-assessments/`, { params: { patient: patientId } }),
  
  getAllGeneralAssessments: () => 
    api.get('/general-assessments/'),
  
  getAssessment: (id: string, type: 'overweight' | 'general') => 
    api.get(`/${type}-assessments/${id}/`),
  
  updateAssessment: (id: string, data: any, type: 'overweight' | 'general') => 
    api.put(`/${type}-assessments/${id}/`, data),
  
  deleteAssessment: (id: string, type: 'overweight' | 'general') => 
    api.delete(`/${type}-assessments/${id}/`),
};

export const vitalsApi = {
  createVitals: (data: any) => api.post('/vitals/', data),
  
  getVitals: (patientId: string) => 
    api.get(`/vitals/`, { params: { patient: patientId } }),
  
  getVitalsByPatientId: (patientId: string) =>
    api.get(`/vitals/`, { params: { patient_id: patientId } }),
  
  getVital: (id: string) => api.get(`/vitals/${id}/`),
  
  updateVital: (id: string, data: any) => api.put(`/vitals/${id}/`, data),
  
  deleteVital: (id: string) => api.delete(`/vitals/${id}/`),
  
  getAllVitals: () => api.get('/vitals/'),
};

export default api;