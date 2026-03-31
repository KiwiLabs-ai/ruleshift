
INSERT INTO watchlist_templates (name, description, industries, key_sources, source_ids, source_count) VALUES
(
  'Mobile App Compliance Essentials',
  'Core regulatory sources for mobile app publishers covering app store policies, data privacy, and advertising rules.',
  ARRAY['Mobile App Publishing'],
  ARRAY['Apple App Store Review Guidelines', 'Google Play Developer Program Policy', 'COPPA Rule — Children''s Privacy', 'GDPR Official Regulation', 'CCPA/CPRA Regulations'],
  (SELECT ARRAY(SELECT id FROM policy_sources WHERE name IN ('Apple App Store Review Guidelines', 'Google Play Developer Program Policy', 'Google Play Data Safety Requirements', 'Apple App Privacy Details', 'Apple App Tracking Transparency', 'GDPR Official Regulation', 'CCPA/CPRA Regulations', 'COPPA Rule — Children''s Privacy', 'WCAG 2.1 Guidelines', 'Google Ads Policies', 'FTC Endorsements & Testimonials Guide'))),
  11
),
(
  'Fintech Regulatory Core',
  'Essential banking, payment, and AML regulations for fintech companies and financial service providers.',
  ARRAY['Fintech & Financial Services'],
  ARRAY['CFPB Regulation E — Electronic Fund Transfers', 'PCI DSS Security Standards', 'FinCEN AML Guidance', 'FINRA Rules & Guidance', 'FTC GLBA Privacy & Safeguards Rule'],
  (SELECT ARRAY(SELECT id FROM policy_sources WHERE name IN ('CFPB Regulation E — Electronic Fund Transfers', 'CFPB Regulation Z — Truth in Lending', 'FDIC Deposit Insurance Coverage', 'PCI DSS Security Standards', 'FinCEN AML Guidance', 'FinCEN Beneficial Ownership Registry', 'FATF Recommendations', 'FINRA Rules & Guidance', 'FTC GLBA Privacy & Safeguards Rule', 'CCPA/CPRA Regulations', 'SEC Crypto Asset Activities FAQs'))),
  11
),
(
  'Crypto & Digital Assets Compliance',
  'Regulatory sources focused on cryptocurrency, digital asset securities, and emerging blockchain regulations.',
  ARRAY['Fintech & Financial Services'],
  ARRAY['SEC Crypto Asset Activities FAQs', 'FinCEN AML Guidance', 'FATF Recommendations'],
  (SELECT ARRAY(SELECT id FROM policy_sources WHERE name IN ('SEC Crypto Asset Activities FAQs', 'FinCEN AML Guidance', 'FinCEN Beneficial Ownership Registry', 'FATF Recommendations', 'FINRA Rules & Guidance'))),
  5
),
(
  'Healthcare HIPAA & Compliance',
  'HIPAA rules, FDA regulations, and CMS guidelines for healthcare organizations and health tech companies.',
  ARRAY['Healthcare'],
  ARRAY['HIPAA Security Rule', 'HIPAA Privacy Rule', 'FDA Medical Device Guidance', 'Medicare Telehealth Coverage', 'ONC Cures Act Final Rule'],
  (SELECT ARRAY(SELECT id FROM policy_sources WHERE name IN ('HIPAA Security Rule', 'HIPAA Privacy Rule', 'HIPAA Breach Notification Rule', 'FDA Medical Device Guidance', 'FDA 21 CFR Part 11 — Electronic Records', 'FDA 21 CFR Part 820 — Quality System', 'Medicare Physician Fee Schedule', 'Medicare Telehealth Coverage', 'ONC Cures Act Final Rule'))),
  9
),
(
  'Digital Health & Telehealth',
  'Regulatory sources for telehealth platforms, health apps, and digital health technology companies.',
  ARRAY['Healthcare'],
  ARRAY['Medicare Telehealth Coverage', 'HIPAA Security Rule', 'ONC Cures Act Final Rule'],
  (SELECT ARRAY(SELECT id FROM policy_sources WHERE name IN ('Medicare Telehealth Coverage', 'HIPAA Security Rule', 'HIPAA Privacy Rule', 'ONC Cures Act Final Rule', 'FDA Medical Device Guidance', 'GDPR Official Regulation', 'CCPA/CPRA Regulations'))),
  7
),
(
  'Marketing & Advertising Compliance',
  'FTC advertising rules, platform policies, email marketing regulations, and consumer protection for marketing agencies.',
  ARRAY['Marketing Agency'],
  ARRAY['FTC Advertising & Marketing Guidance', 'Google Ads Policies', 'Meta Advertising Standards', 'CAN-SPAM Compliance Guide', 'TCPA Telephone Consumer Protection Act'],
  (SELECT ARRAY(SELECT id FROM policy_sources WHERE name IN ('FTC Advertising & Marketing Guidance', 'FTC Endorsements & Testimonials Guide', 'FTC Online Advertising Rules', 'Google Ads Policies', 'Meta Advertising Standards', 'CAN-SPAM Compliance Guide', 'TCPA Telephone Consumer Protection Act', 'NAD National Advertising Division', 'GDPR Official Regulation', 'CCPA/CPRA Regulations'))),
  10
),
(
  'E-commerce Compliance Essentials',
  'Consumer protection, payment compliance, product safety, and platform policies for online sellers.',
  ARRAY['E-commerce'],
  ARRAY['FTC Online Advertising Rules', 'PCI DSS Security Standards', 'CPSC Online Sellers Safety Guide', 'Amazon Seller Central Policies', 'State Sales Tax Economic Nexus Guide'],
  (SELECT ARRAY(SELECT id FROM policy_sources WHERE name IN ('FTC Online Advertising Rules', 'PCI DSS Security Standards', 'CPSC Online Sellers Safety Guide', 'CPSC Regulations & Standards', 'Amazon Seller Central Policies', 'Shopify Terms of Service', 'State Sales Tax Economic Nexus Guide', 'ADA Web Accessibility Guidance', 'CCPA/CPRA Regulations', 'GDPR Official Regulation', 'CAN-SPAM Compliance Guide'))),
  11
),
(
  'Legal Practice Compliance',
  'Ethics rules, advertising regulations, trust account standards, and technology guidance for law firms.',
  ARRAY['Legal Services'],
  ARRAY['ABA Model Rules of Professional Conduct', 'ABA IOLTA Program Overview', 'GDPR Official Regulation'],
  (SELECT ARRAY(SELECT id FROM policy_sources WHERE name IN ('ABA Model Rules of Professional Conduct', 'ABA IOLTA Program Overview', 'GDPR Official Regulation', 'CCPA/CPRA Regulations', 'FTC Advertising & Marketing Guidance'))),
  5
),
(
  'Data Privacy Essentials',
  'Core data privacy regulations applicable to any business handling personal data — GDPR, CCPA, and FTC guidance.',
  ARRAY['Mobile App Publishing', 'Fintech & Financial Services', 'Healthcare', 'Marketing Agency', 'E-commerce', 'Legal Services', 'Other'],
  ARRAY['GDPR Official Regulation', 'CCPA/CPRA Regulations', 'EDPB Guidelines & Recommendations', 'COPPA Rule — Children''s Privacy'],
  (SELECT ARRAY(SELECT id FROM policy_sources WHERE name IN ('GDPR Official Regulation', 'EDPB Guidelines & Recommendations', 'CCPA/CPRA Regulations', 'CPPA Announcements & Rule Updates', 'COPPA Rule — Children''s Privacy', 'FTC GLBA Privacy & Safeguards Rule'))),
  6
),
(
  'Web Accessibility & ADA Compliance',
  'Accessibility standards and ADA requirements for websites and digital products across all industries.',
  ARRAY['Mobile App Publishing', 'E-commerce', 'Healthcare', 'Marketing Agency', 'Legal Services', 'Other'],
  ARRAY['WCAG 2.1 Guidelines', 'ADA Web Accessibility Guidance'],
  (SELECT ARRAY(SELECT id FROM policy_sources WHERE name IN ('WCAG 2.1 Guidelines', 'ADA Web Accessibility Guidance'))),
  2
);
