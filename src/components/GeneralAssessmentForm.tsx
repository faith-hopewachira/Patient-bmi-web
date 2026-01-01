import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { assessmentApi } from '../services/api';


/*
The general assessing form is for assessing patients with normal or underweight BMI (BMI ≤ 25) with health and drug use questions.

Eligibility Check:
   - Only accessible for patients with BMI ≤ 25
   - Blocks overweight patients (redirects them)

Health Assessment:
   - General health status (Good/Poor)
   - Current drug usage status
   - Comments field

Duplicate Prevention:
   - Checks existing assessment dates
   - Prevents multiple assessments on same date

BMI Status Calculation:
   - Dynamically calculates BMI category
   - Displays appropriate status (Underweight/Normal)

KEY FLOW:
1. Receives patient data and BMI from vitals form
2. Calculates BMI status (Underweight/Normal)
3. Fetches existing assessment dates
4. Validates form inputs
5. Submits assessment to API
6. Returns to patient details page

*/

interface GeneralAssessmentData {
  visit_date: string;
  general_health: string;  
  using_drugs: string;     
  comments: string;       
}

const GeneralAssessmentForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { patient, bmi, bmiStatus } = location.state || {};
  
  const [formData, setFormData] = useState<GeneralAssessmentData>({
    visit_date: new Date().toISOString().split('T')[0],
    general_health: '',
    using_drugs: '',
    comments: '',
  });
  
  const [existingDates, setExistingDates] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getBmiStatusText = (bmiValue: number): string => {
    if (bmiValue < 18.5) return 'Underweight';
    if (bmiValue < 25) return 'Normal';
    return 'Overweight';
  };

  const displayBmiStatus = bmi !== undefined ? getBmiStatusText(bmi) : bmiStatus;

  useEffect(() => {
    const fetchExistingAssessments = async () => {
      if (!patient?.id) return;
      
      try {
        const response = await assessmentApi.getPatientGeneralAssessments(patient.id);
        console.log('Existing general assessments:', response.data);
        
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
        
        console.log('Existing general assessment dates:', dates);
        setExistingDates(dates);
      } catch (error) {
        console.log('No existing general assessments found');
        setExistingDates([]);
      }
    };
    
    fetchExistingAssessments();
  }, [patient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    console.log('Form data before submission:', formData);
    
    if (!patient?.id) {
      setError('Patient data not found');
      return;
    }
    
    if (!formData.visit_date) {
      setError('Visit date is required');
      return;
    }
    
    if (!formData.general_health) {
      setError('General health assessment is required');
      return;
    }
    
    if (!formData.using_drugs) {
      setError('Please specify if the patient is using any drugs');
      return;
    }
    
    if (existingDates.includes(formData.visit_date)) {
      setError(`A general assessment already exists for ${formData.visit_date}. Please select a different date.`);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const assessmentData = {
        patient_id: patient.id,          
        visit_date: formData.visit_date,
        general_health: formData.general_health.trim(),
        using_drugs: formData.using_drugs.trim(),
        comments: formData.comments ? formData.comments.trim() : '',
      };
      
      console.log('Submitting general assessment:', assessmentData);
      
      const response = await assessmentApi.createGeneralAssessment(assessmentData);
      console.log('General assessment saved:', response.data);
      
      navigate('/patient-details', { 
        state: { 
          patient: patient,
          forceRefresh: true 
        } 
      });
      
    } catch (err: any) {
      console.error('Error saving assessment:', err);
      
      let errorMsg = 'Failed to save assessment';
      if (err.response?.data) {
        if (typeof err.response.data === 'object') {
          errorMsg = Object.entries(err.response.data)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join('. ');
        } else {
          errorMsg = err.response.data;
        }
      }
      
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

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

  const calculatedStatus = getBmiStatusText(bmi);
  if (calculatedStatus === 'Overweight') {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Access Denied</h2>
        <p>General Assessment Form is only available for patients with BMI ≤ 25.</p>
        <p>This patient's BMI is {bmi} ({calculatedStatus}).</p>
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
      <h1>General Health Assessment</h1>
      
      <div style={{ 
        background: '#f8fafc',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1.5rem'
      }}>
        <p><strong>Patient:</strong> {patient.first_name} {patient.last_name}</p>
        <p><strong>BMI:</strong> {bmi} ({displayBmiStatus})</p>
        {existingDates.length > 0 && (
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            This patient has {existingDates.length} previous general assessment(s)
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
          <strong>Error:</strong> {error}
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
                  Date already has a general assessment
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
              Are you currently using any drugs? *
            </label>
            <div style={{ display: 'flex', gap: '2rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  name="using_drugs"
                  value="Yes"
                  required
                  checked={formData.using_drugs === 'Yes'}
                  onChange={handleChange}
                />
                Yes
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  name="using_drugs"
                  value="No"
                  required
                  checked={formData.using_drugs === 'No'}
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
            onClick={() => navigate('/patient-listing')}
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
            {isSubmitting ? 'Saving...' : 'Save Assessment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GeneralAssessmentForm;