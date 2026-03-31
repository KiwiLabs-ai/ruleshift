
-- U.S. State Privacy Laws
INSERT INTO policy_sources (name, url, category, description) VALUES
('Virginia VCDPA', 'https://lis.virginia.gov/cgi-bin/legp604.exe?000+cod+59.1-575', 'State Privacy Law', 'Virginia Consumer Data Protection Act granting consumers rights to access, delete, and correct personal data, effective January 2023.'),
('Colorado Privacy Act', 'https://coag.gov/resources/colorado-privacy-act/', 'State Privacy Law', 'Colorado comprehensive privacy law requiring data protection assessments and consumer consent for sensitive data processing.'),
('Connecticut Data Privacy Act', 'https://portal.ct.gov/ag/sections/privacy/the-connecticut-data-privacy-act', 'State Privacy Law', 'Connecticut privacy law granting consumers data access, deletion, and opt-out rights for targeted advertising and data sales.'),
('Utah Consumer Privacy Act', 'https://dcp.utah.gov/ucpa/', 'State Privacy Law', 'Utah privacy law providing consumers rights to access, delete, correct, and port personal data held by businesses.'),
('Texas Data Privacy and Security Act', 'https://www.texasattorneygeneral.gov/consumer-protection/file-consumer-complaint/consumer-privacy-rights/texas-data-privacy-and-security-act', 'State Privacy Law', 'Texas comprehensive privacy law establishing consumer rights and data processor obligations, effective July 2024.'),
('Oregon Consumer Privacy Act', 'https://www.doj.state.or.us/consumer-protection/for-businesses/privacy-law-faqs-for-businesses/', 'State Privacy Law', 'Oregon privacy law providing consumer rights to access, delete, correct, and obtain data portability, effective July 2024.'),
('Montana Consumer Data Privacy Act', 'https://dojmt.gov/office-of-consumer-protection/montana-consumer-data-privacy/', 'State Privacy Law', 'Montana privacy law establishing consumer rights and business data handling obligations, effective October 2024.'),
('Iowa Consumer Data Protection Act', 'https://www.legis.iowa.gov/docs/code//715D.pdf', 'State Privacy Law', 'Iowa privacy law providing consumer rights to access, delete, correct, and control personal data, effective January 2025.'),
('Indiana Consumer Data Protection Act', 'https://iga.in.gov/ic/2024/Title_24/Article_15.pdf', 'State Privacy Law', 'Indiana privacy law granting consumers rights to confirm processing, access, correct, and delete personal data, effective January 2026.'),
('Tennessee Information Protection Act', 'https://www.tn.gov/attorneygeneral/', 'State Privacy Law', 'Tennessee privacy law protecting consumer data and granting individuals control over personal information, effective July 2025.'),
('Delaware Personal Data Privacy Act', 'https://delcode.delaware.gov/title6/c012d/index.html', 'State Privacy Law', 'Delaware privacy law establishing consumer rights and data controller obligations, effective January 2025.'),
('New Jersey Data Privacy Act', 'https://www.njconsumeraffairs.gov/ocp/Pages/NJ-Data-Privacy-Law-FAQ.aspx', 'State Privacy Law', 'New Jersey privacy law protecting residents personal data with strict processing standards, effective January 2025.'),
('New Hampshire Privacy Act', 'https://www.doj.nh.gov/data-privacy-enforcement', 'State Privacy Law', 'New Hampshire privacy law creating consumer rights and business responsibilities regarding personal data, effective January 2025.'),
('Kentucky Consumer Data Protection Act', 'https://apps.legislature.ky.gov/record/24rs/hb15.html', 'State Privacy Law', 'Kentucky privacy law applying to persons controlling or processing personal data of 100,000+ consumers, effective January 2026.'),
('Maryland Online Data Privacy Act', 'https://mgaleg.maryland.gov/mgawebsite/Legislation/Details/sb0541?ys=2024RS', 'State Privacy Law', 'Maryland privacy law establishing data controller and processor obligations, effective October 2025.'),
('Minnesota Consumer Data Privacy Act', 'https://ag.state.mn.us/Data-Privacy/', 'State Privacy Law', 'Minnesota privacy law protecting consumer data with rights to access, delete, and correct information, effective July 2025.'),
('Nebraska Data Privacy Act', 'https://nebraskalegislature.gov/laws/statutes.php?statute=87-1101', 'State Privacy Law', 'Nebraska privacy law establishing consumer rights and business data security obligations, effective January 2025.'),
('New York SHIELD Act', 'https://ag.ny.gov/resources/organizations/data-breach-reporting/shield-act', 'State Privacy Law', 'New York data security law strengthening breach notification requirements and establishing reasonable security safeguards obligations.');

