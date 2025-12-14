export interface Patient {
  id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female';
  registrationDate: string;
}

export interface Vitals {
  id: string;
  patientId: string;
  visitDate: string;
  height: number;
  weight: number;
  bmi: number;
}
