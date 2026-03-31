
-- Expanded Banking & Lending
INSERT INTO policy_sources (name, url, category, description) VALUES
('OCC Bulletins & News Releases', 'https://www.occ.gov/news-events/newsroom/news-issuances-by-year/bulletins/index-bulletins.html', 'Banking Regulation', 'Official OCC bulletins providing guidance on banking practices, capital requirements, and supervisory expectations.'),
('FDIC Rules & Regulations', 'https://www.fdic.gov/laws-and-regulations', 'Banking Regulation', 'Comprehensive repository of FDIC rules, regulations, and supervisory guidance governing insured depository institutions.'),
('Federal Reserve Regulation CC — Funds Availability', 'https://www.federalreserve.gov/paymentsystems/regcc-about.htm', 'Banking Regulation', 'Regulation establishing expedited funds availability standards and check collection procedures for depository institutions.'),
('Federal Reserve Regulation DD — Truth in Savings', 'https://www.federalreserve.gov/supervisionreg/regddcg.htm', 'Banking Regulation', 'Regulation requiring transparent disclosure of deposit account terms, fees, and interest rates to consumers.'),
('Federal Reserve Regulation II — Debit Interchange', 'https://www.federalreserve.gov/paymentsystems/regii-about.htm', 'Banking Regulation', 'Regulation implementing the Durbin Amendment standards for reasonable and proportional debit card interchange fees.'),
('CFPB Open Banking — Section 1033', 'https://www.consumerfinance.gov/personal-financial-data-rights/', 'Banking Regulation', 'Rule enabling consumers to access and transfer their financial data to authorized third parties from covered institutions.'),
('CFPB Enforcement Actions', 'https://www.consumerfinance.gov/enforcement/', 'Banking Regulation', 'Official enforcement case documentation addressing violations of consumer financial laws.'),
('NCUA Credit Union Regulations', 'https://ncua.gov/regulation-supervision/rules-regulations', 'Banking Regulation', 'National Credit Union Administration rules governing federally chartered and insured credit unions.'),
('Equal Credit Opportunity Act — Regulation B', 'https://www.consumerfinance.gov/rules-policy/regulations/1002/', 'Banking Regulation', 'CFPB regulation prohibiting credit discrimination and requiring fair lending practices in all credit transactions.'),
('Community Reinvestment Act Regulations', 'https://www.federalreserve.gov/consumerscommunities/cra_about.htm', 'Banking Regulation', 'Federal regulations requiring banks to demonstrate commitment to lending and investment in underserved communities.'),
('TILA-RESPA Integrated Disclosures', 'https://www.consumerfinance.gov/compliance/compliance-resources/mortgage-resources/tila-respa-integrated-disclosures/', 'Banking Regulation', 'CFPB rule integrating Truth in Lending and Real Estate Settlement Procedures Act into unified mortgage disclosure forms.'),
('UDAAP Examination Guidance', 'https://www.consumerfinance.gov/compliance/supervision-examinations/unfair-deceptive-or-abusive-acts-or-practices-udaaps-examination-procedures/', 'Banking Regulation', 'CFPB examination procedures for identifying unfair, deceptive, or abusive consumer financial practices.');

-- Payments & Money Transmission
INSERT INTO policy_sources (name, url, category, description) VALUES
('CSBS Money Transmission Modernization Act', 'https://www.csbs.org/csbs-money-transmission-modernization-act-mtma', 'Payment Compliance', 'Uniform state standards for money transmitter licensing and prudential requirements.'),
('Nacha ACH Compliance Rules', 'https://www.nacha.org/content/compliance', 'Payment Compliance', 'Nacha rules governing ACH network participation, transaction processing, and fraud prevention measures.'),
('Visa Core Rules', 'https://usa.visa.com/dam/VCOM/download/about-visa/visa-rules-public.pdf', 'Payment Compliance', 'Official Visa core rules governing cardholder benefits, merchant compliance, and transaction processing.'),
('Mastercard Transaction Processing Rules', 'https://www.mastercard.us/content/dam/public/mastercardcom/na/global-site/documents/mastercard-rules.pdf', 'Payment Compliance', 'Mastercard rules covering authentication, authorization, settlement, and merchant compliance requirements.'),
('FedNow Service Rules', 'https://www.federalreserve.gov/paymentsystems/fednow_about.htm', 'Payment Compliance', 'Federal Reserve real-time payment service rules for instant 24x7x365 domestic fund transfers.'),
('CFPB Prepaid Card Rule', 'https://www.consumerfinance.gov/prepaid-rule/', 'Payment Compliance', 'CFPB regulation extending consumer protections to prepaid accounts, payroll cards, and government benefit cards.'),
('CFPB Remittance Transfer Rule', 'https://www.consumerfinance.gov/compliance/compliance-resources/deposit-accounts-resources/remittance-transfer-rule/', 'Payment Compliance', 'CFPB rule requiring transparency in international remittance transfers including mandatory fee and exchange rate disclosure.');