-- International Privacy & Data Protection
INSERT INTO policy_sources (name, url, category, description) VALUES
('UK GDPR & Data Protection Act 2018', 'https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/', 'International Privacy', 'UK data protection framework enforced by the Information Commissioner''s Office covering GDPR compliance and individual rights.'),
('Brazil LGPD', 'https://lgpd-brazil.info/', 'International Privacy', 'Brazil''s General Personal Data Protection Law establishing comprehensive data protection framework enforced by the ANPD.'),
('Canada PIPEDA', 'https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/', 'International Privacy', 'Canada''s federal private-sector privacy law governing how organizations collect, use, and disclose personal information.'),
('Australia Privacy Act & APPs', 'https://www.oaic.gov.au/privacy/australian-privacy-principles', 'International Privacy', 'Australian Privacy Act establishing 13 Australian Privacy Principles for personal information protection.'),
('Japan APPI', 'https://www.appi.co.jp/en/', 'International Privacy', 'Japan''s Act on the Protection of Personal Information regulating personal data processing by businesses.'),
('South Korea PIPA', 'https://www.pipc.go.kr/eng/', 'International Privacy', 'South Korea''s Personal Information Protection Act, one of the world''s strictest privacy laws enforced by the PIPC.'),
('India Digital Personal Data Protection Act', 'https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf', 'International Privacy', 'India''s DPDPA 2023 establishing framework for data fiduciaries and data principals rights, effective September 2024.'),
('Singapore PDPA', 'https://www.pdpc.gov.sg/', 'International Privacy', 'Singapore Personal Data Protection Act balancing data protection with organizational data usage needs.'),
('China PIPL', 'https://personalinformationprotectionlaw.com/', 'International Privacy', 'China''s Personal Information Protection Law with extraterritorial reach to protect Chinese residents data.'),
('New Zealand Privacy Act 2020', 'https://www.legislation.govt.nz/act/public/2020/31/en/latest/', 'International Privacy', 'New Zealand privacy law replacing the 1993 act, administered by the Office of the Privacy Commissioner.'),
('South Africa POPIA', 'https://popia.co.za/', 'International Privacy', 'South Africa''s Protection of Personal Information Act establishing 8 minimum data processing requirements.'),
('Thailand PDPA', 'https://pdpathailand.com/pdpa/index_eng.html', 'International Privacy', 'Thailand Personal Data Protection Act regulating collection, usage, and processing of personal data.'),
('UAE Data Protection Law', 'https://u.ae/en/about-the-uae/digital-uae/data/data-protection-laws', 'International Privacy', 'UAE Federal Decree-Law on Personal Data Protection establishing comprehensive data protection framework.');

-- AI & Automated Decision-Making Regulations
INSERT INTO policy_sources (name, url, category, description) VALUES
('EU AI Act', 'https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai', 'AI Regulation', 'First comprehensive AI regulation establishing risk-based framework for AI systems, entered into force August 2024.'),
('NIST AI Risk Management Framework', 'https://www.nist.gov/itl/ai-risk-management-framework', 'AI Regulation', 'Voluntary framework for managing AI risks through Govern, Map, Measure, and Manage functions.'),
('NYC Local Law 144 — AI Hiring', 'https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page', 'AI Regulation', 'NYC law requiring bias audits of automated employment decision tools, effective July 2023.'),
('Colorado AI Act', 'https://leg.colorado.gov/bills/sb24-205', 'AI Regulation', 'Colorado law regulating high-risk AI systems in employment, housing, financial services, insurance, and healthcare, effective June 2026.'),
('FTC AI Enforcement Guidance', 'https://www.ftc.gov/industry/technology/artificial-intelligence', 'AI Regulation', 'FTC guidance addressing deceptive AI claims, unfair AI practices, and Operation AI Comply initiative.'),
('EEOC AI Hiring Guidance', 'https://www.eeoc.gov/newsroom/eeoc-launches-initiative-artificial-intelligence-and-algorithmic-fairness', 'AI Regulation', 'EEOC initiative ensuring Title VII and ADA compliance in AI-based employment decisions.'),
('UNESCO AI Ethics Recommendation', 'https://www.unesco.org/en/artificial-intelligence/recommendation-ethics', 'AI Regulation', 'UNESCO recommendation on AI ethics adopted by 194 member states establishing core values for responsible AI.'),
('Canada Directive on Automated Decision-Making', 'https://www.tbs-sct.canada.ca/pol/doc-eng.aspx?id=32592', 'AI Regulation', 'Canadian government directive ensuring automated decision systems maintain transparency, accountability, and procedural fairness.');
