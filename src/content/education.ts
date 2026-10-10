import type { CertificateItem, EducationItem, LanguageItem } from '@/types';

/** Source: the EDUCATION, CERTIFICATES and LANGUAGES blocks of the author's CV. */
export const education: readonly EducationItem[] = [
  {
    id: 'wsb-merito',
    school: 'WSB Merito University, Wrocław',
    degree: 'Master’s Degree in Computer Science (in progress)',
    period: '2024 - present',
    note: 'Specialization: Artificial Intelligence and Machine Learning. Deep learning in Python, project management.',
  },
  {
    id: 'wskz',
    school: 'Wyższa Szkoła Kształcenia Zawodowego',
    degree: 'Cybersecurity',
    period: '2023 - 2024',
    note: 'Security auditing, data protection and data security.',
  },
  {
    id: 'angelus-silesius',
    school: 'Angelus Silesius University of Applied Sciences, Wałbrzych',
    degree: 'Bachelor’s Degree (Licencjat)',
    period: '2020 - 2024',
  },
];

export const certificates: readonly CertificateItem[] = [
  {
    id: 'nodejs',
    name: 'Node.js for Programmers (backend, 36 h)',
    issuer: 'Coders Lab',
    year: '2024',
  },
  {
    id: 'javascript',
    name: 'JavaScript Developer (frontend, 180 h)',
    issuer: 'Coders Lab',
    year: '2023',
  },
];

export const languages: readonly LanguageItem[] = [
  { id: 'pl', name: 'Polish', level: 'native' },
  { id: 'en', name: 'English', level: 'C1' },
  { id: 'de', name: 'German', level: 'B1' },
];
