import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientApi, vitalsApi, assessmentApi } from '../services/api';

/*
This React component serves as a comprehensive patient management interface that:
1. Displays a searchable and filterable list of patients
2. Shows key patient metrics (BMI status, last visits, age)
3. Allows navigation to patient details, registration, and vitals recording
4. Integrates with multiple API endpoints to fetch and display patient data
5. Includes pagination for better data management

DATA FETCHING & PROCESSING:
   - Fetches patient data from patientApi
   - Enriches patient records with:
     * Latest vitals (BMI calculations and status)
     * Assessment history (overweight/general assessments)
   - Handles different API response structures via extractArrayFromResponse()
   - Calculates age from date of birth

FILTERING & SEARCH:
   - Real-time search by name or patient ID
   - Date filtering by last visit/assessment date
   - Combined filter logic for search + date criteria
   - Clear filters functionality

USER INTERACTIONS:
   - Click patient row to view detailed patient information
   - "Record Vitals" button for quick vitals entry
   - Register new patient via dedicated button
   - Refresh data functionality
   - Clear individual or all filters

KEY DATA FLOWS:
  1. On mount → fetchPatients() → calls multiple APIs → processes data → updates state
  2. User interactions → update filters → filteredPatients recalculation → re-render
  3. Navigation actions → route to appropriate pages with patient data in state
*/

interface Patient {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  date_of_birth: string;
  gender?: string;
  registration_date?: string;
  created_at?: string;
  age?: number;
  last_bmi?: number;
  last_bmi_status?: string;
  last_vitals_date?: string;
  last_assessment_date?: string;
  last_assessment_type?: string;
}

