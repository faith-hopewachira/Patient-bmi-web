import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { vitalsApi } from '../services/api';

/*
VitalsForm Component

This component handles the collection of patient vital signs (height and weight),
calculates BMI automatically, and determines the next assessment type based on BMI.

Key Features:
1. Fetches existing vitals for the patient to prevent duplicate entries
2. Real-time BMI calculation as height/weight are entered
3. Validates input data and prevents duplicate dates
4. Navigates to appropriate assessment form based on BMI criteria

BMI Logic:
- Underweight: BMI < 18.5 → General Assessment
- Normal: 18.5 ≤ BMI < 25 → General Assessment  
- Overweight: BMI ≥ 25 → Overweight Assessment

*/

interface PatientData {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  age?: number;
}

interface VitalsFormData {
  visit_date: string;
  height_cm: string;
  weight_kg: string;
}

interface ExistingVital {
  id: string;
  patient_id: string;
  visit_date: string;
  height_cm: number;
  weight_kg: number;
  bmi: number;
  created_at: string;
}

const VitalsForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const patient = location.state?.patient as PatientData | undefined;
  
  console.log('VitalsForm - Patient from location state:', patient);
  
  const [formData, setFormData] = useState<VitalsFormData>({
    visit_date: new Date().toISOString().split('T')[0],
    height_cm: '',
    weight_kg: '',
  });
  
  const [bmi, setBmi] = useState<number | null>(null);
  const [bmiStatus, setBmiStatus] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [existingDates, setExistingDates] = useState<string[]>([]);

  /*
  Effect: Fetch existing vitals for the patient
  Purpose: Retrieve all previous vitals records to check for duplicate visit dates
  Trigger: Runs when patient data changes
  */
  useEffect(() => {
    const fetchExistingVitals = async () => {
      if (!patient?.id) {
        console.log('No patient ID available for fetching vitals');
        return;
      }
      
      console.log('Fetching vitals for patient ID:', patient.id);
      
      try {
        const response = await vitalsApi.getVitals(patient.id);
        console.log('Vitals API response:', response.data);
        
        if (response.data) {
          let vitalsArray: ExistingVital[] = [];
          
          if (Array.isArray(response.data)) {
            vitalsArray = response.data;
          } else if (response.data.results && Array.isArray(response.data.results)) {
            vitalsArray = response.data.results;
          } else if (response.data.data && Array.isArray(response.data.data)) {
            vitalsArray = response.data.data;
          }
          
          console.log('Parsed vitals array:', vitalsArray);
          
          const dates = vitalsArray.map((vital: ExistingVital) => {
            try {
              const date = new Date(vital.visit_date);
              return date.toISOString().split('T')[0];
            } catch (e) {
              return vital.visit_date;
            }
          });
          
          console.log('Existing dates:', dates);
          setExistingDates(dates);
        }
      } catch (error: any) {
        console.log('No existing vitals found or error fetching:', error?.response?.data || error.message);
        setExistingDates([]);
      }
    };

    fetchExistingVitals();
  }, [patient]);

  /*
  Function: Calculate BMI from height and weight
  Purpose: Computes BMI and determines status category
  Logic: BMI = weight(kg) / (height(m)²)
  Criteria: 
    - Underweight: BMI < 18.5
    - Normal: 18.5 ≤ BMI < 25
    - Overweight: BMI ≥ 25
  */
  const calculateBMI = useCallback((heightCm: number, weightKg: number) => {
    const heightM = heightCm / 100;
    const bmiValue = weightKg / (heightM * heightM);
    const roundedBMI = parseFloat(bmiValue.toFixed(1));
    
    let status = '';
    
    if (roundedBMI < 18.5) {
      status = 'Underweight';
    } else if (roundedBMI < 25) {
      status = 'Normal';
    } else {
      status = 'Overweight';
    }
    
    return { bmi: roundedBMI, status };
  }, []);

  /*
  Effect: Recalculate BMI when height or weight changes
  Purpose: Provides real-time BMI feedback to user
  Trigger: Runs whenever height_cm or weight_kg form fields change
  */
  useEffect(() => {
    const heightNum = parseFloat(formData.height_cm);
    const weightNum = parseFloat(formData.weight_kg);
    
    if (heightNum && weightNum && heightNum > 0 && weightNum > 0) {
      const { bmi: calculatedBMI, status } = calculateBMI(heightNum, weightNum);
      setBmi(calculatedBMI);
      setBmiStatus(status);
    } else {
      setBmi(null);
      setBmiStatus('');
    }
  }, [formData.height_cm, formData.weight_kg, calculateBMI]);

  /*
  Function: Handle Cancel button click
  Purpose: Navigate back to patient search or previous page
  Logic: If patient data exists, go to patient search with patient data
         Otherwise, go back one step in history
  */
  const handleCancel = () => {
    if (patient) {
      navigate('/patient-search', { 
        state: { 
          patient
        } 
      });
    } else {
      navigate(-1);
    }
  };

  /*
  Function: Handle form submission
  Purpose: Validate data, save vitals to API, navigate to next assessment
  Steps:
  1. Validate required fields and data format
  2. Check for duplicate visit dates
  3. Calculate final BMI
  4. Submit to API
  5. Navigate based on BMI result
  */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!patient) {
      setError('No patient data found. Please register the patient first.');
      return;
    }
    
    if (!patient.id) {
      setError('Invalid patient data. Patient ID is missing.');
      return;
    }
    
    if (!formData.visit_date || !formData.height_cm || !formData.weight_kg) {
      setError('All fields are mandatory.');
      return;
    }
    
    const heightNum = parseFloat(formData.height_cm);
    const weightNum = parseFloat(formData.weight_kg);
    
    if (isNaN(heightNum) || isNaN(weightNum) || heightNum <= 0 || weightNum <= 0) {
      setError('Height and weight must be valid numbers greater than zero.');
      return;
    }
    
    const normalizedDate = formData.visit_date.trim();
    const dateExists = existingDates.some(existingDate => {
      const existingNormalized = existingDate.trim();
      return existingNormalized === normalizedDate;
    });
    
    if (dateExists) {
      setError(`A vitals entry already exists for ${formData.visit_date}. Please select a different date.`);
      return;
    }
    
    const { bmi: calculatedBMI, status } = calculateBMI(heightNum, weightNum);
    
    setIsSubmitting(true);
    
    try {
      const vitalsData = {
        patient_id: patient.id,
        visit_date: formData.visit_date,
        height_cm: heightNum,
        weight_kg: weightNum,
        bmi: calculatedBMI,
      };
      
      console.log('Submitting vitals data:', vitalsData);
      
      const response = await vitalsApi.createVitals(vitalsData);
      
      console.log('Vitals saved successfully:', response.data);
     
      const nextRoute = calculatedBMI <= 25 ? '/general-assessment' : '/overweight-assessment';
      
      navigate(nextRoute, { 
        state: { 
          patient, 
          bmi: calculatedBMI,
          bmiStatus: status,
          vitalsData: {
            ...formData,
            height_cm: heightNum.toString(),
            weight_kg: weightNum.toString()
          },
          vitalsId: response.data?.id || response.data?.data?.id
        } 
      });
    } catch (err: any) {
      console.error('Error saving vitals:', err);
      console.error('Error response data:', err.response?.data);
      
      let errorMessage = 'Failed to save vitals. Please try again.';
      
      if (err.response?.data) {
        const data = err.response.data;
        
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (typeof data === 'object') {
          const errors: string[] = [];
          
          for (const [field, messages] of Object.entries(data)) {
            if (Array.isArray(messages)) {
              errors.push(`${field}: ${messages.join(', ')}`);
            } else if (typeof messages === 'string') {
              errors.push(`${field}: ${messages}`);
            }
          }
          
          if (errors.length > 0) {
            errorMessage = errors.join('. ');
          }
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
  Function: Handle input changes
  Purpose: Update form state and clear any existing errors
  */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    if (error) setError(null);
  };

  /*
  Function: Format patient name for display
  Purpose: Safely display patient name or fallback message
  */
  const getPatientName = () => {
    if (!patient) return 'No Patient Selected';
    return `${patient.first_name} ${patient.last_name}`.trim();
  };

  /*
  Function: Get BMI status background color
  Purpose: Visual feedback based on BMI category
  Returns: Background color based on BMI value
  */
  const getStatusColor = () => {
    if (!bmi) return '#e5e7eb';
    if (bmi < 18.5) return '#fef3c7';
    if (bmi < 25) return '#d1fae5'; 
    return '#fee2e2'; 
  };

  /*
  Function: Get BMI status text color
  Purpose: Contrast text color for BMI display
  Returns: Text color based on BMI value
  */
  const getStatusTextColor = () => {
    if (!bmi) return '#374151';
    if (bmi < 18.5) return '#92400e';
    if (bmi < 25) return '#065f46';
    return '#991b1b';
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1rem' }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <h1 style={{ 
          fontSize: '1.875rem', 
          fontWeight: 700, 
          color: '#1f2937',
          margin: 0 
        }}>
          Patient Vitals
        </h1>
      </div>
      
      <div style={{ 
        background: '#f8fafc',
        padding: '1.5rem',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        marginBottom: '2rem'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>
            {getPatientName()}
          </h2>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
            {patient?.patient_id && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ fontWeight: 500 }}>Patient ID:</span> {patient.patient_id}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem',
          color: '#991b1b'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div style={{ fontSize: '1.25rem' }}>⚠️</div>
            <div>
              <p style={{ margin: 0, fontWeight: 500 }}>{error}</p>
            </div>
          </div>
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
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem', color: '#374151' }}>
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
                fontSize: '1rem',
                backgroundColor: isSubmitting || !patient ? '#f3f4f6' : 'white',
                outline: 'none'
              }}
              value={formData.visit_date}
              onChange={handleChange}
              max={new Date().toISOString().split('T')[0]}
              disabled={!patient || isSubmitting}
            />
            {existingDates.includes(formData.visit_date) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                <span style={{ color: '#dc2626', fontSize: '0.75rem' }}>⚠️</span>
                <span style={{ color: '#dc2626', fontSize: '0.75rem' }}>
                  Date already has vitals record
                </span>
              </div>
            )}
          </div>

          {/* Height and Weight Inputs in Grid Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem', color: '#374151' }}>
                Height (cm) *
              </label>
              <input
                type="number"
                name="height_cm"
                required
                min="1"
                step="0.1"
                placeholder="e.g., 170.5"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  backgroundColor: isSubmitting || !patient ? '#f3f4f6' : 'white',
                  outline: 'none'
                }}
                value={formData.height_cm}
                onChange={handleChange}
                disabled={isSubmitting || !patient}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem', color: '#374151' }}>
                Weight (kg) *
              </label>
              <input
                type="number"
                name="weight_kg"
                required
                min="1"
                step="0.1"
                placeholder="e.g., 70.2"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  backgroundColor: isSubmitting || !patient ? '#f3f4f6' : 'white',
                  outline: 'none'
                }}
                value={formData.weight_kg}
                onChange={handleChange}
                disabled={isSubmitting || !patient}
              />
            </div>
          </div>

          {/* BMI Display - Only shown when BMI is calculated */}
          {bmi && (
            <div style={{ 
              backgroundColor: getStatusColor(),
              padding: '1.5rem',
              borderRadius: '8px',
              border: `2px solid ${getStatusTextColor()}`,
              marginBottom: '1.5rem',
              color: getStatusTextColor()
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 500, margin: 0, opacity: 0.9 }}>
                    AUTO-CALCULATED BMI
                  </h3>
                  <p style={{ fontSize: '2.5rem', fontWeight: 700, margin: '0.5rem 0' }}>
                    {bmi.toFixed(1)}
                  </p>
                  <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                    BMI = {formData.weight_kg}kg ÷ ({parseFloat(formData.height_cm)/100}m)²
                  </p>
                </div>
                <div style={{ 
                  backgroundColor: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '9999px',
                  fontWeight: 600,
                  fontSize: '0.875rem'
                }}>
                  {bmiStatus.toUpperCase()}
                </div>
              </div>
              
              {/* Next Step Information */}
              <div style={{ 
                padding: '1rem',
                backgroundColor: 'white',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: '#1f2937'
              }}>
                <p style={{ margin: 0, fontWeight: 600 }}>
                  Next Step After Saving:
                </p>
                <p style={{ margin: '0.25rem 0 0 0' }}>
                  {bmi <= 25 
                    ? '✓ BMI ≤ 25 → Will load General Assessment Form'
                    : '✓ BMI > 25 → Will load Overweight Assessment Form'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Form Action Buttons */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {/* Cancel Button */}
          <button
            type="button"
            onClick={handleCancel}
            style={{ 
              padding: '0.75rem 1.5rem',
              borderRadius: '0.375rem',
              backgroundColor: 'white',
              color: '#4b5563',
              fontWeight: 500,
              fontSize: '1rem',
              border: '1px solid #d1d5db',
              cursor: 'pointer',
              minWidth: '140px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              transition: 'all 0.2s ease'
            }}
            disabled={isSubmitting}
            onMouseOver={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.borderColor = '#9ca3af';
              }
            }}
            onMouseOut={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#d1d5db';
              }
            }}
          >
            Cancel
          </button>
          
          {/* Save & Continue Button */}
          <button
            type="submit"
            style={{ 
              padding: '0.75rem 1.5rem',
              borderRadius: '0.375rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              fontWeight: 500,
              fontSize: '1rem',
              border: 'none',
              cursor: (!formData.visit_date || !formData.height_cm || !formData.weight_kg || isSubmitting || !patient) ? 'not-allowed' : 'pointer',
              opacity: (!formData.visit_date || !formData.height_cm || !formData.weight_kg || isSubmitting || !patient) ? 0.5 : 1,
              minWidth: '140px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              transition: 'all 0.2s ease'
            }}
            disabled={!formData.visit_date || !formData.height_cm || !formData.weight_kg || isSubmitting || !patient}
            onMouseOver={(e) => {
              if (!(!formData.visit_date || !formData.height_cm || !formData.weight_kg || isSubmitting || !patient)) {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseOut={(e) => {
              if (!(!formData.visit_date || !formData.height_cm || !formData.weight_kg || isSubmitting || !patient)) {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }
            }}
          >
            {isSubmitting ? (
              <>
                <span style={{
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginRight: '0.5rem'
                }}></span>
                Saving...
              </>
            ) : 'Save & Continue'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VitalsForm;
