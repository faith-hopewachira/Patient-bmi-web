import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { vitalsApi, patientApi } from '../services/api';

interface PatientData {
  id: string;
  patient_id: string;
  patient_number?: string;
  first_name: string;
  last_name: string;
}

interface VitalsRecord {
  id: string;
  patient_id: string;
  visit_date: string;
  height_cm: number;
  weight_kg: number;
  bmi: number | string;
  created_at: string;
}

const isValidUUID = (str: string): boolean => {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isFutureDate = (dateString: string): boolean => {
  const inputDate = new Date(dateString);
  const today = new Date();
  
  inputDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  return inputDate > today;
};

const VitalsForm: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { patient: locationPatient, redirectBack } = location.state || {};
  
  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [patientUUID, setPatientUUID] = useState<string>('');
  const [existingVitals, setExistingVitals] = useState<VitalsRecord[]>([]);
  const [existingDates, setExistingDates] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    visit_date: getTodayDate(),
    height_cm: '',
    weight_kg: '',
    bmi: 0,
  });
  
  const [errors, setErrors] = useState({
    patient: '',
    height_cm: '',
    weight_kg: '',
    visit_date: '',
  });

  useEffect(() => {
    const fetchRealPatientData = async () => {
      if (!locationPatient) {
        console.error('No patient data provided');
        navigate('/patient-listing');
        return;
      }
      
      try {
        setLoading(true);
        
        console.log('Location patient data:', locationPatient);
        
        if (locationPatient.id && isValidUUID(locationPatient.id)) {
          try {
            console.log('Fetching patient data from API with ID:', locationPatient.id);
            const response = await patientApi.getPatient(locationPatient.id);
            const apiPatient = response.data;
            
            console.log('API Patient data:', apiPatient);
            
            const fetchedPatient: PatientData = {
              id: apiPatient.id,
              patient_id: apiPatient.patient_id || '',
              patient_number: apiPatient.patient_number || '',
              first_name: apiPatient.first_name,
              last_name: apiPatient.last_name
            };
            
            console.log('Fetched patient:', fetchedPatient);
            
            setPatient(fetchedPatient);
            setPatientUUID(apiPatient.id);
            return;
            
          } catch (error) {
            console.log('Failed to fetch patient from API, using location data:', error);
          }
        }
        
        if (locationPatient && locationPatient.first_name) {
          console.log('Using location patient data as fallback');
          
          const patientFromLocation: PatientData = {
            id: locationPatient.id || '',
            patient_id: locationPatient.patient_id || '',
            patient_number: locationPatient.patient_number || locationPatient.patient_id || '',
            first_name: locationPatient.first_name,
            last_name: locationPatient.last_name
          };
          
          console.log('Patient from location:', patientFromLocation);
          
          setPatient(patientFromLocation);
          
          if (isValidUUID(locationPatient.id)) {
            setPatientUUID(locationPatient.id);
          }
        }
        
      } catch (error) {
        console.error('Error fetching patient data:', error);
        setErrors(prev => ({ ...prev, patient: 'Failed to load patient data' }));
      } finally {
        setLoading(false);
      }
    };
    
    fetchRealPatientData();
  }, [locationPatient, navigate]);

  useEffect(() => {
    const fetchVitals = async () => {
      if (!patientUUID || !isValidUUID(patientUUID)) {
        console.log('Cannot fetch vitals: no valid UUID');
        return;
      }
      
      try {
        console.log('Fetching existing vitals for patient:', patientUUID);
        
        const response = await vitalsApi.getVitals(patientUUID);
        console.log('Vitals API response:', response.data);
        
        const vitalsArray = response.data?.results || [];
        console.log('Vitals found:', vitalsArray.length);
        
        const parsedVitals = vitalsArray.map((v: any): VitalsRecord => ({
          id: v.id || '',
          patient_id: v.patient_id || v.patient || patientUUID,
          visit_date: v.visit_date || '',
          height_cm: parseFloat(v.height_cm) || 0,
          weight_kg: parseFloat(v.weight_kg) || 0,
          bmi: typeof v.bmi === 'number' ? v.bmi : parseFloat(v.bmi) || 0,
          created_at: v.created_at || ''
        }));
        
        setExistingVitals(parsedVitals);
        
        const dates = parsedVitals.map((v: VitalsRecord) => {
          if (v.visit_date) {
            return new Date(v.visit_date).toISOString().split('T')[0];
          }
          return '';
        }).filter(Boolean);
        
        setExistingDates(dates);
        
        console.log('Existing vitals dates:', dates);
        
      } catch (error) {
        console.error('Error fetching vitals:', error);
      }
    };
    
    if (patientUUID && isValidUUID(patientUUID)) {
      fetchVitals();
    }
  }, [patientUUID]);

  const validateForm = () => {
    const newErrors = {
      patient: '',
      height_cm: '',
      weight_kg: '',
      visit_date: '',
    };
    
    let isValid = true;
    
    if (!patientUUID || !isValidUUID(patientUUID)) {
      newErrors.patient = 'Valid patient UUID is required';
      isValid = false;
    }
    
    const height = parseFloat(formData.height_cm);
    if (!formData.height_cm || isNaN(height)) {
      newErrors.height_cm = 'Please enter a valid height';
      isValid = false;
    } else if (height < 50 || height > 300) {
      newErrors.height_cm = 'Height must be between 50cm and 300cm';
      isValid = false;
    }
    
    const weight = parseFloat(formData.weight_kg);
    if (!formData.weight_kg || isNaN(weight)) {
      newErrors.weight_kg = 'Please enter a valid weight';
      isValid = false;
    } else if (weight < 2 || weight > 500) {
      newErrors.weight_kg = 'Weight must be between 2kg and 500kg';
      isValid = false;
    }
    
    if (isFutureDate(formData.visit_date)) {
      newErrors.visit_date = 'Visit date cannot be in the future';
      isValid = false;
    }
    
    if (existingDates.includes(formData.visit_date)) {
      newErrors.visit_date = 'Vitals already recorded for this date';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const calculateBMI = (height: number, weight: number): number => {
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    return parseFloat(bmi.toFixed(1));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const updatedData = { ...prev, [name]: value };
      
      if (name === 'height_cm' || name === 'weight_kg') {
        const height = parseFloat(name === 'height_cm' ? value : prev.height_cm);
        const weight = parseFloat(name === 'weight_kg' ? value : prev.weight_kg);
        
        if (!isNaN(height) && !isNaN(weight) && height > 0 && weight > 0) {
          updatedData.bmi = calculateBMI(height, weight);
        } else {
          updatedData.bmi = 0;
        }
      }
      
      return updatedData;
    });
    
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      if (errors.patient) {
        alert(`Error: ${errors.patient}\n\nPlease go back and try again.`);
      }
      return;
    }
    
    try {
      setLoading(true);
      
      console.log('Submitting vitals for patient:', patientUUID);
      
      const submissionData = {
        patient_id: patientUUID,
        visit_date: formData.visit_date,
        height_cm: parseFloat(formData.height_cm),
        weight_kg: parseFloat(formData.weight_kg),
        bmi: formData.bmi,
      };
      
      console.log('Submission data:', submissionData);
      
      const response = await vitalsApi.createVitals(submissionData);
      console.log('Vitals saved successfully:', response.data);
      
      alert('Vitals saved successfully!');
      
      const calculatedBMI = calculateBMI(
        parseFloat(formData.height_cm),
        parseFloat(formData.weight_kg)
      );
      
      console.log(`Calculated BMI: ${calculatedBMI}`);
      
      if (calculatedBMI <= 25) {
        navigate('/general-assessment', { 
          state: { 
            patient: {
              id: patient?.id,
              patient_id: patient?.patient_id,
              patient_number: patient?.patient_number,
              first_name: patient?.first_name,
              last_name: patient?.last_name
            },
            bmi: calculatedBMI,
            bmiStatus: calculatedBMI <= 25 ? 'Normal/Underweight' : 'Overweight'
          } 
        });
      } else {
        navigate('/overweight-assessment', { 
          state: { 
            patient: {
              id: patient?.id,
              patient_id: patient?.patient_id,
              patient_number: patient?.patient_number,
              first_name: patient?.first_name,
              last_name: patient?.last_name
            },
            bmi: calculatedBMI,
            bmiStatus: calculatedBMI <= 25 ? 'Normal/Underweight' : 'Overweight'
          } 
        });
      }
      
    } catch (error: any) {
      console.error('Error saving vitals:', error);
      
      let errorMessage = 'Failed to save vitals. ';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (typeof errorData === 'object') {
          Object.keys(errorData).forEach(key => {
            if (Array.isArray(errorData[key])) {
              errorMessage += `${key}: ${errorData[key].join(', ')}. `;
            } else if (typeof errorData[key] === 'string') {
              errorMessage += `${key}: ${errorData[key]}. `;
            }
          });
        } else if (typeof errorData === 'string') {
          errorMessage += errorData;
        }
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (redirectBack && patient) {
      navigate(`/patient-details`, { state: { patient } });
    } else {
      navigate('/patient-listing');
    }
  };

  const formatBMI = (bmi: number | string): string => {
    if (typeof bmi === 'number') {
      return bmi.toFixed(1);
    }
    
    if (typeof bmi === 'string') {
      const num = parseFloat(bmi);
      if (!isNaN(num)) {
        return num.toFixed(1);
      }
    }
    
    return 'N/A';
  };

  const getBmiStatusColor = (bmi: number | string): { bg: string; text: string } => {
    const num = typeof bmi === 'number' ? bmi : parseFloat(bmi);
    
    if (isNaN(num)) return { bg: '#f3f4f6', text: '#6b7280' };
    if (num < 18.5) return { bg: '#fef3c7', text: '#92400e' };
    if (num < 25) return { bg: '#d1fae5', text: '#065f46' };
    return { bg: '#fee2e2', text: '#991b1b' };
  };

  if (loading && !patient) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <div style={{
          display: 'inline-block',
          width: '40px',
          height: '40px',
          border: '3px solid #3b82f6',
          borderTop: '3px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem'
        }}></div>
        <p>Loading patient data...</p>
        <button
          onClick={() => navigate('/patient-listing')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
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
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={handleCancel}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'transparent',
            color: '#6b7280',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1f2937' }}>
          Record Vitals
        </h1>
        
        {patient ? (
          <>
            <div style={{ 
              marginTop: '0.5rem',
              padding: '0.75rem',
              backgroundColor: '#f9fafb',
              borderRadius: '6px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '1rem'
                }}>
                  {patient.first_name?.charAt(0)}{patient.last_name?.charAt(0)}
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '1rem', color: '#1f2937', margin: 0 }}>
                    {patient.first_name} {patient.last_name}
                  </p>
                  <p style={{ 
                    fontSize: '0.875rem', 
                    color: '#6b7280', 
                    margin: '0.125rem 0 0 0',
                    fontWeight: 500 
                  }}>
                    {patient.patient_number 
                      ? `Patient #: ${patient.patient_number}`
                      : 'Patient #: Not Available'}
                  </p>
                </div>
              </div>
            </div>
            
            {errors.patient && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: '#fef2f2',
                color: '#991b1b',
                borderRadius: '6px',
                fontSize: '0.875rem',
                border: '1px solid #fecaca'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div style={{ 
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.75rem',
                    flexShrink: 0,
                    marginTop: '0.125rem'
                  }}>
                    ✗
                  </div>
                  <div>
                    <p style={{ fontWeight: 500, margin: 0 }}>Patient Lookup Error</p>
                    <p style={{ margin: '0.25rem 0 0 0' }}>{errors.patient}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ 
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            borderRadius: '6px',
            fontSize: '0.875rem',
            border: '1px solid #fecaca'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <div style={{ 
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.75rem',
                flexShrink: 0,
                marginTop: '0.125rem'
              }}>
                ✗
              </div>
              <div>
                <p style={{ fontWeight: 500, margin: 0 }}>Patient Data Unavailable</p>
                <p style={{ margin: '0.25rem 0 0 0' }}>
                  Please return to the patient listing and try again.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ 
          background: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Visit Date *
            </label>
            <input
              type="date"
              name="visit_date"
              value={formData.visit_date}
              onChange={handleInputChange}
              max={getTodayDate()}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${errors.visit_date ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            />
            {errors.visit_date && (
              <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {errors.visit_date}
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Height (cm) *
              </label>
              <input
                type="number"
                name="height_cm"
                value={formData.height_cm}
                onChange={handleInputChange}
                step="0.1"
                min="50"
                max="300"
                placeholder="Enter height in cm"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: `1px solid ${errors.height_cm ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              />
              {errors.height_cm && (
                <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  {errors.height_cm}
                </p>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Weight (kg) *
              </label>
              <input
                type="number"
                name="weight_kg"
                value={formData.weight_kg}
                onChange={handleInputChange}
                step="0.1"
                min="2"
                max="500"
                placeholder="Enter weight in kg"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: `1px solid ${errors.weight_kg ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              />
              {errors.weight_kg && (
                <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  {errors.weight_kg}
                </p>
              )}
            </div>
          </div>

          {formData.bmi > 0 && (
            <div style={{ 
              marginTop: '1.5rem',
              padding: '1rem',
              background: '#f9fafb',
              borderRadius: '6px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    Calculated BMI
                  </p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937' }}>
                    {formData.bmi.toFixed(1)}
                  </p>
                </div>
                <div style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: formData.bmi < 18.5 ? '#fef3c7' : 
                                 formData.bmi < 25 ? '#d1fae5' : '#fee2e2',
                  color: formData.bmi < 18.5 ? '#92400e' : 
                        formData.bmi < 25 ? '#065f46' : '#991b1b',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  border: `1px solid ${
                    formData.bmi < 18.5 ? '#fde68a' : 
                    formData.bmi < 25 ? '#a7f3d0' : '#fecaca'
                  }`
                }}>
                  {formData.bmi < 18.5 ? 'Underweight' : 
                   formData.bmi < 25 ? 'Normal' : 'Overweight'}
                </div>
              </div>
              <div style={{ 
                marginTop: '1rem', 
                padding: '0.75rem', 
                background: '#eff6ff', 
                borderRadius: '4px',
                border: '1px solid #dbeafe'
              }}>
                <p style={{ fontSize: '0.75rem', color: '#1e40af', margin: 0, fontWeight: 500 }}>
                  Next Step After Saving:
                </p>
                <ul style={{ fontSize: '0.75rem', color: '#1e40af', margin: '0.25rem 0 0 1rem', padding: 0 }}>
                  {formData.bmi <= 25 ? (
                    <li>📋 <strong>General Assessment Form</strong> (BMI ≤ 25)</li>
                  ) : (
                    <li>⚖️ <strong>Overweight Assessment Form</strong> (BMI &gt; 25)</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !patientUUID || !isValidUUID(patientUUID)}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: loading || !patientUUID || !isValidUUID(patientUUID) ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading || !patientUUID || !isValidUUID(patientUUID) ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!loading && patientUUID && isValidUUID(patientUUID)) {
                  e.currentTarget.style.backgroundColor = '#059669';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && patientUUID && isValidUUID(patientUUID)) {
                  e.currentTarget.style.backgroundColor = '#10b981';
                }
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid white',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Saving...
                </div>
              ) : (
                'Save Vitals & Continue'
              )}
            </button>
          </div>
        </div>
      </form>

      {existingVitals.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937' }}>
            Previous Vitals Records
          </h3>
          <div style={{ 
            background: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th style={{ 
                      padding: '1rem', 
                      textAlign: 'left', 
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      Date
                    </th>
                    <th style={{ 
                      padding: '1rem', 
                      textAlign: 'left', 
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      Height (cm)
                    </th>
                    <th style={{ 
                      padding: '1rem', 
                      textAlign: 'left', 
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      Weight (kg)
                    </th>
                    <th style={{ 
                      padding: '1rem', 
                      textAlign: 'left', 
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      BMI
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {existingVitals.slice(0, 5).map((vitals, index) => {
                    const colors = getBmiStatusColor(vitals.bmi);
                    return (
                      <tr key={vitals.id} style={{ 
                        borderBottom: index === Math.min(4, existingVitals.length - 1) ? 'none' : '1px solid #f3f4f6',
                        backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb'
                      }}>
                        <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                          {vitals.visit_date ? new Date(vitals.visit_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{vitals.height_cm}</td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{vitals.weight_kg}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: colors.bg,
                            color: colors.text,
                            border: `1px solid ${colors.text}20`
                          }}>
                            {formatBMI(vitals.bmi)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {existingVitals.length > 5 && (
              <div style={{ 
                padding: '1rem', 
                textAlign: 'center', 
                color: '#6b7280', 
                fontSize: '0.875rem',
                borderTop: '1px solid #f3f4f6',
                backgroundColor: '#f9fafb'
              }}>
                Showing 5 of {existingVitals.length} records
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default VitalsForm;