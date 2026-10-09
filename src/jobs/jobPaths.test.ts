import { describe, expect, it } from 'vitest';
import { jobApplyPath, jobPath, jobSlug, jobUrlKey } from './jobPaths';

const JOB = { id: 'b3f1c0de-0004-4a00-8000-000000000004', title: 'Data Analyst', companyName: 'Northwind Analytics' };

describe('job paths', () => {
  it('uses the title and company, with no id', () => {
    expect(jobPath(JOB)).toBe('/jobs/data-analyst-northwind-analytics');
    expect(jobApplyPath(JOB)).toBe('/jobs/data-analyst-northwind-analytics/apply');
  });

  it("prefers the backend's slug when it sends one", () => {
    expect(jobPath({ ...JOB, slug: 'data-analyst-northwind-analytics-2' })).toBe('/jobs/data-analyst-northwind-analytics-2');
  });

  it('makes tidy words from punctuation, accents and symbols', () => {
    expect(jobSlug({ title: 'Backend Engineer (Java / Spring Boot)', companyName: 'Café & Co.' })).toBe(
      'backend-engineer-java-spring-boot-cafe-co',
    );
  });

  it('keeps long slugs short without cutting a word in half', () => {
    const slug = jobSlug({ title: 'Principal Customer Success and Implementation Manager for Enterprise Accounts', companyName: 'Acme' });
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug).toBe('principal-customer-success-and-implementation-manager-for-enterprise-accounts');
  });

  it('falls back to the id when the title has no latin letters', () => {
    expect(jobUrlKey({ ...JOB, title: 'මෘදුකාංග ඉංජිනේරු', companyName: 'සමාගම' })).toBe(JOB.id);
  });
});
