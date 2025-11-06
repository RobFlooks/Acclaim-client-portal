--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (165f042)
-- Dumped by pg_dump version 16.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_organisation_id_organisations_id_fk;
ALTER TABLE IF EXISTS ONLY public.user_organisations DROP CONSTRAINT IF EXISTS user_organisations_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_organisations DROP CONSTRAINT IF EXISTS user_organisations_organisation_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_recorded_by_fkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_organisation_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_case_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_case_id_cases_id_fk;
ALTER TABLE IF EXISTS ONLY public.external_api_credentials DROP CONSTRAINT IF EXISTS external_api_credentials_organisation_id_fkey;
ALTER TABLE IF EXISTS ONLY public.external_api_credentials DROP CONSTRAINT IF EXISTS external_api_credentials_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.documents DROP CONSTRAINT IF EXISTS documents_uploaded_by_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.documents DROP CONSTRAINT IF EXISTS documents_organisation_id_organisations_id_fk;
ALTER TABLE IF EXISTS ONLY public.documents DROP CONSTRAINT IF EXISTS documents_case_id_cases_id_fk;
ALTER TABLE IF EXISTS ONLY public.cases DROP CONSTRAINT IF EXISTS cases_organisation_id_organisations_id_fk;
ALTER TABLE IF EXISTS ONLY public.case_submission_documents DROP CONSTRAINT IF EXISTS case_submission_documents_case_submission_id_fkey;
ALTER TABLE IF EXISTS ONLY public.case_activities DROP CONSTRAINT IF EXISTS case_activities_case_id_cases_id_fk;
ALTER TABLE IF EXISTS ONLY public.audit_log DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.audit_log DROP CONSTRAINT IF EXISTS audit_log_organisation_id_fkey;
DROP INDEX IF EXISTS public."IDX_session_expire";
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_external_ref_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_unique;
ALTER TABLE IF EXISTS ONLY public.user_organisations DROP CONSTRAINT IF EXISTS user_organisations_user_id_organisation_id_key;
ALTER TABLE IF EXISTS ONLY public.user_organisations DROP CONSTRAINT IF EXISTS user_organisations_pkey;
ALTER TABLE IF EXISTS ONLY public.user_activity_logs DROP CONSTRAINT IF EXISTS user_activity_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.system_metrics DROP CONSTRAINT IF EXISTS system_metrics_pkey;
ALTER TABLE IF EXISTS ONLY public.user_sessions DROP CONSTRAINT IF EXISTS session_pkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_pkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_external_ref_key;
ALTER TABLE IF EXISTS ONLY public.organisations DROP CONSTRAINT IF EXISTS organizations_pkey;
ALTER TABLE IF EXISTS ONLY public.organisations DROP CONSTRAINT IF EXISTS organisations_external_ref_key;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE IF EXISTS ONLY public.login_attempts DROP CONSTRAINT IF EXISTS login_attempts_pkey;
ALTER TABLE IF EXISTS ONLY public.external_api_credentials DROP CONSTRAINT IF EXISTS external_api_credentials_pkey;
ALTER TABLE IF EXISTS ONLY public.documents DROP CONSTRAINT IF EXISTS documents_pkey;
ALTER TABLE IF EXISTS ONLY public.cases DROP CONSTRAINT IF EXISTS cases_pkey;
ALTER TABLE IF EXISTS ONLY public.cases DROP CONSTRAINT IF EXISTS cases_external_ref_unique;
ALTER TABLE IF EXISTS ONLY public.cases DROP CONSTRAINT IF EXISTS cases_external_ref_key;
ALTER TABLE IF EXISTS ONLY public.cases DROP CONSTRAINT IF EXISTS cases_account_number_unique;
ALTER TABLE IF EXISTS ONLY public.case_submissions DROP CONSTRAINT IF EXISTS case_submissions_pkey;
ALTER TABLE IF EXISTS ONLY public.case_submission_documents DROP CONSTRAINT IF EXISTS case_submission_documents_pkey;
ALTER TABLE IF EXISTS ONLY public.case_activities DROP CONSTRAINT IF EXISTS case_activities_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log DROP CONSTRAINT IF EXISTS audit_log_pkey;
ALTER TABLE IF EXISTS public.user_organisations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.user_activity_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_metrics ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.payments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.organisations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.messages ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.login_attempts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.external_api_credentials ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.documents ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.cases ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.case_submissions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.case_submission_documents ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.case_activities ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.audit_log ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.user_sessions;
DROP SEQUENCE IF EXISTS public.user_organisations_id_seq;
DROP TABLE IF EXISTS public.user_organisations;
DROP SEQUENCE IF EXISTS public.user_activity_logs_id_seq;
DROP TABLE IF EXISTS public.user_activity_logs;
DROP SEQUENCE IF EXISTS public.system_metrics_id_seq;
DROP TABLE IF EXISTS public.system_metrics;
DROP SEQUENCE IF EXISTS public.payments_id_seq;
DROP TABLE IF EXISTS public.payments;
DROP SEQUENCE IF EXISTS public.organizations_id_seq;
DROP TABLE IF EXISTS public.organisations;
DROP SEQUENCE IF EXISTS public.messages_id_seq;
DROP TABLE IF EXISTS public.messages;
DROP SEQUENCE IF EXISTS public.login_attempts_id_seq;
DROP TABLE IF EXISTS public.login_attempts;
DROP SEQUENCE IF EXISTS public.external_api_credentials_id_seq;
DROP TABLE IF EXISTS public.external_api_credentials;
DROP SEQUENCE IF EXISTS public.documents_id_seq;
DROP TABLE IF EXISTS public.documents;
DROP SEQUENCE IF EXISTS public.cases_id_seq;
DROP TABLE IF EXISTS public.cases;
DROP SEQUENCE IF EXISTS public.case_submissions_id_seq;
DROP TABLE IF EXISTS public.case_submissions;
DROP SEQUENCE IF EXISTS public.case_submission_documents_id_seq;
DROP TABLE IF EXISTS public.case_submission_documents;
DROP SEQUENCE IF EXISTS public.case_activities_id_seq;
DROP TABLE IF EXISTS public.case_activities;
DROP SEQUENCE IF EXISTS public.audit_log_id_seq;
DROP TABLE IF EXISTS public.audit_log;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id integer NOT NULL,
    table_name character varying(100) NOT NULL,
    record_id character varying(100) NOT NULL,
    operation character varying(20) NOT NULL,
    field_name character varying(100),
    old_value text,
    new_value text,
    user_id character varying,
    user_email character varying,
    ip_address character varying(45),
    user_agent text,
    organisation_id integer,
    "timestamp" timestamp without time zone DEFAULT now(),
    description text
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: case_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_activities (
    id integer NOT NULL,
    case_id integer NOT NULL,
    activity_type character varying(100) NOT NULL,
    description text NOT NULL,
    performed_by character varying,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: case_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.case_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: case_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.case_activities_id_seq OWNED BY public.case_activities.id;


--
-- Name: case_submission_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_submission_documents (
    id integer NOT NULL,
    case_submission_id integer,
    file_name character varying(255) NOT NULL,
    file_size integer,
    file_type character varying(100),
    file_path character varying(500) NOT NULL,
    uploaded_at timestamp without time zone DEFAULT now()
);


--
-- Name: case_submission_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.case_submission_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: case_submission_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.case_submission_documents_id_seq OWNED BY public.case_submission_documents.id;


--
-- Name: case_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_submissions (
    id integer NOT NULL,
    submitted_by character varying(255) NOT NULL,
    client_name character varying(255) NOT NULL,
    client_email character varying(255) NOT NULL,
    client_phone character varying(50),
    case_name character varying(255) NOT NULL,
    debtor_type character varying(50) DEFAULT 'individual'::character varying NOT NULL,
    individual_type character varying(50),
    trading_name character varying(255),
    organisation_name character varying(255),
    organisation_trading_name character varying(255),
    company_number character varying(50),
    principal_salutation character varying(20),
    principal_first_name character varying(100),
    principal_last_name character varying(100),
    address_line_1 character varying(255),
    address_line_2 character varying(255),
    city character varying(100),
    county character varying(100),
    postcode character varying(20),
    main_phone character varying(50),
    alt_phone character varying(50),
    main_email character varying(255),
    alt_email character varying(255),
    debt_details text,
    total_debt_amount numeric(12,2),
    currency character varying(10) DEFAULT 'GBP'::character varying,
    payment_terms_type character varying(50),
    payment_terms_days integer,
    payment_terms_other text,
    single_invoice character varying(10),
    first_overdue_date character varying(20),
    last_overdue_date character varying(20),
    additional_info text,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    organisation_id integer NOT NULL,
    submitted_at timestamp without time zone DEFAULT now(),
    processed_at timestamp without time zone,
    processed_by character varying(255),
    debt_details_full text,
    invoice_details text,
    creditor_name character varying(255),
    business_type character varying(100),
    account_reference character varying(100),
    preferred_contact_method character varying(50),
    urgency_level character varying(50),
    special_instructions text
);


--
-- Name: case_submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.case_submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: case_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.case_submissions_id_seq OWNED BY public.case_submissions.id;


--
-- Name: cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cases (
    id integer NOT NULL,
    account_number character varying(50) NOT NULL,
    case_name character varying(255) NOT NULL,
    original_amount numeric(10,2) NOT NULL,
    outstanding_amount numeric(10,2) NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    stage character varying(100) DEFAULT 'initial_contact'::character varying NOT NULL,
    organisation_id integer NOT NULL,
    assigned_to character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    debtor_type character varying(50) DEFAULT 'individual'::character varying NOT NULL,
    costs_added numeric(10,2) DEFAULT 0.00,
    interest_added numeric(10,2) DEFAULT 0.00,
    fees_added numeric(10,2) DEFAULT 0.00,
    is_archived boolean DEFAULT false,
    archived_at timestamp without time zone,
    archived_by character varying,
    external_ref character varying(100)
);


--
-- Name: cases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cases_id_seq OWNED BY public.cases.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    case_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_size integer,
    file_type character varying(100),
    file_path character varying(500) NOT NULL,
    uploaded_by character varying,
    organisation_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: external_api_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_api_credentials (
    id integer NOT NULL,
    organisation_id integer NOT NULL,
    username character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    is_active boolean DEFAULT true,
    description text,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: external_api_credentials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.external_api_credentials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: external_api_credentials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.external_api_credentials_id_seq OWNED BY public.external_api_credentials.id;


--
-- Name: login_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_attempts (
    id integer NOT NULL,
    email character varying(255),
    success boolean NOT NULL,
    ip_address character varying(45),
    user_agent text,
    failure_reason character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: login_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.login_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: login_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.login_attempts_id_seq OWNED BY public.login_attempts.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    sender_id character varying NOT NULL,
    recipient_type character varying(20) NOT NULL,
    recipient_id character varying NOT NULL,
    case_id integer,
    subject character varying(255),
    content text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    attachment_file_name character varying,
    attachment_file_path character varying,
    attachment_file_size integer,
    attachment_file_type character varying
);


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: organisations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organisations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    contact_email character varying,
    contact_phone character varying,
    address text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    external_ref character varying(100)
);


--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organisations.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    case_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_date timestamp without time zone NOT NULL,
    payment_method character varying(50),
    reference character varying(100),
    notes text,
    recorded_by character varying(255),
    created_at timestamp without time zone DEFAULT now(),
    organisation_id integer NOT NULL,
    external_ref character varying(100)
);


