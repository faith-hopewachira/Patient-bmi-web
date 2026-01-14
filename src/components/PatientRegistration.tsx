import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientApi } from '../services/api';

/*
PatientRegistration Component

This is the entry point of the application where new patients are registered.
It collects basic patient information before proceeding to vitals measurement.

Key Changes:
1. Removed patient_number from form (will be auto-generated)
2. Updated validation to not require patient_number
3. Updated API call to not send patient_number

*/

const PatientRegistration: React.FC = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    first_name: '',           
    last_name: '',        
    middle_name: '', 
    date_of_birth: '',     
    gender: 'M',          
    registration_date: new Date().toISOString().split('T')[0], 
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPatientNumber, setGeneratedPatientNumber] = useState<string>('');

  /*
  Function: Handle form submission
  Purpose: Validate and submit patient data to API, then navigate to next step
  Steps:
  1. Validate all required fields are filled
  2. Prepare data for API submission (NO patient_number)
  3. Submit to patient creation endpoint
  4. Navigate to VitalsForm with patient data
  5. Handle errors with user-friendly messages
  */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.first_name || !formData.last_name || !formData.date_of_birth || 
        !formData.gender) {
      setError('Please fill in all required fields');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const patientData = {
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
            patient_id: response.data.patient_number,
            patient_number: response.data.patient_number,
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
          setError('Patient number already exists. Please try again.');
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

  /*
  Function: Generate a preview patient number (client-side)
  Purpose: Show user what format to expect
  */
  const generatePreviewNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    const randomNum = Math.floor(Math.random() * 1000);
    const previewNumber = `PAT-${timestamp}-${randomNum.toString().padStart(3, '0')}`;
    setGeneratedPatientNumber(previewNumber);
  };

  return (
    <div>
      <h1 className="form-title">Patient Registration</h1>
      
      {error && (
        <div className="alert-box alert-error">
          <p>{error}</p>
        </div>
      )}
      
      {generatedPatientNumber && (
        <div className="alert-box alert-info">
          <p><strong>Sample Patient Number:</strong> {generatedPatientNumber}</p>
          <p><small>Patient numbers are automatically generated upon successful registration.</small></p>
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
            <label className="form-label">Patient Number</label>
            <div className="patient-number-info">
              <div className="form-input readonly" style={{
                backgroundColor: '#f9fafb',
                color: '#6b7280',
                cursor: 'not-allowed'
              }}>
                Auto-generated upon registration
              </div>
              <button
                type="button"
                onClick={generatePreviewNumber}
                className="preview-btn"
                disabled={isSubmitting}
                style={{
                  marginTop: '5px',
                  padding: '3px 8px',
                  fontSize: '0.75rem',
                  backgroundColor: '#e5e7eb',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Preview Format
              </button>
              <small style={{ color: '#6b7280', fontSize: '0.875rem', display: 'block', marginTop: '5px' }}>
                Unique identifier will be automatically generated
              </small>
            </div>
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