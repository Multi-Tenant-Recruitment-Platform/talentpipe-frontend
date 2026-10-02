import type { JobDetail } from '../api/types';

/**
 * Stand-in published vacancies for building the public job board before the
 * Job module returns real rows. Used only when VITE_PUBLIC_JOBS_SOURCE=mock;
 * never as a fallback for a failed request. Delete once the API is live.
 */
export const MOCK_PUBLIC_JOBS: JobDetail[] = [
  {
    id: 'b3f1c0de-0001-4a00-8000-000000000001',
    title: 'Senior Frontend Engineer',
    companyName: 'Demo Company',
    summary:
      'Build the candidate and recruiter experiences of a multi-tenant hiring platform with React and TypeScript.',
    description:
      'You will own major parts of our React and TypeScript frontend, working closely with design and backend engineers.\n\nWe value accessible, well-tested UI and pragmatic engineering.',
    requirements: [
      '4+ years building production React applications',
      'Strong TypeScript skills',
      'Experience writing accessible UI',
    ],
    location: 'Colombo, Sri Lanka',
    category: 'Engineering',
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'Testing Library'],
    employmentType: 'Full-time',
    workplaceType: 'Hybrid',
    applicationDeadline: '2026-10-31',
  },
  {
    id: 'b3f1c0de-0002-4a00-8000-000000000002',
    title: 'Backend Engineer (Java / Spring Boot)',
    companyName: 'Northwind Analytics',
    summary: 'Design and scale REST APIs for data-heavy analytics products.',
    description: 'Join a small platform team building reliable Spring Boot services on PostgreSQL.',
    requirements: ['Java 17', 'Spring Boot', 'PostgreSQL'],
    location: 'Remote',
    category: 'Engineering',
    skills: ['Java', 'Spring Boot', 'PostgreSQL', 'Docker', 'AWS', 'Kafka', 'Redis', 'JUnit'],
    employmentType: 'Full-time',
    workplaceType: 'Remote',
    applicationDeadline: '2026-11-15',
  },
  {
    id: 'b3f1c0de-0003-4a00-8000-000000000003',
    title:
      'Principal Customer Success and Implementation Manager for Enterprise Healthcare and Financial Services Accounts',
    companyName: 'Acme Health & Financial Technologies International (Private) Limited',
    summary:
      'Lead onboarding and long-term success for our largest enterprise customers across healthcare and financial services, partnering with sales, product and engineering to turn complex requirements into successful rollouts, while mentoring a growing team of implementation specialists and representing the voice of the customer in quarterly planning.',
    description:
      'A long-form role description that exercises truncation on the listing page. The full text is only shown here, on the details page.',
    location: 'Kandy, Sri Lanka',
    category: 'Customer Success',
    skills: ['Stakeholder management', 'Enterprise onboarding', 'Healthcare compliance'],
    employmentType: 'Full-time',
    workplaceType: 'On-site',
    applicationDeadline: '2026-10-20',
  },
  {
    id: 'b3f1c0de-0004-4a00-8000-000000000004',
    title: 'Data Analyst',
    companyName: 'Northwind Analytics',
  },
  {
    id: 'b3f1c0de-0005-4a00-8000-000000000005',
    title: 'UX Designer',
    companyName: 'Demo Company',
    summary: 'Shape research-led, accessible product experiences.',
    location: 'Colombo, Sri Lanka',
    skills: ['Figma', 'User research'],
    workplaceType: 'Hybrid',
  },
];
