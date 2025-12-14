import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './styles/App.css';

import PatientRegistration from './components/PatientRegistration';
import VitalsForm from './components/VitalsForm';
import OverweightAssessmentForm from './components/OverweightAssessmentForm';
import GeneralAssessmentForm from './components/GeneralAssessmentForm';
import PatientListing from './components/PatientListing';

/*
App Component - Main Application Router

This is the root component of the application that sets up the routing structure.

ROUTE STRUCTURE:
1. / (root) -> PatientRegistration (default landing page)
2. /register-patient -> PatientRegistration (patient registration form)
3. /vitals-form -> VitalsForm (form to record patient vitals and calculate BMI)
4. /overweight-assessment -> OverweightAssessmentForm (assessment form for patients with BMI > 25)
5. /general-assessment -> GeneralAssessmentForm (assessment form for patients with BMI ≤ 25)
6. /patient-listing -> PatientListing (displays all patients with their vitals and assessment data)

*/
const App: React.FC = () => {
  return (
    <Router>
      <div className="container">
        <Routes>
          <Route path="/" element={<PatientRegistration />} />
          
          <Route path="/register-patient" element={<PatientRegistration />} />
          
          <Route path="/vitals-form" element={<VitalsForm />} />
          
          <Route path="/overweight-assessment" element={<OverweightAssessmentForm />} />
          
          <Route path="/general-assessment" element={<GeneralAssessmentForm />} />
          
          <Route path="/patient-listing" element={<PatientListing />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;