import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { assessmentApi } from '../services/api';


/*
This PatientDetails component is a comprehensive patient management dashboard that displays and manages 
a patient's medical records.

DISPLAYS PATIENT INFORMATION:
   - Shows patient's full name with BMI status badge
   - Displays key statistics: total vitals, total assessments, latest BMI, and last visit date

DATA FETCHING AND MANAGEMENT:
   - Fetches patient vitals history from API endpoint
   - Fetches both general and overweight assessments from separate APIs
   - Combines and sorts all assessments by date (newest first)
   - Tracks the latest vitals record for BMI calculation

NAVIGATION AND ACTIONS:
   - Back button to return to patient listing
   - Refresh button to reload patient data
   - "Record Vitals" button to navigate to vitals form
   - Patient name in listing table is clickable for details view

*/


interface Patient {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  date_of_birth: string;
  gender: string;
  registration_date: string;
  created_at?: string;
}

interface VitalsRecord {
  id: string;
  patient_id: string;
  visit_date: string;
  height_cm: number;
  weight_kg: number;
  bmi: number;
  created_at: string;
}

interface AssessmentRecord {
  id: string;
  patient_id: string;
  visit_date: string;
  type: 'general' | 'overweight';
  general_health?: string;
  using_drugs?: string;
  been_on_diet?: string;
  comments?: string;
  created_at: string;
}

