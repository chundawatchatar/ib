CREATE TABLE "countries" (
	"code" varchar(2) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"default_currency" varchar(3),
	CONSTRAINT "countries_code_valid" CHECK ("countries"."code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "countries_name_valid" CHECK (length(trim("countries"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"code" varchar(3) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"minor_units" integer NOT NULL,
	CONSTRAINT "currencies_code_valid" CHECK ("currencies"."code" ~ '^[A-Z]{3}$'),
	CONSTRAINT "currencies_precision_valid" CHECK ("currencies"."minor_units" between 0 and 6),
	CONSTRAINT "currencies_name_valid" CHECK (length(trim("currencies"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "departments_name_unique" UNIQUE("name"),
	CONSTRAINT "departments_name_valid" CHECK (length(trim("departments"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"department_id" uuid NOT NULL,
	"level" text NOT NULL,
	"job_title_id" uuid NOT NULL,
	"salary_minor_units" bigint NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_code_unique" UNIQUE("code"),
	CONSTRAINT "employees_salary_valid" CHECK ("employees"."salary_minor_units" between 1 and 9007199254740991),
	CONSTRAINT "employees_version_valid" CHECK ("employees"."version" > 0),
	CONSTRAINT "employees_text_valid" CHECK (length(trim("employees"."code")) > 0 and length(trim("employees"."name")) > 0 and length(trim("employees"."level")) > 0)
);
--> statement-breakpoint
CREATE TABLE "fx_rates" (
	"source_currency_code" varchar(3) NOT NULL,
	"target_currency_code" varchar(3) NOT NULL,
	"rate_date" date NOT NULL,
	"rate" numeric NOT NULL,
	CONSTRAINT "fx_rates_source_currency_code_target_currency_code_rate_date_pk" PRIMARY KEY("source_currency_code","target_currency_code","rate_date"),
	CONSTRAINT "fx_rates_rate_valid" CHECK ("fx_rates"."rate" > 0 and "fx_rates"."rate" < 'Infinity'::numeric)
);
--> statement-breakpoint
CREATE TABLE "job_titles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "job_titles_name_unique" UNIQUE("name"),
	CONSTRAINT "job_titles_name_valid" CHECK (length(trim("job_titles"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "salary_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"old_salary_minor_units" bigint NOT NULL,
	"new_salary_minor_units" bigint NOT NULL,
	"old_currency_code" varchar(3) NOT NULL,
	"new_currency_code" varchar(3) NOT NULL,
	"employee_version" integer NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text,
	CONSTRAINT "salary_changes_employee_version_unique" UNIQUE("employee_id","employee_version"),
	CONSTRAINT "salary_changes_amounts_valid" CHECK ("salary_changes"."old_salary_minor_units" between 1 and 9007199254740991 and "salary_changes"."new_salary_minor_units" between 1 and 9007199254740991),
	CONSTRAINT "salary_changes_version_valid" CHECK ("salary_changes"."employee_version" > 1)
);
--> statement-breakpoint
ALTER TABLE "countries" ADD CONSTRAINT "countries_default_currency_currencies_code_fk" FOREIGN KEY ("default_currency") REFERENCES "public"."currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_country_code_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_currency_code_currencies_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_job_title_id_job_titles_id_fk" FOREIGN KEY ("job_title_id") REFERENCES "public"."job_titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_rates" ADD CONSTRAINT "fx_rates_source_currency_code_currencies_code_fk" FOREIGN KEY ("source_currency_code") REFERENCES "public"."currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_rates" ADD CONSTRAINT "fx_rates_target_currency_code_currencies_code_fk" FOREIGN KEY ("target_currency_code") REFERENCES "public"."currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_changes" ADD CONSTRAINT "salary_changes_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_changes" ADD CONSTRAINT "salary_changes_old_currency_code_currencies_code_fk" FOREIGN KEY ("old_currency_code") REFERENCES "public"."currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_changes" ADD CONSTRAINT "salary_changes_new_currency_code_currencies_code_fk" FOREIGN KEY ("new_currency_code") REFERENCES "public"."currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employees_country_idx" ON "employees" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "employees_currency_idx" ON "employees" USING btree ("currency_code");--> statement-breakpoint
CREATE INDEX "employees_department_idx" ON "employees" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "employees_job_title_idx" ON "employees" USING btree ("job_title_id");--> statement-breakpoint
CREATE INDEX "employees_level_idx" ON "employees" USING btree ("level");--> statement-breakpoint
CREATE INDEX "employees_salary_idx" ON "employees" USING btree ("salary_minor_units");--> statement-breakpoint
CREATE INDEX "salary_changes_employee_date_idx" ON "salary_changes" USING btree ("employee_id","changed_at");