const PatientListing: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [paginatedPatients, setPaginatedPatients] = useState<Patient[]>([]);
  
  const extractArrayFromResponse = (data: any): any[] => {
    if (Array.isArray(data)) return data;
    if (data?.results && Array.isArray(data.results)) return data.results;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  };

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

  const getBmiStatus = (bmi: number): string => {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    return 'Overweight';
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

  const fetchPatients = async () => {
    try {
      setLoading(true);
      console.log('Fetching patients from API...');
      
      const response = await patientApi.getPatients();
      console.log('Patients API response:', response.data);
      
      const patientsArray = extractArrayFromResponse(response.data);
      console.log(`Extracted ${patientsArray.length} patients`);
      
      const basicPatients: Patient[] = patientsArray.map((p: any) => ({
        id: p.id,
        patient_id: p.patient_id || `PAT${p.id.substring(0, 8).toUpperCase()}`,
        first_name: p.first_name,
        last_name: p.last_name,
        middle_name: p.middle_name,
        date_of_birth: p.date_of_birth,
        gender: p.gender,
        registration_date: p.registration_date || p.created_at,
        age: p.age || calculateAge(p.date_of_birth),
        created_at: p.created_at,
        last_bmi: undefined,
        last_bmi_status: undefined,
        last_vitals_date: undefined,
        last_assessment_date: undefined,
        last_assessment_type: undefined,
      }));
      
      const patientsWithDetails = await Promise.all(
        basicPatients.map(async (patient) => {
          try {
            const vitalsResponse = await vitalsApi.getVitals(patient.id);
            const vitalsArray = extractArrayFromResponse(vitalsResponse.data);
            
            if (vitalsArray.length > 0) {
              vitalsArray.sort((a: any, b: any) => 
                new Date(b.visit_date || b.created_at).getTime() - 
                new Date(a.visit_date || a.created_at).getTime()
              );
              
              const latestVital = vitalsArray[0];
              patient.last_bmi = typeof latestVital.bmi === 'string' ? 
                parseFloat(latestVital.bmi) : latestVital.bmi;
              patient.last_bmi_status = getBmiStatus(patient.last_bmi || 0);
              patient.last_vitals_date = latestVital.visit_date || latestVital.created_at;
            }
            
            try {
              const overweightResponse = await assessmentApi.getPatientOverweightAssessments(patient.id);
              const overweightArray = extractArrayFromResponse(overweightResponse.data);
              
              if (overweightArray.length > 0) {
                overweightArray.sort((a: any, b: any) => 
                  new Date(b.visit_date || b.created_at).getTime() - 
                  new Date(a.visit_date || a.created_at).getTime()
                );
                
                const latestAssessment = overweightArray[0];
                patient.last_assessment_date = latestAssessment.visit_date || latestAssessment.created_at;
                patient.last_assessment_type = 'Overweight';
              } else {
                const generalResponse = await assessmentApi.getPatientGeneralAssessments(patient.id);
                const generalArray = extractArrayFromResponse(generalResponse.data);
                
                if (generalArray.length > 0) {
                  generalArray.sort((a: any, b: any) => 
                    new Date(b.visit_date || b.created_at).getTime() - 
                    new Date(a.visit_date || a.created_at).getTime()
                  );
                  
                  const latestAssessment = generalArray[0];
                  patient.last_assessment_date = latestAssessment.visit_date || latestAssessment.created_at;
                  patient.last_assessment_type = 'General';
                }
              }
            } catch (assessmentError) {
              console.log(`No assessments found for patient ${patient.patient_id}`);
            }
            
          } catch (error) {
            console.error(`Error fetching details for patient ${patient.patient_id}:`, error);
          }
          
          return patient;
        })
      );
      
      setPatients(patientsWithDetails);
      setFilteredPatients(patientsWithDetails);
      
      if (patientsWithDetails.length > 0) {
        console.log('First patient with details:', patientsWithDetails[0]);
      }
      
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchPatients();
  }, []);
  
  useEffect(() => {
    if (!searchTerm.trim() && !dateFilter) {
      setFilteredPatients(patients);
      setCurrentPage(1);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    
    const filtered = patients.filter(patient => {
      const matchesSearch = !searchTerm.trim() || 
        patient.first_name?.toLowerCase().includes(term) ||
        patient.last_name?.toLowerCase().includes(term) ||
        patient.patient_id?.toLowerCase().includes(term) ||
        `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(term);
      
      let matchesDate = true;
      if (dateFilter) {
        const filterDate = new Date(dateFilter);
        let hasMatchingDate = false;
        
        if (patient.last_vitals_date) {
          const vitalsDate = new Date(patient.last_vitals_date);
          if (
            vitalsDate.getFullYear() === filterDate.getFullYear() &&
            vitalsDate.getMonth() === filterDate.getMonth() &&
            vitalsDate.getDate() === filterDate.getDate()
          ) {
            hasMatchingDate = true;
          }
        }
        
        if (patient.last_assessment_date) {
          const assessmentDate = new Date(patient.last_assessment_date);
          if (
            assessmentDate.getFullYear() === filterDate.getFullYear() &&
            assessmentDate.getMonth() === filterDate.getMonth() &&
            assessmentDate.getDate() === filterDate.getDate()
          ) {
            hasMatchingDate = true;
          }
        }
        
        matchesDate = hasMatchingDate;
      }
      
      return matchesSearch && matchesDate;
    });
    
    setFilteredPatients(filtered);
    setCurrentPage(1);
  }, [searchTerm, dateFilter, patients]);
  
  useEffect(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredPatients.slice(indexOfFirstItem, indexOfLastItem);
    setPaginatedPatients(currentItems);
  }, [filteredPatients, currentPage, itemsPerPage]);
  
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  
  const handlePageChange = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newItemsPerPage = parseInt(e.target.value);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };
  
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push(-1); 
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push(-1);
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(1);
        pageNumbers.push(-1);
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push(-1);
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };
  
  const handlePatientClick = (patient: Patient) => {
    console.log('Patient clicked:', patient);
    navigate('/patient-details', { 
      state: { 
        patient: {
          id: patient.id,
          patient_id: patient.patient_id,
          first_name: patient.first_name,
          last_name: patient.last_name,
          middle_name: patient.middle_name,
          date_of_birth: patient.date_of_birth,
          gender: patient.gender,
          registration_date: patient.registration_date,
          age: patient.age,
          created_at: patient.created_at,
        }
      } 
    });
  };
  
  const handleRecordVitals = (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Recording vitals for:', patient);
    navigate('/vitals-form', { 
      state: { 
        patient: {
          id: patient.id,
          patient_id: patient.patient_id,
          first_name: patient.first_name,
          last_name: patient.last_name,
          middle_name: patient.middle_name,
          date_of_birth: patient.date_of_birth,
          gender: patient.gender
        },
        redirectBack: true
      } 
    });
  };
  
  const navigateToRegistration = () => {
    navigate('/register-patient');
  };
  
  const handleRefresh = async () => {
    await fetchPatients();
    setSearchTerm('');
    setDateFilter('');
    setCurrentPage(1);
    console.log(`Refreshed! Loaded ${patients.length} patients.`);
  };
  
  const getStatusColor = (status: string = ''): string => {
    if (!status || status === 'No Data') return '#f3f4f6';
    switch (status.toLowerCase()) {
      case 'underweight': return '#fef3c7';
      case 'normal': return '#d1fae5';
      case 'overweight': return '#fee2e2';
      default: return '#f3f4f6';
    }
  };
  
  const getStatusTextColor = (status: string = ''): string => {
    if (!status || status === 'No Data') return '#6b7280';
    switch (status.toLowerCase()) {
      case 'underweight': return '#92400e';
      case 'normal': return '#065f46';
      case 'overweight': return '#991b1b';
      default: return '#6b7280'; 
    }
  };
  
  const formatDate = (dateString: string = ''): string => {
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
  
  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter('');
    setCurrentPage(1);
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
        <p>Loading patient data...</p>
      </div>
    );
  }
  
  return (
    <div style={{ padding: '2rem' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Showing {filteredPatients.length} of {patients.length} patients
          </span>
          <button
            onClick={navigateToRegistration}
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
            title="Register new patient"
          >
            <span style={{ fontSize: '1.125rem' }}>+</span>
            Register Patient
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              opacity: loading ? 0.6 : 1
            }}
            title="Refresh data"
          >
            {loading ? (
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid white',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
            ) : (
              '↻'
            )}
            Refresh
          </button>
        </div>
      </div>
      
      {/* Simple Filters Section */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr auto',
        gap: '1rem',
        marginBottom: '1.5rem',
        alignItems: 'end'
      }}>
        {/* Search Filter */}
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#374151'
          }}>
            Search
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by name or patient ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            />
            <div style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af'
            }}>
              🔍
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  fontSize: '1.25rem'
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>
        
        {/* Date Filter */}
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#374151'
          }}>
            Filter by Date
          </label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem'
            }}
          />
        </div>
        
        {/* Clear Filters Button */}
        <div>
          <button
            onClick={clearFilters}
            disabled={!searchTerm && !dateFilter}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: !searchTerm && !dateFilter ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              opacity: !searchTerm && !dateFilter ? 0.5 : 1,
              height: '46px'
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>
      
      {/* Active Filters Display */}
      {(searchTerm || dateFilter) && (
        <div style={{ 
          padding: '0.75rem',
          backgroundColor: '#eff6ff',
          borderRadius: '6px',
          border: '1px solid #dbeafe',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ 
            fontSize: '0.875rem', 
            color: '#1e40af',
            fontWeight: 500
          }}>
            Active Filters:
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {searchTerm && (
              <span style={{
                fontSize: '0.75rem',
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                Search: "{searchTerm}"
                <button
                  onClick={() => setSearchTerm('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1e40af',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    padding: 0
                  }}
                >
                  ×
                </button>
              </span>
            )}
            {dateFilter && (
              <span style={{
                fontSize: '0.75rem',
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                Date: {new Date(dateFilter).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
                <button
                  onClick={() => setDateFilter('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1e40af',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    padding: 0
                  }}
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
      
      <div style={{ 
        background: 'white',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '2rem'
      }}>
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
                <th style={{ 
                  padding: '1rem',
                  textAlign: 'left',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: '#374151',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedPatients.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                    {searchTerm || dateFilter ? 
                      `No patients found matching the selected filters` : 
                      'No patients found'}
                  </td>
                </tr>
              ) : (
                paginatedPatients.map((patient, index) => {
                  const status = patient.last_bmi_status || 'No Data';
                  const statusColor = getStatusColor(status);
                  const textColor = getStatusTextColor(status);
                  
                  return (
                    <tr 
                      key={patient.id} 
                      style={{ 
                        borderBottom: '1px solid #f3f4f6',
                        backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
                      }}
                    >
                      <td style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => handlePatientClick(patient)}>
                        <div style={{ 
                          fontWeight: 500, 
                          fontSize: '1rem', 
                          color: '#111827'
                        }}>
                          {patient.first_name} {patient.last_name}
                        </div>
                        {patient.date_of_birth && (
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                            DOB: {formatDate(patient.date_of_birth)}
                            {patient.gender && (
                              <span style={{ marginLeft: '0.75rem' }}>
                                • {formatGender(patient.gender)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      
                      <td style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => handlePatientClick(patient)}>
                        <div style={{ 
                          fontWeight: 600, 
                          fontSize: '1.125rem', 
                          color: '#1f2937',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          {patient.age || calculateAge(patient.date_of_birth) || 'N/A'}
                          {patient.age && patient.age > 0 && (
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>years</span>
                          )}
                        </div>
                      </td>
                      
                      <td style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => handlePatientClick(patient)}>
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
                            height: '24px'
                          }}>
                            {status}
                          </span>
                          {patient.last_bmi !== undefined ? (
                            <div style={{ 
                              fontSize: '0.875rem', 
                              color: '#6b7280',
                              backgroundColor: '#f3f4f6',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px'
                            }}>
                              BMI: {patient.last_bmi.toFixed(1)}
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
                      </td>
                      
                      <td style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => handlePatientClick(patient)}>
                        {patient.last_assessment_date ? (
                          <>
                            <div style={{ 
                              fontWeight: 500, 
                              color: '#1f2937',
                              fontSize: '0.875rem'
                            }}>
                              {formatDate(patient.last_assessment_date)}
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
                          </>
                        ) : patient.last_vitals_date ? (
                          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                            {formatDate(patient.last_vitals_date)}
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
                          </div>
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
                      
                      <td style={{ padding: '1rem' }}>
                        <button
                          onClick={(e) => handleRecordVitals(patient, e)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 500
                          }}
                          title="Record vitals for this patient"
                        >
                          Record Vitals
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination Controls */}
      {filteredPatients.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          {/* Left side: Items per page selector and current range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Show:</span>
              <select
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                style={{
                  padding: '0.375rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>per page</span>
            </div>
            
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Showing <span style={{ fontWeight: 600, color: '#1f2937' }}>
                {((currentPage - 1) * itemsPerPage) + 1}
              </span> to <span style={{ fontWeight: 600, color: '#1f2937' }}>
                {Math.min(currentPage * itemsPerPage, filteredPatients.length)}
              </span> of <span style={{ fontWeight: 600, color: '#1f2937' }}>
                {filteredPatients.length}
              </span> patients
            </div>
          </div>
          
          {/* Right side: Page navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Previous button */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: currentPage === 1 ? '#f3f4f6' : '#3b82f6',
                color: currentPage === 1 ? '#9ca3af' : 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                opacity: currentPage === 1 ? 0.6 : 1
              }}
            >
              ← Previous
            </button>
            
            {/* Page numbers */}
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {getPageNumbers().map((pageNumber, index) => (
                pageNumber === -1 ? (
                  <span 
                    key={`ellipsis-${index}`}
                    style={{
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      backgroundColor: currentPage === pageNumber ? '#3b82f6' : 'white',
                      color: currentPage === pageNumber ? 'white' : '#374151',
                      border: `1px solid ${currentPage === pageNumber ? '#3b82f6' : '#d1d5db'}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: currentPage === pageNumber ? 600 : 400,
                      minWidth: '2.5rem'
                    }}
                  >
                    {pageNumber}
                  </button>
                )
              ))}
            </div>
            
            {/* Next button */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: currentPage === totalPages ? '#f3f4f6' : '#3b82f6',
                color: currentPage === totalPages ? '#9ca3af' : 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                opacity: currentPage === totalPages ? 0.6 : 1
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        select:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
};

export default PatientListing;