--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: system_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_metrics (
    id integer NOT NULL,
    metric_name character varying(100) NOT NULL,
    metric_value numeric(15,2) NOT NULL,
    recorded_at timestamp without time zone DEFAULT now()
);


--
-- Name: system_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_metrics_id_seq OWNED BY public.system_metrics.id;


--
-- Name: user_activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_activity_logs (
    id integer NOT NULL,
    user_id text NOT NULL,
    action text NOT NULL,
    details text,
    ip_address text,
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_activity_logs_id_seq OWNED BY public.user_activity_logs.id;


--
-- Name: user_organisations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_organisations (
    id integer NOT NULL,
    user_id character varying(255) NOT NULL,
    organisation_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_organisations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_organisations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_organisations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_organisations_id_seq OWNED BY public.user_organisations.id;


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    organisation_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    is_admin boolean DEFAULT false,
    phone character varying,
    hashed_password character varying,
    temp_password character varying,
    must_change_password boolean DEFAULT false,
    external_ref character varying(100),
    email_notifications boolean DEFAULT true,
    push_notifications boolean DEFAULT true
);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: case_activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_activities ALTER COLUMN id SET DEFAULT nextval('public.case_activities_id_seq'::regclass);


--
-- Name: case_submission_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_submission_documents ALTER COLUMN id SET DEFAULT nextval('public.case_submission_documents_id_seq'::regclass);


--
-- Name: case_submissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_submissions ALTER COLUMN id SET DEFAULT nextval('public.case_submissions_id_seq'::regclass);


--
-- Name: cases id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cases ALTER COLUMN id SET DEFAULT nextval('public.cases_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: external_api_credentials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_api_credentials ALTER COLUMN id SET DEFAULT nextval('public.external_api_credentials_id_seq'::regclass);


--
-- Name: login_attempts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_attempts ALTER COLUMN id SET DEFAULT nextval('public.login_attempts_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: organisations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organisations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: system_metrics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_metrics ALTER COLUMN id SET DEFAULT nextval('public.system_metrics_id_seq'::regclass);


--
-- Name: user_activity_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activity_logs ALTER COLUMN id SET DEFAULT nextval('public.user_activity_logs_id_seq'::regclass);


--
-- Name: user_organisations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_organisations ALTER COLUMN id SET DEFAULT nextval('public.user_organisations_id_seq'::regclass);


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_log (id, table_name, record_id, operation, field_name, old_value, new_value, user_id, user_email, ip_address, user_agent, organisation_id, "timestamp", description) FROM stdin;
6	cases	1	UPDATE	status	active	closed	\N	admin@chadlaw.co.uk	\N	\N	1	2025-07-24 17:33:43.378234	Case status updated by admin
7	users	2	INSERT	\N	\N	{"email":"test@example.com","firstName":"Test","lastName":"User"}	\N	admin@chadlaw.co.uk	\N	\N	1	2025-07-24 17:33:43.378234	New user created
8	organisations	1	UPDATE	name	Old Name Ltd	New Name Ltd	\N	admin@chadlaw.co.uk	\N	\N	1	2025-07-24 17:33:43.378234	Organisation name updated
9	cases	2	UPDATE	outstanding_amount	1000.00	750.00	\N	External System API	\N	\N	2	2025-07-24 17:33:43.378234	Balance updated via external API
10	documents	1	INSERT	\N	\N	{"filename":"contract.pdf","size":2048}	\N	user@company.com	\N	\N	2	2025-07-24 17:33:43.378234	Document uploaded by user
11	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.1.140	\N	4	2025-07-30 13:03:10.582839	Case updated via external API by acclaim.orgadmin@acclaim.law
12	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.1.140	\N	4	2025-07-30 13:03:33.168903	Case updated via external API by acclaim.orgadmin@acclaim.law
13	cases	14	UPDATE	outstandingAmount	7440.22	19459.22	\N	External System	10.82.1.140	\N	4	2025-07-30 13:03:48.652221	Case updated via external API by acclaim.orgadmin@acclaim.law
14	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.1.140	\N	4	2025-07-30 13:03:48.710036	Case updated via external API by acclaim.orgadmin@acclaim.law
15	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.1.140	\N	4	2025-07-30 13:04:31.945323	Case updated via external API by acclaim.orgadmin@acclaim.law
16	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.6.108	\N	4	2025-08-01 08:11:57.995794	Case updated via external API by acclaim.orgadmin@acclaim.law
17	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.4.40	\N	4	2025-08-01 08:15:05.455825	Case updated via external API by acclaim.orgadmin@acclaim.law
18	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.4.40	\N	4	2025-08-01 08:15:43.038524	Case updated via external API by acclaim.orgadmin@acclaim.law
19	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.4.40	\N	4	2025-08-01 08:17:25.399367	Case updated via external API by acclaim.orgadmin@acclaim.law
20	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.8.133	\N	4	2025-08-01 08:48:07.891055	Case updated via external API by acclaim.orgadmin@acclaim.law
21	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.4.40	\N	4	2025-08-01 09:42:54.8098	Case updated via external API by acclaim.orgadmin@acclaim.law
22	cases	14	UPDATE	outstandingAmount	19459.22	18483.85	\N	External System	10.82.0.164	\N	4	2025-08-01 09:45:33.3292	Case updated via external API by acclaim.orgadmin@acclaim.law
23	cases	14	UPDATE	costsAdded	1698.37	723.00	\N	External System	10.82.0.164	\N	4	2025-08-01 09:45:33.401877	Case updated via external API by acclaim.orgadmin@acclaim.law
24	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.0.164	\N	4	2025-08-01 09:45:33.464844	Case updated via external API by acclaim.orgadmin@acclaim.law
25	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.0.164	\N	4	2025-08-01 09:46:23.370913	Case updated via external API by acclaim.orgadmin@acclaim.law
26	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.4.40	\N	4	2025-08-01 09:49:32.340262	Case updated via external API by acclaim.orgadmin@acclaim.law
27	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.6.108	\N	4	2025-08-01 09:58:03.976029	Case updated via external API by acclaim.orgadmin@acclaim.law
28	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.9.83	\N	4	2025-08-05 13:21:06.284256	Case updated via external API by acclaim.orgadmin@acclaim.law
29	cases	14	UPDATE	stage	Pre-Legal	Enforcement	\N	External System	10.82.5.105	\N	4	2025-08-05 13:26:12.106433	Case updated via external API by acclaim.orgadmin@acclaim.law
30	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.5.105	\N	4	2025-08-05 13:26:12.18549	Case updated via external API by acclaim.orgadmin@acclaim.law
31	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.0.4	\N	4	2025-08-05 13:29:56.472227	Case updated via external API by acclaim.orgadmin@acclaim.law
32	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.0.4	\N	4	2025-08-05 13:31:15.272885	Case updated via external API by acclaim.orgadmin@acclaim.law
33	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.0.4	\N	4	2025-08-05 13:32:26.824687	Case updated via external API by acclaim.orgadmin@acclaim.law
34	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.9.83	\N	4	2025-08-05 13:35:03.516971	Case updated via external API by acclaim.orgadmin@acclaim.law
35	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.2.23	\N	4	2025-08-05 13:38:34.570608	Case updated via external API by acclaim.orgadmin@acclaim.law
36	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.9.83	\N	4	2025-08-05 13:42:43.162013	Case updated via external API by acclaim.orgadmin@acclaim.law
37	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.9.83	\N	4	2025-08-05 13:47:53.066069	Case updated via external API by acclaim.orgadmin@acclaim.law
38	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.1.27	\N	4	2025-08-05 13:54:34.610822	Case updated via external API by acclaim.orgadmin@acclaim.law
39	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.5.105	\N	4	2025-08-05 14:01:38.201613	Case updated via external API by acclaim.orgadmin@acclaim.law
40	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.5.105	\N	4	2025-08-05 14:01:57.678549	Case updated via external API by acclaim.orgadmin@acclaim.law
41	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.5.105	\N	4	2025-08-05 14:02:24.725882	Case updated via external API by acclaim.orgadmin@acclaim.law
42	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.2.23	\N	4	2025-08-05 14:10:30.122474	Case updated via external API by acclaim.orgadmin@acclaim.law
43	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.0.4	\N	4	2025-08-05 14:14:31.606348	Case updated via external API by acclaim.orgadmin@acclaim.law
44	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.0.4	\N	4	2025-08-05 14:15:34.014397	Case updated via external API by acclaim.orgadmin@acclaim.law
45	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.7.45	\N	4	2025-08-05 15:09:15.203326	Case updated via external API by acclaim.orgadmin@acclaim.law
46	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.3.54	\N	4	2025-08-06 20:28:33.226861	Case updated via external API by acclaim.orgadmin@acclaim.law
47	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.1.27	\N	4	2025-08-06 20:32:48.539795	Case updated via external API by acclaim.orgadmin@acclaim.law
48	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.1.27	\N	4	2025-08-06 20:33:26.212804	Case updated via external API by acclaim.orgadmin@acclaim.law
49	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.2.127	\N	4	2025-08-06 20:36:28.332926	Case updated via external API by acclaim.orgadmin@acclaim.law
50	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.9.227	\N	4	2025-08-06 20:39:10.828289	Case updated via external API by acclaim.orgadmin@acclaim.law
51	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.7.106	\N	4	2025-08-06 20:43:20.561532	Case updated via external API by acclaim.orgadmin@acclaim.law
52	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.7.106	\N	4	2025-08-06 20:44:34.255089	Case updated via external API by acclaim.orgadmin@acclaim.law
53	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.9.227	\N	4	2025-08-06 20:53:40.282605	Case updated via external API by acclaim.orgadmin@acclaim.law
54	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.9.227	\N	4	2025-08-06 20:57:15.514065	Case updated via external API by acclaim.orgadmin@acclaim.law
55	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.3.54	\N	4	2025-08-06 20:59:41.218089	Case updated via external API by acclaim.orgadmin@acclaim.law
56	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.0.4	\N	4	2025-08-06 21:01:58.190214	Case updated via external API by acclaim.orgadmin@acclaim.law
57	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.0.4	\N	4	2025-08-06 21:03:38.460013	Case updated via external API by acclaim.orgadmin@acclaim.law
58	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.5.105	\N	4	2025-08-06 21:05:26.047446	Case updated via external API by acclaim.orgadmin@acclaim.law
59	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.10.77	\N	4	2025-08-06 21:18:42.994474	Case updated via external API by acclaim.orgadmin@acclaim.law
60	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.5.105	\N	4	2025-08-06 21:23:13.06169	Case updated via external API by acclaim.orgadmin@acclaim.law
61	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.9.227	\N	4	2025-08-07 09:37:56.373078	Case updated via external API by acclaim.orgadmin@acclaim.law
62	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.3.54	\N	4	2025-08-07 10:37:22.56688	Case updated via external API by acclaim.orgadmin@acclaim.law
63	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.9.13	\N	4	2025-08-19 12:25:36.132658	Case updated via external API by acclaim.orgadmin@acclaim.law
64	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.9.13	\N	4	2025-08-19 12:44:04.801611	Case updated via external API by acclaim.orgadmin@acclaim.law
65	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.1.3	\N	4	2025-08-19 12:49:29.43381	Case updated via external API by acclaim.orgadmin@acclaim.law
66	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.6.143	\N	4	2025-08-21 01:09:30.526035	Case updated via external API by acclaim.orgadmin@acclaim.law
67	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.1.85	\N	4	2025-08-21 07:41:18.655965	Case updated via external API by acclaim.orgadmin@acclaim.law
68	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.7.83	\N	4	2025-08-21 15:55:13.103183	Case updated via external API by acclaim.orgadmin@acclaim.law
69	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.7.83	\N	4	2025-08-21 15:55:40.173389	Case updated via external API by acclaim.orgadmin@acclaim.law
70	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.1.85	\N	4	2025-08-21 16:15:29.749361	Case updated via external API by acclaim.orgadmin@acclaim.law
71	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.2.114	\N	4	2025-09-05 13:10:54.323678	Case updated via external API by acclaim.orgadmin@acclaim.law
72	cases	14	UPDATE	stage	Enforcement	Claim	\N	External System	10.82.7.144	\N	4	2025-09-05 13:13:56.483908	Case updated via external API by acclaim.orgadmin@acclaim.law
73	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.7.144	\N	4	2025-09-05 13:13:56.542281	Case updated via external API by acclaim.orgadmin@acclaim.law
74	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.9.139	\N	4	2025-09-13 11:12:59.067777	Case updated via external API by acclaim.orgadmin@acclaim.law
75	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.9.139	\N	4	2025-09-13 11:13:14.610176	Case updated via external API by acclaim.orgadmin@acclaim.law
76	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.9.139	\N	4	2025-09-13 11:13:28.300033	Case updated via external API by acclaim.orgadmin@acclaim.law
77	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	10.82.9.139	\N	4	2025-09-13 11:13:41.676841	Case updated via external API by acclaim.orgadmin@acclaim.law
78	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	104.154.151.15	\N	4	2025-09-14 07:26:52.121719	Case updated via external API by acclaim.orgadmin@acclaim.law
79	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	34.132.167.173	\N	4	2025-09-14 07:27:22.074303	Case updated via external API by acclaim.orgadmin@acclaim.law
80	cases	14	UPDATE	outstandingAmount	18483.85	18473.85	\N	External System	34.60.209.83	\N	4	2025-09-14 07:27:41.902879	Case updated via external API by acclaim.orgadmin@acclaim.law
81	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	34.60.209.83	\N	4	2025-09-14 07:27:41.925496	Case updated via external API by acclaim.orgadmin@acclaim.law
82	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	34.132.167.173	\N	4	2025-09-14 07:27:50.698754	Case updated via external API by acclaim.orgadmin@acclaim.law
83	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	104.155.170.175	\N	4	2025-09-24 13:16:36.813738	Case updated via external API by acclaim.orgadmin@acclaim.law
84	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	35.224.72.90	\N	4	2025-09-24 13:18:03.937458	Case updated via external API by acclaim.orgadmin@acclaim.law
85	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	34.171.105.174	\N	4	2025-09-24 13:32:13.545517	Case updated via external API by acclaim.orgadmin@acclaim.law
86	cases	14	UPDATE	outstandingAmount	18473.85	21710.44	\N	External System	34.133.76.182	\N	4	2025-10-02 10:29:45.086204	Case updated via external API by acclaim.orgadmin@acclaim.law
87	cases	14	UPDATE	feesAdded	1208.00	4444.59	\N	External System	34.133.76.182	\N	4	2025-10-02 10:29:45.113373	Case updated via external API by acclaim.orgadmin@acclaim.law
88	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	34.133.76.182	\N	4	2025-10-02 10:29:45.136284	Case updated via external API by acclaim.orgadmin@acclaim.law
89	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	34.135.54.148	\N	4	2025-10-02 10:34:19.088328	Case updated via external API by acclaim.orgadmin@acclaim.law
90	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	34.132.193.8	\N	4	2025-10-13 11:18:15.930082	Case updated via external API by acclaim.orgadmin@acclaim.law
91	cases	14	UPDATE	originalAmount	17000.00	2500.00	\N	External System	34.132.193.8	\N	4	2025-10-13 11:19:45.471936	Case updated via external API by acclaim.orgadmin@acclaim.law
92	cases	14	UPDATE	outstandingAmount	21710.44	5492.95	\N	External System	34.132.193.8	\N	4	2025-10-13 11:19:45.508971	Case updated via external API by acclaim.orgadmin@acclaim.law
93	cases	14	UPDATE	interestAdded	1762.85	45.36	\N	External System	34.132.193.8	\N	4	2025-10-13 11:19:45.535966	Case updated via external API by acclaim.orgadmin@acclaim.law
94	cases	14	UPDATE	createdAt	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	Thu Jul 24 2025 09:32:37 GMT+0000 (Coordinated Universal Time)	\N	External System	34.132.193.8	\N	4	2025-10-13 11:19:45.563526	Case updated via external API by acclaim.orgadmin@acclaim.law
95	cases	18	UPDATE	status	active	Active	\N	External System	34.121.43.20	\N	4	2025-10-24 12:39:29.032999	Case updated via external API by acclaim.orgadmin@acclaim.law
96	cases	18	UPDATE	stage	New	Pre-Legal	\N	External System	34.121.43.20	\N	4	2025-10-24 12:39:29.084794	Case updated via external API by acclaim.orgadmin@acclaim.law
97	cases	18	UPDATE	createdAt	Fri Oct 24 2025 12:39:23 GMT+0000 (Coordinated Universal Time)	Fri Oct 24 2025 12:39:23 GMT+0000 (Coordinated Universal Time)	\N	External System	34.121.43.20	\N	4	2025-10-24 12:39:29.112557	Case updated via external API by acclaim.orgadmin@acclaim.law
98	cases	18	UPDATE	originalAmount	0.00	116.00	\N	External System	104.197.78.4	\N	4	2025-10-24 12:42:50.930484	Case updated via external API by acclaim.orgadmin@acclaim.law
99	cases	18	UPDATE	outstandingAmount	0.00	171.18	\N	External System	104.197.78.4	\N	4	2025-10-24 12:42:50.981384	Case updated via external API by acclaim.orgadmin@acclaim.law
100	cases	18	UPDATE	interestAdded	0.00	15.18	\N	External System	104.197.78.4	\N	4	2025-10-24 12:42:51.005553	Case updated via external API by acclaim.orgadmin@acclaim.law
101	cases	18	UPDATE	feesAdded	0.00	40.00	\N	External System	104.197.78.4	\N	4	2025-10-24 12:42:51.038546	Case updated via external API by acclaim.orgadmin@acclaim.law
102	cases	18	UPDATE	createdAt	Fri Oct 24 2025 12:39:23 GMT+0000 (Coordinated Universal Time)	Fri Oct 24 2025 12:39:23 GMT+0000 (Coordinated Universal Time)	\N	External System	104.197.78.4	\N	4	2025-10-24 12:42:51.062089	Case updated via external API by acclaim.orgadmin@acclaim.law
103	cases	18	UPDATE	createdAt	Fri Oct 24 2025 12:39:23 GMT+0000 (Coordinated Universal Time)	Fri Oct 24 2025 12:39:23 GMT+0000 (Coordinated Universal Time)	\N	External System	34.136.134.81	\N	4	2025-10-24 12:55:59.797951	Case updated via external API by acclaim.orgadmin@acclaim.law
104	cases	18	UPDATE	createdAt	Fri Oct 24 2025 12:39:23 GMT+0000 (Coordinated Universal Time)	Fri Oct 24 2025 12:39:23 GMT+0000 (Coordinated Universal Time)	\N	External System	34.59.40.34	\N	4	2025-10-24 13:16:19.533159	Case updated via external API by acclaim.orgadmin@acclaim.law
\.


--
-- Data for Name: case_activities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.case_activities (id, case_id, activity_type, description, performed_by, created_at) FROM stdin;
1	1	case_created	Case created for TechNova Solutions Ltd	system	2025-07-11 17:29:15.061842
3	1	phone_call	Phone call made to debtor - no answer, left voicemail	Sarah Johnson	2025-07-11 17:29:15.061842
4	1	email_sent	Follow-up email sent to accounts department	Sarah Johnson	2025-07-11 17:29:15.061842
5	2	case_created	Case created for Green Manufacturing Co	system	2025-07-11 17:29:15.061842
7	2	phone_call	Phone call made to debtor - spoke with finance manager	Mike Davies	2025-07-11 17:29:15.061842
8	2	payment_plan_agreed	Payment plan agreed - £2,000 monthly installments	Mike Davies	2025-07-11 17:29:15.061842
9	2	payment_received	First payment of £2,000 received	Mike Davies	2025-07-11 17:29:15.061842
10	3	case_created	Case created for Digital Marketing Hub	system	2025-07-11 17:29:15.061842
12	3	phone_call	Phone call made to debtor - payment promised within 7 days	Emma Thompson	2025-07-11 17:29:15.061842
13	3	payment_received	Full payment of £8,500 received	Emma Thompson	2025-07-11 17:29:15.061842
14	3	case_closed	Case successfully resolved - full payment received	Emma Thompson	2025-07-11 17:29:15.061842
15	4	case_created	Case created for Coastal Retail Group	system	2025-07-11 17:29:15.061842
17	4	phone_call	Multiple phone calls made - debtor avoiding contact	James Wilson	2025-07-11 17:29:15.061842
18	4	formal_demand	Formal demand letter sent via recorded delivery	James Wilson	2025-07-11 17:29:15.061842
19	4	legal_action	Legal proceedings initiated - court claim filed	James Wilson	2025-07-11 17:29:15.061842
20	5	case_created	Case created for Healthcare Solutions Inc	system	2025-07-11 17:29:15.061842
22	5	phone_call	Phone call made to debtor - dispute raised over invoice	Sarah Johnson	2025-07-11 17:29:15.061842
23	5	negotiation	Negotiation in progress - debtor claims service issues	Sarah Johnson	2025-07-11 17:29:15.061842
24	6	case_created	Case created for Construction Plus Ltd	system	2025-07-11 17:29:15.061842
26	6	phone_call	Phone call made to debtor - payment promised	Mike Davies	2025-07-11 17:29:15.061842
27	6	payment_received	Full payment of £33,000 received	Mike Davies	2025-07-11 17:29:15.061842
28	6	case_closed	Case successfully resolved - full payment received	Mike Davies	2025-07-11 17:29:15.061842
29	7	case_created	Case created for Fashion Forward Boutique	system	2025-07-11 17:29:15.061842
31	7	phone_call	Phone call made to debtor - financial difficulties discussed	Emma Thompson	2025-07-11 17:29:15.061842
32	7	payment_plan_agreed	Payment plan agreed - £650 monthly installments	Emma Thompson	2025-07-11 17:29:15.061842
33	7	case_archived	Case archived by admin	43000315	2025-07-13 19:17:42.17613
34	7	case_unarchived	Case unarchived by admin	43000315	2025-07-13 19:27:15.077856
25	6	initial_contact	Pre-Action correspondence sent	Mike Davies	2025-07-11 17:29:15.061842
30	7	Pre-Action_correspondence_sent	Pre-Action correspondence sent	Emma Thompson	2025-07-11 17:29:15.061842
21	5	Pre-Action_correspondence_sent	Pre-Action correspondence sent	Sarah Johnson	2025-07-11 17:29:15.061842
2	1	Pre-Action_correspondence_sent	Pre-Action correspondence sent	Sarah Johnson	2025-07-11 17:29:15.061842
11	3	Pre-Action_correspondence_sent	Pre-Action correspondence sent	Emma Thompson	2025-07-11 17:29:15.061842
6	2	Pre-Action_correspondence_sent	Pre-Action correspondence sent	Mike Davies	2025-07-11 17:29:15.061842
16	4	Pre-Action_correspondence_sent	Pre-Action correspondence sent	James Wilson	2025-07-11 17:29:15.061842
51	1	TEST	Claim form raised	Matthew Perry	2025-07-18 13:53:15.770755
57	1	Test	Judgment obtained	Matt Perry	2025-07-18 14:35:53.639168
58	14	TL0001	Case created	Matt Perry	2025-07-24 10:03:54.599897
67	18	TL0001	Case created	Matt Perry	2025-10-24 12:39:24.61964
\.


--
-- Data for Name: case_submission_documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.case_submission_documents (id, case_submission_id, file_name, file_size, file_type, file_path, uploaded_at) FROM stdin;
1	4	Acclaim.png	4890	image/png	uploads/3f4460bb261381e56ee803dd770096c4	2025-08-06 11:52:54.702459
2	7	Acclaim rose.png	22398	image/png	uploads/a2d8cfc68c3a31c2026e9f35a1decbdf	2025-09-03 07:38:01.732415
3	7	Chadlaw logo.jpg	5846	image/jpeg	uploads/71ec788a82458e4f22faf47aae0bf221	2025-09-03 07:38:01.798677
4	7	DockStreet.jpg	139067	image/jpeg	uploads/b7e879294ef69dc23cdff1a6e30e38d0	2025-09-03 07:38:01.858203
5	8	jamie-howard-2023-572x1024.jpg	44405	image/jpeg	uploads/6be9a2e8977aca96e0c08af280b2b18d	2025-10-02 09:42:22.063416
6	9	Acclaim rose.png	22398	image/png	uploads/0ae05e8bfc7293556b50b1ef1aa239ba	2025-10-02 09:53:19.610737
7	9	Picture2.png	6573	image/png	uploads/840f446abe657c56ff68d25cac4d294c	2025-10-02 09:53:19.674051
\.


--
-- Data for Name: case_submissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.case_submissions (id, submitted_by, client_name, client_email, client_phone, case_name, debtor_type, individual_type, trading_name, organisation_name, organisation_trading_name, company_number, principal_salutation, principal_first_name, principal_last_name, address_line_1, address_line_2, city, county, postcode, main_phone, alt_phone, main_email, alt_email, debt_details, total_debt_amount, currency, payment_terms_type, payment_terms_days, payment_terms_other, single_invoice, first_overdue_date, last_overdue_date, additional_info, status, organisation_id, submitted_at, processed_at, processed_by, debt_details_full, invoice_details, creditor_name, business_type, account_reference, preferred_contact_method, urgency_level, special_instructions) FROM stdin;
9	43000315	Dan Hirst	danhirst@chadlaw.co.uk	\N	Test Debtor Limited	organisation	\N	\N	Test Debtor Limited	\N	1235687	\N	\N	\N	8-16 dock Street	\N	Leeds	\N	LS10 1LX	0113228811	01132258847	debtor@chadlaw.co.uk	\N	Services provided	752.59	GBP	days_from_month_end	30	\N	no	2025-07-09	2025-08-06	LBA pleaase	processed	3	2025-10-02 09:53:19.538996	2025-10-02 09:56:48.414	43000315	\N	\N	\N	\N	\N	\N	\N	\N
8	43000315	Dan Hirst	danhirst@chadlaw.co.uk	\N	Mug Me Off	individual	business	Mug Me Off	\N	\N	\N	mr	Jonathan	Smith	10 Low Key Road	\N	Leeds	\N	LS2 4RF	01132356587	01132356588	j@mugmeoff.com	js@mugmeoff.com	Goods sold unpaid invoices	15435.07	GBP	days_from_invoice	14	\N	yes	2025-07-30	\N	This guy is slippery	processed	2	2025-10-02 09:42:21.989899	2025-10-02 09:57:07.327	43000315	\N	\N	\N	\N	\N	\N	\N	\N
7	43000315	Dan Hirst	danhirst@chadlaw.co.uk	01132258811	Shoes By smith	individual	business	Shoes By smith	\N	\N	\N	mr	Jason	Smith	32 Wakely Street	Middleton	Leeds	West Yorkshire	LS10 1RY	01132556399	\N	jsmithshoes@btconnect.com	jsmithshoes@yahoo.co.uk	Goods Supplied on credit	17526.37	GBP	days_from_month_end	30	\N	no	2025-05-28	2025-06-05	The debtor owns 2 vehicles and his property	processed	2	2025-09-03 07:38:01.657466	2025-10-02 09:57:09.53	43000315	\N	\N	\N	\N	\N	\N	\N	\N
6	43000315	Dan Hirst	danhirst@chadlaw.co.uk	\N	Test Company	organisation	\N	\N	Test Company	\N	\N	\N	\N	\N	123	\N	Leeds	West Yorkshire	LS9 0QW	\N	\N	\N	\N	Debt Due	500.00	GBP	days_from_invoice	30	\N	yes	2025-07-28	\N	\N	processed	2	2025-08-06 12:29:12.118907	2025-10-02 09:57:11.602	43000315	\N	\N	\N	\N	\N	\N	\N	\N
5	43000315	Dan Hirst	danhirst@chadlaw.co.uk	\N	fantastic Food Ltd	organisation	\N	\N	fantastic Food Ltd	\N	84564743	\N	\N	\N	72 High Street	Godslawn	Bradford	West Yorkshire	BD7 7GH	\N	\N	\N	\N	Services rendered	10.52	GBP	days_from_month_end	60	\N	yes	2024-08-02	\N	\N	processed	3	2025-08-06 12:00:34.344925	2025-10-02 09:57:13.535	43000315	\N	\N	\N	\N	\N	\N	\N	\N
4	43000315	Dan Hirst	danhirst@chadlaw.co.uk	\N	mr Joe Bloggs	individual	individual	\N	\N	\N	\N	mr	Joe	Bloggs	8 redfern Avenue	\N	Leeds	W Yorks	LS10 4YH	01135564458	01135542587	BloggsJ@yahoo.co.uk	Bloggsjoe@hotmail.com	Loan to friend	5140.52	GBP	days_from_invoice	6	\N	yes	2025-07-04	\N	\N	processed	3	2025-08-06 11:52:54.629949	2025-10-02 09:57:15.302	43000315	\N	\N	\N	\N	\N	\N	\N	\N
3	43000315	Dan Hirst	danhirst@chadlaw.co.uk	\N	ABC Ltd	organisation	\N	\N	ABC Ltd	\N	123456	\N	\N	\N	10 Calverly Close	\N	Leeds	W Yorks	LS66 8DJ	01132258899	\N	\N	\N	Goods sold	1000.00	GBP	days_from_month_end	30	\N	no	2025-05-01	2025-07-03	\N	processed	3	2025-08-06 11:47:56.012175	2025-10-02 09:57:19.823	43000315	\N	\N	\N	\N	\N	\N	\N	\N
2	43000315	Another Test Client	test2@example.com	\N	Individual Debtor Case	individual	business	Smith Trading	\N	\N	\N	Mr	John	Smith	456 Another Street	\N	Birmingham	West Midlands	B1 1AA	01214567890	\N	john@smithtrading.com	\N	Outstanding invoices for professional services	2500.50	GBP	days_from_month_end	15	\N	no	2024-01-01	2024-01-31	\N	rejected	1	2025-08-06 09:38:23.074142	2025-10-02 09:57:24.232	43000315	\N	\N	\N	\N	\N	\N	\N	\N
1	43000315	Test Client	test@example.com	01234567890	Sample Case for Testing	organisation	\N	\N	ABC Ltd	ABC Trading	12345678	\N	\N	\N	123 Test Street	Unit 1	London	Greater London	SW1A 1AA	02071234567	07987654321	main@example.com	alt@example.com	Sample debt for goods sold and delivered	5000.00	GBP	days_from_invoice	30	\N	yes	2024-01-15	\N	This is additional information for testing purposes	rejected	1	2025-08-06 09:38:18.220239	2025-10-02 09:57:26.786	43000315	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: cases; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cases (id, account_number, case_name, original_amount, outstanding_amount, status, stage, organisation_id, assigned_to, created_at, updated_at, debtor_type, costs_added, interest_added, fees_added, is_archived, archived_at, archived_by, external_ref) FROM stdin;
2	ACC-2024-002	Green Manufacturing Co	28000.00	6155.25	Closed	Claim	1	Jordan Crowther	2025-03-06 00:00:00	2025-07-11 17:28:57.513324	individual	95.00	45.25	15.00	f	\N	\N	\N
7	ACC-2024-007	Fashion Forward Boutique	6750.00	205.00	active	Claim	2	Jordan Crowther	2023-10-10 00:00:00	2025-07-13 19:27:14.977	sole_trader	205.00	0.00	0.00	f	\N	\N	\N
3	ACC-2024-003	Digital Marketing Hub	8500.00	8950.75	Closed	Enforcement	1	Ella McMaster	2025-07-11 17:28:57.513324	2025-07-11 17:28:57.513324	sole_trader	275.00	125.75	50.00	f	\N	\N	\N
4	ACC-2024-004	Coastal Retail Group	42000.00	41500.00	active	Judgment	1	Sean Thornhill-Adey	2024-11-18 00:00:00	2025-07-11 17:28:57.513324	company_and_individual	0.00	0.00	0.00	f	\N	\N	\N
6	ACC-2024-006	Construction Plus Ltd	33000.00	33000.00	Closed	Paid	1	Katy Mullarkey	2025-07-11 17:28:57.513324	2025-07-11 17:28:57.513324	individual	0.00	0.00	0.00	f	\N	\N	\N
1	ACC-2024-001	TechNova Solutions Ltd	30000.00	7200.00	active	Enforcement	1	Matt Perry	2025-02-04 00:00:00	2025-07-19 20:52:04.071	Company	173.75	465.83	1970.00	f	\N	\N	Ref_Chadwick_Lawrence_LLP:MA:CLS00003-xc028
5	ACC-2024-005	Healthcare Solutions Inc	19500.00	19075.00	active	Pre-Legal	1	Matt Perry	2025-02-03 00:00:00	2025-07-11 17:28:57.513324	company	0.00	0.00	0.00	f	\N	\N	\N
18	CLS00003-113	We Are Rock Limited	116.00	171.18	Active	Pre-Legal	4	Sean Thornhill-Adey	2025-10-24 12:39:23.146703	2025-10-24 13:16:19.487	individual	0.00	15.18	40.00	f	\N	\N	Ref_Chadwick_Lawrence_LLP:MA:CLS00003-113
15	ACM-001	Multi-Org Test Case 1	5000.00	5000.00	active	initial_contact	1	\N	2025-07-28 08:30:42.242126	2025-07-28 08:30:42.242126	individual	0.00	0.00	0.00	f	\N	\N	\N
16	ACM-002	Multi-Org Test Case 2	12000.00	12000.00	active	pre_legal	1	\N	2025-07-28 08:30:42.242126	2025-07-28 08:30:42.242126	company	0.00	0.00	0.00	f	\N	\N	\N
17	SOS-TEST-002	SOS Integration Test Case	50.00	50.00	active	initial_contact	4	System	2025-08-21 01:05:27.479695	2025-08-21 01:05:27.479695	individual	0.00	0.00	0.00	f	\N	\N	sos-test-case-002
14	CLS00003-028	Test matter only	2500.00	5492.95	Active	Claim	4	Matt Perry	2025-07-24 09:32:37.147036	2025-10-13 11:19:45.429	Company	723.00	45.36	4444.59	f	\N	\N	Ref_Chadwick_Lawrence_LLP:MA:CLS00003-028
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.documents (id, case_id, file_name, file_size, file_type, file_path, uploaded_by, organisation_id, created_at) FROM stdin;
2	1	TechNova_Contact_Log.docx	89344	application/vnd.openxmlformats-officedocument.wordprocessingml.document	uploads/technova_contact_log.docx	43000315	1	2025-07-11 17:29:44.287583
3	2	Green_Manufacturing_Contract.pdf	512000	application/pdf	uploads/green_manufacturing_contract.pdf	43000315	1	2025-07-11 17:29:44.287583
4	2	Green_Manufacturing_Payment_Plan.pdf	156672	application/pdf	uploads/green_manufacturing_payment_plan.pdf	43000315	1	2025-07-11 17:29:44.287583
5	3	Digital_Marketing_Invoice.pdf	198400	application/pdf	uploads/digital_marketing_invoice.pdf	43000315	1	2025-07-11 17:29:44.287583
6	3	Digital_Marketing_Payment_Confirmation.pdf	87040	application/pdf	uploads/digital_marketing_payment_confirmation.pdf	43000315	1	2025-07-11 17:29:44.287583
7	4	Coastal_Retail_Demand_Letter.pdf	134144	application/pdf	uploads/coastal_retail_demand_letter.pdf	43000315	1	2025-07-11 17:29:44.287583
8	4	Coastal_Retail_Court_Claim.pdf	298752	application/pdf	uploads/coastal_retail_court_claim.pdf	43000315	1	2025-07-11 17:29:44.287583
9	5	Healthcare_Solutions_Dispute_Notice.pdf	176128	application/pdf	uploads/healthcare_solutions_dispute.pdf	43000315	1	2025-07-11 17:29:44.287583
11	1	Exit road view.PNG	4816020	image/png	uploads/2b418b32d52fe0bb3fef2fdfa90286bb	43000315	1	2025-07-13 08:34:02.897325
12	1	SOS_Integration_Test.txt	53	text/plain	uploads/8602c78d5038f46dab4fc118ab4e2990	jZJVUVcC3I	1	2025-07-18 14:59:07.186
13	1	Case_Correspondence_2025.txt	53	text/plain	uploads/6647f95843fed04f8be63ca454e29087	jZJVUVcC3I	1	2025-07-18 14:59:18.075
14	1	Test_Document.txt	0	application/octet-stream	uploads/039ad79e91c20fc5435ccb43813cd604	jZJVUVcC3I	1	2025-07-18 16:18:28.82
15	1	None	28	text/plain	uploads/044899cca8d4df33cf84666405e9615b	jZJVUVcC3I	1	2025-07-18 16:19:52.131
18	1	None	28	text/plain	uploads/925935d6c41477279076b901d7b9455a	jZJVUVcC3I	1	2025-07-19 17:30:09.457
19	1	C:\\Users\\Matt.Perry\\OneDrive - Chadwick Lawrence\\Pictures\\BPTW_SUBS_BPTW-1400x700.jpg	73600	application/ms-word	uploads/71f9719eed15d2476ba1f3da69d52a2b	jZJVUVcC3I	1	2025-07-19 18:12:06.633
20	1	BPTW_SUBS_BPTW-1400x700.jpg	73600	application/ms-word	uploads/ba785fe21e38f31f07a7d9d1ec75dc1f	jZJVUVcC3I	1	2025-07-19 18:16:00.126
21	1	CLPN2 - Privacy Notice.docx	17059	application/ms-word	uploads/fd4dbd7c80472b125ce2d1243497d281	jZJVUVcC3I	1	2025-07-19 18:30:20.065
22	1	CCTB - Terms of Business.docx	49311	application/ms-word	uploads/ed14e53afc80faa01efb15778375c2cb	jZJVUVcC3I	1	2025-07-19 18:33:09.41
23	1	Casesopened.png	64957	application/ms-word	uploads/d12148aa12943e4808eb3fde6895ef27	jZJVUVcC3I	1	2025-07-19 18:33:24.681
10	7	Fashion_Forward_Payment_Agreement.pdf	145408	application/pdf	uploads/fashion_forward_payment_agreement.pdf	43000315	2	2025-07-11 17:29:44.287583
\.


--
-- Data for Name: external_api_credentials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.external_api_credentials (id, organisation_id, username, password_hash, is_active, description, created_by, created_at, updated_at) FROM stdin;
1	3	acclaim.orgadmin@acclaim.law	$2b$10$xVUTCdRwcpZotETjY1HBMe7EFWpEibNkiZR1uf1YL6yKzXBKj6BQi	t		43000315	2025-07-18 10:12:43.979075	2025-07-18 10:12:43.979075
2	4	test_user	$2b$10$4m2GBLCdQCUVimUbfI8eJ.CmeFBAuuJlLkAhh6O8kJvt2mVeNUSke	t	\N	\N	2025-07-24 10:44:10.103891	2025-07-24 10:44:10.103891
\.


--
-- Data for Name: login_attempts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.login_attempts (id, email, success, ip_address, user_agent, failure_reason, created_at) FROM stdin;
1	danhirst@chadlaw.co.uk	t	127.0.0.1	\N	\N	2025-08-06 14:05:05.502426
2	test@example.com	f	192.168.1.100	\N	Invalid credentials	2025-08-06 14:05:05.502426
3	danhirst@chadlaw.co.uk	t	127.0.0.1	\N	\N	2025-08-06 14:05:05.502426
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, sender_id, recipient_type, recipient_id, case_id, subject, content, is_read, created_at, attachment_file_name, attachment_file_path, attachment_file_size, attachment_file_type) FROM stdin;
1	43000315	organization	support	\N	Hello	I have a debt	f	2025-07-11 17:08:46.764624	\N	\N	\N	\N
3	43000315	organization	support	2	Green Manufacturing payment plan	The payment plan for Green Manufacturing is working well. They made their first payment on time. Please continue monitoring their account.	t	2025-07-11 17:29:30.6147	\N	\N	\N	\N
4	43000315	organization	support	4	Coastal Retail Group - Legal Action	I see legal action has been initiated against Coastal Retail Group. Can you provide an update on the expected timeline for court proceedings?	f	2025-07-11 17:29:30.6147	\N	\N	\N	\N
5	43000315	organization	support	\N	Monthly report request	Could you please send me the monthly recovery report for our account? I need it for our board meeting next week.	t	2025-07-11 17:29:30.6147	\N	\N	\N	\N
6	43000315	organization	support	7	Fashion Forward Boutique payment	Fashion Forward Boutique contacted us directly about their payment plan. They want to increase their monthly payments to £800. Please update their account.	f	2025-07-11 17:29:30.6147	\N	\N	\N	\N
7	43000315	organization	support	\N	New case submission	We have a new case that needs to be added to our account. The debtor is Riverside Hotels Ltd, account number RH-2024-089, amount £24,500. Please process this when possible.	t	2025-07-11 17:29:30.6147	\N	\N	\N	\N
12	43000315	organization	support	\N	Re: Re: Monthly report request	Thank you\n\n--- Original Message ---\nFrom: 43000315\nDate: 11 Jul 2025, 22:39\nSubject: Re: Monthly report request\n\nWe will get this for you. Thank you.	t	2025-07-11 21:40:58.354866	\N	\N	\N	\N
11	43000315	organization	support	\N	Re: Monthly report request	We will get this for you. Thank you.	t	2025-07-11 21:39:21.301239	\N	\N	\N	\N
27	44821844	user	43000315	7	Message regarding case ACC-2024-007	Test	f	2025-07-16 19:05:43.580101	\N	\N	\N	\N
9	43000315	organization	support	\N	Hello	I hope you are recovering my debt	t	2025-07-11 21:19:06.542916	\N	\N	\N	\N
8	43000315	organization	support	1	Message regarding case ACC-2024-001	Hello	t	2025-07-11 17:31:21.311351	\N	\N	\N	\N
2	43000315	organization	support	1	Query about TechNova Solutions case	Hi, I wanted to check on the progress of the TechNova Solutions case. They mentioned they would be making a payment this week but we haven't received anything yet. Can you please follow up?	t	2025-07-11 17:29:30.6147	\N	\N	\N	\N
13	43000315	organization	support	3	Message regarding case ACC-2024-003	Can we have an update please?	t	2025-07-11 21:45:39.896744	\N	\N	\N	\N
14	43000315	organization	support	\N	Re: Monthly report request	Please find attached your report. \r\n\r\n--- Original Message ---\r\nFrom: Dan Hirst\r\nDate: 11 Jul 2025, 18:29\r\nSubject: Monthly report request\r\n\r\nCould you please send me the monthly recovery report for our account? I need it for our board meeting next week.	t	2025-07-11 21:52:48.415013	Client Report.xlsx	uploads/832975ce10c820d9582914fae3dd1c57	8796	application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
19	43000315	organization	1	2	Older Update	This is an older message for case 2	f	2025-07-09 23:54:26.025865	\N	\N	\N	\N
18	43000315	organization	1	1	Recent Update	This is the most recent message for case 1	t	2025-07-11 22:54:26.025865	\N	\N	\N	\N
17	43000315	organization	support	5	Message regarding case ACC-2024-005	Thank you	t	2025-07-11 22:08:28.06483	\N	\N	\N	\N
15	43000315	organization	support	5	Message regarding case ACC-2024-005	see attached	t	2025-07-11 22:00:05.180802	\N	\N	\N	\N
16	43000315	organization	support	5	Message regarding case ACC-2024-005	Sorry now attached	t	2025-07-11 22:05:33.021519	Client Report (1).xlsx	uploads/5a19679d17d526dfa549a2a184f3500a	8796	application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
21	44821844	organization	support	7	Message regarding case ACC-2024-007	Is there any update please? 	f	2025-07-13 09:20:31.986124	\N	\N	\N	\N
23	43000315	organization	support	3	Message regarding case ACC-2024-003	test	f	2025-07-16 13:29:38.815964	\N	\N	\N	\N
24	43000315	organization	support	3	test subject	test message	f	2025-07-16 13:30:06.457438	\N	\N	\N	\N
25	43000315	organization	support	7	Report	Here is your report. 	f	2025-07-16 18:33:50.580236	\N	\N	\N	\N
26	43000315	organization	support	7	Message regarding case ACC-2024-007	fYI	t	2025-07-16 18:34:42.567827	\N	\N	\N	\N
28	43000315	organization	2	7	Message regarding case ACC-2024-007	This is your report	f	2025-07-16 19:07:24.176345	\N	\N	\N	\N
32	jZJVUVcC3I	case	1	\N	case_update: TechNova Solutions Ltd	This is a test message from the external system	f	2025-07-18 14:11:47.633	\N	\N	\N	\N
33	jZJVUVcC3I	case	1	\N	case_update: TechNova Solutions Ltd	We confirm that the claim form has been issued	f	2025-07-18 14:19:20.99	\N	\N	\N	\N
34	jZJVUVcC3I	case	1	\N	case_update: TechNova Solutions Ltd	Test message with custom subject	f	2025-07-18 14:22:51.27	\N	\N	\N	\N
35	jZJVUVcC3I	case	1	\N	case_update: TechNova Solutions Ltd	Test message with custom subject	f	2025-07-18 14:23:06.696	\N	\N	\N	\N
36	jZJVUVcC3I	case	1	\N	Custom Subject Test	Test message with custom subject	f	2025-07-18 14:23:18.525	\N	\N	\N	\N
37	jZJVUVcC3I	case	1	\N	case_update: TechNova Solutions Ltd	Test message without custom subject	f	2025-07-18 14:23:24.456	\N	\N	\N	\N
38	jZJVUVcC3I	case	1	\N	Custom Subject - Final Test	Final test with custom subject	f	2025-07-18 14:24:33.54	\N	\N	\N	\N
39	jZJVUVcC3I	case	1	\N	payment_received: TechNova Solutions Ltd	Final test without custom subject	f	2025-07-18 14:24:38.792	\N	\N	\N	\N
40	jZJVUVcC3I	case	1	\N	Test subject	We confirm that the claim form has been issued	f	2025-07-18 14:25:22.907	\N	\N	\N	\N
41	jZJVUVcC3I	case	1	\N	Test caseId Fix	Testing caseId fix	f	2025-07-18 14:27:51.112	\N	\N	\N	\N
42	jZJVUVcC3I	case	1	\N	Debug Test	Debug test message	f	2025-07-18 14:28:26.746	\N	\N	\N	\N
43	jZJVUVcC3I	case	1	1	CaseId Fix Test	Testing caseId fix again	f	2025-07-18 14:29:02.343	\N	\N	\N	\N
44	jZJVUVcC3I	case	1	1	Final Test Message	Final test message for case display	f	2025-07-18 14:29:16.668	\N	\N	\N	\N
45	jZJVUVcC3I	case	1	1	Test subject	We confirm that the claim form has been issued	f	2025-07-18 14:31:23.443	\N	\N	\N	\N
46	jZJVUVcC3I	case	1	1	Test	Judgment obtained	f	2025-07-18 14:41:29.678	\N	\N	\N	\N
47	43000315	organisation	support	\N	Test	Hello	f	2025-07-23 17:17:56.341481	b05681bc-a80a-463d-94de-142f85bf7c03.jpeg	uploads/2faab9bd5af49a05573bf87c03f331e4	173381	image/jpeg
48	44821844	user	43000315	\N	Test message	Testing email notifications	f	2025-07-23 19:20:18.002709	\N	\N	\N	\N
49	xm-1imDrcC	user	43000315	\N	Test	Hello	f	2025-07-23 19:21:45.034877	\N	\N	\N	\N
50	44821844	user	43000315	\N	Manual Test - Email Should Work	Testing if admin email notification works from API	f	2025-07-23 19:24:52.316677	\N	\N	\N	\N
53	xm-1imDrcC	user	43000315	\N	Not in a case	Hello	f	2025-07-23 19:39:16.25912	\N	\N	\N	\N
54	44821844	user	43000315	\N	FINAL TEST - Admin Email Notification	This proves the email system works correctly for messages sent from the system	f	2025-07-23 19:42:46.88527	\N	\N	\N	\N
59	xm-1imDrcC	user	43000315	14	Update	I have a board meeting. Is there an update on this case?	f	2025-07-24 16:44:58.610287	\N	\N	\N	\N
60	xm-1imDrcC	user	43000315	\N	Test 1	Hi	f	2025-07-24 16:47:45.209236	\N	\N	\N	\N
61	xm-1imDrcC	user	43000315	14	Test 2	Hello	f	2025-07-24 16:48:06.624264	\N	\N	\N	\N
62	xm-1imDrcC	user	43000315	\N	Hi	Hi 	f	2025-07-24 16:56:39.608365	\N	\N	\N	\N
63	TwbHhZRCUt	user	43000315	\N	Update	Good Morning, Please can you explain why my matter is not showing up on the portal? I sent it through 6 months ago! WHY HAVEN'T YOU DONE ANNYTHING!!! I want to make a complaint. Kind regards Sean	f	2025-07-25 09:14:50.164164	\N	\N	\N	\N
64	xm-1imDrcC	user	43000315	\N	Hi	Hello	f	2025-07-28 13:10:58.271759	\N	\N	\N	\N
65	jZJVUVcC3I	case	14	14	Information for Client	We have engaged the services of High Court Enforcement Officers, who will proceed to apply to the Court for a Writ of Control. This Writ of Control grants the High Court Enforcement Officer the authority to enforce the debt and, if feasible, seize assets.\r\n\r\nWill keep you advised.\r\n	f	2025-08-05 13:29:36.136	\N	\N	\N	\N
66	jZJVUVcC3I	case	14	14	Information for Client	Hello Jim	f	2025-08-05 15:09:55.752	\N	\N	\N	\N
67	jZJVUVcC3I	case	14	14	Test Payment Update - Email Notification Test	This is a test message from the SOS external case management system to verify email notifications are working properly.	f	2025-08-07 09:00:06.401	\N	\N	\N	\N
68	jZJVUVcC3I	case	14	14	Payment Received - £2,500	Payment of £2,500 has been received for this case.\n\nAccount Statement:\n- Previous Balance: £5,000.00\n- Payment Received: £2,500.00\n- Outstanding Balance: £2,500.00\n\nPayment Method: Bank Transfer\nReference: PAY-2024-001\nDate: 07/08/2025\n\nPlease update your records accordingly.	f	2025-08-07 09:20:09.265	\N	\N	\N	\N
69	jZJVUVcC3I	case	14	14	Email Template Design Update - Teal Header & Logo	Design Update Test: This email demonstrates the new teal header with your Acclaim logo.\n\nFeatures updated:\n• Beautiful teal gradient header (#14b8a6 → #0d9488)\n• Your Acclaim rose logo prominently displayed\n• Professional "Acclaim Credit Management" branding\n• Consistent styling across all email types\n\nThis ensures your emails have a cohesive, professional appearance that matches your brand identity.	f	2025-08-07 09:26:05.523	\N	\N	\N	\N
70	jZJVUVcC3I	case	14	14	FRESH TEST - New Teal Design - 9:32:56 AM	Fresh Design Test - 9:32:56 AM\n\nThis is a brand new test message to verify the email template changes:\n\n✅ Teal gradient header (#14b8a6 to #0d9488)\n✅ Acclaim rose logo in header (replacing "Acclaim Portal" text)\n✅ "Acclaim Credit Management" sender branding\n✅ Logo attached as email attachment for reliable display\n\nIf you're still seeing the old blue design, please check you're looking at the newest email preview URL (this test generates a fresh one).	f	2025-08-07 09:32:56.675	\N	\N	\N	\N
71	jZJVUVcC3I	case	14	14	Email Design Preview - 9:35:11 AM - Teal Header & Logo	PREVIEW TEST - 2025-08-07T09:35:11.392Z\n\nThis email preview demonstrates the updated design:\n\n🎨 VISUAL CHANGES:\n• Header: Beautiful teal gradient (#14b8a6 → #0d9488) \n• Logo: Your Acclaim rose logo replaces "Acclaim Portal" text\n• Branding: "Acclaim Credit Management" sender name\n• Styling: Professional, consistent appearance\n\n📧 EMAIL FEATURES:\n• SendGrid integration for production delivery\n• User preference filtering (only users with notifications enabled)\n• Professional HTML templates with responsive design\n• Logo embedded as attachment for reliable display\n\nThis preview URL will show you exactly what your users receive when external systems send notifications.	f	2025-08-07 09:35:11.531	\N	\N	\N	\N
72	jZJVUVcC3I	case	14	14	Fresh Preview - Teal Header with Acclaim Logo	FRESH PREVIEW - New Teal Design Test\n\nThis email shows the updated design:\n• Teal gradient header (#14b8a6 → #0d9488)\n• Your Acclaim rose logo in header\n• Acclaim Credit Management branding\n• Professional styling throughout\n\nGenerated at: Thu Aug  7 09:35:28 AM UTC 2025	f	2025-08-07 09:35:28.61	\N	\N	\N	\N
73	jZJVUVcC3I	case	14	14	Information for Client	We have instructed the High Court Enforcement Agents and will update you again once we have heard from them with notice that the Writ of Control has been issued.	f	2025-08-07 09:39:02.858	\N	\N	\N	\N
74	jZJVUVcC3I	case	14	14	REAL EMAIL TEST - SendGrid Delivery	SENDGRID TEST - Real Email Delivery Test\n\nThis email is being sent via SendGrid to REAL inboxes:\n\n✅ Teal gradient header\n✅ Acclaim rose logo\n✅ Professional branding\n✅ Delivered to actual email addresses\n\nTime: Thu Aug  7 10:33:09 AM UTC 2025	f	2025-08-07 10:33:10.029	\N	\N	\N	\N
75	jZJVUVcC3I	case	14	14	SUCCESS - Real Email from email@acclaim.law	REAL EMAIL DELIVERY TEST\n\nThis email is now being sent from your verified email address:\n✅ From: email@acclaim.law (verified)\n✅ Via: SendGrid for real delivery\n✅ Design: Teal header with Acclaim logo\n✅ Recipients: Actual user inboxes\n\nThis test will deliver to real email inboxes!\n\nSent at: Thu Aug  7 10:36:02 AM UTC 2025	f	2025-08-07 10:36:02.217	\N	\N	\N	\N
76	jZJVUVcC3I	case	14	14	Information for Client	We have received confirmation from the HCE that they have received the sealed Writ of Control back from Court. 	f	2025-08-07 10:38:07.325	\N	\N	\N	\N
77	jZJVUVcC3I	case	14	14	DEBUG - Testing Both Users	DEBUG: Testing notification to both users\n\nThis should send to both:\n- perry367@gmail.com\n- seanthornhill@chadlaw.co.uk\n\nBoth have notifications enabled and are in organisation 4.\n\nTime: Thu Aug  7 11:01:47 AM UTC 2025	f	2025-08-07 11:01:47.578	\N	\N	\N	\N
78	jZJVUVcC3I	case	14	14	PERSONAL EMAIL TEST - Check Your Inbox	DIRECT TEST EMAIL - Personal Check\n\nIf you are reading this in your actual email inbox, the system is working perfectly.\n\nThis email was sent at: Thu Aug  7 11:18:09 AM UTC 2025\n\nPlease check:\n- Your main inbox\n- Spam/junk folder\n- Promotions tab (Gmail)\n\nFrom: email@acclaim.law\nVia: SendGrid production delivery	f	2025-08-07 11:18:09.465	\N	\N	\N	\N
79	jZJVUVcC3I	case	14	14	Instructions Required	Test	f	2025-08-19 12:26:16.59	\N	\N	\N	\N
80	jZJVUVcC3I	case	14	14	Information for Client	We have prepared and submitted the claim to the Court for issuing. As it has been sent to the Civil National Business Centre by paper, we are aware that there is currently a backlog, and it may take in excess of four weeks for the claim to be processed.\r\n\r\nWe will keep you updated once we receive confirmation of the date of issue from the Court.\r\n\r\nOnce the claim is issued, it will be served on the defendants, who will then have 14 days to respond. During this time, they may choose to acknowledge the claim, file a defence, or make payment to settle the matter.	f	2025-08-19 12:44:26.333	\N	\N	\N	\N
81	jZJVUVcC3I	case	14	14	Information for Client	A letter of claim has been issued and will be sent to the debtor.\r\n\r\nThe total amount being pursued from the debtor is £19,970.85. This includes the principal debt together with claimed interest of £1,762.85 and costs of £1,208.00.\r\n\r\n	f	2025-08-19 12:49:57.68	\N	\N	\N	\N
82	jZJVUVcC3I	case	17	17	SOS Test - Email Should NOT Send	This is a test message from SOS on the case - checking email suppression	f	2025-08-21 01:05:34.943	\N	\N	\N	\N
83	jZJVUVcC3I	case	17	17	SOS Test - With Notifications ON	This is another SOS test with sendNotifications TRUE - should check if emails send	f	2025-08-21 01:05:46.329	\N	\N	\N	\N
84	jZJVUVcC3I	case	17	17	Direct Email Test	Direct test to check email delivery - this should generate email logs	f	2025-08-21 01:07:56.173	\N	\N	\N	\N
85	jZJVUVcC3I	case	17	17	Email Delivery Check	URGENT: Please check your email (including spam folder) for this test message from Acclaim Portal. Subject will be: urgent_test: Email Delivery Check - Acclaim Portal	f	2025-08-21 01:08:07.466	\N	\N	\N	\N
86	jZJVUVcC3I	case	14	14	Information for Client	hi	f	2025-08-21 01:10:03.085	\N	\N	\N	\N
87	jZJVUVcC3I	case	17	17	Bounce Detection Test	Final bounce test - checking if this email bounces or gets rejected by the email provider	f	2025-08-21 01:11:56.4	\N	\N	\N	\N
88	jZJVUVcC3I	case	17	17	Enhanced Bounce Detection	Enhanced logging test - checking SMTP response details and bounce notifications	f	2025-08-21 01:12:10.027	\N	\N	\N	\N
89	jZJVUVcC3I	case	17	17	Invalid Email Bounce Test	Testing with a clearly invalid email to see bounce detection - this should show rejection	f	2025-08-21 01:12:18.651	\N	\N	\N	\N
90	jZJVUVcC3I	case	17	17	Bounce Detection with Invalid Domain	Testing bounce detection with invalid email domain - should show delivery failure	f	2025-08-21 01:12:39.4	\N	\N	\N	\N
91	jZJVUVcC3I	case	14	14	Instructions Required	Test no admin log-in instructions required	f	2025-08-21 07:41:50.595	\N	\N	\N	\N
92	jZJVUVcC3I	case	14	14	Instructions Required	Test with admin logged-in.	f	2025-08-21 07:43:40.073	\N	\N	\N	\N
93	jZJVUVcC3I	case	14	14	Instructions Required	test with admin logged in to main site.	f	2025-08-21 07:44:43.589	\N	\N	\N	\N
94	43000315	organisation	4	14	Hello	Do new message work?	f	2025-08-21 08:29:51.660696	\N	\N	\N	\N
95	jZJVUVcC3I	case	14	14	Instructions Required	We have not received any response to the letter of claim that was sent to the debtor regarding this matter.\r\n\r\nAt this point, we have reached a stage where we can initiate court proceedings on your behalf. This process involves us submitting a claim to the court.\r\n\r\nOnce the court receives the claim, they will officially issue it and serve a copy of the claim to the debtor. Subsequently, the debtor will have a 14-day window within which to respond to the claim. During this period, they can choose to admit the claim, acknowledge it, defend against it, or make a payment. In the event that the debtor files an acknowledgement of the claim, they will be granted an additional 14-day extension to prepare and submit their defence or make a payment.\r\n\r\nIf you decide to proceed with the claim, please note that there will be a court fee of 5% of the claimed value payable upon presentation of the claim.\r\n\r\nPlease confirm whether you wish for us to proceed with initiating these court proceedings on your behalf.	f	2025-08-21 15:56:05.106	\N	\N	\N	\N
96	44821844	user	43000315	\N	Hi	Test	f	2025-08-21 16:04:23.193739	\N	\N	\N	\N
97	jZJVUVcC3I	case	14	14	Information for Client	We have submitted a request for Judgment to the Court, and we will provide you with further updates as soon as we receive confirmation from the Court regarding the Judgment date.	f	2025-08-21 16:16:15.098	\N	\N	\N	\N
98	44821844	user	43000315	14	Test	Test message on case	f	2025-08-21 17:16:51.218839	\N	\N	\N	\N
99	44821844	user	43000315	\N	Test	Test message not on a case	f	2025-08-21 17:17:44.538763	\N	\N	\N	\N
100	44821844	user	43000315	\N	See attached	Thanks 	f	2025-08-21 17:18:40.752763	2AD3FDCA-E43F-4DF9-97F3-D0BA7321A861.png	uploads/6e0721347e6b5cb4a662316652d5e6f2	119240	image/png
101	44821844	user	43000315	\N	See attached	Image	f	2025-08-21 17:25:59.695937	2AD3FDCA-E43F-4DF9-97F3-D0BA7321A861.png	uploads/1e9671d435879c065ce5788b47c6f581	119240	image/png
102	44821844	user	43000315	\N	Re: Information for Client	Thanks very much \r\n\r\n--- Original Message ---\r\nFrom: Matthew Perry\r\nDate: 21 Aug 2025 at 17:16\r\nSubject: Information for Client\r\n\r\nWe have submitted a request for Judgment to the Court, and we will provide you with further updates as soon as we receive confirmation from the Court regarding the Judgment date.	f	2025-08-21 17:30:56.708127	\N	\N	\N	\N
103	44821844	user	43000315	14	Message regarding case CLS00003-028	Teal?	f	2025-08-21 17:33:51.922505	\N	\N	\N	\N
104	43000315	organisation	4	14	Message regarding case CLS00003-028	Hellooo 	f	2025-08-21 18:11:25.30346	\N	\N	\N	\N
105	44821844	user	43000315	14	Update needed	Can I get an update? 	f	2025-08-21 19:39:48.860266	\N	\N	\N	\N
\.


--
-- Data for Name: organisations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.organisations (id, name, contact_email, contact_phone, address, created_at, updated_at, external_ref) FROM stdin;
1	Acme Corporation	admin@acme.com	+44 20 7123 4567	123 Business Park, London, UK	2025-07-11 17:28:34.489579	2025-07-11 17:28:34.489579	\N
3	AcclaimCMR	\N	\N	\N	2025-07-18 10:03:22.861315	2025-07-18 10:03:22.861315	\N
4	Chadwick Lawrence LLP	\N	\N	\N	2025-07-19 18:52:51.473392	2025-07-19 18:52:51.473392	CLS00003
5	National Group	\N	\N	\N	2025-08-05 15:11:55.814725	2025-08-05 15:11:55.814725	\N
2	Dodo Happy	\N	\N	\N	2025-07-11 20:48:23.673703	2025-08-23 12:34:53.583	1234
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, case_id, amount, payment_date, payment_method, reference, notes, recorded_by, created_at, organisation_id, external_ref) FROM stdin;
5	2	22000.00	2025-07-08 00:00:00	Bank Transfer	TXN-2025-003	Final Payment	43000315	2025-07-11 21:21:30.939	1	\N
6	7	6600.00	2024-01-15 10:00:00	Bank Transfer	BT-2024-001	Final settlement payment	43000315	2025-07-12 17:31:24.975377	1	\N
1	5	250.00	2025-06-11 00:00:00	Bank Transfer	TXN-2024-001	Initial payment received	43000315	2025-07-11 22:21:30.93994	1	\N
2	5	175.50	2025-06-25 00:00:00	Card Payment	TXN-2024-002	Monthly instalment	43000315	2025-07-11 22:21:30.93994	1	\N
3	4	500.00	2025-01-25 00:00:00	Cheque	CHQ-789456	Partial payment	43000315	2025-07-11 22:21:30.93994	1	\N
4	7	150.00	2024-01-10 16:20:00	Cash	DD-2024-003	Payment plan instalment	43000315	2025-07-11 22:21:30.93994	1	\N
37	14	110.00	2025-07-24 12:00:00	Unknown	\N		\N	2025-07-24 12:43:00.489826	4	CLS_24072025134241_MDP
38	14	1500.00	2025-01-24 12:00:00	Updated Bank Transfer	UPD-REF-001	Final test update with JSON response	\N	2025-07-24 12:53:24.751336	4	TEST-PAY-001
39	14	10.00	2025-09-14 12:00:00	Unknown	\N		\N	2025-09-14 07:27:39.77005	4	CLS_14092025082725_MDP
\.


--
-- Data for Name: system_metrics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_metrics (id, metric_name, metric_value, recorded_at) FROM stdin;
1	cpu_usage	45.70	2025-08-06 14:05:02.569701
2	memory_usage	68.30	2025-08-06 14:05:02.569701
3	disk_usage	42.10	2025-08-06 14:05:02.569701
4	active_connections	23.00	2025-08-06 14:05:02.569701
5	response_time_ms	125.50	2025-08-06 14:05:02.569701
\.


--
-- Data for Name: user_activity_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_activity_logs (id, user_id, action, details, ip_address, user_agent, created_at) FROM stdin;
1	43000315	LOGIN	User logged in successfully	127.0.0.1	\N	2025-08-06 14:05:03.720803
2	43000315	VIEW_CASE	Viewed case CLS00003-028	127.0.0.1	\N	2025-08-06 14:05:03.720803
3	43000315	SEND_MESSAGE	Sent message to admin	127.0.0.1	\N	2025-08-06 14:05:03.720803
\.


--
-- Data for Name: user_organisations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_organisations (id, user_id, organisation_id, created_at) FROM stdin;
1	44821844	4	2025-07-28 08:30:24.441445
5	43000315	3	2025-07-28 08:30:24.441445
6	TwbHhZRCUt	4	2025-07-28 08:30:24.441445
7	jZJVUVcC3I	2	2025-07-28 08:30:24.441445
14	43000315	2	2025-08-06 12:19:45.342038
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_sessions (sid, sess, expire) FROM stdin;
6iRt9lwc-5MLTPLxT49gpFgsRgP9zuOy	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-07T11:38:34.809Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"43000315"}}	2025-11-07 11:38:35
DqSDjN1OeR6Db-YcyoL1UQkbFJVjBYU1	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-13T15:05:00.868Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-11-13 15:05:01
AH-ScEX2Wx-LjLoL2DtLNQGLhRWzao3U	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-13T15:05:21.411Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-11-13 15:05:22
VIX-pFRO_BQV5dMezK1cpz58xLBa8l_p	{"cookie":{"originalMaxAge":604800000,"expires":"2025-10-31T12:39:17.328Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-10-31 12:39:18
XclpTwloCpOFLK4P52FyfGEz0Ahv39y0	{"cookie":{"originalMaxAge":604800000,"expires":"2025-10-31T12:39:23.198Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-10-31 12:39:24
FK9fwbNt1PA7HSeImrNUAEZk-bnnGNe8	{"cookie":{"originalMaxAge":604800000,"expires":"2025-10-31T12:39:24.645Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-10-31 12:39:25
9FK_Ftk_arDUJk9fbsBZVkZTZ7QidQGW	{"cookie":{"originalMaxAge":604800000,"expires":"2025-10-31T12:39:29.124Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-10-31 12:39:30
jfrYcgHZYgN_cp2OVNcCTZsR_gPSJcUO	{"cookie":{"originalMaxAge":604800000,"expires":"2025-10-31T12:42:51.074Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-10-31 12:42:52
uw7D9NfiogrTy1tpMYFiwWSFn-VeJQqM	{"cookie":{"originalMaxAge":604800000,"expires":"2025-10-31T12:55:59.822Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-10-31 12:56:00
a55a68QIcoMq_UwGxIMOw6Lnu1zSaAJd	{"cookie":{"originalMaxAge":604800000,"expires":"2025-10-31T13:16:18.406Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-10-31 13:16:19
zMKTvtyfQzYCYIQsrLRDkAzCQnda7BKs	{"cookie":{"originalMaxAge":604800000,"expires":"2025-10-31T13:16:19.570Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-10-31 13:16:20
KEXqPvNoEceDKJAqg7HRNp90R1DMW8ST	{"cookie":{"originalMaxAge":604800000,"expires":"2025-10-31T13:35:37.005Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-10-31 13:35:38
p83lLj3AfCQkgj14hvJ_Vty2IdSPaXeT	{"cookie":{"originalMaxAge":604800000,"expires":"2025-10-31T14:40:12.118Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-10-31 14:40:13
KXa8Dz35FURg7z5JZ47LPlldK_USp0v0	{"cookie":{"originalMaxAge":604800000,"expires":"2025-10-31T15:13:41.976Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-10-31 15:13:42
5iKCDE_PCNJT49kyD9EFPEOQEm25zTFN	{"cookie":{"originalMaxAge":604800000,"expires":"2025-10-31T16:28:39.144Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-10-31 16:28:40
4XBD-E-bP1UYdldfiqT1Lrf138DdQjz_	{"cookie":{"originalMaxAge":604800000,"expires":"2025-10-31T18:30:15.384Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-10-31 18:30:16
HxTh7rALGLxq4zrDJB1uomAFLzPZnQyx	{"cookie":{"originalMaxAge":604800000,"expires":"2025-10-31T19:08:48.687Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2025-10-31 19:08:49
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, first_name, last_name, profile_image_url, organisation_id, created_at, updated_at, is_admin, phone, hashed_password, temp_password, must_change_password, external_ref, email_notifications, push_notifications) FROM stdin;
xm-1imDrcC	jordancrowther@chadlaw.co.uk	Jordan	Crowther	\N	\N	2025-07-23 17:51:50.915875	2025-08-06 11:06:37.657	f		1868e9e0fd94740682fb7deb3a942b6738ce145a685499a76a107490a87dd2b06fcb087971f8501013d636224ec182c46589550232aaedbfaca8a9fcccd7fdb0.d3e04eae89904821dfafc3bde595cde5	\N	f	\N	t	t
43000315	danhirst@chadlaw.co.uk	Dan	Hirst	\N	3	2025-07-11 17:07:05.530534	2025-08-06 13:46:43.784	t	01132258811	6ba8e17c2e5a2f1048049745f227c8161eca55e19b8ae78ed44c3f90941cb68bf1129202562eb0f85a40f7644affd8f148cb2bbd7952c078b6d3a0218a535a38.97de72625d8b9afce9e9f18ad79c9656	admin123	f	\N	t	t
admin_1753292574.014698	Email@acclaim.law	Admin	User	\N	\N	2025-07-23 17:42:54.014698	2025-07-23 17:42:54.014698	t	\N	$2b$10$bhv9qcJt0Qu7IB8ZGqB9ZuTE8n3FipK6vBltsP4.MV9t0pGx75VaK	\N	f	\N	t	t
44821844	perry367@gmail.com	Matt	Perry	\N	4	2025-07-12 08:42:50.58667	2025-08-21 16:04:00.427	f	\N	56a54e19afd7bc60ae2dadd8016bdb1ac0e9b2eccb56cd86a30279afefbc2ec0f4ca4f5e4b92970cf8a03f50daf0b1a6d327d87a6c7287f7e3e8dfa3865c7b67.f4a82d871d7253cf6a2f9620d61a0323	\N	f	\N	t	t
TwbHhZRCUt	seanthornhill@chadlaw.co.uk	Sean	Thornhill-Adey	\N	4	2025-07-24 15:53:31.667104	2025-07-25 09:13:01.241	f		$2b$10$60dZmPdy.6wuenagKui8buGIsS6y85K5klqpi5upjCuHg6M1W9Oca	\N	f	\N	t	t
jZJVUVcC3I	mattperry@chadlaw.co.uk	Matthew	Perry	\N	2	2025-07-13 07:41:58.985119	2025-07-19 21:35:16.688	t	01132258847	$2b$10$yU0Tcr.O2uMBoi16qkxcZugGjJRZaVlIsCuqR.QYWr4SHv6yR5X62	Ky3X1ryyPiUN	t	\N	t	t
\.


--
-- Name: audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_log_id_seq', 104, true);


--
-- Name: case_activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.case_activities_id_seq', 67, true);


--
-- Name: case_submission_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.case_submission_documents_id_seq', 7, true);


--
-- Name: case_submissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.case_submissions_id_seq', 9, true);


--
-- Name: cases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cases_id_seq', 18, true);


--
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.documents_id_seq', 23, true);


--
-- Name: external_api_credentials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.external_api_credentials_id_seq', 2, true);


--
-- Name: login_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.login_attempts_id_seq', 3, true);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.messages_id_seq', 105, true);


--
-- Name: organizations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.organizations_id_seq', 13, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payments_id_seq', 39, true);


--
-- Name: system_metrics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_metrics_id_seq', 5, true);


--
-- Name: user_activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_activity_logs_id_seq', 3, true);


--
-- Name: user_organisations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_organisations_id_seq', 14, true);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: case_activities case_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_activities
    ADD CONSTRAINT case_activities_pkey PRIMARY KEY (id);


--
-- Name: case_submission_documents case_submission_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_submission_documents
    ADD CONSTRAINT case_submission_documents_pkey PRIMARY KEY (id);


--
-- Name: case_submissions case_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_submissions
    ADD CONSTRAINT case_submissions_pkey PRIMARY KEY (id);


--
-- Name: cases cases_account_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_account_number_unique UNIQUE (account_number);


--
-- Name: cases cases_external_ref_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_external_ref_key UNIQUE (external_ref);


--
-- Name: cases cases_external_ref_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_external_ref_unique UNIQUE (external_ref);


--
-- Name: cases cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: external_api_credentials external_api_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_api_credentials
    ADD CONSTRAINT external_api_credentials_pkey PRIMARY KEY (id);


--
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: organisations organisations_external_ref_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organisations
    ADD CONSTRAINT organisations_external_ref_key UNIQUE (external_ref);


--
-- Name: organisations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organisations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: payments payments_external_ref_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_external_ref_key UNIQUE (external_ref);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: user_sessions session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: system_metrics system_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_metrics
    ADD CONSTRAINT system_metrics_pkey PRIMARY KEY (id);


--
-- Name: user_activity_logs user_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activity_logs
    ADD CONSTRAINT user_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: user_organisations user_organisations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_organisations
    ADD CONSTRAINT user_organisations_pkey PRIMARY KEY (id);


--
-- Name: user_organisations user_organisations_user_id_organisation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_organisations
    ADD CONSTRAINT user_organisations_user_id_organisation_id_key UNIQUE (user_id, organisation_id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_external_ref_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_external_ref_key UNIQUE (external_ref);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.user_sessions USING btree (expire);


--
-- Name: audit_log audit_log_organisation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id);


--
-- Name: audit_log audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: case_activities case_activities_case_id_cases_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_activities
    ADD CONSTRAINT case_activities_case_id_cases_id_fk FOREIGN KEY (case_id) REFERENCES public.cases(id);


--
-- Name: case_submission_documents case_submission_documents_case_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_submission_documents
    ADD CONSTRAINT case_submission_documents_case_submission_id_fkey FOREIGN KEY (case_submission_id) REFERENCES public.case_submissions(id) ON DELETE CASCADE;


--
-- Name: cases cases_organisation_id_organisations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_organisation_id_organisations_id_fk FOREIGN KEY (organisation_id) REFERENCES public.organisations(id);


--
-- Name: documents documents_case_id_cases_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_case_id_cases_id_fk FOREIGN KEY (case_id) REFERENCES public.cases(id);


--
-- Name: documents documents_organisation_id_organisations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_organisation_id_organisations_id_fk FOREIGN KEY (organisation_id) REFERENCES public.organisations(id);


--
-- Name: documents documents_uploaded_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_users_id_fk FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: external_api_credentials external_api_credentials_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_api_credentials
    ADD CONSTRAINT external_api_credentials_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: external_api_credentials external_api_credentials_organisation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_api_credentials
    ADD CONSTRAINT external_api_credentials_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id);


--
-- Name: messages messages_case_id_cases_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_case_id_cases_id_fk FOREIGN KEY (case_id) REFERENCES public.cases(id);


--
-- Name: messages messages_sender_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_users_id_fk FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: payments payments_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id);


--
-- Name: payments payments_organisation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id);


--
-- Name: payments payments_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id);


--
-- Name: user_organisations user_organisations_organisation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_organisations
    ADD CONSTRAINT user_organisations_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id) ON DELETE CASCADE;


--
-- Name: user_organisations user_organisations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_organisations
    ADD CONSTRAINT user_organisations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_organisation_id_organisations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organisation_id_organisations_id_fk FOREIGN KEY (organisation_id) REFERENCES public.organisations(id);


--
-- PostgreSQL database dump complete
--

