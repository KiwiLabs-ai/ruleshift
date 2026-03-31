
-- Template 11: State Privacy Law Tracker
INSERT INTO watchlist_templates (name, description, industries, key_sources, source_ids, source_count)
VALUES (
  'State Privacy Law Tracker',
  'Comprehensive tracker for U.S. state-level privacy laws including CCPA, Virginia VCDPA, Colorado CPA, and 15+ other active state privacy statutes.',
  ARRAY['Mobile App Publishing', 'Fintech & Financial Services', 'Healthcare', 'Marketing Agency', 'E-commerce', 'Legal Services', 'Other'],
  ARRAY['CCPA/CPRA Regulations', 'Virginia VCDPA', 'Colorado Privacy Act', 'Texas Data Privacy and Security Act', 'New York SHIELD Act'],
  (SELECT ARRAY(SELECT id FROM policy_sources WHERE category = 'State Privacy Law' OR name IN ('CCPA/CPRA Regulations', 'CPPA Announcements & Rule Updates'))),
  (SELECT count(*)::int FROM policy_sources WHERE category = 'State Privacy Law' OR name IN ('CCPA/CPRA Regulations', 'CPPA Announcements & Rule Updates'))
);

-- Template 12: International Privacy Compliance
INSERT INTO watchlist_templates (name, description, industries, key_sources, source_ids, source_count)
VALUES (
  'International Privacy Compliance',
  'Global data protection laws for businesses operating internationally — GDPR, UK GDPR, Brazil LGPD, Canada PIPEDA, and 10+ more jurisdictions.',
  ARRAY['Mobile App Publishing', 'Fintech & Financial Services', 'E-commerce', 'Marketing Agency', 'Other'],
  ARRAY['GDPR Official Regulation', 'UK GDPR & Data Protection Act 2018', 'Brazil LGPD', 'Canada PIPEDA', 'Japan APPI'],
  (SELECT ARRAY(SELECT id FROM policy_sources WHERE category = 'International Privacy' OR name IN ('GDPR Official Regulation', 'EDPB Guidelines & Recommendations'))),
  (SELECT count(*)::int FROM policy_sources WHERE category = 'International Privacy' OR name IN ('GDPR Official Regulation', 'EDPB Guidelines & Recommendations'))
);

-- Template 13: AI Regulation & Platform Policies
INSERT INTO watchlist_templates (name, description, industries, key_sources, source_ids, source_count)
VALUES (
  'AI Regulation & Platform Policies',
  'AI governance regulations and major AI platform usage policies — EU AI Act, NIST AI RMF, plus terms from OpenAI, Anthropic, Google, Meta, and more.',
  ARRAY['Mobile App Publishing', 'Fintech & Financial Services', 'Healthcare', 'Marketing Agency', 'E-commerce', 'Legal Services', 'Other'],
  ARRAY['EU AI Act', 'NIST AI Risk Management Framework', 'OpenAI Usage Policies', 'Anthropic Acceptable Use Policy', 'Google Generative AI Terms'],
  (SELECT ARRAY(SELECT id FROM policy_sources WHERE category IN ('AI Regulation', 'AI Platform Policy'))),
  (SELECT count(*)::int FROM policy_sources WHERE category IN ('AI Regulation', 'AI Platform Policy'))
);

-- Template 14: Cybersecurity Framework Compliance
INSERT INTO watchlist_templates (name, description, industries, key_sources, source_ids, source_count)
VALUES (
  'Cybersecurity Framework Compliance',
  'Major cybersecurity frameworks and requirements — NIST CSF 2.0, SOC 2, ISO 27001, SEC disclosure rules, and breach notification laws.',
  ARRAY['Mobile App Publishing', 'Fintech & Financial Services', 'Healthcare', 'E-commerce', 'Legal Services', 'Other'],
  ARRAY['NIST Cybersecurity Framework 2.0', 'SOC 2 Trust Services Criteria', 'ISO 27001:2022 Standard', 'SEC Cybersecurity Disclosure Rules', 'State Breach Notification Laws'],
  (SELECT ARRAY(SELECT id FROM policy_sources WHERE category = 'Cybersecurity')),
  (SELECT count(*)::int FROM policy_sources WHERE category = 'Cybersecurity')
);

