import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { assessmentApi } from '../services/api';

/*
OverweightAssessmentForm Component

This form is specifically for patients with BMI > 25 (overweight).
It collects additional health information relevant to overweight patients,
including diet history and general health assessment.

Key Features:
1. BMI-based access restriction (only BMI > 25 patients)
2. Duplicate date validation to prevent multiple assessments on same date
3. Collects diet history information specific to overweight patients
4. Navigates to PatientListing upon successful submission

Data Flow: VitalsForm (BMI > 25) → OverweightAssessmentForm → PatientListing
*/

interface OverweightAssessmentData {
  visit_date: string;
  general_health: string;  
  been_on_diet: string;    
  comments: string;        
}

const OverweightAssessmentForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { patient, bmi, bmiStatus } = location.state || {};
  
  const [formData, setFormData] = useState<OverweightAssessmentData>({
    visit_date: new Date().toISOString().split('T')[0],
    general_health: '',
    been_on_diet: '',
    comments: '',
  });
  
  const [existingDates, setExistingDates] = useState<string[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
  Effect: Fetch existing overweight assessment dates for the patient
  Purpose: Prevent duplicate assessments on the same date
  Trigger: Runs when patient data changes (on component mount)
  */
  useEffect(() => {
    const fetchExistingAssessments = async () => {
      if (!patient?.id) return;
      
      try {
        const response = await assessmentApi.getPatientOverweightAssessments(patient.id);
        console.log('Existing overweight assessments:', response.data);
        
        let assessmentsArray: any[] = [];
        
        if (Array.isArray(response.data)) {
          assessmentsArray = response.data;
        } else if (response.data?.results && Array.isArray(response.data.results)) {
          assessmentsArray = response.data.results;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          assessmentsArray = response.data.data;
        }
        
        const dates = assessmentsArray.map(assessment => {
          try {
            const date = new Date(assessment.visit_date);
            return date.toISOString().split('T')[0];
          } catch (e) {
            return assessment.visit_date;
          }
        }).filter(date => date);
        
        console.log('Existing overweight assessment dates:', dates);
        setExistingDates(dates);
      } catch (error) {
        console.log('No existing overweight assessments found');
        setExistingDates([]);
      }
    };
    
    fetchExistingAssessments();
  }, [patient]);

  /*
  Function: Handle form submission
  Purpose: Validate and submit overweight assessment data to API
  Steps:
    1. Validate patient data exists
    2. Validate all required fields are filled
    3. Check for duplicate assessment dates
    4. Submit data to API
    5. Navigate to PatientListing on success
    6. Handle errors with user-friendly messages
  */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!patient?.id) {
      setError('Patient data not found');
      return;
    }
    
    if (!formData.visit_date || !formData.general_health || !formData.been_on_diet) {
      setError('All fields are mandatory');
      return;
    }
    
    if (existingDates.includes(formData.visit_date)) {
      setError(`An overweight assessment already exists for ${formData.visit_date}. Please select a different date.`);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const assessmentData = {
        patient_id: patient.id,           
        visit_date: formData.visit_date,  
        general_health: formData.general_health, 
        been_on_diet: formData.been_on_diet,     
        comments: formData.comments || '',      
      };
      
      console.log('Submitting overweight assessment:', assessmentData);
      
      const response = await assessmentApi.createOverweightAssessment(assessmentData);
      console.log('Overweight assessment saved:', response.data);
      
      navigate('/patient-listing');
      
    } catch (err: any) {
      console.error('Error saving assessment:', err);
      
      setError(err.response?.data?.detail || 'Failed to save assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
  Function: Handle input changes
  Purpose: Update form state when user interacts with form elements
  Parameters: e - change event from input/textarea/select elements
  */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  /*
  Component: Missing Data State
  Purpose: Display when patient data is not found (user navigated directly)
  Action: Provides button to go to PatientListing
  */
  if (!patient || bmi === undefined) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <p>No patient data found. Please start with vitals.</p>
        <button 
          onClick={() => navigate('/patient-listing')}
          style={{
            padding: '0.5rem 1rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '1rem'
          }}
        >
          Go to Patient Listing
        </button>
      </div>
    );
  }

  /*
  Component: Access Control State
  Purpose: Restrict access to patients with BMI > 25 only
  Logic: This form should only be accessible for overweight patients
         If BMI ≤ 25, show access denied message
  */
  if (bmi <= 25) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Access Denied</h2>
        <p>Overweight Assessment Form is only available for patients with BMI &gt; 25.</p>
        <p>This patient's BMI is {bmi} ({bmiStatus}).</p>
        <button 
          onClick={() => navigate('/patient-listing')}
          style={{
            padding: '0.5rem 1rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '1rem'
          }}
        >
          Back to Patient Listing
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1rem' }}>
      <h1>Overweight Assessment</h1>
      
      <div style={{ 
        background: '#f8fafc',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1.5rem'
      }}>
        <p><strong>Patient:</strong> {patient.first_name} {patient.last_name}</p>
        <p><strong>Patient ID:</strong> {patient.patient_id}</p>
        <p><strong>BMI:</strong> {bmi} ({bmiStatus})</p>
        {existingDates.length > 0 && (
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            This patient has {existingDates.length} previous overweight assessment(s)
          </p>
        )}
      </div>
      
      {error && (
        <div style={{ 
          background: '#fee2e2',
          color: '#991b1b',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div style={{ 
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Visit Date *
            </label>
            <input
              type="date"
              name="visit_date"
              required
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: existingDates.includes(formData.visit_date) ? '2px solid #dc2626' : '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
              value={formData.visit_date}
              onChange={handleChange}
              max={new Date().toISOString().split('T')[0]}
            />
            {existingDates.includes(formData.visit_date) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                <span style={{ color: '#dc2626', fontSize: '0.75rem' }}>⚠️</span>
                <span style={{ color: '#dc2626', fontSize: '0.75rem' }}>
                  Date already has an overweight assessment
                </span>
              </div>
            )}
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              General Health *
            </label>
            <div style={{ display: 'flex', gap: '2rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  name="general_health"
                  value="Good"
                  required
                  checked={formData.general_health === 'Good'}
                  onChange={handleChange}
                />
                Good
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  name="general_health"
                  value="Poor"
                  required
                  checked={formData.general_health === 'Poor'}
                  onChange={handleChange}
                />
                Poor
              </label>
            </div>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Have you ever been on a diet to lose weight? *
            </label>
            <div style={{ display: 'flex', gap: '2rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  name="been_on_diet"
                  value="Yes"
                  required
                  checked={formData.been_on_diet === 'Yes'}
                  onChange={handleChange}
                />
                Yes
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  name="been_on_diet"
                  value="No"
                  required
                  checked={formData.been_on_diet === 'No'}
                  onChange={handleChange}
                />
                No
              </label>
            </div>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Comments
            </label>
            <textarea
              name="comments"
              rows={4}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
              value={formData.comments}
              onChange={handleChange}
              placeholder="Additional comments..."
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting || existingDates.includes(formData.visit_date)}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (isSubmitting || existingDates.includes(formData.visit_date)) ? 'not-allowed' : 'pointer',
              opacity: (isSubmitting || existingDates.includes(formData.visit_date)) ? 0.7 : 1
            }}
          >
            {isSubmitting ? 'Saving...' : 'Save & Go to Patient Listing'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OverweightAssessmentForm;
