import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientApi } from '../services/api';

/*
PatientRegistration Component

This is the entry point of the application where new patients are registered.
It collects basic patient information before proceeding to vitals measurement.

Key Features:
1. Collects required patient demographic information
2. Generates or accepts a unique patient identifier
3. Validates form data before submission
4. Creates patient record in the database
5. Navigates to VitalsForm with patient data

*/

const PatientRegistration: React.FC = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    patient_number: '',       
    first_name: '',           
    last_name: '',        
    middle_name: '', 
    date_of_birth: '',     
    gender: 'M',          
    registration_date: new Date().toISOString().split('T')[0], 
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
  Function: Handle form submission
  Purpose: Validate and submit patient data to API, then navigate to next step
  Steps:
  1. Validate all required fields are filled
  2. Prepare data for API submission
  3. Submit to patient creation endpoint
  4. Navigate to VitalsForm with patient data
  5. Handle errors with user-friendly messages
  */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.first_name || !formData.last_name || !formData.date_of_birth || 
        !formData.gender || !formData.patient_number) {
      setError('Please fill in all required fields');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const patientData = {
        patient_number: formData.patient_number,
        first_name: formData.first_name,
        last_name: formData.last_name,
        middle_name: formData.middle_name || undefined,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        registration_date: formData.registration_date,
      };
      
      console.log('Creating patient:', patientData);
      
      const response = await patientApi.createPatient(patientData);
      console.log('Patient created:', response.data);
      
      /*
      Navigate to VitalsForm with patient data
      The state object passed will be available in the VitalsForm component
      via React Router's location state
      */
      navigate('/vitals-form', { 
        state: { 
          patient: {
            id: response.data.id,                   
            patient_id: response.data.patient_number || response.data.patient_id,
            first_name: response.data.first_name,   
            last_name: response.data.last_name,   
          }
        } 
      });
    } catch (err: any) {
      console.error('Error:', err);
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        if (errorData.patient_number) {
          setError('Patient number already exists. Please use a different number.');
        } 
        else if (errorData.detail) {
          setError(errorData.detail);
        } 
        else {
          setError('Failed to register patient. Please check the form data.');
        }
      } else {
        setError('Failed to register patient. Please check your connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
  Function: Handle input changes
  Purpose: Update form state and clear any existing error messages
  Parameters: 
    - e: Change event from input/select elements
  */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    if (error) setError(null);
  };

  /*
  Function: Handle Cancel button click
  Purpose: Navigate back to home page or previous page
  */
  const handleCancel = () => {
    navigate('/');
  };

  return (
    <div>
      <h1 className="form-title">Patient Registration</h1>
      
      {error && (
        <div className="alert-box alert-error">
          <p>{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">First Name *</label>
            <input
              type="text"
              name="first_name"
              required
              className="form-input"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="John"
              disabled={isSubmitting}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Last Name *</label>
            <input
              type="text"
              name="last_name"
              required
              className="form-input"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Doe"
              disabled={isSubmitting}
            />
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label">Middle Name (Optional)</label>
          <input
            type="text"
            name="middle_name"
            className="form-input"
            value={formData.middle_name}
            onChange={handleChange}
            placeholder="Michael"
            disabled={isSubmitting}
          />
        </div>
        
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Date of Birth *</label>
            <input
              type="date"
              name="date_of_birth"
              required
              className="form-input"
              value={formData.date_of_birth}
              onChange={handleChange}
              max={new Date().toISOString().split('T')[0]}
              disabled={isSubmitting}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Gender *</label>
            <select
              name="gender"
              required
              className="form-input"
              value={formData.gender}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>
        </div>
        
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Registration Date *</label>
            <input
              type="date"
              name="registration_date"
              required
              className="form-input"
              value={formData.registration_date}
              onChange={handleChange}
              max={new Date().toISOString().split('T')[0]}
              disabled={isSubmitting}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Patient Number *</label>
            <input
              type="text"
              name="patient_number"
              required
              className="form-input"
              value={formData.patient_number}
              onChange={handleChange}
              placeholder="PAT001"
              disabled={isSubmitting}
            />
            <small style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              Unique identifier for the patient
            </small>
          </div>
        </div>
        
        <div className="button-group">
          <button
            type="button"
            onClick={handleCancel}
            className="btn btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Registering...' : 'Register Patient'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientRegistration;