-- Template 15: Employment & Labor Law Essentials
INSERT INTO watchlist_templates (name, description, industries, key_sources, source_ids, source_count)
VALUES (
  'Employment & Labor Law Essentials',
  'Federal employment regulations for any business with employees — FLSA, EEOC, OSHA, FMLA, ADA, and worker classification rules.',
  ARRAY['Fintech & Financial Services', 'Healthcare', 'Marketing Agency', 'E-commerce', 'Legal Services', 'Other'],
  ARRAY['DOL FLSA — Wage & Overtime Rules', 'EEOC Employment Discrimination Guidance', 'OSHA Workplace Safety Standards', 'FMLA Regulations', 'ADA Employment Provisions — Title I'],
  (SELECT ARRAY(SELECT id FROM policy_sources WHERE category = 'Employment Law')),
  (SELECT count(*)::int FROM policy_sources WHERE category = 'Employment Law')
);

-- Template 16: ESG & Climate Disclosure
INSERT INTO watchlist_templates (name, description, industries, key_sources, source_ids, source_count)
VALUES (
  'ESG & Climate Disclosure',
  'Environmental, social, and governance reporting requirements — SEC climate rules, EU CSRD, California climate accountability, and GHG Protocol.',
  ARRAY['Fintech & Financial Services', 'E-commerce', 'Legal Services', 'Other'],
  ARRAY['SEC Climate Disclosure Rule', 'EU CSRD — Corporate Sustainability Reporting', 'California Climate Accountability Acts', 'GHG Protocol Standards'],
  (SELECT ARRAY(SELECT id FROM policy_sources WHERE category = 'ESG/Environmental')),
  (SELECT count(*)::int FROM policy_sources WHERE category = 'ESG/Environmental')
);

-- Template 17: Payments & Money Transmission
INSERT INTO watchlist_templates (name, description, industries, key_sources, source_ids, source_count)
VALUES (
  'Payments & Money Transmission',
  'Payment processing compliance including PCI DSS, card network rules, ACH standards, and money transmission licensing.',
  ARRAY['Fintech & Financial Services', 'E-commerce'],
  ARRAY['PCI DSS Security Standards', 'Nacha ACH Network Rules', 'Visa Core Rules & Programs', 'Mastercard Transaction Processing Rules'],
  (SELECT ARRAY(SELECT id FROM policy_sources WHERE category = 'Payment Compliance')),
  (SELECT count(*)::int FROM policy_sources WHERE category = 'Payment Compliance')
);

-- Template 18: Crypto & Digital Assets
INSERT INTO watchlist_templates (name, description, industries, key_sources, source_ids, source_count)
VALUES (
  'Crypto & Digital Assets — Full Regulatory Stack',
  'Complete regulatory landscape for crypto businesses — SEC, CFTC, FinCEN, OCC, state licensing, EU MiCA, and IRS tax guidance.',
  ARRAY['Fintech & Financial Services'],
  ARRAY['SEC Digital Asset Securities Framework', 'CFTC Digital Assets Hub', 'EU MiCA — Markets in Crypto-Assets', 'New York BitLicense', 'IRS Digital Assets Tax Guidance'],
  (SELECT ARRAY(SELECT id FROM policy_sources WHERE category = 'Crypto Regulation')),
  (SELECT count(*)::int FROM policy_sources WHERE category = 'Crypto Regulation')
);

-- Template 19: Insurance Regulatory Compliance
INSERT INTO watchlist_templates (name, description, industries, key_sources, source_ids, source_count)
VALUES (
  'Insurance Regulatory Compliance',
  'NAIC model laws, insurtech guidance, AI in insurance, and state cybersecurity requirements for insurance companies.',
  ARRAY['Fintech & Financial Services'],
  ARRAY['NAIC Model Laws & Regulations', 'NAIC AI in Insurance Guidance', 'NAIC InsurTech Guidance'],
  (SELECT ARRAY(SELECT id FROM policy_sources WHERE category = 'Insurance Regulation')),
  (SELECT count(*)::int FROM policy_sources WHERE category = 'Insurance Regulation')
);

-- Template 20: Social Media & Ad Platform Policies
INSERT INTO watchlist_templates (name, description, industries, key_sources, source_ids, source_count)
VALUES (
  'Social Media & Ad Platform Policies',
  'Advertising and seller policies across major platforms — Google, Meta, TikTok, LinkedIn, X, Pinterest, Amazon, Shopify, and more.',
  ARRAY['Mobile App Publishing', 'Marketing Agency', 'E-commerce'],
  ARRAY['Google Ads Policies', 'Meta Advertising Standards', 'TikTok Advertising Policies', 'Amazon Seller Central Policies', 'Shopify Terms of Service'],
  (SELECT ARRAY(SELECT id FROM policy_sources WHERE category = 'Platform Policy')),
  (SELECT count(*)::int FROM policy_sources WHERE category = 'Platform Policy')
);
