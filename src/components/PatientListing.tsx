import React, { useState, useEffect, useCallback } from 'react';
import { patientApi, assessmentApi, vitalsApi } from '../services/api';

/*
PatientListing Component

This is the central dashboard that displays all registered patients
with their latest vitals (BMI), assessment status, and visit history.

Key Features:
1. Fetches and displays all patients from the database
2. Aggregates data from multiple sources (patients, vitals, assessments)
3. Provides real-time BMI status with color coding
4. Filtering capability by visit date
5. Auto-refresh and data statistics

*/

interface Patient {
  id: string;
  patient_id: string; 
  first_name: string;
  last_name: string;
  date_of_birth: string;
  last_bmi?: number;
  last_bmi_status?: string;
  last_assessment_date?: string;
  last_assessment_type?: string;
  last_vitals_date?: string;
  age?: number;
  created_at?: string;
}

interface Vitals {
  id: string;
  patient_id: string;
  visit_date: string;
  height_cm: number;
  weight_kg: number;
  bmi: number | string;
  created_at: string;
}

interface Assessment {
  id: string;
  patient_id: string;
  visit_date?: string;
  created_at?: string;
  general_health?: string;
  currently_using_drugs?: string;
  diet_history?: string;
  comments?: string;
  type?: string;
}

const PatientListing: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null); 
  const [filterDate, setFilterDate] = useState<string>('');       

  /*
  Function: Calculate age from date of birth
  Purpose: Convert date of birth to current age for display
  Parameters: dateOfBirth - string in YYYY-MM-DD format
  Returns: Calculated age in years (0 if invalid)
  */
  const calculateAge = useCallback((dateOfBirth: string): number => {
    if (!dateOfBirth) return 0;
    
    try {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      
      if (isNaN(birthDate.getTime())) return 0;
      
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch (e) {
      console.error('Error calculating age:', e);
      return 0;
    }
  }, []);

  /*
  Function: Get BMI status category
  Purpose: Categorize BMI value according to VitalsForm criteria
  Criteria:
    - Underweight: BMI < 18.5
    - Normal: 18.5 ≤ BMI < 25
    - Overweight: BMI ≥ 25
  Parameters: bmi - numeric BMI value
  Returns: Status string or 'No Data' for invalid values
  */
  const getBmiStatus = useCallback((bmi: number | undefined): string => {
    if (!bmi || isNaN(bmi)) return 'No Data';
    
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    return 'Overweight';
  }, []);

  /*
  Function: Format date for display
  Purpose: Convert ISO date string to readable format (DD Mon YYYY)
  Parameters: dateString - ISO date string
  Returns: Formatted date string or 'No Data' for invalid dates
  */
  const formatDate = useCallback((dateString: string | undefined): string => {
    if (!dateString || dateString === 'No Data') return 'No Data';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      const day = date.getDate().toString().padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      
      return `${day} ${month} ${year}`;
    } catch (e) {
      return dateString || 'No Data';
    }
  }, []);

  /*
  Function: Safe date conversion
  Purpose: Convert date string to timestamp for sorting, handling invalid dates
  Parameters: dateString - date string (optional)
  Returns: Timestamp (number) or 0 for invalid dates
  */
  const getDateValue = useCallback((dateString?: string): number => {
    if (!dateString) return 0;
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? 0 : date.getTime();
    } catch (e) {
      return 0;
    }
  }, []);

  /*
  Function: Parse BMI value safely
  Purpose: Handle BMI values that may be strings or numbers from API
  Parameters: bmi - any BMI value (string, number, null, undefined)
  Returns: Parsed number or undefined for invalid values
  */
  const parseBmiValue = useCallback((bmi: any): number | undefined => {
    if (bmi === null || bmi === undefined) return undefined;
    
    try {
      const num = typeof bmi === 'string' ? parseFloat(bmi) : Number(bmi);
      
      if (isNaN(num) || !isFinite(num)) {
        return undefined;
      }
      
      return parseFloat(num.toFixed(1));
    } catch (e) {
      console.error('Error parsing BMI:', e, 'BMI value:', bmi);
      return undefined;
    }
  }, []);

  /*
  Function: Fetch vitals for specific patient
  Purpose: Retrieve most recent vitals record for a patient
  Process: 
    1. Call vitals API with patient ID
    2. Handle different API response structures
    3. Sort by most recent date
    4. Return most recent vitals or null
  */
  const fetchPatientVitals = useCallback(async (patientId: string) => {
    try {
      console.log(`Fetching vitals for patient ${patientId}...`);
      
      const response = await vitalsApi.getVitals(patientId);
      console.log('Vitals response data:', response.data);
      
      let vitalsArray: Vitals[] = [];
      
      if (Array.isArray(response.data)) {
        vitalsArray = response.data;
      } else if (response.data.results && Array.isArray(response.data.results)) {
        vitalsArray = response.data.results;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        vitalsArray = response.data.data;
      }
      
      console.log(`Found ${vitalsArray.length} vitals records`);
      
      if (vitalsArray.length === 0) return null;
      
      const sortedVitals = vitalsArray.sort((a, b) => {
        const dateA = getDateValue(a.visit_date || a.created_at);
        const dateB = getDateValue(b.visit_date || b.created_at);
        return dateB - dateA;
      });
      
      return sortedVitals[0];
      
    } catch (error) {
      console.log(`No vitals found for patient ${patientId}:`, error);
      return null;
    }
  }, [getDateValue]);

  /*
  Function: Fetch assessments for specific patient
  Purpose: Retrieve most recent assessment (general or overweight) for a patient
  Process:
    1. Fetch both assessment types in parallel using Promise.allSettled
    2. Combine and sort all assessments
    3. Return most recent assessment or null
  */
  const fetchPatientAssessments = useCallback(async (patientId: string) => {
    try {
      console.log(`Fetching assessments for patient ${patientId}...`);
      
      const [overweightResponse, generalResponse] = await Promise.allSettled([
        assessmentApi.getPatientOverweightAssessments(patientId),
        assessmentApi.getPatientGeneralAssessments(patientId)
      ]);

      const assessments: Assessment[] = [];

      if (overweightResponse.status === 'fulfilled' && overweightResponse.value.data) {
        let overweightAssessments: any[] = [];
        const responseData = overweightResponse.value.data;
        
        if (Array.isArray(responseData)) {
          overweightAssessments = responseData;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          overweightAssessments = responseData.results;
        } else if (responseData.data && Array.isArray(responseData.data)) {
          overweightAssessments = responseData.data;
        }
        
        overweightAssessments.forEach((assessment: any) => {
          assessments.push({
            ...assessment,
            type: 'overweight',
            visit_date: assessment.visit_date || assessment.created_at
          });
        });
      }

      if (generalResponse.status === 'fulfilled' && generalResponse.value.data) {
        let generalAssessments: any[] = [];
        const responseData = generalResponse.value.data;
        
        if (Array.isArray(responseData)) {
          generalAssessments = responseData;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          generalAssessments = responseData.results;
        } else if (responseData.data && Array.isArray(responseData.data)) {
          generalAssessments = responseData.data;
        }
        
        generalAssessments.forEach((assessment: any) => {
          assessments.push({
            ...assessment,
            type: 'general',
            visit_date: assessment.visit_date || assessment.created_at
          });
        });
      }

      console.log(`Found ${assessments.length} assessments`);
      
      if (assessments.length === 0) return null;
      
      const sortedAssessments = assessments.sort((a, b) => {
        const dateA = getDateValue(a.visit_date || a.created_at);
        const dateB = getDateValue(b.visit_date || b.created_at);
        return dateB - dateA;
      });
      
      return sortedAssessments[0];

    } catch (error) {
      console.log(`No assessments found for patient ${patientId}:`, error);
      return null;
    }
  }, [getDateValue]);

  /*
  Function: Process individual patient data
  Purpose: Combine patient data with their latest vitals and assessments
  Process:
    1. Extract basic patient info
    2. Fetch vitals and assessments in parallel
    3. Calculate derived fields (age, BMI status)
    4. Return complete patient object for display
  */
  const processPatientData = useCallback(async (patientData: any): Promise<Patient> => {
    console.log('Processing patient:', patientData.first_name, patientData.last_name);
    
    const patientId = patientData.patient_number || 
                     patientData.patient_id || 
                     patientData.id || 
                     `PAT${Date.now().toString().slice(-6)}`;
    
    let dateOfBirth = patientData.date_of_birth || '';
    
    const age = calculateAge(dateOfBirth);
    
    const [latestVitals, latestAssessment] = await Promise.all([
      fetchPatientVitals(patientData.id),
      fetchPatientAssessments(patientData.id)
    ]);
    
    let lastBmi: number | undefined;
    let lastVitalsDate: string | undefined;
    let lastAssessmentDate: string | undefined;
    let lastAssessmentType: string | undefined;
    
    if (latestVitals) {
      console.log('Latest vitals data:', latestVitals);
      
      lastBmi = parseBmiValue(latestVitals.bmi);
      lastVitalsDate = latestVitals.visit_date || latestVitals.created_at;
    }
    
    if (latestAssessment) {
      console.log('Latest assessment data:', latestAssessment);
      lastAssessmentDate = latestAssessment.visit_date || latestAssessment.created_at;
      lastAssessmentType = latestAssessment.type === 'overweight' ? 'Overweight Assessment' : 'General Assessment';
    }
    
    const bmiStatus = lastBmi ? getBmiStatus(lastBmi) : 'No Data';
    
    const processedPatient: Patient = {
      id: patientData.id,
      patient_id: patientId,
      first_name: patientData.first_name || '',
      last_name: patientData.last_name || '',
      date_of_birth: dateOfBirth,
      age: age,
      last_bmi: lastBmi,
      last_bmi_status: bmiStatus,
      last_vitals_date: lastVitalsDate,
      last_assessment_date: lastAssessmentDate,
      last_assessment_type: lastAssessmentType,
      created_at: patientData.created_at || patientData.date_created || undefined,
    };
    
    console.log(`Processed patient: ${patientData.first_name} ${patientData.last_name}, BMI: ${lastBmi}, Status: ${bmiStatus}`);
    return processedPatient;
  }, [calculateAge, getBmiStatus, fetchPatientVitals, fetchPatientAssessments, parseBmiValue]);

  /*
  Function: Fetch all patients with aggregated data
  Purpose: Main data fetching function for the component
  Process:
    1. Fetch basic patient list from API
    2. Process each patient in parallel with their vitals/assessments
    3. Sort by most recently created
    4. Calculate statistics for debugging
    5. Update component state
  */
  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching patients from API...');
      
      const response = await patientApi.getPatients();
      console.log('Patients API response:', response.data);
      
      if (response.data) {
        let patientsArray: any[] = [];
        
        if (response.data.results && Array.isArray(response.data.results)) {
          patientsArray = response.data.results;
        } 
        else if (Array.isArray(response.data)) {
          patientsArray = response.data;
        }
        else if (response.data.data && Array.isArray(response.data.data)) {
          patientsArray = response.data.data;
        }
        else {
          for (const key in response.data) {
            if (Array.isArray(response.data[key])) {
              patientsArray = response.data[key];
              break;
            }
          }
        }
        
        console.log(`Found ${patientsArray.length} patients`);
        
        if (patientsArray.length > 0) {
          const patientsPromises = patientsArray.map(patientData => 
            processPatientData(patientData)
          );
          
          const patientsData = await Promise.all(patientsPromises);
          
          const validPatients = patientsData.filter(patient => 
            patient.first_name || patient.last_name
          );
          
          const sortedPatients = validPatients.sort((a, b) => {
            const dateA = a.created_at ? getDateValue(a.created_at) : 0;
            const dateB = b.created_at ? getDateValue(b.created_at) : 0;
            return dateB - dateA;
          });
          
          const statusCounts: Record<string, number> = {};
          let patientsWithBmi = 0;
          
          sortedPatients.forEach(patient => {
            const status = patient.last_bmi_status || 'No Data';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
            if (patient.last_bmi !== undefined) patientsWithBmi++;
          });
          
          console.log('Patient BMI Status Distribution:', statusCounts);
          console.log(`Total patients: ${sortedPatients.length}`);
          console.log(`Patients with BMI data: ${patientsWithBmi}`);
          
          setPatients(sortedPatients);
          setFilteredPatients(sortedPatients);
        } else {
          console.log('No patients found in response');
          setPatients([]);
          setFilteredPatients([]);
        }
      } else {
        console.log('No data in response');
        setError('No patient data received from server');
      }
    } catch (err: any) {
      console.error('Error fetching patients:', err);
      setError(`Failed to load patients: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [processPatientData, getDateValue]);

  /*
  Function: Handle date filter change
  Purpose: Filter patients by their last assessment date
  Parameters: date - YYYY-MM-DD format date string
  Process: Filters patients to show only those with assessments on specified date
  */
  const handleFilterDateChange = (date: string) => {
    setFilterDate(date);
    
    if (!date) {
      setFilteredPatients(patients);
      return;
    }
    
    const filtered = patients.filter(patient => {
      if (!patient.last_assessment_date) return false;
      
      try {
        const assessmentDate = new Date(patient.last_assessment_date).toISOString().split('T')[0];
        return assessmentDate === date;
      } catch (e) {
        return false;
      }
    });
    
    setFilteredPatients(filtered);
  };

  /*
  Function: Get BMI status background color
  Purpose: Visual color coding for BMI status badges
  Parameters: status - BMI status string
  Returns: Background color matching VitalsForm color scheme
  */
  const getStatusColor = (status: string): string => {
    if (!status || status === 'No Data') return '#f3f4f6';
    
    switch (status.toLowerCase()) {
      case 'underweight':
        return '#fef3c7';
      case 'normal':
        return '#d1fae5';
      case 'overweight':
        return '#fee2e2';
      default:
        return '#f3f4f6';
    }
  };

  /*
  Function: Get BMI status text color
  Purpose: Contrast text color for BMI status badges
  Parameters: status - BMI status string
  Returns: Text color matching VitalsForm color scheme
  */
  const getStatusTextColor = (status: string): string => {
    if (!status || status === 'No Data') return '#6b7280';
    
    switch (status.toLowerCase()) {
      case 'underweight':
        return '#92400e';
      case 'normal':
        return '#065f46';
      case 'overweight':
        return '#991b1b';
      default:
        return '#6b7280'; 
    }
  };

  /*
  Function: Clear all filters
  Purpose: Reset filter state and show all patients
  */
  const handleClearFilters = () => {
    setFilterDate('');
    setFilteredPatients(patients);
  };

  /*
  Function: Force refresh data
  Purpose: Manual refresh button handler to reload all patient data
  */
  const forceRefresh = useCallback(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  /*
  Loading State Display
  Shows spinner and loading message while fetching data
  */
  if (loading) {
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
        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Fetching patient records, vitals, and assessments...
        </p>
      </div>
    );
  }

  return (
    <div>
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
          Patient Listing
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
          <span>Showing {filteredPatients.length} patients</span>
          <button
            onClick={forceRefresh}
            style={{
              padding: '0.25rem 0.75rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
            title="Refresh data"
          >
            ↻ Refresh
          </button>
        </div>
      </div>
      
      <div style={{ 
        background: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{ 
            display: 'block', 
            fontWeight: 500,
            minWidth: '120px'
          }}>
            Filter by Visit Date:
          </label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => handleFilterDateChange(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            style={{
              padding: '0.5rem 1rem',
              border: '2px solid #d1d5db',
              borderRadius: '6px',
              minWidth: '200px'
            }}
          />
          {filterDate && (
            <button
              onClick={handleClearFilters}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Clear Filter
            </button>
          )}
        </div>
        <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
          <p>
            {filterDate 
              ? `Showing patients with assessments on ${filterDate}`
              : 'Showing all patients'}
          </p>
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
          <p style={{ margin: 0, fontWeight: 500 }}>Error: {error}</p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
            Check the console for detailed information.
          </p>
        </div>
      )}
      
      <div style={{ 
        background: 'white',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '2rem'
      }}>
        {filteredPatients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div style={{
              fontSize: '3rem',
              color: '#d1d5db',
              marginBottom: '1rem'
            }}>
              👨‍⚕️
            </div>
            <p style={{ fontSize: '1.125rem', marginBottom: '1rem', color: '#4b5563' }}>
              {filterDate 
                ? `No patients found with visits on ${filterDate}`
                : patients.length === 0 
                  ? 'No patients found in the system' 
                  : 'No patients match your filters'}
            </p>
            {filterDate && (
              <button
                onClick={handleClearFilters}
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
                Clear filter to see all patients
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead style={{ background: '#f9fafb' }}>
                <tr>
                  <th style={{ 
                    padding: '1rem',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: '#374151',
                    borderBottom: '2px solid #e5e7eb'
                  }}>
                    Patient Name
                  </th>
                  <th style={{ 
                    padding: '1rem',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: '#374151',
                    borderBottom: '2px solid #e5e7eb'
                  }}>
                    Age
                  </th>
                  <th style={{ 
                    padding: '1rem',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: '#374151',
                    borderBottom: '2px solid #e5e7eb'
                  }}>
                    BMI Status
                  </th>
                  <th style={{ 
                    padding: '1rem',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: '#374151',
                    borderBottom: '2px solid #e5e7eb'
                  }}>
                    Last Visit
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient, index) => {
                  const statusColor = getStatusColor(patient.last_bmi_status || '');
                  const textColor = getStatusTextColor(patient.last_bmi_status || '');
                  
                  return (
                    <tr 
                      key={patient.id} 
                      style={{ 
                        borderBottom: '1px solid #f3f4f6',
                        backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#f9fafb';
                      }}
                    >
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 500, fontSize: '1rem', color: '#111827' }}>
                          {patient.first_name} {patient.last_name}
                        </div>
                        {patient.date_of_birth && patient.date_of_birth !== 'No Data' && (
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                            DOB: {formatDate(patient.date_of_birth)}
                          </div>
                        )}
                      </td>
                      
                      <td style={{ padding: '1rem' }}>
                        <div style={{ 
                          fontWeight: 600, 
                          fontSize: '1.125rem', 
                          color: '#1f2937',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          {patient.age || 'N/A'}
                          {patient.age && patient.age > 0 && (
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>years</span>
                          )}
                        </div>
                      </td>
                      
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: textColor,
                            backgroundColor: statusColor,
                            minWidth: '100px',
                            height: '24px',
                            border: patient.last_bmi_status === 'No Data' ? '1px dashed #d1d5db' : 'none'
                          }}>
                            {patient.last_bmi_status || 'No Data'}
                          </span>
                          {patient.last_bmi !== undefined ? (
                            <div style={{ 
                              fontSize: '0.875rem', 
                              color: '#6b7280',
                              backgroundColor: '#f3f4f6',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px'
                            }}>
                              BMI: {typeof patient.last_bmi === 'number' ? patient.last_bmi.toFixed(1) : 'N/A'}
                            </div>
                          ) : (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: '#9ca3af',
                              fontStyle: 'italic'
                            }}>
                              No vitals recorded
                            </div>
                          )}
                        </div>
                        {patient.last_bmi_status && patient.last_bmi_status !== 'No Data' && patient.last_bmi !== undefined && (
                          <div style={{ 
                            fontSize: '0.75rem', 
                            color: '#6b7280',
                            marginTop: '0.25rem',
                            fontStyle: 'italic'
                          }}>
                            {patient.last_bmi_status === 'Underweight' && `BMI < 18.5`}
                            {patient.last_bmi_status === 'Normal' && `18.5 ≤ BMI < 25`}
                            {patient.last_bmi_status === 'Overweight' && `BMI ≥ 25`}
                          </div>
                        )}
                      </td>
                      
                      <td style={{ padding: '1rem' }}>
                        {patient.last_assessment_date || patient.last_vitals_date ? (
                          <>
                            <div style={{ 
                              fontWeight: 500, 
                              color: '#1f2937',
                              fontSize: '0.875rem'
                            }}>
                              {patient.last_assessment_date ? 
                                formatDate(patient.last_assessment_date) : 
                                formatDate(patient.last_vitals_date)}
                            </div>
                            {patient.last_assessment_type && (
                              <div style={{ 
                                fontSize: '0.75rem', 
                                color: '#3b82f6',
                                marginTop: '0.25rem',
                                backgroundColor: '#eff6ff',
                                padding: '0.125rem 0.375rem',
                                borderRadius: '4px',
                                display: 'inline-block'
                              }}>
                                {patient.last_assessment_type}
                              </div>
                            )}
                            {!patient.last_assessment_date && patient.last_vitals_date && (
                              <div style={{ 
                                fontSize: '0.75rem', 
                                color: '#10b981',
                                marginTop: '0.25rem',
                                backgroundColor: '#d1fae5',
                                padding: '0.125rem 0.375rem',
                                borderRadius: '4px',
                                display: 'inline-block'
                              }}>
                                Vitals Only
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ 
                            color: '#9ca3af',
                            fontSize: '0.875rem',
                            fontStyle: 'italic'
                          }}>
                            No visits recorded
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const spinnerStyle = document.createElement('style');
spinnerStyle.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(spinnerStyle);

export default PatientListing;

