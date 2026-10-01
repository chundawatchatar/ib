-- Supported master data for the single-organization salary manager.
-- These records are installed by migration; the seed script only adds employees.
INSERT INTO "currencies" ("code", "name", "minor_units") VALUES
('USD', 'US Dollar', '2'),
('GBP', 'Pound Sterling', '2'),
('EUR', 'Euro', '2'),
('INR', 'Indian Rupee', '2'),
('JPY', 'Yen', '0'),
('CAD', 'Canadian Dollar', '2'),
('AUD', 'Australian Dollar', '2'),
('SGD', 'Singapore Dollar', '2'),
('BRL', 'Brazilian Real', '2');
--> statement-breakpoint
INSERT INTO "countries" ("code", "name", "default_currency") VALUES
('US', 'United States', 'USD'),
('GB', 'United Kingdom', 'GBP'),
('DE', 'Germany', 'EUR'),
('FR', 'France', 'EUR'),
('IN', 'India', 'INR'),
('JP', 'Japan', 'JPY'),
('CA', 'Canada', 'CAD'),
('AU', 'Australia', 'AUD'),
('SG', 'Singapore', 'SGD'),
('BR', 'Brazil', 'BRL');
--> statement-breakpoint
INSERT INTO "departments" ("id", "name") VALUES
('cfe7a498-7ed2-52cb-abd3-5ecb3b8700f4', 'Engineering'),
('cdcb6b00-1ff5-5758-8ac6-77bb05fe1211', 'Finance'),
('7de04d5d-7d02-528c-bf1e-34c4527193e4', 'Operations'),
('5003e322-b330-5bce-879e-67a9d81ed114', 'People'),
('eb38e2a9-81f2-5639-bcfa-3689f5f1df4d', 'Sales');
--> statement-breakpoint
INSERT INTO "job_titles" ("id", "name") VALUES
('23f0cca1-60a6-5ab8-aa1c-55e2d869becd', 'Account Executive'),
('e9cf11b3-d30c-5546-abda-4318faa8552d', 'Analyst'),
('5842c669-81ef-55f3-b89e-e646d1b00943', 'Coordinator'),
('fed4297f-0c4a-53b7-a81b-72d3cf20325f', 'Engineer'),
('509b440d-a49d-559a-8e52-f4d2a7e7f712', 'Specialist');
--> statement-breakpoint
-- Static dated rates are exercise data, not observed market quotes.
INSERT INTO "fx_rates" ("source_currency_code", "target_currency_code", "rate_date", "rate") VALUES
('USD', 'USD', '2026-01-01', '1'),
('GBP', 'USD', '2026-01-01', '1.30'),
('EUR', 'USD', '2026-01-01', '1.10'),
('INR', 'USD', '2026-01-01', '0.012'),
('JPY', 'USD', '2026-01-01', '0.0067'),
('CAD', 'USD', '2026-01-01', '0.74'),
('AUD', 'USD', '2026-01-01', '0.66'),
('SGD', 'USD', '2026-01-01', '0.75'),
('BRL', 'USD', '2026-01-01', '0.20');
