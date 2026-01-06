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
  currently_using_drugs: string;
  comments: string;       
}

const GeneralAssessmentForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { patient, bmi, bmiStatus } = location.state || {};
  
  const [formData, setFormData] = useState<GeneralAssessmentData>({
    visit_date: new Date().toISOString().split('T')[0],
    general_health: '',
    currently_using_drugs: '',
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
    
    if (!formData.currently_using_drugs) {
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
        currently_using_drugs: formData.currently_using_drugs.trim(),
        comments: formData.comments ? formData.comments.trim() : '',
      };
      
      console.log('Submitting general assessment:', assessmentData);
      
      const response = await assessmentApi.createGeneralAssessment(assessmentData);
      console.log('General assessment saved:', response.data);
      
      navigate('/patient-listing');
      
    } catch (err: any) {
      console.error('Error saving assessment:', err);
      
      let errorMsg = 'Failed to save assessment';
      if (err.response?.data) {
        console.log('Error response data:', err.response.data);
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
        <p>This patient's BMI is {bmi.toFixed(1)} ({calculatedStatus}).</p>
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
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header Section */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          General Health Assessment
        </h1>
        <p style={{ color: '#6b7280' }}>
          Complete assessment for patients with normal or underweight BMI (BMI ≤ 25)
        </p>
      </div>
      
      {/* Patient Info Card */}
      <div style={{ 
        background: '#f8fafc',
        padding: '1.5rem',
        borderRadius: '12px',
        marginBottom: '2rem',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              {patient.first_name} {patient.last_name}
            </h2>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              <div>
                <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>BMI</span>
                <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                  {bmi.toFixed(1)} <span style={{ 
                    color: displayBmiStatus === 'Underweight' ? '#f59e0b' : 
                           displayBmiStatus === 'Normal' ? '#10b981' : '#6b7280',
                    fontSize: '0.875rem' 
                  }}>({displayBmiStatus})</span>
                </div>
              </div>
            </div>
          </div>
          <div style={{ 
            background: displayBmiStatus === 'Underweight' ? '#fef3c7' : '#d1fae5',
            padding: '0.5rem 1rem', 
            borderRadius: '20px',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: displayBmiStatus === 'Underweight' ? '#92400e' : '#065f46'
          }}>
            {displayBmiStatus} Assessment Required
          </div>
        </div>
        
        {existingDates.length > 0 && (
          <div style={{ 
            marginTop: '1rem',
            padding: '0.75rem',
            background: '#fef3c7',
            borderRadius: '8px',
            border: '1px solid #fbbf24'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#92400e' }}>📋</span>
              <span style={{ color: '#92400e', fontSize: '0.875rem' }}>
                This patient has {existingDates.length} previous general assessment(s)
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Error Message */}
      {error && (
        <div style={{ 
          background: '#fee2e2',
          color: '#991b1b',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          border: '1px solid #fca5a5',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '1.25rem' }}>⚠️</span>
          <div>
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}
      
      {/* Assessment Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ 
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '2rem',
          border: '1px solid #e5e7eb'
        }}>
          
          {/* Visit Date Section */}
          <div style={{ marginBottom: '2.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', fontSize: '1.125rem' }}>
              Visit Date *
            </label>
            <div style={{ maxWidth: '300px' }}>
              <input
                type="date"
                name="visit_date"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: existingDates.includes(formData.visit_date) ? '2px solid #dc2626' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  transition: 'border-color 0.2s',
                  backgroundColor: existingDates.includes(formData.visit_date) ? '#fef2f2' : 'white'
                }}
                value={formData.visit_date}
                onChange={handleChange}
                max={new Date().toISOString().split('T')[0]}
              />
              {existingDates.includes(formData.visit_date) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <span style={{ color: '#dc2626' }}>⚠️</span>
                  <span style={{ color: '#dc2626', fontSize: '0.875rem', fontWeight: '500' }}>
                    An assessment already exists for this date. Please select a different date.
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* General Health Assessment Section */}
          <div style={{ marginBottom: '2.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', fontSize: '1.125rem' }}>
              General Health Assessment *
            </label>
            
            <div style={{ 
              display: 'flex', 
              gap: '1rem',
              flexWrap: 'wrap' 
            }}>
              {/* Good Health Option */}
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                cursor: 'pointer',
                padding: '1rem',
                borderRadius: '8px',
                border: `2px solid ${formData.general_health === 'Good' ? '#10b981' : '#e5e7eb'}`,
                backgroundColor: formData.general_health === 'Good' ? '#f0fdf4' : 'white',
                transition: 'all 0.2s',
                flex: '1',
                minWidth: '200px'
              }}>
                <input
                  type="radio"
                  name="general_health"
                  value="Good"
                  required
                  checked={formData.general_health === 'Good'}
                  onChange={handleChange}
                  style={{ transform: 'scale(1.2)' }}
                />
                <div>
                  <div style={{ fontWeight: '600', fontSize: '1.125rem', marginBottom: '0.25rem' }}>Good</div>
                  <div style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
                    Patient reports good health
                  </div>
                </div>
              </label>
              
              {/* Poor Health Option */}
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                cursor: 'pointer',
                padding: '1rem',
                borderRadius: '8px',
                border: `2px solid ${formData.general_health === 'Poor' ? '#ef4444' : '#e5e7eb'}`,
                backgroundColor: formData.general_health === 'Poor' ? '#fef2f2' : 'white',
                transition: 'all 0.2s',
                flex: '1',
                minWidth: '200px'
              }}>
                <input
                  type="radio"
                  name="general_health"
                  value="Poor"
                  required
                  checked={formData.general_health === 'Poor'}
                  onChange={handleChange}
                  style={{ transform: 'scale(1.2)' }}
                />
                <div>
                  <div style={{ fontWeight: '600', fontSize: '1.125rem', marginBottom: '0.25rem' }}>Poor</div>
                  <div style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
                    Patient reports poor health
                  </div>
                </div>
              </label>
            </div>
          </div>
          
          {/* Currently Using Drugs Section */}
          <div style={{ marginBottom: '2.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', fontSize: '1.125rem' }}>
              Currently Using Drugs *
            </label>
            <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.95rem' }}>
              Is the patient currently using any drugs?
            </p>
            
            <div style={{ 
              display: 'flex', 
              gap: '1rem',
              flexWrap: 'wrap' 
            }}>
              {/* Yes Option */}
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                cursor: 'pointer',
                padding: '1rem',
                borderRadius: '8px',
                border: `2px solid ${formData.currently_using_drugs === 'Yes' ? '#ef4444' : '#e5e7eb'}`,
                backgroundColor: formData.currently_using_drugs === 'Yes' ? '#fef2f2' : 'white',
                transition: 'all 0.2s',
                flex: '1',
                minWidth: '200px'
              }}>
                <input
                  type="radio"
                  name="currently_using_drugs"
                  value="Yes"
                  required
                  checked={formData.currently_using_drugs === 'Yes'}
                  onChange={handleChange}
                  style={{ transform: 'scale(1.2)' }}
                />
                <div>
                  <div style={{ fontWeight: '600', fontSize: '1.125rem', marginBottom: '0.25rem' }}>Yes</div>
                  <div style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
                    Patient is currently using drugs
                  </div>
                </div>
              </label>
              
              {/* No Option */}
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                cursor: 'pointer',
                padding: '1rem',
                borderRadius: '8px',
                border: `2px solid ${formData.currently_using_drugs === 'No' ? '#10b981' : '#e5e7eb'}`,
                backgroundColor: formData.currently_using_drugs === 'No' ? '#f0fdf4' : 'white',
                transition: 'all 0.2s',
                flex: '1',
                minWidth: '200px'
              }}>
                <input
                  type="radio"
                  name="currently_using_drugs"
                  value="No"
                  required
                  checked={formData.currently_using_drugs === 'No'}
                  onChange={handleChange}
                  style={{ transform: 'scale(1.2)' }}
                />
                <div>
                  <div style={{ fontWeight: '600', fontSize: '1.125rem', marginBottom: '0.25rem' }}>No</div>
                  <div style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
                    Patient is not using drugs
                  </div>
                </div>
              </label>
            </div>
          </div>
          
          {/* Comments Section */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', fontSize: '1.125rem' }}>
              Additional Comments
            </label>
            <textarea
              name="comments"
              rows={4}
              style={{
                width: '100%',
                padding: '1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem',
                transition: 'border-color 0.2s',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
              value={formData.comments}
              onChange={handleChange}
              placeholder="Enter any additional observations, notes, or recommendations..."
            />
            <div style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Optional: Add any relevant notes about the patient's condition, lifestyle, or recommendations.
            </div>
          </div>
        </div>
        
        {/* Form Actions */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          gap: '1rem',
          padding: '1rem 0',
          borderTop: '1px solid #e5e7eb'
        }}>
          <button
            type="button"
            onClick={() => navigate('/patient-listing')}
            style={{
              padding: '0.875rem 1.75rem',
              background: 'white',
              color: '#4b5563',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '1rem',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            ← Back to Patient Listing
          </button>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="button"
              onClick={() => navigate('/patient-listing')}
              style={{
                padding: '0.875rem 1.75rem',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '1rem',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6b7280'}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting || existingDates.includes(formData.visit_date)}
              style={{
                padding: '0.875rem 2rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: (isSubmitting || existingDates.includes(formData.visit_date)) ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                fontSize: '1rem',
                transition: 'all 0.2s',
                opacity: (isSubmitting || existingDates.includes(formData.visit_date)) ? 0.7 : 1
              }}
              onMouseOver={(e) => {
                if (!isSubmitting && !existingDates.includes(formData.visit_date)) {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }
              }}
              onMouseOut={(e) => {
                if (!isSubmitting && !existingDates.includes(formData.visit_date)) {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                }
              }}
            >
              {isSubmitting ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    display: 'inline-block',
                    width: '1rem',
                    height: '1rem',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></span>
                  Saving...
                </span>
              ) : 'Save Assessment'}
            </button>
          </div>
        </div>
      </form>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        input:focus, textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        input[type="radio"]:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }
        
        @media (max-width: 768px) {
          .radio-option {
            min-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default GeneralAssessmentForm;