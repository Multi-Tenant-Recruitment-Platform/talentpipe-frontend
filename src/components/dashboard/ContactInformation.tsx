import { websiteLabel, type CompanyFormValues } from '../../dashboard/companyProfile';
import { DetailItem } from './DetailItem';

/**
 * How to reach the company: email, phone, website.
 *
 * <p>Every value that can be acted on is a link. A phone number a candidate
 * has to retype is a phone number that gets typed wrong.</p>
 */
export function ContactInformation({ values }: { values: CompanyFormValues }) {
  return (
    <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      <DetailItem
        icon="envelope"
        label="Email"
        value={values.email}
        href={values.email ? `mailto:${values.email}` : undefined}
        testId="company-email"
      />
      <DetailItem
        icon="envelope"
        label="HR / recruitment"
        value={values.hrEmail}
        href={values.hrEmail ? `mailto:${values.hrEmail}` : undefined}
        testId="company-hrEmail"
      />
      <DetailItem
        icon="phone"
        label="Phone"
        value={values.phone}
        // 'tel:' wants dialable characters only, but the separators stay in
        // the text — they are what makes a number readable.
        href={values.phone ? `tel:${values.phone.replace(/[^\d+]/g, '')}` : undefined}
        testId="company-phone"
      />
      <DetailItem
        icon="phone"
        label="Alternative phone"
        value={values.alternativePhone}
        href={
          values.alternativePhone
            ? `tel:${values.alternativePhone.replace(/[^\d+]/g, '')}`
            : undefined
        }
        testId="company-alternativePhone"
      />
      <DetailItem
        icon="globe"
        label="Website"
        // The scheme is what the browser needs, not what a person wants to read.
        value={values.website ? websiteLabel(values.website) : ''}
        href={values.website || undefined}
        external
        testId="company-website"
      />
    </dl>
  );
}