const PatientDetails: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const patientData = location.state?.patient as Patient;
  const forceRefresh = location.state?.forceRefresh;
  
  const [patient] = useState<Patient | null>(patientData);
  const [vitalsHistory, setVitalsHistory] = useState<VitalsRecord[]>([]);
  const [assessmentsHistory, setAssessmentsHistory] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'vitals' | 'assessments' | 'new-assessment'>('overview');
  const [latestVitals, setLatestVitals] = useState<VitalsRecord | null>(null);
  
  const [newAssessment, setNewAssessment] = useState({
    visit_date: new Date().toISOString().split('T')[0],
    general_health: '',
    been_on_diet: '',
    using_drugs: '',
    comments: '',
  });

  const extractArrayFromResponse = useCallback((data: any): any[] => {
    if (Array.isArray(data)) return data;
    if (data?.results && Array.isArray(data.results)) return data.results;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  }, []);

  const fetchPatientDetails = useCallback(async () => {
    if (!patient) return;
    
    try {
      setLoading(true);
      
      console.log('Fetching details for patient:', patient.id);
      console.log('Patient display ID:', patient.patient_id);
      
      try {
        const vitalsResponse = await fetch(`http://localhost:8000/api/vitals/?patient=${patient.id}`);
        if (vitalsResponse.ok) {
          const vitalsData = await vitalsResponse.json();
          const vitalsArray = extractArrayFromResponse(vitalsData);
          
          const formattedVitals: VitalsRecord[] = vitalsArray.map((v: any) => ({
            id: v.id,
            patient_id: v.patient_id || v.patient,
            visit_date: v.visit_date || v.created_at,
            height_cm: parseFloat(v.height_cm),
            weight_kg: parseFloat(v.weight_kg),
            bmi: typeof v.bmi === 'string' ? parseFloat(v.bmi) : v.bmi,
            created_at: v.created_at
          }));
          
          formattedVitals.sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());
          
          setVitalsHistory(formattedVitals);
          setLatestVitals(formattedVitals[0] || null);
          console.log(`Fetched ${formattedVitals.length} vitals records`);
          console.log('Latest vitals BMI:', formattedVitals[0]?.bmi);
        }
      } catch (vitalsError) {
        console.error('Error fetching vitals:', vitalsError);
      }
      
      try {
        const [overweightResponse, generalResponse] = await Promise.all([
          assessmentApi.getPatientOverweightAssessments(patient.id),
          assessmentApi.getPatientGeneralAssessments(patient.id)
        ]);
        
        const overweightArray = extractArrayFromResponse(overweightResponse.data);
        const generalArray = extractArrayFromResponse(generalResponse.data);
        
        console.log('Overweight assessments:', overweightArray);
        console.log('General assessments:', generalArray);
        
        const allAssessments: AssessmentRecord[] = [
          ...overweightArray.map((a: any) => ({
            id: a.id,
            patient_id: a.patient_id || a.patient,
            visit_date: a.visit_date || a.created_at,
            type: 'overweight' as const,
            general_health: a.general_health,
            been_on_diet: a.been_on_diet,
            comments: a.comments,
            created_at: a.created_at
          })),
          ...generalArray.map((a: any) => ({
            id: a.id,
            patient_id: a.patient_id || a.patient,
            visit_date: a.visit_date || a.created_at,
            type: 'general' as const,
            general_health: a.general_health,
            using_drugs: a.using_drugs,
            comments: a.comments,
            created_at: a.created_at
          }))
        ];
        
        allAssessments.sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());
        
        setAssessmentsHistory(allAssessments);
        console.log(`Fetched ${allAssessments.length} assessments (${overweightArray.length} overweight, ${generalArray.length} general)`);
        
        if (allAssessments.length > 0) {
          console.log('Latest assessment details:', allAssessments[0]);
          console.log('Assessment type:', allAssessments[0].type);
          console.log('Assessment fields:', {
            general_health: allAssessments[0].general_health,
            been_on_diet: allAssessments[0].been_on_diet,
            using_drugs: allAssessments[0].using_drugs,
            comments: allAssessments[0].comments
          });
        }
        
      } catch (assessmentError) {
        console.error('Error fetching assessments:', assessmentError);
        setAssessmentsHistory([]);
      }
      
    } catch (error) {
      console.error('Error fetching patient details:', error);
    } finally {
      setLoading(false);
    }
  }, [patient, extractArrayFromResponse]);

  useEffect(() => {
    if (patient) {
      fetchPatientDetails();
    } else {
      navigate('/patient-listing');
    }
  }, [patient, navigate, fetchPatientDetails, forceRefresh]);
  
  const calculateAge = (dateOfBirth: string): number => {
    if (!dateOfBirth) return 0;
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };
  
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };
  
  const getBmiStatus = (bmi: number): string => {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    return 'Overweight';
  };
  
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'underweight': return '#fef3c7';
      case 'normal': return '#d1fae5';
      case 'overweight': return '#fee2e2';
      default: return '#f3f4f6';
    }
  };
  
  const getStatusTextColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'underweight': return '#92400e';
      case 'normal': return '#065f46';
      case 'overweight': return '#991b1b';
      default: return '#6b7280';
    }
  };
  
  const formatGender = (gender: string = ''): string => {
    if (!gender) return 'Unknown';
    switch (gender.toUpperCase()) {
      case 'M': return 'Male';
      case 'F': return 'Female';
      case 'O': return 'Other';
      default: return gender;
    }
  };
  
  const handleAddVitals = () => {
    navigate('/vitals-form', { 
      state: { 
        patient: {
          id: patient?.id,
          patient_id: patient?.patient_id,
          first_name: patient?.first_name,
          last_name: patient?.last_name,
          middle_name: patient?.middle_name,
          date_of_birth: patient?.date_of_birth,
          gender: patient?.gender
        },
        redirectBack: true
      } 
    });
  };
  
  const handleCreateAssessment = (type: 'general' | 'overweight') => {
    if (!latestVitals) {
      alert('Please record vitals first to calculate BMI');
      setActiveTab('overview');
      return;
    }
    
    setActiveTab('new-assessment');
    setNewAssessment({
      visit_date: new Date().toISOString().split('T')[0],
      general_health: '',
      been_on_diet: '',
      using_drugs: '',
      comments: '',
    });
  };
  
  const handleAssessmentSubmit = async () => {
    if (!patient || !latestVitals) return;
    
    if (!newAssessment.visit_date || !newAssessment.general_health) {
      alert('Please fill in all required fields');
      return;
    }
    
    if (latestVitals.bmi > 25 && !newAssessment.been_on_diet) {
      alert('Please fill in diet history for overweight assessment');
      return;
    }
    
    if (latestVitals.bmi <= 25 && !newAssessment.using_drugs) {
      alert('Please fill in drug usage information for general assessment');
      return;
    }
    
    try {
      if (latestVitals.bmi > 25) {
        const assessmentData = {
          patient_id: patient.id,
          visit_date: newAssessment.visit_date,
          general_health: newAssessment.general_health,
          been_on_diet: newAssessment.been_on_diet,
          comments: newAssessment.comments,
        };
        
        console.log('Submitting overweight assessment:', assessmentData);
        
        const response = await assessmentApi.createOverweightAssessment(assessmentData);
        console.log('Overweight assessment saved:', response.data);
        
      } else {
        const assessmentData = {
          patient_id: patient.id,
          visit_date: newAssessment.visit_date,
          general_health: newAssessment.general_health,
          using_drugs: newAssessment.using_drugs,
          comments: newAssessment.comments,
        };
        
        console.log('Submitting general assessment:', assessmentData);
        
        const response = await assessmentApi.createGeneralAssessment(assessmentData);
        console.log('General assessment saved:', response.data);
      }
      
      fetchPatientDetails();
      setActiveTab('assessments');
      alert('Assessment created successfully!');
      
    } catch (error: any) {
      console.error('Error creating assessment:', error);
      console.error('Error details:', error.response?.data);
      
      let errorMessage = 'Failed to create assessment. ';
      if (error.response?.data) {
        if (typeof error.response.data === 'object') {
          Object.entries(error.response.data).forEach(([key, value]) => {
            errorMessage += `${key}: ${Array.isArray(value) ? value.join(', ') : value}. `;
          });
        } else {
          errorMessage += error.response.data;
        }
      }
      alert(errorMessage);
    }
  };
  
  const handleBack = () => {
    navigate('/patient-listing');
  };
  
  const handleRefresh = () => {
    fetchPatientDetails();
  };
  
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
        <p>Loading patient details...</p>
      </div>
    );
  }
  
  if (!patient) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <p>Patient not found</p>
        <button
          onClick={handleBack}
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
  
  const age = calculateAge(patient.date_of_birth);
  const latestBmiStatus = latestVitals ? getBmiStatus(latestVitals.bmi) : 'No Data';
  
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <button
            onClick={handleBack}
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
          <h1 style={{ 
            fontSize: '1.875rem', 
            fontWeight: 700, 
            color: '#1f2937',
            margin: 0 
          }}>
            Patient Dashboard
          </h1>
        </div>
        
        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleRefresh}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            title="Refresh data"
          >
            ↻ Refresh
          </button>
          <button
            onClick={handleAddVitals}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 500
            }}
          >
            + Record Vitals
          </button>
        </div>
      </div>
      
      {/* Patient Info Card - REMOVED all patient demographic information */}
      <div style={{ 
        background: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              {patient.first_name} {patient.last_name}
              {patient.middle_name && ` ${patient.middle_name}`}
            </h2>
            {/* Removed all patient demographic fields */}
          </div>
          
          {/* BMI Status Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: getStatusTextColor(latestBmiStatus),
            backgroundColor: getStatusColor(latestBmiStatus),
            minWidth: '120px',
            height: '32px'
          }}>
            {latestBmiStatus}
            {latestVitals && (
              <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                (BMI: {latestVitals.bmi.toFixed(1)})
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{ 
          background: 'white',
          padding: '1rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Vitals</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>{vitalsHistory.length}</p>
        </div>
        
        <div style={{ 
          background: 'white',
          padding: '1rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Assessments</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{assessmentsHistory.length}</p>
        </div>
        
        <div style={{ 
          background: 'white',
          padding: '1rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Latest BMI</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8b5cf6' }}>
            {latestVitals ? latestVitals.bmi.toFixed(1) : 'No Data'}
          </p>
        </div>
        
        <div style={{ 
          background: 'white',
          padding: '1rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Last Visit</p>
          <p style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937' }}>
            {assessmentsHistory[0] ? formatDate(assessmentsHistory[0].visit_date) : 
             vitalsHistory[0] ? formatDate(vitalsHistory[0].visit_date) : 'No visits'}
          </p>
        </div>
      </div>
      
      {/* Workflow Guidance - Only show if no vitals recorded */}
      {!latestVitals && (
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '2rem' }}>📋</div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                First Step Required: Record Vitals
              </h3>
              <p style={{ fontSize: '0.875rem', marginBottom: '1rem', opacity: 0.9 }}>
                To create an assessment, you need to record the patient's vitals first. 
                This will calculate their BMI, which determines the type of assessment needed.
              </p>
              <button
                onClick={handleAddVitals}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'white',
                  color: '#764ba2',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 600
                }}
              >
                Record Vitals Now →
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '1.5rem',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeTab === 'overview' ? '#3b82f6' : 'transparent',
            color: activeTab === 'overview' ? 'white' : '#6b7280',
            border: 'none',
            borderBottom: activeTab === 'overview' ? '2px solid #3b82f6' : '2px solid transparent',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '0.875rem'
          }}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('vitals')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeTab === 'vitals' ? '#3b82f6' : 'transparent',
            color: activeTab === 'vitals' ? 'white' : '#6b7280',
            border: 'none',
            borderBottom: activeTab === 'vitals' ? '2px solid #3b82f6' : '2px solid transparent',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '0.875rem'
          }}
        >
          Vitals History ({vitalsHistory.length})
        </button>
        <button
          onClick={() => setActiveTab('assessments')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeTab === 'assessments' ? '#3b82f6' : 'transparent',
            color: activeTab === 'assessments' ? 'white' : '#6b7280',
            border: 'none',
            borderBottom: activeTab === 'assessments' ? '2px solid #3b82f6' : '2px solid transparent',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '0.875rem'
          }}
        >
          Assessments ({assessmentsHistory.length})
        </button>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ 
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Patient Overview</h3>
          </div>
          
          {latestVitals ? (
            <>
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.5rem' }}>Latest Vitals</h4>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '1rem',
                  background: '#f9fafb',
                  padding: '1rem',
                  borderRadius: '6px'
                }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Visit Date</p>
                    <p style={{ fontWeight: 500 }}>{formatDate(latestVitals.visit_date)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Height</p>
                    <p style={{ fontWeight: 500 }}>{latestVitals.height_cm} cm</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Weight</p>
                    <p style={{ fontWeight: 500 }}>{latestVitals.weight_kg} kg</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>BMI</p>
                    <p style={{ fontWeight: 500 }}>{latestVitals.bmi.toFixed(1)}</p>
                  </div>
                </div>
              </div>
              
              {assessmentsHistory.length > 0 ? (
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.5rem' }}>Latest Assessment</h4>
                  <div style={{ 
                    background: '#f9fafb',
                    padding: '1rem',
                    borderRadius: '6px'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem'
                    }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        color: '#3b82f6',
                        backgroundColor: '#eff6ff',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '4px'
                      }}>
                        {assessmentsHistory[0].type === 'overweight' ? 'Overweight Assessment' : 'General Assessment'}
                      </span>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {formatDate(assessmentsHistory[0].visit_date)}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.5rem' }}>
                      <div>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>General Health</p>
                        <p style={{ fontWeight: 500 }}>{assessmentsHistory[0].general_health}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {assessmentsHistory[0].type === 'overweight' ? 'Diet History' : 'Currently Using Drugs'}
                        </p>
                        <p style={{ fontWeight: 500 }}>
                          {assessmentsHistory[0].type === 'overweight' 
                            ? (assessmentsHistory[0].been_on_diet || 'Not specified')
                            : (assessmentsHistory[0].using_drugs || 'Not specified')}
                        </p>
                      </div>
                    </div>
                    {assessmentsHistory[0].comments && (
                      <div>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Comments</p>
                        <p style={{ fontSize: '0.875rem' }}>{assessmentsHistory[0].comments}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ 
                  background: '#f9fafb',
                  padding: '1.5rem',
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '3rem', color: '#d1d5db', marginBottom: '1rem' }}>📝</div>
                  <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '1.125rem' }}>
                    No assessments recorded yet
                  </p>
                  <p style={{ color: '#9ca3af', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                    Based on the patient's BMI of {latestVitals.bmi.toFixed(1)}, 
                    {latestVitals.bmi > 25 
                      ? ' an Overweight Assessment should be created.' 
                      : ' a General Assessment should be created.'}
                  </p>
                  <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    <p>Assessments should be created through the Vitals Form workflow.</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ 
              background: '#f9fafb',
              padding: '1.5rem',
              borderRadius: '6px',
              textAlign: 'center',
              marginBottom: '2rem'
            }}>
              <div style={{ fontSize: '3rem', color: '#d1d5db', marginBottom: '1rem' }}>📏</div>
              <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '1.125rem' }}>
                No vitals recorded yet
              </p>
              <p style={{ color: '#9ca3af', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                Record the patient's height and weight to calculate BMI and determine which assessment to create.
              </p>
              <button
                onClick={handleAddVitals}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                Record Vitals First
              </button>
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'vitals' && (
        <div style={{ 
          background: 'white',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          {vitalsHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: '#6b7280', marginBottom: '1rem' }}>No vitals history found</p>
              <button
                onClick={handleAddVitals}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Add First Vitals
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>
                      Visit Date
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>
                      Height (cm)
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>
                      Weight (kg)
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>
                      BMI
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vitalsHistory.map((vitals, index) => {
                    const status = getBmiStatus(vitals.bmi);
                    return (
                      <tr key={vitals.id} style={{ 
                        borderBottom: '1px solid #f3f4f6',
                        backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb'
                      }}>
                        <td style={{ padding: '1rem' }}>{formatDate(vitals.visit_date)}</td>
                        <td style={{ padding: '1rem' }}>{vitals.height_cm}</td>
                        <td style={{ padding: '1rem' }}>{vitals.weight_kg}</td>
                        <td style={{ padding: '1rem', fontWeight: 500 }}>{vitals.bmi.toFixed(1)}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: getStatusTextColor(status),
                            backgroundColor: getStatusColor(status)
                          }}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'assessments' && (
        <div style={{ 
          background: 'white',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          {assessmentsHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: '#6b7280' }}>No assessments found</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>
                      Visit Date
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>
                      Type
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>
                      General Health
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>
                      Comments
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {assessmentsHistory.map((assessment, index) => (
                    <tr key={assessment.id} style={{ 
                      borderBottom: '1px solid #f3f4f6',
                      backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb'
                    }}>
                      <td style={{ padding: '1rem' }}>{formatDate(assessment.visit_date)}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: assessment.type === 'overweight' ? '#fee2e2' : '#dbeafe',
                          color: assessment.type === 'overweight' ? '#991b1b' : '#1e40af',
                          fontSize: '0.75rem',
                          fontWeight: 500
                        }}>
                          {assessment.type === 'overweight' ? 'Overweight' : 'General'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>{assessment.general_health || 'N/A'}</td>
                      <td style={{ padding: '1rem' }}>{assessment.comments || 'No comments'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

export default PatientDetails;