-- Expanded Crypto & Digital Assets
INSERT INTO policy_sources (name, url, category, description) VALUES
('SEC Digital Asset Securities Framework', 'https://www.sec.gov/about/divisions-offices/division-corporation-finance/framework-investment-contract-analysis-digital-assets', 'Crypto Regulation', 'SEC framework for analyzing whether digital assets constitute investment contracts under federal securities law.'),
('CFTC Digital Assets Hub', 'https://www.cftc.gov/digitalassets/index.htm', 'Crypto Regulation', 'CFTC regulatory hub covering tokenized collateral, digital commodity classification, and futures oversight.'),
('FinCEN Virtual Currency Guidance', 'https://www.fincen.gov/resources/statutes-regulations/guidance/application-fincens-regulations-persons-administering', 'Crypto Regulation', 'FinCEN guidance on AML/CFT requirements for virtual currency exchangers, administrators, and MSBs.'),
('OCC Crypto-Asset Guidance Letters', 'https://www.occ.gov/news-issuances/news-releases/2025/nr-occ-2025-121.html', 'Crypto Regulation', 'OCC interpretive letters clarifying national bank authority for crypto custody, trading, and stablecoin activities.'),
('New York BitLicense', 'https://www.dfs.ny.gov/virtual_currency_businesses', 'Crypto Regulation', 'New York DFS virtual currency business licensing framework for cryptocurrency exchanges and custodians.'),
('EU MiCA — Markets in Crypto-Assets', 'https://www.esma.europa.eu/esmas-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica', 'Crypto Regulation', 'EU comprehensive regulatory framework for crypto-asset issuers and service providers across member states.'),
('FATF Virtual Assets Guidance', 'https://www.fatf-gafi.org/en/topics/virtual-assets.html', 'Crypto Regulation', 'FATF AML/CFT standards for virtual assets and virtual asset service providers globally.'),
('IRS Digital Assets Tax Guidance', 'https://www.irs.gov/filing/digital-assets', 'Crypto Regulation', 'IRS guidance treating virtual currency as property for tax purposes with capital gains reporting requirements.');

-- Insurance Regulation
INSERT INTO policy_sources (name, url, category, description) VALUES
('NAIC Model Laws & Regulations', 'https://content.naic.org/model-laws', 'Insurance Regulation', 'National Association of Insurance Commissioners model laws for state adoption to standardize insurance regulation.'),
('NAIC Innovation & Technology Committee', 'https://content.naic.org/committees/h/innovation-cybersecurity-technology-cmte', 'Insurance Regulation', 'NAIC committee addressing cybersecurity, AI/ML governance, and insurtech compliance guidelines.'),
('NAIC InsurTech Guidance', 'https://content.naic.org/insurance-topics/insurtech', 'Insurance Regulation', 'NAIC resources on regulatory treatment of insurtech innovation and emerging technology oversight.'),
('NAIC AI in Insurance Guidance', 'https://content.naic.org/insurance-topics/artificial-intelligence', 'Insurance Regulation', 'NAIC model bulletin on insurers responsible use of AI in underwriting and rating decisions.'),
('NY DFS Insurance Cybersecurity — 23 NYCRR 500', 'https://www.dfs.ny.gov/industry_guidance/cybersecurity', 'Insurance Regulation', 'Cybersecurity requirements for NY-licensed financial services and insurance companies including MFA and breach notification.');
