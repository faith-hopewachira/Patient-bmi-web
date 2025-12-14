import axios from 'axios';

/*
API Configuration File

This file sets up the base API configuration and defines all API endpoints
for the Patient Management System. It uses Axios for HTTP requests and
organizes endpoints by resource type (patients, assessments, vitals).

BASE URL: http://localhost:8000/api (Django REST Framework backend)
*/

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/*
Patient API Endpoints
CRUD operations for patient management
Base endpoint: /api/patients/
*/
export const patientApi = {
  getPatients: () => api.get('/patients/'),
  
  createPatient: (data: any) => api.post('/patients/', data),
  
  getPatient: (id: string) => api.get(`/patients/${id}/`),
  
  updatePatient: (id: string, data: any) => api.put(`/patients/${id}/`, data),
  
  deletePatient: (id: string) => api.delete(`/patients/${id}/`),
};

/*
Assessment API Endpoints
Two types of assessments with separate endpoints:
1. Overweight Assessment - For patients with BMI > 25
2. General Assessment - For patients with BMI ≤ 25
*/

export const assessmentApi = {
  /*
  Overweight Assessment Endpoints
  Base endpoint: /api/overweight-assessments/
  */
  
  createOverweightAssessment: (data: any) => 
    api.post('/overweight-assessments/', data),
  
  getPatientOverweightAssessments: (patientId: string) => 
    api.get(`/overweight-assessments/?patient=${patientId}`),
  
  getAllOverweightAssessments: () => 
    api.get('/overweight-assessments/'),
  
  /*
  General Assessment Endpoints
  Base endpoint: /api/general-assessments/
  */
  
  createGeneralAssessment: (data: any) => 
    api.post('/general-assessments/', data),
  
  getPatientGeneralAssessments: (patientId: string) => 
    api.get(`/general-assessments/?patient=${patientId}`),
  
  getAllGeneralAssessments: () => 
    api.get('/general-assessments/'),
  
  /*
  Common Assessment Methods
  Used for operations that work for both assessment types
  */
  
  getAssessment: (id: string, type: 'overweight' | 'general') => 
    api.get(`/${type}-assessments/${id}/`),
  
  updateAssessment: (id: string, data: any, type: 'overweight' | 'general') => 
    api.put(`/${type}-assessments/${id}/`, data),
  
  deleteAssessment: (id: string, type: 'overweight' | 'general') => 
    api.delete(`/${type}-assessments/${id}/`),
};

/*
Vitals API Endpoints
CRUD operations for patient vital signs (height, weight, BMI)
Base endpoint: /api/vitals/
*/
export const vitalsApi = {
  createVitals: (data: any) => api.post('/vitals/', data),
  
  getVitals: (patientId: string) => api.get(`/vitals/?patient=${patientId}`),
  
  getVital: (id: string) => api.get(`/vitals/${id}/`),
  
  updateVital: (id: string, data: any) => api.put(`/vitals/${id}/`, data),
  
  deleteVital: (id: string) => api.delete(`/vitals/${id}/`),
  
  getAllVitals: () => api.get('/vitals/'),
};

export default api;
