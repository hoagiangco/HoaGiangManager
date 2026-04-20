--
-- PostgreSQL database dump
--

\restrict 6LxBZUt4tNqgAlhfki1UUCu44vDDSV66o9DetSnJdOWrGFzQJTh6T116qwV00ik

-- Dumped from database version 17.8 (a48d9ca)
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO neondb_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: neondb_owner
--

COMMENT ON SCHEMA public IS '';


--
-- Name: pg_session_jwt; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_session_jwt WITH SCHEMA public;


--
-- Name: EXTENSION pg_session_jwt; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_session_jwt IS 'pg_session_jwt: manage authentication sessions using JWTs';


--
-- Name: neon_auth; Type: SCHEMA; Schema: -; Owner: neon_auth
--

CREATE SCHEMA neon_auth;


ALTER SCHEMA neon_auth OWNER TO neon_auth;

--
-- Name: pgrst; Type: SCHEMA; Schema: -; Owner: neon_service
--

CREATE SCHEMA pgrst;


ALTER SCHEMA pgrst OWNER TO neon_service;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: damage_report_priority; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.damage_report_priority AS ENUM (
    '1',
    '2',
    '3',
    '4'
);


ALTER TYPE public.damage_report_priority OWNER TO neondb_owner;

--
-- Name: damage_report_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.damage_report_status AS ENUM (
    '1',
    '2',
    '3',
    '4',
    '5',
    '6'
);


ALTER TYPE public.damage_report_status OWNER TO neondb_owner;

--
-- Name: device_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.device_status AS ENUM (
    '1',
    '2',
    '3',
    '4',
    '5'
);


ALTER TYPE public.device_status OWNER TO neondb_owner;

--
-- Name: pre_config(); Type: FUNCTION; Schema: pgrst; Owner: neon_service
--

CREATE FUNCTION pgrst.pre_config() RETURNS void
    LANGUAGE sql
    SET search_path TO ''
    AS $$
  SELECT
      set_config('pgrst.db_schemas', 'public', true)
    , set_config('pgrst.db_aggregates_enabled', 'true', true)
    , set_config('pgrst.db_anon_role', 'anonymous', true)
    , set_config('pgrst.jwt_role_claim_key', '.role', true)
$$;


ALTER FUNCTION pgrst.pre_config() OWNER TO neon_service;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account; Type: TABLE; Schema: neon_auth; Owner: neon_auth
--

CREATE TABLE neon_auth.account (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" uuid NOT NULL,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp with time zone,
    "refreshTokenExpiresAt" timestamp with time zone,
    scope text,
    password text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE neon_auth.account OWNER TO neon_auth;

--
-- Name: invitation; Type: TABLE; Schema: neon_auth; Owner: neon_auth
--

CREATE TABLE neon_auth.invitation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "organizationId" uuid NOT NULL,
    email text NOT NULL,
    role text,
    status text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "inviterId" uuid NOT NULL
);


ALTER TABLE neon_auth.invitation OWNER TO neon_auth;

--
-- Name: jwks; Type: TABLE; Schema: neon_auth; Owner: neon_auth
--

CREATE TABLE neon_auth.jwks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "publicKey" text NOT NULL,
    "privateKey" text NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "expiresAt" timestamp with time zone
);


ALTER TABLE neon_auth.jwks OWNER TO neon_auth;

--
-- Name: member; Type: TABLE; Schema: neon_auth; Owner: neon_auth
--

CREATE TABLE neon_auth.member (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "organizationId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    role text NOT NULL,
    "createdAt" timestamp with time zone NOT NULL
);


ALTER TABLE neon_auth.member OWNER TO neon_auth;

--
-- Name: organization; Type: TABLE; Schema: neon_auth; Owner: neon_auth
--

CREATE TABLE neon_auth.organization (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo text,
    "createdAt" timestamp with time zone NOT NULL,
    metadata text
);


ALTER TABLE neon_auth.organization OWNER TO neon_auth;

--
-- Name: project_config; Type: TABLE; Schema: neon_auth; Owner: neon_auth
--

CREATE TABLE neon_auth.project_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    endpoint_id text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    trusted_origins jsonb NOT NULL,
    social_providers jsonb NOT NULL,
    email_provider jsonb,
    email_and_password jsonb,
    allow_localhost boolean NOT NULL,
    plugin_configs jsonb,
    webhook_config jsonb
);


ALTER TABLE neon_auth.project_config OWNER TO neon_auth;

--
-- Name: session; Type: TABLE; Schema: neon_auth; Owner: neon_auth
--

CREATE TABLE neon_auth.session (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    token text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" uuid NOT NULL,
    "impersonatedBy" text,
    "activeOrganizationId" text
);


ALTER TABLE neon_auth.session OWNER TO neon_auth;

--
-- Name: user; Type: TABLE; Schema: neon_auth; Owner: neon_auth
--

CREATE TABLE neon_auth."user" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "emailVerified" boolean NOT NULL,
    image text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    role text,
    banned boolean,
    "banReason" text,
    "banExpires" timestamp with time zone
);


ALTER TABLE neon_auth."user" OWNER TO neon_auth;

--
-- Name: verification; Type: TABLE; Schema: neon_auth; Owner: neon_auth
--

CREATE TABLE neon_auth.verification (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE neon_auth.verification OWNER TO neon_auth;

--
-- Name: AspNetRoleClaims; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."AspNetRoleClaims" (
    "Id" integer NOT NULL,
    "RoleId" text NOT NULL,
    "ClaimType" text,
    "ClaimValue" text
);


ALTER TABLE public."AspNetRoleClaims" OWNER TO neondb_owner;

--
-- Name: AspNetRoleClaims_Id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public."AspNetRoleClaims_Id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AspNetRoleClaims_Id_seq" OWNER TO neondb_owner;

--
-- Name: AspNetRoleClaims_Id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public."AspNetRoleClaims_Id_seq" OWNED BY public."AspNetRoleClaims"."Id";


--
-- Name: AspNetRoles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."AspNetRoles" (
    "Id" text NOT NULL,
    "Name" character varying(256),
    "NormalizedName" character varying(256),
    "ConcurrencyStamp" text
);


ALTER TABLE public."AspNetRoles" OWNER TO neondb_owner;

--
-- Name: AspNetUserClaims; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."AspNetUserClaims" (
    "Id" integer NOT NULL,
    "UserId" text NOT NULL,
    "ClaimType" text,
    "ClaimValue" text
);


ALTER TABLE public."AspNetUserClaims" OWNER TO neondb_owner;

--
-- Name: AspNetUserClaims_Id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public."AspNetUserClaims_Id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AspNetUserClaims_Id_seq" OWNER TO neondb_owner;

--
-- Name: AspNetUserClaims_Id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public."AspNetUserClaims_Id_seq" OWNED BY public."AspNetUserClaims"."Id";


--
-- Name: AspNetUserLogins; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."AspNetUserLogins" (
    "LoginProvider" text NOT NULL,
    "ProviderKey" text NOT NULL,
    "ProviderDisplayName" text,
    "UserId" text NOT NULL
);


ALTER TABLE public."AspNetUserLogins" OWNER TO neondb_owner;

--
-- Name: AspNetUserRoles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."AspNetUserRoles" (
    "UserId" text NOT NULL,
    "RoleId" text NOT NULL
);


ALTER TABLE public."AspNetUserRoles" OWNER TO neondb_owner;

--
-- Name: AspNetUserTokens; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."AspNetUserTokens" (
    "UserId" text NOT NULL,
    "LoginProvider" text NOT NULL,
    "Name" text NOT NULL,
    "Value" text
);


ALTER TABLE public."AspNetUserTokens" OWNER TO neondb_owner;

--
-- Name: AspNetUsers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."AspNetUsers" (
    "Id" text NOT NULL,
    "UserName" character varying(256),
    "NormalizedUserName" character varying(256),
    "Email" character varying(256),
    "NormalizedEmail" character varying(256),
    "EmailConfirmed" boolean DEFAULT false,
    "PasswordHash" text,
    "SecurityStamp" text,
    "ConcurrencyStamp" text,
    "PhoneNumber" text,
    "PhoneNumberConfirmed" boolean DEFAULT false,
    "TwoFactorEnabled" boolean DEFAULT false,
    "LockoutEnd" timestamp without time zone,
    "LockoutEnabled" boolean DEFAULT false,
    "AccessFailedCount" integer DEFAULT 0,
    "FullName" character varying(256),
    "CreatedDate" timestamp without time zone
);


ALTER TABLE public."AspNetUsers" OWNER TO neondb_owner;

--
-- Name: DamageReport; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."DamageReport" (
    "ID" integer NOT NULL,
    "DeviceID" integer,
    "DamageLocation" character varying(200),
    "ReporterID" smallint NOT NULL,
    "ReportingDepartmentID" smallint NOT NULL,
    "HandlerID" smallint,
    "AssignedDate" date,
    "ReportDate" date DEFAULT CURRENT_DATE NOT NULL,
    "HandlingDate" date,
    "CompletedDate" date,
    "EstimatedCompletionDate" date,
    "DamageContent" text NOT NULL,
    "Images" jsonb,
    "Status" public.damage_report_status DEFAULT '1'::public.damage_report_status NOT NULL,
    "Priority" public.damage_report_priority DEFAULT '2'::public.damage_report_priority NOT NULL,
    "Notes" text,
    "HandlerNotes" text,
    "RejectionReason" text,
    "CreatedBy" text,
    "UpdatedBy" text,
    "CreatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "MaintenanceBatchId" text,
    "AfterImages" jsonb,
    CONSTRAINT "DamageReport_check" CHECK (("ReportDate" <= COALESCE("HandlingDate", CURRENT_DATE))),
    CONSTRAINT "DamageReport_check1" CHECK ((("HandlingDate" IS NULL) OR ("HandlingDate" <= COALESCE("CompletedDate", CURRENT_DATE)))),
    CONSTRAINT "DamageReport_check2" CHECK ((("DeviceID" IS NOT NULL) OR (("DamageLocation" IS NOT NULL) AND (("DamageLocation")::text <> ''::text)) OR (("MaintenanceBatchId" IS NOT NULL) AND ("MaintenanceBatchId" <> ''::text))))
);


ALTER TABLE public."DamageReport" OWNER TO neondb_owner;

--
-- Name: COLUMN "DamageReport"."AfterImages"; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public."DamageReport"."AfterImages" IS 'Mảng đường dẫn hình ảnh sau khi xử lý (thực hiện xong công việc)';


--
-- Name: DamageReportHistory; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."DamageReportHistory" (
    "ID" integer NOT NULL,
    "DamageReportID" integer NOT NULL,
    "FieldName" character varying(50) NOT NULL,
    "OldValue" text,
    "NewValue" text,
    "ChangedBy" text NOT NULL,
    "ChangedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public."DamageReportHistory" OWNER TO neondb_owner;

--
-- Name: DamageReportHistory_ID_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public."DamageReportHistory_ID_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."DamageReportHistory_ID_seq" OWNER TO neondb_owner;

--
-- Name: DamageReportHistory_ID_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public."DamageReportHistory_ID_seq" OWNED BY public."DamageReportHistory"."ID";


--
-- Name: DamageReport_ID_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public."DamageReport_ID_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."DamageReport_ID_seq" OWNER TO neondb_owner;

--
-- Name: DamageReport_ID_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public."DamageReport_ID_seq" OWNED BY public."DamageReport"."ID";


--
-- Name: Department; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Department" (
    "ID" smallint NOT NULL,
    "Name" character varying(50)
);


ALTER TABLE public."Department" OWNER TO neondb_owner;

--
-- Name: Device; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Device" (
    "ID" integer NOT NULL,
    "Name" character varying(100),
    "Serial" character varying(100),
    "Description" text,
    "Img" text,
    "WarrantyDate" date,
    "UseDate" date,
    "EndDate" date,
    "DepartmentID" smallint NOT NULL,
    "DeviceCategoryID" smallint NOT NULL,
    "Status" public.device_status DEFAULT '1'::public.device_status,
    "LocationID" integer
);


ALTER TABLE public."Device" OWNER TO neondb_owner;

--
-- Name: DeviceCategory; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."DeviceCategory" (
    "ID" smallint NOT NULL,
    "Name" character varying(50),
    "DisplayOrder" integer
);


ALTER TABLE public."DeviceCategory" OWNER TO neondb_owner;

--
-- Name: DeviceReminderPlan; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."DeviceReminderPlan" (
    "ID" integer NOT NULL,
    "DeviceID" integer NOT NULL,
    "ReminderType" character varying(50) NOT NULL,
    "EventTypeID" integer,
    "Title" character varying(150),
    "Description" text,
    "IntervalValue" integer,
    "IntervalUnit" character varying(10),
    "CronExpression" character varying(120),
    "StartFrom" timestamp without time zone,
    "EndAt" timestamp without time zone,
    "NextDueDate" timestamp without time zone,
    "LastTriggeredAt" timestamp without time zone,
    "IsActive" boolean DEFAULT true NOT NULL,
    "Metadata" jsonb,
    "CreatedBy" character varying(450),
    "CreatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "UpdatedBy" character varying(450),
    "UpdatedAt" timestamp with time zone
);


ALTER TABLE public."DeviceReminderPlan" OWNER TO neondb_owner;

--
-- Name: DeviceReminderPlan_ID_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public."DeviceReminderPlan_ID_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."DeviceReminderPlan_ID_seq" OWNER TO neondb_owner;

--
-- Name: DeviceReminderPlan_ID_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public."DeviceReminderPlan_ID_seq" OWNED BY public."DeviceReminderPlan"."ID";


--
-- Name: Device_ID_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public."Device_ID_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Device_ID_seq" OWNER TO neondb_owner;

--
-- Name: Device_ID_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public."Device_ID_seq" OWNED BY public."Device"."ID";


--
-- Name: Event; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Event" (
    "ID" integer NOT NULL,
    "Title" character varying(200),
    "DeviceID" integer,
    "EventTypeID" smallint,
    "Description" text NOT NULL,
    "StartDate" date,
    "EndDate" date,
    "StaffID" smallint,
    "Notes" character varying(200) NOT NULL,
    "Status" character varying(32),
    "EventDate" timestamp without time zone,
    "RelatedReportID" integer,
    "Metadata" jsonb,
    "CreatedBy" character varying(450),
    "CreatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" character varying(450),
    "UpdatedAt" timestamp with time zone
);


ALTER TABLE public."Event" OWNER TO neondb_owner;

--
-- Name: EventType; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."EventType" (
    "ID" smallint NOT NULL,
    "Name" character varying(50),
    "Code" character varying(50),
    "Description" text,
    "Category" character varying(50),
    "Color" character varying(20),
    "IsReminder" boolean DEFAULT false,
    "DefaultStatus" character varying(32),
    "DefaultLeadTimeDays" integer
);


ALTER TABLE public."EventType" OWNER TO neondb_owner;

--
-- Name: Event_ID_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public."Event_ID_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Event_ID_seq" OWNER TO neondb_owner;

--
-- Name: Event_ID_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public."Event_ID_seq" OWNED BY public."Event"."ID";


--
-- Name: Location; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Location" (
    "ID" integer NOT NULL,
    "Name" text NOT NULL
);


ALTER TABLE public."Location" OWNER TO neondb_owner;

--
-- Name: Location_ID_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public."Location_ID_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Location_ID_seq" OWNER TO neondb_owner;

--
-- Name: Location_ID_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public."Location_ID_seq" OWNED BY public."Location"."ID";


--
-- Name: Notification; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Notification" (
    "ID" integer NOT NULL,
    "Title" text NOT NULL,
    "Content" text,
    "Type" text,
    "Category" text,
    "TargetUrl" text,
    "StaffId" integer,
    "IsRead" boolean DEFAULT false,
    "CreatedBy" text,
    "CreatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public."Notification" OWNER TO neondb_owner;

--
-- Name: Notification_ID_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public."Notification_ID_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Notification_ID_seq" OWNER TO neondb_owner;

--
-- Name: Notification_ID_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public."Notification_ID_seq" OWNED BY public."Notification"."ID";


--
-- Name: PushSubscription; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."PushSubscription" (
    "ID" integer NOT NULL,
    "UserId" character varying(255) NOT NULL,
    "Endpoint" text NOT NULL,
    "P256dh" text NOT NULL,
    "Auth" text NOT NULL,
    "CreatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public."PushSubscription" OWNER TO neondb_owner;

--
-- Name: PushSubscription_ID_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public."PushSubscription_ID_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."PushSubscription_ID_seq" OWNER TO neondb_owner;

--
-- Name: PushSubscription_ID_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public."PushSubscription_ID_seq" OWNED BY public."PushSubscription"."ID";


--
-- Name: Staff; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Staff" (
    "ID" smallint NOT NULL,
    "Name" character varying(50),
    "Gender" boolean,
    "Birthday" date,
    "DepartmentID" smallint,
    "UserId" text
);


ALTER TABLE public."Staff" OWNER TO neondb_owner;

--
-- Name: AspNetRoleClaims Id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AspNetRoleClaims" ALTER COLUMN "Id" SET DEFAULT nextval('public."AspNetRoleClaims_Id_seq"'::regclass);


--
-- Name: AspNetUserClaims Id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AspNetUserClaims" ALTER COLUMN "Id" SET DEFAULT nextval('public."AspNetUserClaims_Id_seq"'::regclass);


--
-- Name: DamageReport ID; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DamageReport" ALTER COLUMN "ID" SET DEFAULT nextval('public."DamageReport_ID_seq"'::regclass);


--
-- Name: DamageReportHistory ID; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DamageReportHistory" ALTER COLUMN "ID" SET DEFAULT nextval('public."DamageReportHistory_ID_seq"'::regclass);


--
-- Name: Device ID; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Device" ALTER COLUMN "ID" SET DEFAULT nextval('public."Device_ID_seq"'::regclass);


--
-- Name: DeviceReminderPlan ID; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DeviceReminderPlan" ALTER COLUMN "ID" SET DEFAULT nextval('public."DeviceReminderPlan_ID_seq"'::regclass);


--
-- Name: Event ID; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Event" ALTER COLUMN "ID" SET DEFAULT nextval('public."Event_ID_seq"'::regclass);


--
-- Name: Location ID; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Location" ALTER COLUMN "ID" SET DEFAULT nextval('public."Location_ID_seq"'::regclass);


--
-- Name: Notification ID; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Notification" ALTER COLUMN "ID" SET DEFAULT nextval('public."Notification_ID_seq"'::regclass);


--
-- Name: PushSubscription ID; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."PushSubscription" ALTER COLUMN "ID" SET DEFAULT nextval('public."PushSubscription_ID_seq"'::regclass);


--
-- Data for Name: account; Type: TABLE DATA; Schema: neon_auth; Owner: neon_auth
--

COPY neon_auth.account (id, "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", scope, password, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: invitation; Type: TABLE DATA; Schema: neon_auth; Owner: neon_auth
--

COPY neon_auth.invitation (id, "organizationId", email, role, status, "expiresAt", "createdAt", "inviterId") FROM stdin;
\.


--
-- Data for Name: jwks; Type: TABLE DATA; Schema: neon_auth; Owner: neon_auth
--

COPY neon_auth.jwks (id, "publicKey", "privateKey", "createdAt", "expiresAt") FROM stdin;
\.


--
-- Data for Name: member; Type: TABLE DATA; Schema: neon_auth; Owner: neon_auth
--

COPY neon_auth.member (id, "organizationId", "userId", role, "createdAt") FROM stdin;
\.


--
-- Data for Name: organization; Type: TABLE DATA; Schema: neon_auth; Owner: neon_auth
--

COPY neon_auth.organization (id, name, slug, logo, "createdAt", metadata) FROM stdin;
\.


--
-- Data for Name: project_config; Type: TABLE DATA; Schema: neon_auth; Owner: neon_auth
--

COPY neon_auth.project_config (id, name, endpoint_id, created_at, updated_at, trusted_origins, social_providers, email_provider, email_and_password, allow_localhost, plugin_configs, webhook_config) FROM stdin;
9ab4f5d9-dfc5-491c-b7bc-2bf2d9262744	HGManager	ep-patient-smoke-a1ekhm8f	2026-03-30 05:13:03.502+00	2026-03-30 05:13:03.502+00	[]	[{"id": "google", "isShared": true}]	{"type": "shared"}	{"enabled": true, "disableSignUp": false, "emailVerificationMethod": "otp", "requireEmailVerification": false, "autoSignInAfterVerification": true, "sendVerificationEmailOnSignIn": false, "sendVerificationEmailOnSignUp": false}	t	{"organization": {"config": {"creatorRole": "owner", "membershipLimit": 100, "organizationLimit": 10, "sendInvitationEmail": false}, "enabled": true}}	{"enabled": false, "enabledEvents": [], "timeoutSeconds": 5}
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: neon_auth; Owner: neon_auth
--

COPY neon_auth.session (id, "expiresAt", token, "createdAt", "updatedAt", "ipAddress", "userAgent", "userId", "impersonatedBy", "activeOrganizationId") FROM stdin;
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: neon_auth; Owner: neon_auth
--

COPY neon_auth."user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt", role, banned, "banReason", "banExpires") FROM stdin;
\.


--
-- Data for Name: verification; Type: TABLE DATA; Schema: neon_auth; Owner: neon_auth
--

COPY neon_auth.verification (id, identifier, value, "expiresAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AspNetRoleClaims; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."AspNetRoleClaims" ("Id", "RoleId", "ClaimType", "ClaimValue") FROM stdin;
\.


--
-- Data for Name: AspNetRoles; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."AspNetRoles" ("Id", "Name", "NormalizedName", "ConcurrencyStamp") FROM stdin;
24bab583-e1fd-4d1e-888f-690adf8305b0	Admin	ADMIN	4d112116-60bd-4080-bd0b-2f12b285019b
d014ebb5-5308-41ec-8a3b-ab95a2eccc23	User	USER	14ac87a0-56ec-4c04-a1f5-7752081bea3c
e262b4db-d67a-4a4e-b4cf-8a0db61b22cf	SuperAdmin	SUPERADMIN	\N
\.


--
-- Data for Name: AspNetUserClaims; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."AspNetUserClaims" ("Id", "UserId", "ClaimType", "ClaimValue") FROM stdin;
\.


--
-- Data for Name: AspNetUserLogins; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."AspNetUserLogins" ("LoginProvider", "ProviderKey", "ProviderDisplayName", "UserId") FROM stdin;
\.


--
-- Data for Name: AspNetUserRoles; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."AspNetUserRoles" ("UserId", "RoleId") FROM stdin;
159c2606-abc5-4006-9633-6926396c181b	24bab583-e1fd-4d1e-888f-690adf8305b0
2a0fbc05-83e4-4d21-a867-8c54d3509ff6	d014ebb5-5308-41ec-8a3b-ab95a2eccc23
dd27e8f9-50a0-4de0-9a5a-9b9f1396f9c9	d014ebb5-5308-41ec-8a3b-ab95a2eccc23
c6f9b9a4-f2c1-4bf7-ba60-61787ca39c5f	d014ebb5-5308-41ec-8a3b-ab95a2eccc23
a4f50c39-8439-429c-a2da-341abcb5e400	d014ebb5-5308-41ec-8a3b-ab95a2eccc23
2240c223-f17f-41b0-bc48-fe421f619f5e	d014ebb5-5308-41ec-8a3b-ab95a2eccc23
97b82a13-8261-4e04-8fd1-e9f0506166a8	d014ebb5-5308-41ec-8a3b-ab95a2eccc23
5627ab1c-0360-4989-beba-bfe151993ec1	d014ebb5-5308-41ec-8a3b-ab95a2eccc23
b882839f-9945-43a5-991e-9a42c76ff8da	d014ebb5-5308-41ec-8a3b-ab95a2eccc23
127c9922-c533-4246-8e84-9bd217bed5ad	d014ebb5-5308-41ec-8a3b-ab95a2eccc23
e71a19da-50d2-4fed-8cd2-08e38caa740e	d014ebb5-5308-41ec-8a3b-ab95a2eccc23
b924fb2a-9c27-4201-a7eb-ad5b7d829491	24bab583-e1fd-4d1e-888f-690adf8305b0
159c2606-abc5-4006-9633-6926396c181b	e262b4db-d67a-4a4e-b4cf-8a0db61b22cf
5d7432c9-6978-4b4c-8e32-2228c776a1e3	d014ebb5-5308-41ec-8a3b-ab95a2eccc23
5d7432c9-6978-4b4c-8e32-2228c776a1e3	24bab583-e1fd-4d1e-888f-690adf8305b0
19bc5494-ab7c-4339-ae84-3e3d25355d07	d014ebb5-5308-41ec-8a3b-ab95a2eccc23
19bc5494-ab7c-4339-ae84-3e3d25355d07	24bab583-e1fd-4d1e-888f-690adf8305b0
5f9697ab-2baf-4ade-a4e6-cb385d1ba051	d014ebb5-5308-41ec-8a3b-ab95a2eccc23
7d54368f-c08c-4315-b902-79e4444718ac	d014ebb5-5308-41ec-8a3b-ab95a2eccc23
eff8338a-dcc2-4935-b55c-3e3b653a89fd	d014ebb5-5308-41ec-8a3b-ab95a2eccc23
939462c9-dfc3-4721-b7e4-78b50203369b	d014ebb5-5308-41ec-8a3b-ab95a2eccc23
cd1a1264-4bb8-4dec-bc32-4ba1f8631abf	d014ebb5-5308-41ec-8a3b-ab95a2eccc23
cd1a1264-4bb8-4dec-bc32-4ba1f8631abf	24bab583-e1fd-4d1e-888f-690adf8305b0
\.


--
-- Data for Name: AspNetUserTokens; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."AspNetUserTokens" ("UserId", "LoginProvider", "Name", "Value") FROM stdin;
159c2606-abc5-4006-9633-6926396c181b	HoaGiangManager	ResetPassword	{"token":"f510398574f87110fc08dd3b5e12ed818d101c51396031cc7d9801d78774ad26","exp":1775528439591}
\.


--
-- Data for Name: AspNetUsers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."AspNetUsers" ("Id", "UserName", "NormalizedUserName", "Email", "NormalizedEmail", "EmailConfirmed", "PasswordHash", "SecurityStamp", "ConcurrencyStamp", "PhoneNumber", "PhoneNumberConfirmed", "TwoFactorEnabled", "LockoutEnd", "LockoutEnabled", "AccessFailedCount", "FullName", "CreatedDate") FROM stdin;
5d7432c9-6978-4b4c-8e32-2228c776a1e3	tmhoang@gmail.com	TMHOANG@GMAIL.COM	tmhoang@gmail.com	TMHOANG@GMAIL.COM	f	$2a$10$qVQyaBAZ7j.yV9.wcgnSOuliqcSMbFH3jRQxVBIwJyC4Pg7py3h0W	5d9693d8-3b3b-4dc6-9bbd-3181d4521b3c	e328a4e9-18dc-4e0f-8de6-82b722cdd2c4	\N	f	f	\N	f	0	Trần Minh Hoàng	2025-11-05 14:33:26.267
97b82a13-8261-4e04-8fd1-e9f0506166a8	nqhao@gmail.com	NQHAO@GMAIL.COM	nqhao@gmail.com	NQHAO@GMAIL.COM	f	$2a$10$I0XXERxTIqY.qEeg6nUgs.jIOcrFMEnqJITc7gxziUCTde1gB9JLS	91335afc-a9f7-45f2-99d8-11a1bbab7908	e2183116-e6e1-4f19-8dc2-717cfd19077d	\N	f	f	\N	f	0	Nguyễn Văn Hảo	2025-11-11 16:57:39.483
19bc5494-ab7c-4339-ae84-3e3d25355d07	lhkhiem@gmail.com	LHKHIEM@GMAIL.COM	lhkhiem@gmail.com	LHKHIEM@GMAIL.COM	f	$2a$10$QBtqWd7Qyex2HrBZaq.dtuJDEqGIo6I9shlgf4SGKytrIzmrQm6gq	a5c7b7e6-bf0d-4e87-9c83-875615f8e92f	05a922ba-1caa-42ff-bb44-caedb17762b4	\N	f	f	\N	f	0	Lê Hoàng Khiêm	2025-11-05 14:33:01.325
2240c223-f17f-41b0-bc48-fe421f619f5e	nthanh@gmail.com	NTHANH@GMAIL.COM	nthanh@gmail.com	NTHANH@GMAIL.COM	f	$2a$10$cbPKJ7t2KZ87wsbi1DdpF.sMxqXKaIdhZF5zILdVHMU4Vxha1lqCq	eb8b3bd0-da29-4f84-82a0-98efb06808bb	ecf6a0fe-b488-4357-8870-5da6c8695257	\N	f	f	\N	f	0	Nguyễn Thị Hạnh	2025-11-07 11:57:59.926
5627ab1c-0360-4989-beba-bfe151993ec1	hccong@gmail.com	HCCONG@GMAIL.COM	hccong@gmail.com	HCCONG@GMAIL.COM	f	$2a$10$GCMIyEuvnnWInylUS/kfYutKt3QaWm.t3D9MslQ2rLRu7jtOvtFqW	b6916fc9-4dcb-40aa-9d1b-eb637a6b6f1f	14d49459-842e-4704-bb69-23bc574371a0	\N	f	f	\N	f	0	Huỳnh Chí Công	2025-11-30 10:57:52.973
a4f50c39-8439-429c-a2da-341abcb5e400	dtlinh@gmail.com	DTLINH@GMAIL.COM	dtlinh@gmail.com	DTLINH@GMAIL.COM	f	$2a$10$VJtd5u4S.JKIqLKqQIK0t.y1AZv3JFpJ0514I7GyjHSZVmT/66VmC	6503d6b7-56cd-4570-9a2b-8ca9e25515c4	2eccccec-853b-4c05-9828-e057f14459a4	\N	f	f	\N	f	0	Đặng Thùy Linh	2025-11-06 07:51:27.078
127c9922-c533-4246-8e84-9bd217bed5ad	htmthuy@gmail.com	HTMTHUY@GMAIL.COM	htmthuy@gmail.com	HTMTHUY@GMAIL.COM	f	$2a$10$KmgmY3ygpRw1Rt7WzfHhE.NQx2LQSCS2werDxWMCLhFv74iOtDgQ6	0a4ab127-5986-461f-b03d-76e5a5629258	a8f0854d-edfa-4d0c-aca8-6749da513b88	\N	f	f	\N	f	0	Huỳnh Thị Mộng Thúy	2026-04-03 01:51:28.151
b924fb2a-9c27-4201-a7eb-ad5b7d829491	dktuan@gmail.com	DKTUAN@GMAIL.COM	dktuan@gmail.com	DKTUAN@GMAIL.COM	f	$2a$10$juiUn2jooBXB1g3DelUejenhA50RglchUz5szdjlJFEVMRAgDnjTG	f934e5f0-04b0-464d-98a3-10eff5b5411c	2786cba6-9c45-455e-9a7b-0dde7b1434f1	\N	f	f	\N	f	0	Diệp Kim Tuấn	2026-04-05 09:14:23.719
dd27e8f9-50a0-4de0-9a5a-9b9f1396f9c9	dhtrang@gmail.com	DHTRANG@GMAIL.COM	dhtrang@gmail.com	DHTRANG@GMAIL.COM	f	$2a$10$FWi1V5lwwC45xE5kty13w.LaP2/qMChbKlQF3LD5t3WmhfR2NYlQi	d67d6a18-1f9c-493d-93f9-4b318f1c9c20	f54f5d61-225c-4d2f-95df-ea8991407b21	\N	f	f	\N	f	0	Dương Hoàng Trang	2025-11-05 19:37:26.373
2a0fbc05-83e4-4d21-a867-8c54d3509ff6	nthien@gmail.com	NTHIEN@GMAIL.COM	nthien@gmail.com	NTHIEN@GMAIL.COM	f	$2a$10$Ji.JuTTk2CoGTu/InUduUu8E6nNfxgB4laBE1yDtnfPmiLBhPIIPu	183ac16d-a1bb-4851-85b3-dc8e83304471	24e4a3b5-695d-442c-b825-bb0b0fe6e13e	\N	f	f	\N	f	0	Nguyễn Thanh Hiền	2025-11-05 14:33:48.186
c6f9b9a4-f2c1-4bf7-ba60-61787ca39c5f	nttuyen@gmail.com	NTTUYEN@GMAIL.COM	nttuyen@gmail.com	NTTUYEN@GMAIL.COM	f	$2a$10$XdEkQLtn6E4NicpZ2R54L.9kgkJq.KJFXP7K5oEVTLhWIGJ/JWO4u	ba7b10f3-ad45-493d-a1f3-7b57fa33aaf5	2a74b625-4dfe-4362-b640-b6a655cf64a4	\N	f	f	\N	f	0	Ngô Thanh Tuyền	2025-11-06 06:18:18.245
159c2606-abc5-4006-9633-6926396c181b	hoagiangkg@gmail.com	HOAGIANGKG@GMAIL.COM	hoagiangkg@gmail.com	HOAGIANGKG@GMAIL.COM	t	$2a$10$3auiIzYnivtXtKqQUEFgleBxHiO2gPydYMkH4SWrDYpwi8BkBjfmG	a8a09543-cd77-429e-a19d-651680146aee	c926e70d-092a-4046-99a2-c4e4cdd38967	\N	f	f	\N	f	0	Quản trị viên	2025-11-04 11:24:51.837
5f9697ab-2baf-4ade-a4e6-cb385d1ba051	ntctu@gmail.com	NTCTU@GMAIL.COM	ntctu@gmail.com	NTCTU@GMAIL.COM	f	$2a$10$6ScArtWUIU.tFGQCtY6n2OOk20s4euJcBhVtCY75HG9BXeDuAwXCi	8ba499b0-4089-4d08-a311-19057942a91c	a9711243-a592-41bb-b3d0-e7b9686fa449	\N	f	f	\N	f	0	Nguyễn Thị Cẩm Tú	2026-04-07 07:05:58.654
7d54368f-c08c-4315-b902-79e4444718ac	qkquang@gmail.com	QKQUANG@GMAIL.COM	qkquang@gmail.com	QKQUANG@GMAIL.COM	f	$2a$10$A6DfWZMNaooM7/0l4IyNZ.viH8EVWIK0yFJTM7WOUDZodQZfK58eW	8e27bff9-ea85-4591-9d64-ae21407439d1	1c0c1575-76e4-4b84-8639-3d369ccdb2a3	\N	f	f	\N	f	0	Quách Kiến Quang	2026-04-08 01:12:20.426
b882839f-9945-43a5-991e-9a42c76ff8da	ltthuy@gmail.com	LTTHUY@GMAIL.COM	ltthuy@gmail.com	LTTHUY@GMAIL.COM	f	$2a$10$OFwfPyZvC6/TGa3tLnt2k.1.oE4n0OmuWvtWg3XHmdWZkDWjAcVGG	ea5f73b4-8bfc-49ad-af02-30b3152005e4	13e46a99-3ce2-4c3a-8971-cb12edd72039	\N	f	f	\N	f	0	Lê Thị Thủy	2026-02-26 08:50:27.471
eff8338a-dcc2-4935-b55c-3e3b653a89fd	ntkhue@gmail.com	NTKHUE@GMAIL.COM	ntkhue@gmail.com	NTKHUE@GMAIL.COM	f	$2a$10$/TY0djaDVh2hBb0DYnpW..Blzs4ymIkfIBQm7iLv4gyoIRIZTK8t6	bed91e4a-8a81-405d-ae3d-e489b4281aba	394dc598-eff0-4089-baec-9baf696af13a	\N	f	f	\N	f	0	Nguyễn Thị Kim Huế	2026-04-08 01:42:24.754
939462c9-dfc3-4721-b7e4-78b50203369b	thungan@gmail.com	THUNGAN@GMAIL.COM	thungan@gmail.com	THUNGAN@GMAIL.COM	f	$2a$10$6bIq.FgRNfVcPyx75lBoqO746ucU.qYla.nTNhMpvwTMfpoQJR1UG	6042b050-e118-4aff-a42b-8aa791ac97d9	01d291e1-ecf7-427f-ba9a-f8f55933f51e	\N	f	f	\N	f	0	Thu Ngân	2026-04-13 00:56:26.34
e71a19da-50d2-4fed-8cd2-08e38caa740e	tvden@gmail.com	TVDEN@GMAIL.COM	tvden@gmail.com	TVDEN@GMAIL.COM	f	$2a$10$kUbdaTwb.eOF78mKE8ZkIewD2rv7d/DsO.9YyE0QJzAClGOJ5N3nO	ccf31a6f-85d3-4043-b381-a785c14811f4	2c4c8936-093e-4466-bb4a-eb4fd3d2c0a4	\N	f	f	\N	f	0	Trần Văn Đen	2026-04-06 09:30:09.453
cd1a1264-4bb8-4dec-bc32-4ba1f8631abf	ntmtrang@gmail.com	NTMTRANG@GMAIL.COM	ntmtrang@gmail.com	NTMTRANG@GMAIL.COM	f	$2a$10$lQGN2rDoh8rvTf/RKDN2..ePZxF5lVecofmuQtB47oOHetTZ.Q3pO	ca643e82-8b60-4679-ba7a-e937f46c6acb	8e7d8493-da0e-4ef6-a068-826003f00c72	\N	f	f	\N	f	0	Nguyễn Thị Mỹ Trang	2026-04-19 02:18:34.417
\.


--
-- Data for Name: DamageReport; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."DamageReport" ("ID", "DeviceID", "DamageLocation", "ReporterID", "ReportingDepartmentID", "HandlerID", "AssignedDate", "ReportDate", "HandlingDate", "CompletedDate", "EstimatedCompletionDate", "DamageContent", "Images", "Status", "Priority", "Notes", "HandlerNotes", "RejectionReason", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt", "MaintenanceBatchId", "AfterImages") FROM stdin;
18	5	\N	3	12	3	\N	2025-11-11	\N	2025-11-11	\N	Camera bị rơi ra khỏi vị trí.	\N	4	2	\N	Đã gắn lại xong.	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 16:13:45.312263	2025-11-11 16:26:14.215557	\N	\N
42	359	\N	3	12	3	\N	2025-12-04	2025-12-05	2026-02-25	\N	Bảng đèn logo vị trí chim bồ câu hư đèn, đen góc.	["/uploads/1000005691_1764895602197.jpg"]	4	2	\N	Đã báo Huy Thanh kiểm tra	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	159c2606-abc5-4006-9633-6926396c181b	2025-12-05 07:46:51.544187	2026-02-25 13:42:53.799082	\N	\N
13	\N	Cửa phòng 555 kẹt	8	14	6	\N	2025-11-06	\N	\N	\N	Cửa kẹt ko mở đc	\N	5	2	\N	test demo	\N	c6f9b9a4-f2c1-4bf7-ba60-61787ca39c5f	159c2606-abc5-4006-9633-6926396c181b	2025-11-06 06:20:55.915726	2025-11-12 07:54:43.680362	\N	\N
15	21	\N	8	14	3	\N	2025-11-11	\N	2025-11-11	\N	Tivi không mở được	\N	4	2	\N	Lỏng cáp nguồn, Tivi bình thường	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 11:11:00.906189	2025-11-11 16:30:07.675417	\N	\N
24	354	\N	3	12	3	\N	2025-10-31	\N	2026-02-25	\N	Kiểm tra, theo dõi xử lý lỗi tổng đài báo cước phát sinh sai trên phần mền Smile	\N	4	2	\N	Đề xuất thay cáp Rs232 theo dõi.	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2025-11-16 14:21:51.593885	2026-02-25 13:44:11.652097	\N	\N
23	\N	Lót thảm hội nghị Hoa sen 14-11-25	10	5	3	\N	2025-11-14	\N	\N	\N	Khách yêu cầu thảm đỏ backdrop chụp hình.	\N	4	3	\N	Tìm thảm cũ cắt lót cho khách	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2025-11-14 09:12:05.587509	2025-11-16 14:08:44.958694	\N	\N
3	263	\N	2	12	2	\N	2025-11-01	\N	2025-11-03	\N	Điện thoại hư cáp.	\N	4	3	\N	Thay cáp điện thoại mới	\N	5d7432c9-6978-4b4c-8e32-2228c776a1e3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-05 16:11:07.080371	2025-11-05 19:31:29.327321	\N	\N
7	\N	Đề xuất gắn cùi trỏ cửa Hoa Mai	3	12	6	\N	2025-11-05	\N	\N	\N	Khách hội nghị thường xuyên mở cửa không đóng làm thoát nhiệt máy lạnh.\nCần gắn thêm cùi trỏ tự đóng cửa mỗi lần ra vào.	\N	5	2	\N	Không khả thi	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	159c2606-abc5-4006-9633-6926396c181b	2025-11-05 19:36:43.532497	2025-11-12 07:54:56.595437	\N	\N
29	6	\N	3	12	3	\N	2025-11-19	\N	2026-02-25	\N	Màn led hư 1 tấm led	["/uploads/1000005459_1763521088114.jpg"]	4	2	\N	Thu hẹp led, xử lý xong	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2025-11-19 09:58:18.247008	2026-02-25 13:45:06.306942	\N	\N
20	45	\N	3	12	3	\N	2025-11-12	\N	2025-11-13	\N	Chuyển 2 bộ đàm bếp cho phục vụ sử dụng.	\N	4	2	\N	Hiền PV nhận	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2025-11-13 09:07:05.250352	2025-11-13 09:07:24.484628	\N	\N
30	\N	Rèm cửa sổ hoa đăng hư 6 cái	3	12	3	\N	2025-11-19	\N	2026-02-25	\N	Rèm hư dây và bộ nhông không kéo đc trơn chu.	["/uploads/1000005460_1763521669229.jpg"]	4	2	\N	\N	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2025-11-19 10:07:58.021292	2026-02-25 13:45:14.271153	\N	\N
17	17	\N	3	12	3	\N	2025-11-11	\N	2026-04-15	\N	Camera mất hình	\N	4	2	\N	Kiểm tra đường dây và camera, \nCamera đứt cáp và hư balun\nThay camera IP, hđbt	\N	159c2606-abc5-4006-9633-6926396c181b	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-11 15:22:02.202119	2026-04-15 01:42:06.848132	\N	\N
21	46	\N	3	12	3	\N	2025-11-12	\N	2025-11-13	\N	Chuyển 1 bộ đàm quầy Bar cho Phục vụ sử dụng	\N	4	2	\N	Hiền PV nhận	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2025-11-13 09:08:21.983133	2025-11-13 09:08:59.033219	\N	\N
16	4	\N	3	12	3	\N	2025-11-11	\N	2025-11-13	\N	Camera mất hình	\N	4	2	\N	Kiểm tra đường dây và camera\nCamera hư điện, đã sửa	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 15:15:32.79793	2025-11-13 16:40:05.889788	\N	\N
22	\N	Kiểm tra máy tính cho khách ở khách sạn	3	12	3	\N	2025-11-14	\N	2025-11-14	\N	Máy khách bị lỗi nhờ kiểm tra	\N	4	2	\N	Đã hỗ trợ kiểm tra xong	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2025-11-14 09:10:06.76045	2025-11-14 09:10:10.916622	\N	\N
19	353	\N	3	12	3	\N	2025-11-12	\N	2025-11-17	\N	Đầu ghi thường xuyên treo chức năng ghi hình	\N	4	2	\N	Kiểm tra tìm nguyên nhân,\nĐang theo dõi thiết bị\nĐã theo dõi 1 tuần không phát hiện tình trạng lặp lại.	\N	159c2606-abc5-4006-9633-6926396c181b	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-12 07:44:32.784359	2025-11-17 08:51:57.329245	\N	\N
14	\N	Trần 506 chưa sơn bê	9	14	6	\N	2025-11-06	\N	\N	\N	Trần thạch cao 506 chưa sơn bê, nhìn rất tệ	\N	4	2	\N	\N	\N	a4f50c39-8439-429c-a2da-341abcb5e400	159c2606-abc5-4006-9633-6926396c181b	2025-11-06 07:53:51.003637	2025-11-10 17:22:25.47256	\N	\N
10	3	\N	10	5	3	\N	2025-10-25	\N	2025-11-10	\N	Máy hư ko sài đc	["/uploads/1000005276_1762358498649.jpg"]	4	2	\N	Hư cụm sấy. Đã thay mới	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	159c2606-abc5-4006-9633-6926396c181b	2025-11-05 23:01:48.090167	2025-11-10 17:24:20.859514	\N	\N
6	\N	Đèn Hoa Mai đứt bóng	2	12	2	\N	2025-11-04	\N	2025-11-05	\N	Bóng đèn đứt	["/uploads/img5_1762332973834.jpg"]	4	2	\N	Đã thay bóng mới	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2025-11-05 19:02:12.210397	2025-11-11 11:10:06.616139	\N	\N
1	\N	Bảng đèn cổng 1 hư chữ Hoa sen	5	13	3	\N	2025-11-04	\N	2025-11-19	\N	Hư chữ SEN, chữ bị tróc, mờ, lem luốc	["/uploads/IMG_20251105_155420_036_1762333285585.jpg", "/uploads/img5_1762332973834.jpg", "/uploads/2_1762235194651.jpg"]	4	2	\N	Gọi Huy thanh kiểm tra\nĐèn xuống cấp chưa có giải pháp	\N	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-05 11:33:46.167434	2025-11-19 11:18:37.367037	\N	\N
34	\N	\N	3	12	3	\N	2025-11-19	2025-11-19	2025-11-20	\N	xxxx	\N	4	2	\N	Đã bảo trì xong	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-19 17:26:41.172814	2025-11-20 08:50:32.900925	batch-2025-11-18-1763457667195	\N
36	12	\N	5	13	3	\N	2025-11-23	2025-11-24	2025-11-24	\N	Chữ T trong chữ RESORT không sáng đèn.	\N	4	2	\N	Đã kiểm tra, đèn sáng bình thường	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 15:26:59.9229	2025-11-24 15:27:32.276864	\N	\N
25	\N	Mua Tablet Order ẩm thực	3	12	3	\N	2025-11-16	2025-11-19	2025-11-28	\N	Mua Tablet Order ẩm thực	\N	4	2	\N	Đã mua được 1 cái	\N	159c2606-abc5-4006-9633-6926396c181b	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-16 16:20:24.643252	2025-11-28 16:11:38.581801	\N	\N
12	2	\N	3	12	3	\N	2025-11-01	\N	2025-11-28	\N	Mixer hư	["/uploads/1000005342_1762358866107.jpg"]	4	2	\N	Gửi phan thảo kiểm tra.\nĐã nhận về ngày 20/11	\N	159c2606-abc5-4006-9633-6926396c181b	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-05 23:25:31.747058	2025-11-28 16:11:05.647846	\N	\N
37	12	\N	5	13	3	\N	2025-11-28	\N	2025-11-30	\N	Chử T trong chữ REOST không sáng đèn.	\N	4	2	\N	Đã thay nguồn,\nĐèn sáng bt	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	159c2606-abc5-4006-9633-6926396c181b	2025-11-30 07:13:17.377404	2025-11-30 07:15:03.158155	\N	\N
11	345	\N	3	12	3	\N	2025-11-01	\N	2025-11-28	\N	Mixer đèn hư ko hoạt động	["/uploads/1000005322_1762358873262.jpg"]	4	2	\N	Gưi Phan thảo kiểm tra\nĐã nhận về ngày 20/11	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-05 23:08:10.08572	2025-11-28 16:10:55.511365	\N	\N
28	12	\N	3	12	3	\N	2025-11-19	2025-11-19	2025-11-20	\N	Chữ O Trong chữ "HOA" không sáng.	\N	4	2	\N	Kiểm tra, hư nguồn.\nHuy Thanh Thay nguồn\nĐã thay xong	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2025-11-19 08:19:59.696898	2026-03-30 13:48:07.856499	\N	\N
69	26	\N	8	14	2	\N	2026-04-02	2026-04-03	2026-04-09	\N	Tivi bị hột mè	\N	4	2	\N	Phòng có khách	\N	c6f9b9a4-f2c1-4bf7-ba60-61787ca39c5f	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-02 02:40:35.908025	2026-04-09 01:54:45.304324	\N	\N
136	355	\N	3	12	6	\N	2026-04-09	2026-04-10	2026-04-10	\N	Test sự kiện	\N	4	2	\N	Kiểm tra, không có thật	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 04:38:22.135887	2026-04-10 04:39:37.53294	\N	\N
35	\N	Dọn đồ trang trí sảnh Hoa cau -> Hoa sen	3	12	3	\N	2025-11-20	2025-11-20	2025-11-20	\N	Dọn cổng, hoa từ hoa cau sang hoa sen, setup sảnh tiệc.	\N	4	2	\N	Chờ hỗ trợ của A Trang, A Đen\nXong	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-20 08:32:41.791908	2025-11-30 10:55:17.606212	\N	\N
40	\N	Kiểm tra máy quét qr cccd lễ tân lỗi	3	12	3	\N	2025-11-30	\N	\N	\N	Nãy lỗi phần mềm khai báo lưu trú	\N	4	2	\N	Đã fix xong	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	\N	2025-11-30 10:52:02.617834	2025-11-30 10:52:02.617834	\N	\N
38	12	\N	5	13	3	\N	2025-11-30	2025-11-30	2026-02-25	\N	RẠCH chữ H lúc tắc lúc cháy trên sân thượng khách sạn	\N	4	2	\N	Kiểm tra đèn đang sáng tốt, nguồn ko có dấu hiệu chập chờn,\nTheo dõi thêm	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2025-11-30 10:40:44.637451	2026-02-25 13:43:05.574484	\N	\N
39	358	\N	11	2	3	\N	2025-11-29	2025-11-30	2026-02-25	\N	Bảng đèn bị hư mặt trong, rớt gãy không rõ nguyên nhân.	["/uploads/1000005665_1764474406428.jpg"]	4	2	\N	Bảng đèn bị hư do nhóm bên ngoài đá banh trúng.\nTháo xuống cho Huy Thanh sửa chữa.	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2025-11-30 10:46:54.794339	2026-02-25 13:43:25.789075	\N	\N
43	360	\N	3	12	3	\N	2026-02-25	\N	2026-02-26	\N	Mất hình ảnh	\N	4	2	\N	Hư banlun	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2026-02-25 13:49:42.083281	2026-02-26 08:42:02.522959	\N	\N
44	\N	Wifi khu vực 2, quầy bar	3	12	3	\N	2026-02-26	\N	2026-02-28	\N	Wifi yếu, gây nhảy order liên tục	\N	4	3	\N	Wifi bị chàn ip, reset thiết bị và router	\N	159c2606-abc5-4006-9633-6926396c181b	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-02-26 08:43:17.78187	2026-03-02 17:17:11.693019	\N	\N
105	\N	Máy oder hu	4	2	3	\N	2026-04-07	\N	\N	\N	Sạc k vô bin	\N	6	2	\N	test thử	\N	2a0fbc05-83e4-4d21-a867-8c54d3509ff6	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 02:41:15.016342	2026-04-07 02:43:45.788033	\N	\N
45	\N	Tam cấp Hoa Sen hư	3	12	6	\N	2026-03-04	\N	2026-03-25	\N	Tam cấp Hoa sen trong bị sụp	["/uploads/z7585314183466_b02b2c10eb4ad57385ccf97bf8b0c6f6_1772760224927.jpg"]	4	2	\N	Xử lý tạm, sửa lại sau tiệc ngày 10	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2026-03-06 01:23:55.890626	2026-03-25 04:06:59.411637	\N	\N
46	6	\N	3	12	3	\N	2026-03-06	\N	2026-03-06	\N	Màn led hư 3 tấm led.\nLúc sắp bắt đầu hội nghị 8/3 điện lực.(6/3/26)	\N	4	2	\N	Hư led, thay 3 tấm led dự phòng.	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-03-06 07:26:52.877709	2026-03-06 07:27:34.657636	\N	\N
82	47	\N	3	12	4	\N	2025-11-13	\N	2026-04-05	\N	Nhận 5 tai nghe từ Khiêm\nBàn giao lại cho Quầy bar sử dụng 1 đàm + 1 sạc + 1 tai nghe	\N	4	2	\N	Pv 5 đàm, sạc, tai nghe.\nBar 1 đàm, 1 sạc, 1 tai nghe	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 09:47:01.572075	2026-04-05 09:48:57.848377	\N	\N
112	12	\N	5	13	3	\N	2026-04-08	2026-04-10	2026-04-11	\N	Hư chữ "H" trong chữ RẠCH	\N	4	2	\N	Nhờ Huy Thanh kiểm tra. Hẹn 9/7 kiểm tra. Hẹn 10/4\nHuy Thanh Nguồn, hđbt	\N	159c2606-abc5-4006-9633-6926396c181b	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 00:57:46.707986	2026-04-11 06:26:12.593132	\N	\N
81	46	\N	3	12	3	\N	2025-11-13	\N	2026-04-05	\N	Nhận 1 bộ đàm + 1 sạc + tai nghe từ Phục vụ (Hiền)	\N	4	2	\N	Nhận 1 đàm, sạc, tai nghe	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 09:44:23.818472	2026-04-05 09:49:57.279521	\N	\N
53	6	\N	3	12	3	\N	2026-03-18	2026-03-18	2026-03-18	\N	Test màn led hoa đăng	\N	4	2	\N	Hư 2 tấm led\nThay led dự phòng\nCòn tồn 18 tấm ok	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2026-03-18 07:28:59.917224	2026-03-18 07:43:52.422407	\N	\N
114	383	\N	3	12	3	\N	2026-04-08	2026-04-08	2026-04-08	\N	Dời tivi lên phòng họp	\N	4	2	\N	Đã hoàn thành, sử dụng bình thường	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 02:37:43.672016	2026-04-08 03:09:09.333815	\N	\N
70	288	\N	8	14	2	\N	2026-04-02	2026-04-03	2026-04-14	\N	Điện thoại tự động gọi lễ tân	\N	4	2	\N	Tiếp tục theo dõi	\N	159c2606-abc5-4006-9633-6926396c181b	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-02 07:12:29.686618	2026-04-14 00:55:01.74972	\N	\N
55	13	\N	3	12	3	\N	2025-07-18	\N	2025-07-19	\N	Thay đầu led Hoa cau (không bao gồm 2 card phát)	\N	4	2	\N	Đã xong, hoạt động bình thường	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 07:46:44.01837	2026-03-20 07:52:01.323371	\N	\N
58	13	\N	3	12	3	\N	2026-03-20	\N	2026-03-20	\N	Kiểm trra màn led và kho dự phòng	\N	4	2	\N	-Màn led chính chết nhiều điểm ảnh (đốm, sâu). Tồn 2 tấm led màn chính + 1 nguồn.\n- 2 cánh gà bình thường. Không còn hàng dự phòng.\n	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 08:01:24.032019	2026-03-20 08:15:12.323604	\N	\N
57	10	\N	3	12	3	\N	2026-03-20	\N	2026-03-20	\N	Kiểm tra màn led và kiểm hàng dự phòng	\N	4	2	\N	Màn led bình thường.\nTồn 3 tấm led + 1 nguồn.	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 07:58:09.280163	2026-03-20 08:15:20.484124	\N	\N
56	11	\N	3	12	3	\N	2026-03-20	\N	2026-03-20	\N	Kiểm tra màn led, kho dự phòng.	\N	4	2	\N	Màn bình thường\nKhông tồn ki dự phòng	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 07:56:09.617803	2026-03-20 08:15:37.947211	\N	\N
47	\N	\N	3	12	6	\N	2026-03-10	2026-03-17	2026-03-22	\N	Bảo trì máy lạnh định kỳ	\N	4	2	\N	Bảo trì nghiệm thu xong.	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2026-03-17 00:59:45.31175	2026-03-22 07:37:04.859046	batch-2025-11-18-1763430857529	\N
54	6	\N	3	12	3	\N	2026-03-20	\N	2026-03-20	\N	Led hư 1 tấm bốc khói lúc trước diễn ra hội nghị Sở Công Thương	\N	4	3	\N	Hư 1 tấm led, thay led dự phòng.\nTồn led dự phòng 17 tấm + 1 nguồn	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 00:01:48.948712	2026-03-23 10:21:03.293024	\N	\N
59	\N	\N	3	12	3	\N	2026-03-22	2026-03-22	2026-03-22	\N	Bảo trì máy, vệ sinh, kiểm  tra tình trạng máy, backup dữ liệu	\N	4	2	\N	Xong	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 07:42:04.168098	2026-03-22 13:50:00.403244	batch-2025-11-18-1763457667195	\N
50	\N	Sửa, cắm lại hoa backdrop Hoa cau	3	12	3	\N	2026-03-18	\N	2026-03-25	\N	Cắm lại hoa backrop Hoa cau	\N	4	3	\N	Nhờ hỗ trợ của Chị Hạnh	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2026-03-18 06:51:29.136431	2026-03-25 04:04:43.429995	\N	\N
49	361	\N	3	12	6	\N	2026-03-18	\N	2026-03-25	\N	Sửa bục nâng không hoạt động	\N	4	3	\N	Kỹ thuật sửa xong.	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2026-03-18 06:49:55.512616	2026-03-25 04:06:39.305639	\N	\N
61	13	\N	3	12	3	\N	2026-03-27	\N	2026-03-27	\N	Test màn led hoa cau.	\N	4	2	\N	Màn hình bình thường, không lỗi mới phát sinh	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-03-27 07:53:14.704793	2026-03-27 07:54:04.366807	\N	\N
60	\N	Đèn sảnh hoa đăng hư.	3	12	6	\N	2026-03-25	\N	2026-03-26	\N	Đèn mắt ếch hư 2 cái	\N	4	2	\N	Thay 2 đèn mắt ếch	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2026-03-25 04:04:24.830437	2026-03-29 09:26:28.272773	\N	\N
41	12	\N	5	13	3	\N	2025-12-02	\N	2025-12-04	\N	Chử S trong chữ RESORT hư	["https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/1000005688_1764817130251_1774877371152-qN0aKJ6JFNrjtRxgvNLgJFo9sxL2GD.jpg"]	4	2	\N	Nguồn cũ bị lỗi, đã xử lý \nĐèn sáng bình thường.	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2025-12-04 09:59:01.857524	2026-03-30 13:29:42.232314	\N	\N
221	\N	\N	6	1	6	\N	2026-04-15	\N	2026-04-15	\N	Báo cáo bảo trì định kỳ cho đợt: Hệ thống PCCC.	\N	4	2	\N	Đã xong	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	\N	2026-04-15 04:58:54.810112	2026-04-15 04:58:54.810112	batch-2026-04-10-1775793592116	\N
104	387	\N	3	12	3	\N	2026-04-06	2026-04-07	2026-04-07	\N	Máy lạnh sảnh trước có 1 dàn lạnh kêu to	\N	4	2	\N	Daikin đã kiểm tra. Máy hết kêu và hoạt động bình thường	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 01:52:00.692758	2026-04-07 01:55:43.422453	\N	\N
222	\N	\N	15	1	15	\N	2026-04-17	2026-04-17	2026-04-17	\N	Bảo trì định kỳ: Xử lý bồn vi sinh nước thảy [Batch: batch-2026-04-11-1775891024445]	\N	4	2	\N	Xong, test	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 01:00:35.755681	2026-04-17 01:17:48.60775	batch-2026-04-11-1775891024445	\N
102	\N	Xử lý camera hồ bơi bị xích đu che	3	12	3	\N	2026-04-07	\N	\N	\N	2 Xích đu che tầm qua sát của camera, di dời ra 2 bên khỏi tầm qua sát, ko di dời camera rất khó khăn.	["https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/1000007489_1775615747272-xKL3p0Qm0LHDRgCuut4Da044PG2Rcm.jpg"]	3	2	\N	Dời 2 nhà xích đu	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 01:45:39.1889	2026-04-17 04:25:38.814348	\N	\N
76	\N	Âm thanh hoa đăng rột rẹt.	3	12	3	\N	2026-04-04	\N	\N	\N	Âm thanh hoa đăng đôi lúc rột rẹt.\nCần kiểm tra	\N	1	2	\N	Đã yêu cầu pham thảo qua kiểm tra. > Thảo hẹn 19/4	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-04 07:38:13.75887	2026-04-17 10:27:07.164558	\N	\N
100	\N	Sạc order không vào pin	3	12	3	\N	2026-04-06	2026-04-06	2026-04-08	\N	1 bộ sạc order không vào pin.	\N	4	2	\N	Đang kiểm tra. Chân sạc lỏng, ổ ghim lỏng.\nTheo dõi sạc thử.\nSạc vẫn dùng tốt	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-06 02:21:08.807146	2026-04-08 00:39:12.162403	\N	\N
99	\N	Kiểm tra xử lý các camera	3	12	3	\N	2026-04-06	2026-04-06	2026-04-07	\N	Kiểm tra các camera bị che khuất, bố trí lại góc quay tối ưu	\N	4	2	\N	Đang nghiên cứu giải pháp.\n1. Camera hồ bơi bị mái nhà xích đu che -> dời 2 nhà ra 2 bên, không cần dời cam.\n2. Camera hoa sứ bị cây che -> dời lên cao.\n	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-06 02:17:18.263687	2026-04-07 06:36:47.047818	\N	\N
62	12	\N	6	1	6	\N	2026-03-29	\N	2026-03-30	\N	Tủ điện đèn tầng 6 cháy CB điện.\nTủ nguồn đèn led cháy	["https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/z7671497908926_0d3380dd582ded6987f38ce453ac22a3_1774859485362-zQd0Qlf064ksxvGEsuifKbeXzglQBs.jpg", "https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/z7671497914172_98fd540ecb13aa79da8dba1d24bf5178_1774859481949-vvm6CBFkM3HBUJXE36p5NTRKjaoUvP.jpg", "https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/z7671497912988_50d077de86c6753283b07c598ec979e8_1774859477607-9T2avsnOfdvpmZzSX8c9ltt31F2jnW.jpg", "https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/z7671497914165_8af293fd02811ba81378e2ad0524fd42_1774859473728-d9sez3PvXNO2PQMANSqriTD8eqyPqb.jpg", "https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/z7671497914171_39dfb0526ce41208329c08f7cc223ea1_1774859469111-eO6ZPEM2GHqtdY5VOmTHa1KYlyC3zq.jpg"]	4	3	\N	Đã dọn đám cháy, Huy thanh kiểm tra sửa chữa.\nHuy thanh Đã thay nguồn và tủ. A Đen theo dõi	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2026-03-29 09:28:01.996968	2026-03-31 04:46:33.537615	\N	["https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/1000007413_1774923574902-6Dw4neG6YLz2C5kjbqvXCqSnf4hkJv.jpg"]
64	\N	Hoa cau	3	12	3	\N	2026-03-31	2026-03-31	2026-03-31	\N	Máy lạnh Hoa cau lỗi A3 cụm sân khấu.	\N	4	2	\N	Daikin đang kiểm tra. Mạch hở mối hàn, bể ống nước	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	159c2606-abc5-4006-9633-6926396c181b	2026-03-31 01:45:06.864609	2026-03-31 05:51:20.765149	\N	\N
109	\N	Màn cửa Hoa sen bị rớt	10	5	2	\N	2026-04-07	\N	2026-04-07	\N	Gắn lại màn cửa hsen trước\nChuyển bacdrop hoa cau về hoa sen cho tiệc 8/4	\N	4	4	\N	\N	\N	2240c223-f17f-41b0-bc48-fe421f619f5e	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-07 07:14:27.740824	2026-04-07 08:45:50.202867	\N	\N
67	\N	Căng bạc bảng thông báo 4/4/2026	3	12	6	\N	2026-04-01	\N	2026-04-01	\N	Căn bạc 2 khung cơm niêu, căng mặt sau. Đặt cổng 3 và NTH	\N	4	2	\N	Xong.	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2026-04-01 14:59:15.678361	2026-04-01 15:01:28.285653	\N	\N
108	370	\N	16	3	3	\N	2026-04-07	\N	2026-04-07	\N	Cài thêm bên kinh doanh để thuận tiện xử lý công việc kế toán	\N	4	2	\N	Đã xong	\N	5f9697ab-2baf-4ade-a4e6-cb385d1ba051	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 07:10:16.104063	2026-04-07 08:38:56.845515	\N	\N
73	386	\N	3	12	3	\N	2026-04-02	2026-04-03	2026-04-03	\N	Máy lạnh ko lạnh. Chạy lúc rồi chớp đèn liên tục.	\N	4	2	\N	Kiểm tra, bơm gas	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 03:08:43.347641	2026-04-03 03:28:12.464738	\N	\N
72	356	\N	13	3	2	\N	2026-04-03	2026-04-03	2026-04-10	\N	Máy không lên nguồn	\N	4	2	\N	Ổ ghim điện bị lỏng ko ăn điện, thay ổ ghim	\N	159c2606-abc5-4006-9633-6926396c181b	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-03 01:52:11.769127	2026-04-10 01:42:48.643109	\N	\N
71	384	\N	3	12	6	\N	2026-04-02	2026-04-02	2026-04-10	\N	Máy lạnh không có nguồn	\N	4	2	\N	Đứt dây nguồn, đấu lại dây nguồn. Máy hđ bình thường.	\N	159c2606-abc5-4006-9633-6926396c181b	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-02 10:01:04.066732	2026-04-10 01:43:50.382825	\N	\N
79	42	\N	3	12	3	\N	2026-04-05	2026-04-05	\N	\N	Buồng phòng hư 1 đàm	\N	3	2	\N	Đàm hư pin	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 00:25:43.968114	2026-04-05 09:11:14.228776	\N	\N
9	41	\N	5	13	3	\N	2025-11-05	\N	2025-11-30	\N	Bộ đàm bảo vệ hư 1 cái	\N	4	2	\N	Hư pin bộ đàm đời cũ. Đề xuất mua pin mới.\nĐã thay pin \nĐã đặt mua hàng, chờ hàng về	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	b924fb2a-9c27-4201-a7eb-ad5b7d829491	2025-11-05 22:05:07.178784	2026-04-05 09:28:26.440385	\N	\N
75	6	\N	3	12	3	\N	2026-04-04	\N	2026-04-05	\N	Màn led hư 1 tấm.	["https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/1000007435_1775264429545-DEQt45EuDhYe2NOnWiT8HVdsSjkJcN.jpg"]	4	2	\N	Thay led dự phòng. Bình thường\nTồn 16 led + 1 nguòn	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2026-04-04 01:01:23.502282	2026-04-06 01:57:49.820268	\N	["https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/1000007436_1775264454279-ZIGTdKCbbn4uV5vPZXB7fhNuXpLXnp.jpg"]
101	23	\N	2	12	2	\N	2026-04-07	\N	2026-04-07	\N	Không kết nối được máy in	\N	4	2	\N	Reset Print Spooler service	\N	5d7432c9-6978-4b4c-8e32-2228c776a1e3	\N	2026-04-07 00:52:49.65996	2026-04-07 00:52:49.65996	\N	\N
77	13	\N	3	12	3	\N	2026-04-04	\N	2026-04-07	\N	CB điện Màn led hoa cau nhá điện khi bật.	["https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/1000007456_1775534846400-t4hLGUqoa24VuS25kOVzf9I8R9eImt.jpg"]	4	2	\N	Thay CB điện cho màn led.\nThay xong.	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-04 07:39:18.53869	2026-04-07 04:07:49.267769	\N	["https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/1000007477_1775534787886-PttfBttH1JnRmFGmqC3XAwhp9ljHDo.jpg", "https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/1000007478_1775534782738-G0w23jOHx8VLr1vwQAOnvfq6QQ1doa.jpg"]
204	\N	In thêm menu ẩm thực sáng 	2	12	2	\N	2026-04-14	2026-04-14	2026-04-15	\N	In thêm menu ẩm thực sáng 14 cuốn	\N	4	2	\N	\N	\N	5d7432c9-6978-4b4c-8e32-2228c776a1e3	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-14 01:04:12.447511	2026-04-15 07:53:02.266771	\N	\N
80	\N	Nước chảy từ vách cột hoa đăng	3	12	15	\N	2026-04-05	2026-04-05	2026-04-16	\N	Nước chảy ra từ vách ko rõ nguyên nhân.	["https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/1000007452_1775372976693-J2Oj4D7Z1UGf8Y2nG9814QifYNMonF.jpg", "https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/1000007455_1775386750429-NE9cEPpZAj9tzzT1sMFk3nghLwaxro.jpg", "https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/1000007458_1775386745170-r0qajpWgKmGVHBqutKPQq3aGHH83bQ.jpg"]	4	2	\N	Nước máy lạnh xả vào bồn cây, đường ống thoát bồn bị nghẹt.\nĐã xử lý đường ống thoát xong (Trang, Đen, Hôn).\nChờ khô lắp lại vách alu.	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-05 07:07:24.647163	2026-04-17 00:53:03.798412	\N	["https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/sua_alu_cot_hoa_dang_1776387174289-LalrHF8kwvHnTTHFr4GeYrXutxBbkb.jpg"]
137	13	\N	3	12	3	\N	2026-04-10	2026-04-10	2026-04-10	\N	Màn led hoa đăng hư 2 tấm led	["https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/1000007501_1775811255987-V1rf1awpg7dcwJZXht3vKTGqgIUzpe.jpg", "https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/1000007502_1775811248201-cS2GIrpT6Nypha0xkqTLi7o8LkrRxp.jpg"]	4	3	\N	Hư jack nguồn, đã sửa. Dời một số tấm led hư ở giữa xuống góc. Hđbt	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 08:54:28.248717	2026-04-10 10:43:36.715248	\N	\N
145	394	\N	3	12	3	\N	2026-04-11	\N	2026-04-11	\N	Trả board nóng máy lạnh	\N	4	2	\N	Đã xong, hoạt động bình thường.	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:22:15.965822	2026-04-11 09:38:11.029171	\N	\N
205	\N	Đèn trang lối đi tiệc cưới hư điện	3	12	3	\N	2026-04-14	2026-04-14	2026-04-17	\N	Đèn trang trí lối đi hoa Sen và Hoa cau hư dây điện và chuôi điện.	["https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/17761347966147672877925608303607_1776134825362-wzBJXfS4SlJ9kZdhsZU1iyATIgIEi5.jpg"]	4	2	\N	Dây điện mỏng cấn tróc vỏ, chuôi ghim gãy cong	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 01:34:26.341092	2026-04-17 04:21:28.407449	\N	\N
52	\N	Bổ sung các bảng tên ẩm thực	3	12	3	\N	2026-03-18	\N	\N	\N	Nghiên cứu, bổ sung các bảng tên khu vực ẩm thực, WC để chỉ dẫn khách	\N	3	2	\N	Bản thiết kế chưa đạt, cần sửa lại	\N	159c2606-abc5-4006-9633-6926396c181b	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-03-18 06:54:49.547743	2026-04-17 04:25:16.457627	\N	\N
199	\N	Máy in Bill Thu Ngân lỗi	19	3	3	\N	2026-04-13	2026-04-13	2026-04-13	\N	Máy in Bill Thu Ngân lỗi không in ra bill	\N	4	2	\N	Máy in lỗi phần cơ, đã xử ký. Hđbt	\N	939462c9-dfc3-4721-b7e4-78b50203369b	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-13 00:57:15.9179	2026-04-13 01:00:23.342693	\N	\N
200	212	\N	15	1	3	\N	2026-04-13	\N	2026-04-13	\N	Tivi nhiễu kênh	\N	4	2	\N	Tivi tự kích hoạt kênh digital, chuyển về analog 	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2026-04-13 01:09:54.381132	2026-04-13 01:12:40.83434	\N	\N
202	\N	Kết nối học tập nghị quyết	18	3	3	\N	2026-04-13	2026-04-13	2026-04-13	\N	Họp nội dung trực tuyến, trực tiếp trên VTV1	\N	4	2	\N	Mở youtube trên phòng họp nhỏ	\N	159c2606-abc5-4006-9633-6926396c181b	\N	2026-04-13 01:42:07.769345	2026-04-13 01:42:07.769345	\N	\N
157	\N	TRIỂN KHAI TIỆC 15.4	10	5	3	\N	2026-04-12	2026-04-13	2026-04-13	\N	DẸP TOÀN BỘ TRANGTRI  - CỔNG, LỐI ĐI - KHÁCH TỰ TRANG TRÍ MANG VÀO	\N	4	4	\N	\N	\N	2240c223-f17f-41b0-bc48-fe421f619f5e	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 03:50:09.128048	2026-04-13 02:44:48.451236	\N	\N
211	398	\N	3	12	3	\N	2026-04-15	\N	2026-04-17	\N	Tín hiệu không ổn định	\N	4	2	\N	Chạm dây tín hiệu dưới hầm	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-15 01:23:14.584266	2026-04-17 09:44:58.010345	\N	\N
203	\N	Thùng phân loại rác sân vườn	3	12	3	\N	2026-04-13	2026-04-14	2026-04-17	\N	Thiết kế, dán nhãn tem thùng rác sân vườn.\nTem số, tem "RÁC HỮU CƠ", tem "RÁC VÔ CƠ"	\N	4	2	\N	Đã xong	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-13 03:46:54.544387	2026-04-17 10:17:40.310857	\N	\N
233	\N	Âm thanh Hoa sen	3	12	3	\N	2026-04-19	\N	\N	\N	Di dời làm kệ để micro Hoa sen khắc phục tình trạng yếu sóng	\N	1	2	\N	\N	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 10:21:18.406995	2026-04-19 11:20:33.087299	\N	\N
229	279	\N	2	12	2	\N	2026-04-18	\N	\N	\N	Mất tín hiệu	\N	1	2	\N	Phòng có khách	\N	5d7432c9-6978-4b4c-8e32-2228c776a1e3	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-18 03:31:39.729013	2026-04-18 03:32:20.031467	\N	\N
230	\N	Quạt ẩm thực	4	2	6	\N	2026-04-19	\N	\N	\N	Vệ sinh bụi và vô dầu	\N	1	2	\N	\N	\N	2a0fbc05-83e4-4d21-a867-8c54d3509ff6	\N	2026-04-19 01:21:05.706437	2026-04-19 01:21:05.706437	\N	\N
223	\N	Sửa rèm Hoa đăng	3	12	3	\N	2026-04-17	\N	\N	\N	Sửa lại rèm sảnh hoa đăng	\N	1	2	\N	Đã lên lịch ngày 21/4 xử lý (Khiêm, Hoàng, Trang, Đen)	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 04:23:59.785548	2026-04-19 01:38:45.111221	\N	\N
209	\N	\N	15	1	15	\N	2026-04-19	2026-04-19	2026-04-19	\N	Báo cáo bảo trì định kỳ cho đợt: Theo dõi chỉ số nước thảy [Batch: batch-2026-04-11-1775899621533].\n\nDanh sách thiết bị:\n- Hố vi sinh xử lý nước thảy	\N	4	2	\N	Xong. Chỉ số 1234	\N	e71a19da-50d2-4fed-8cd2-08e38caa740e	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 16:37:32.148378	2026-04-19 09:53:32.453747	batch-2026-04-11-1775899621533	\N
207	23	\N	16	3	3	\N	2026-04-14	2026-04-14	2026-04-14	\N	không kết nối được máy in	\N	4	2	\N	Lỗi spooler, Upadate windows	\N	5f9697ab-2baf-4ade-a4e6-cb385d1ba051	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 06:39:37.546364	2026-04-14 07:42:41.606926	\N	\N
98	\N	Thẩm định âm thanh Hoa sen	3	12	3	\N	2026-04-06	2026-04-19	2026-04-19	\N	Nhờ Phan Thảo thẩm định âm thanh sành Hoa sen, có giải pháp thay thế, nâng cấp.	\N	4	2	\N	Phan thảo kiểm tra khắc phục tình trạng âm thanh Hoa sen. Đã thấy chất câm ổn định. Micro bị yếu sóng không sửa được.	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-06 01:06:38.434967	2026-04-19 10:20:15.103447	\N	\N
208	\N	máy tính Tú KT	16	3	2	\N	2026-04-14	2026-04-14	2026-04-14	\N	không kết nối được máy in	\N	4	4	\N	\N	\N	5f9697ab-2baf-4ade-a4e6-cb385d1ba051	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 07:54:51.166851	2026-04-14 08:48:50.135447	\N	\N
224	393	\N	3	12	3	\N	2026-04-15	2026-04-17	\N	\N	Sửa đèn mặt hoa cau	\N	3	2	\N	Phan Thảo đã kiểm tra sửa chữa, chờ sửa chữa. Không ảnh hưởng nhiều đến chất lượng ánh sáng sân khấu.	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 10:32:41.455481	2026-04-19 10:22:54.037648	\N	\N
83	361	\N	3	12	6	\N	2026-03-29	2026-04-07	2026-04-10	\N	Bục nâng Hoa cau hư không sử dụng đc.	["https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/1000007481_1775545048209-3iG3qrbsVrzxxL1Mx6LNwtES5X5IR3.jpg", "https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/1000007482_1775545042991-yco4wRQrMDZCBa80ZK8vSfJZlfO0Ob.jpg"]	4	3	\N	Cháy motor. Kỹ thuật hẹn t3, ngày 7/4/25 - Đã mang thợ kiểm tra - Đã sửa motor chưa lắp - Đang lắp motor - Đã sửa xong, hđbt	\N	159c2606-abc5-4006-9633-6926396c181b	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-05 10:16:01.619025	2026-04-10 04:42:53.453448	\N	\N
138	\N	Cho mượn cây thang cấm lại hoa -hoa cau	10	5	3	\N	2026-04-10	\N	\N	\N	Lòi cục mốp hoa lặt lìa	\N	6	4	\N	\N	\N	2240c223-f17f-41b0-bc48-fe421f619f5e	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 09:08:54.422997	2026-04-10 10:41:45.271887	\N	\N
139	391	\N	3	12	3	\N	2026-04-10	\N	2026-04-10	\N	Két sắt hư bản lề	\N	4	4	\N	Bản lề bị lỏng chốt gài, đã cố định lại, hđbt	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 23:21:56.858782	2026-04-10 23:23:28.647914	\N	\N
111	23	\N	16	3	3	\N	2026-04-08	2026-04-08	2026-04-08	\N	Máy tính không kết nối máy in, không in được	\N	4	2	\N	Fix Kaspersky chặn mạng lan.	\N	5f9697ab-2baf-4ade-a4e6-cb385d1ba051	159c2606-abc5-4006-9633-6926396c181b	2026-04-08 00:49:04.353805	2026-04-08 01:01:10.540236	\N	\N
103	400	\N	3	12	3	\N	2026-04-06	2026-04-07	2026-04-17	\N	Camera quan sát cổng NTH, bị cây xanh che khuất -> dời lên cao.\nĐã xong.	\N	4	2	\N	\N	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 01:47:07.562875	2026-04-17 10:23:07.323603	\N	\N
110	370	\N	16	3	3	\N	2026-04-07	2026-04-07	2026-04-08	\N	Máy tính không kết nối với máy in màu, không in được thực đơn	\N	4	2	\N	Đã cài đặt xong	\N	5f9697ab-2baf-4ade-a4e6-cb385d1ba051	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 07:55:50.093068	2026-04-08 09:16:00.10339	\N	\N
140	23	\N	16	3	3	\N	2026-04-11	2026-04-11	2026-04-11	\N	Máy tính không kết nối máy in nữa rồi	\N	4	2	\N	Đã xử lý xong	\N	5f9697ab-2baf-4ade-a4e6-cb385d1ba051	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 06:03:11.86376	2026-04-11 09:41:58.83822	\N	\N
141	393	\N	3	12	3	\N	2026-04-11	2026-04-15	2026-04-15	\N	Xử lý Đèn mặt sân khấu hư 1 cây	\N	4	2	\N	Tháo đèn xuống không làm ảnh hướng các đèn khác. Ánh sáng đủ dùng. Đã báo Phan Thảo kiểm tra sửa chữa.	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 07:30:41.537341	2026-04-17 10:31:21.489141	\N	\N
231	\N	Tủ cáp bên ngoài Hoa sen	3	12	3	\N	2026-04-19	2026-04-19	2026-04-19	\N	Xử lý tủ cáp gọn ràng hơn	["https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/tu_cap_hoa_sen_1776562870791-LQclTCQl6V8Sd9IsFgtDW43VY5nkYf.jpg"]	4	2	\N	Xong	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 01:41:47.279053	2026-04-19 10:15:23.7254	\N	["https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/17765920914102725042637604585565_1776592102655-0Y4FaD7xAWzMDBQIyd0SYYfiTUr8BQ.jpg"]
201	42	\N	8	14	3	\N	2026-04-13	2026-04-13	\N	\N	Đàm hư	\N	3	2	\N	Đàm lỗi pin	\N	159c2606-abc5-4006-9633-6926396c181b	159c2606-abc5-4006-9633-6926396c181b	2026-04-13 01:15:56.994899	2026-04-13 01:40:15.715225	\N	\N
142	395	\N	3	12	3	\N	2026-04-03	2026-04-04	2026-04-04	\N	Máy lỗi chớp đèn đỏ. Lúc chuẩn bị hội nghị	\N	4	4	\N	Báo daikin tình trạng. Hẹn sáng 4/4 xử lý -> Sáng 4/4 daikin qua kiểm tra báo hư board -> Mượn board Phòng họp nhỏ sử dụng bt. Chờ thay board.	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 08:25:23.26204	2026-04-11 09:34:41.956161	\N	["https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/1000007505_1775896317254-QEmKiZbaFt4fdNhSWYBadU8mI43Ovu.jpg"]
196	397	\N	10	5	3	\N	2026-04-12	2026-04-13	2026-04-13	\N	ĐỀ NGHỊ SỬA MÁY IN MÀU GẤP - LÝ DO KÉO KO ĐỀU MÀU	\N	4	3	\N	Máy nghẹt đầu phun, clean đầu phun. Đầu phun đã nghẹt nặng không xử lý được, sử dụng tạm với chất lượng tương đối.	\N	2240c223-f17f-41b0-bc48-fe421f619f5e	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 10:42:02.329378	2026-04-13 03:26:16.795006	\N	\N
48	\N	Sửa rèm sảnh tiệc	3	12	3	\N	2026-03-18	2026-04-16	2026-04-17	\N	Sửa rèm kéo hoa đăng, hoa cau.	\N	4	2	\N	Xong rèm Hoa cau. Tồn rèm Hoa đăng	\N	159c2606-abc5-4006-9633-6926396c181b	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-03-18 06:46:36.263772	2026-04-17 04:23:06.247861	\N	\N
8	\N	Vá trần thạch cao khách sạn 301,506	3	12	6	\N	2025-11-05	\N	2025-11-05	\N	Vá, bê, sơn trần thạch cao 301 và 506. \nAnh trang theo dõi thợ làm	\N	4	2	\N	XOng	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-05 19:45:05.28606	2026-04-08 10:26:25.907953	\N	\N
143	394	\N	3	12	3	\N	2026-04-04	\N	2026-04-11	\N	Tháo board nóng cho Phòng Hoa hồng mượn.	\N	4	4	\N	Đã tháo board. Máy ko hoạt động.	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 08:34:29.542284	2026-04-11 08:41:43.247656	\N	\N
115	\N	Wifi khu vực quầy bar chập chờn	3	12	3	\N	2026-04-08	\N	2026-04-08	\N	Wifi yếu	\N	4	2	\N	Đang kiểm tra\nReset wifi	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 04:53:25.702756	2026-04-08 10:36:27.002273	\N	\N
51	359	\N	3	12	3	\N	2026-03-18	\N	\N	\N	Sửa bảng đèn bị lũng lổ không rõ nguyên nhân	\N	1	2	\N	Huy Thanh đã vá lại sử dụng tạm > Đã yêu cầu báo giá làm lại	\N	159c2606-abc5-4006-9633-6926396c181b	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-03-18 06:53:29.255679	2026-04-09 03:02:30.507239	\N	\N
116	\N	DOANH THU BỊ LỖI	17	17	2	\N	2026-04-09	\N	2026-04-09	\N	BỊ SAI NGÀY + ĐỘI DOANH THU LÊN	\N	4	3	\N	Đã nhờ Smile xử lý	\N	7d54368f-c08c-4315-b902-79e4444718ac	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-09 05:19:29.116613	2026-04-09 08:23:54.06342	\N	\N
123	\N	Lỗi đóng ngày Smile FO	2	12	2	\N	2026-04-10	\N	2026-04-10	\N	Lỗi FO đóng ngày lỗi, ảnh hưởng POS không hoạt động đúng.	["https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/Screenshot_2026-04-10_072352_1775780656117-axthDs4QVSC778ba56Y1dRlzH260Q2.png"]	4	2	\N	Chạy tiền phòng bị thiếu 1 folio. Dùng admin thêm tiền phòng còn thiếu.\nFO và POS đã hoạt động lại. -> cần post lại các order đã post giấy.\n	\N	5d7432c9-6978-4b4c-8e32-2228c776a1e3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 00:26:32.924094	2026-04-10 01:01:54.150675	\N	\N
131	388	\N	2	12	3	\N	2026-04-10	\N	2026-04-17	\N	Mất hình. Nguồn đủ 12V. Không có tín hiệu từ dây	\N	4	2	\N	Đứt dây tín hiệu trên tầng 2 nhà hàng tròn	\N	5d7432c9-6978-4b4c-8e32-2228c776a1e3	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-10 02:22:15.868244	2026-04-17 09:45:57.240239	\N	\N
144	395	\N	3	12	3	\N	2026-04-11	\N	2026-04-11	\N	Thay board nóng Máy lạnh Hoa hồng.	\N	4	2	\N	Đã thay xong - > Bình thường	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:10:53.039683	2026-04-11 09:12:02.888346	\N	\N
113	\N	Order ẩm thực sai tên nhân viên	18	3	3	\N	2026-04-08	2026-04-08	2026-04-15	\N	Order ẩm thực sai tên nhân viên order	["https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/loi_order_1775612738507-TujbsrYJCXUeuRzkFDIXqUIssx8c4P.jpg"]	4	2	\N	Đã nhờ smile hỗ trợ kiểm tra.\nLỗi do mạng không ổn định pos lấy user poswin đẩy order. Smile yêu cầu nâng cấp pm các phân hệ.	\N	eff8338a-dcc2-4935-b55c-3e3b653a89fd	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 01:46:13.159362	2026-04-15 01:38:02.338478	\N	\N
232	400	\N	2	12	3	\N	2026-04-19	2026-04-19	2026-04-19	\N	Camera bị rơi	["https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/17765905570887803701361860317222_1776590581714-8xcz1ATp4GIx9Lw3hG5LifrvX5kZVi.jpg", "https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/z7741724343250_3e748e7242af1908b5e5a51109804491_1776593860552-j0s6VNctIDiUcjLbYp9Ir9sP40S3P0.jpg"]	3	2	\N	Cam bị rèm kéo làm rớt, cần thay đổi vị trí	\N	5d7432c9-6978-4b4c-8e32-2228c776a1e3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 09:23:16.733257	2026-04-19 10:17:55.340083	\N	["https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/17765917693106508295898828983705_1776591783966-MVUDnhh8AN3oGEHByvcNKR5xK23PKS.jpg"]
238	365	\N	3	12	2	\N	2026-04-20	\N	2026-04-20	\N	Xử lý máy tính không có internet	\N	4	3	\N	Lỏng dây LAN	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-20 02:04:36.060862	2026-04-20 02:24:04.642257	\N	\N
78	369	\N	3	12	3	\N	2026-04-05	2026-04-05	\N	\N	Máy load dữ liệu chậm, thường xuyên fullload disk, đầy data	\N	3	2	\N	Đề Xuất thay ổ cứng. Hẹn 22/4 xử lý	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-05 00:13:18.373069	2026-04-20 02:50:11.571389	\N	\N
237	\N	Hoa sứ, Hoa Phượng	3	12	2	\N	2026-04-20	\N	2026-04-20	\N	Thu dọn backdrop, Trả lại dàn âm thanh cho Hoa Mai	\N	4	2	\N	\N	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-20 01:21:23.541157	2026-04-20 03:05:13.675933	\N	\N
236	404	\N	3	12	2	\N	2026-04-20	\N	2026-04-20	\N	Xử lý camera mất màu	["https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/NV3__26__Camera29_10_0_1_247_20260420081723_576749_1776647935575-NP7SBmd8QpatkesH4K0gESkFtqL2qK.jpg"]	4	2	\N	\N	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-20 01:19:17.122178	2026-04-20 03:06:42.226505	\N	["https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/1001018817_1776654355317-NuYLxGwo6zzoHOqQYXxaFEXO7MVnZq.jpg"]
235	403	\N	3	12	2	\N	2026-04-20	\N	2026-04-20	\N	Xử lý camera bị lệch góc quay	["https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/PLV2__10__IP_Camera28_PLV_20260420081517_368687_1776647733818-TqGk92RVq63mJRfvw2yS0R1dXNj1UD.jpg"]	4	2	\N	\N	\N	19bc5494-ab7c-4339-ae84-3e3d25355d07	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-20 01:15:48.446007	2026-04-20 03:06:54.496092	\N	\N
\.


--
-- Data for Name: DamageReportHistory; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."DamageReportHistory" ("ID", "DamageReportID", "FieldName", "OldValue", "NewValue", "ChangedBy", "ChangedAt") FROM stdin;
7	1	Status	1	2	159c2606-abc5-4006-9633-6926396c181b	2025-11-05 11:59:15.559855
8	1	Status	2	1	159c2606-abc5-4006-9633-6926396c181b	2025-11-05 11:59:16.878466
10	1	Status	1	2	159c2606-abc5-4006-9633-6926396c181b	2025-11-05 11:59:20.200885
13	1	Status	2	3	159c2606-abc5-4006-9633-6926396c181b	2025-11-05 17:26:38.50899
14	3	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-05 19:21:25.987534
15	1	Status	3	2	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-05 19:29:40.054042
16	1	Status	2	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-05 19:30:09.397148
17	3	Priority	2	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-05 19:31:29.328047
18	7	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2025-11-05 19:40:11.628338
19	7	Status	3	2	159c2606-abc5-4006-9633-6926396c181b	2025-11-05 19:40:23.3744
20	8	HandlerNotes		jhgjghjghj	159c2606-abc5-4006-9633-6926396c181b	2025-11-05 22:27:57.019418
21	7	HandlerNotes		...	159c2606-abc5-4006-9633-6926396c181b	2025-11-05 22:28:11.912724
22	9	HandlerNotes	Hư pin bộ đàm đời cũ. Đề xuất mua pin	Hư pin bộ đàm đời cũ. Đề xuất mua pin mới	159c2606-abc5-4006-9633-6926396c181b	2025-11-05 22:28:25.660239
23	13	Status	1	3	dd27e8f9-50a0-4de0-9a5a-9b9f1396f9c9	2025-11-06 06:21:52.831323
24	13	Status	3	5	159c2606-abc5-4006-9633-6926396c181b	2025-11-06 07:47:52.034182
25	14	Status	1	3	dd27e8f9-50a0-4de0-9a5a-9b9f1396f9c9	2025-11-06 11:06:39.548622
26	14	Status	3	1	dd27e8f9-50a0-4de0-9a5a-9b9f1396f9c9	2025-11-06 11:06:41.652522
27	7	Status	2	3	dd27e8f9-50a0-4de0-9a5a-9b9f1396f9c9	2025-11-06 11:06:45.90384
28	7	Status	3	1	dd27e8f9-50a0-4de0-9a5a-9b9f1396f9c9	2025-11-06 11:06:47.031218
29	7	Status	1	6	dd27e8f9-50a0-4de0-9a5a-9b9f1396f9c9	2025-11-06 11:06:49.552022
30	7	Status	6	1	dd27e8f9-50a0-4de0-9a5a-9b9f1396f9c9	2025-11-06 11:06:50.83782
31	14	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-10 17:22:25.488013
32	7	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-10 17:22:31.961326
33	7	Status	4	1	159c2606-abc5-4006-9633-6926396c181b	2025-11-10 17:22:35.061321
34	10	Status	4	1	159c2606-abc5-4006-9633-6926396c181b	2025-11-10 17:22:50.14004
35	10	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-10 17:24:20.858729
36	10	CompletedDate	2025-10-31T17:00:00.000Z	2025-11-10T10:24:20.858Z	159c2606-abc5-4006-9633-6926396c181b	2025-11-10 17:24:20.860533
37	6	Status	4	1	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 11:10:04.353872
38	6	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 11:10:06.617288
39	15	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 11:11:47.696779
40	15	CompletedDate		2025-11-11T04:11:47.697Z	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 11:11:47.69909
41	15	Status	4	1	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 11:11:47.734236
42	15	CompletedDate	2025-11-10T17:00:00.000Z		159c2606-abc5-4006-9633-6926396c181b	2025-11-11 11:11:47.736002
43	15	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 11:12:20.325876
44	15	CompletedDate		2025-11-11T04:12:20.326Z	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 11:12:20.328642
45	15	Status	4	1	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 14:42:10.485826
46	15	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 14:42:38.918005
47	15	CompletedDate	2025-11-10T17:00:00.000Z	2025-11-11T07:42:38.917Z	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 14:42:38.92018
48	15	Status	4	1	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 14:42:38.963489
49	15	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 14:45:13.143968
50	15	HandlerNotes		yyyyyyyyyyy	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 14:45:13.146786
51	15	CompletedDate	2025-11-10T17:00:00.000Z	2025-11-11T07:45:13.146Z	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 14:45:13.148382
52	15	Status	4	3	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 14:45:38.985274
53	15	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 14:45:51.800019
54	15	HandlerNotes	yyyyyyyyyyy	zzzzzzzzzzzz	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 14:45:51.801288
55	15	CompletedDate	2025-11-10T17:00:00.000Z	2025-11-11T07:45:51.801Z	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 14:45:51.803105
56	15	Status	4	3	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 14:46:11.867772
57	15	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 14:46:36.924039
58	15	CompletedDate	2025-11-10T17:00:00.000Z	2025-11-11T07:46:36.924Z	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 14:46:36.928115
59	15	Status	4	3	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 14:46:36.9659
60	15	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 14:46:42.062226
61	15	CompletedDate	2025-11-10T17:00:00.000Z	2025-11-11T07:46:42.063Z	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 14:46:42.064747
62	15	Status	4	3	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 14:46:42.102421
63	16	Status	3	1	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 15:22:05.401179
64	18	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 16:14:32.801391
65	18	HandlerNotes		Đã gắn lại xong.	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 16:14:32.803603
66	18	CompletedDate	2025-11-10T17:00:00.000Z	2025-11-11T09:14:32.803Z	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 16:14:32.805623
67	18	HandlerNotes	Đã gắn lại xong.		159c2606-abc5-4006-9633-6926396c181b	2025-11-11 16:14:32.838811
68	18	Status	4	3	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 16:14:32.842419
69	18	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 16:14:45.610464
70	18	HandlerNotes		Đã gắn lại xong.	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 16:14:45.611739
71	18	CompletedDate	2025-11-10T17:00:00.000Z	2025-11-11T09:14:45.611Z	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 16:14:45.613126
72	18	HandlerNotes	Đã gắn lại xong.		159c2606-abc5-4006-9633-6926396c181b	2025-11-11 16:14:45.750636
73	18	Status	4	3	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 16:14:45.752863
74	18	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 16:14:52.391361
75	18	HandlerNotes		Đã gắn lại xong.	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 16:14:52.392805
76	18	CompletedDate	2025-11-10T17:00:00.000Z	2025-11-11T09:14:52.392Z	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 16:14:52.394335
77	18	HandlerNotes	Đã gắn lại xong.		159c2606-abc5-4006-9633-6926396c181b	2025-11-11 16:14:52.430242
78	18	Status	4	3	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 16:14:52.432223
79	18	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 16:26:14.213727
80	18	HandlerNotes		Đã gắn lại xong.	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 16:26:14.214958
81	18	CompletedDate	2025-11-10T17:00:00.000Z	2025-11-11T09:26:14.214Z	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 16:26:14.216185
82	17	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 16:27:06.079655
83	16	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 16:27:09.987428
84	15	HandlerNotes	zzzzzzzzzzzz	Lỏng cáp nguồn, Tivi bình thường	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 16:27:57.83913
85	15	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 16:30:07.674368
86	15	CompletedDate	2025-11-10T17:00:00.000Z	2025-11-11T09:30:07.674Z	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 16:30:07.676584
87	19	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2025-11-12 07:46:29.06927
88	19	HandlerNotes		Kiểm tra tìm nguyên nhân	159c2606-abc5-4006-9633-6926396c181b	2025-11-12 07:46:56.023228
89	17	HandlerNotes		Kiểm tra đường dây và camera	159c2606-abc5-4006-9633-6926396c181b	2025-11-12 07:47:14.595766
90	16	HandlerNotes		Kiểm tra đường dây và camera\n	159c2606-abc5-4006-9633-6926396c181b	2025-11-12 07:47:18.249764
91	16	HandlerNotes	Kiểm tra đường dây và camera\n	Kiểm tra đường dây và camera	159c2606-abc5-4006-9633-6926396c181b	2025-11-12 07:47:20.855973
92	7	Status	1	5	159c2606-abc5-4006-9633-6926396c181b	2025-11-12 07:54:23.597317
93	13	HandlerNotes		test demo	159c2606-abc5-4006-9633-6926396c181b	2025-11-12 07:54:43.683692
94	7	HandlerNotes	...	Không khả thi	159c2606-abc5-4006-9633-6926396c181b	2025-11-12 07:54:56.598533
95	20	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-13 09:07:24.479022
96	20	CompletedDate	2025-11-11T17:00:00.000Z	2025-11-13T02:07:24.483Z	159c2606-abc5-4006-9633-6926396c181b	2025-11-13 09:07:24.485593
97	21	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-13 09:08:29.93636
98	21	CompletedDate	2025-11-11T17:00:00.000Z	2025-11-13T02:08:29.936Z	159c2606-abc5-4006-9633-6926396c181b	2025-11-13 09:08:29.938393
99	17	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-13 16:39:23.467635
100	17	HandlerNotes	Kiểm tra đường dây và camera	Kiểm tra đường dây và camera, \nCamera đứt cáp và hư balun	159c2606-abc5-4006-9633-6926396c181b	2025-11-13 16:39:23.474002
101	17	CompletedDate		2025-11-13T09:39:23.473Z	159c2606-abc5-4006-9633-6926396c181b	2025-11-13 16:39:23.475641
102	16	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-13 16:40:05.887323
103	16	HandlerNotes	Kiểm tra đường dây và camera	Kiểm tra đường dây và camera\nCamera hư điện, đã sửa	159c2606-abc5-4006-9633-6926396c181b	2025-11-13 16:40:05.889117
104	16	CompletedDate		2025-11-13T09:40:05.889Z	159c2606-abc5-4006-9633-6926396c181b	2025-11-13 16:40:05.890592
105	22	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-14 09:10:10.93032
106	19	HandlerNotes	Kiểm tra tìm nguyên nhân	Kiểm tra tìm nguyên nhân,\nĐang theo dõi thiết bị	159c2606-abc5-4006-9633-6926396c181b	2025-11-14 09:12:56.470606
107	23	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-16 14:08:44.986384
108	9	HandlerNotes	Hư pin bộ đàm đời cũ. Đề xuất mua pin mới	Hư pin bộ đàm đời cũ. Đề xuất mua pin mới.\nĐã đặt mua hàng, chờ hàng về	159c2606-abc5-4006-9633-6926396c181b	2025-11-16 14:15:01.273818
109	24	Status	3	1	159c2606-abc5-4006-9633-6926396c181b	2025-11-16 16:09:25.280891
110	25	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2025-11-16 16:23:10.259142
111	24	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2025-11-16 16:23:17.91087
112	25	HandlerNotes	Đang chờ báo giá	Đang chờ báo giá.\nĐặt hàng cellphones	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-17 08:49:08.255006
113	19	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-17 08:51:57.326966
114	19	CompletedDate		2025-11-17T01:51:57.326Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-17 08:51:57.328567
115	19	HandlerNotes	Kiểm tra tìm nguyên nhân,\nĐang theo dõi thiết bị	Kiểm tra tìm nguyên nhân,\nĐang theo dõi thiết bị\nĐã theo dõi 1 tuần không phát hiện tình trạng lặp lại.	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-17 08:51:57.329695
116	25	HandlerNotes	Đang chờ báo giá.\nĐặt hàng cellphones	Đang chờ báo giá.\nĐặt hàng cellphones\n	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-18 08:47:18.562669
117	25	HandlerNotes	Đang chờ báo giá.\nĐặt hàng cellphones\n	Đang chờ báo giá.\nĐặt hàng cellphones\nHết hàng, chờ sếp duyệt mẫu khác	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-18 08:47:59.726087
118	25	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-19 16:03:26.736098
119	25	CompletedDate		2025-11-19T09:03:26.748Z	159c2606-abc5-4006-9633-6926396c181b	2025-11-19 16:03:26.75015
120	25	Status	4	3	159c2606-abc5-4006-9633-6926396c181b	2025-11-19 16:04:24.813168
121	28	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2025-11-19 08:35:10.187555
122	28	Status	3	1	159c2606-abc5-4006-9633-6926396c181b	2025-11-19 08:37:52.042529
123	28	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2025-11-19 08:37:58.765186
124	28	HandlerNotes	Kiểm tra, hư nguồn.	Kiểm tra, hư nguồn.\nHuy Thanh Thay nguồn	159c2606-abc5-4006-9633-6926396c181b	2025-11-19 08:38:19.051227
125	1	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-19 11:18:04.102133
126	1	CompletedDate		2025-11-19T04:18:04.102Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-19 11:18:04.104589
127	1	HandlerNotes	Gọi Huy thanh kiểm tra	Gọi Huy thanh kiểm tra\nĐèn xuống cấp chưa có giải pháp	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-19 11:18:37.368037
128	25	Status	3	1	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-19 15:00:34.184274
129	25	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-19 15:00:36.755532
130	25	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-19 15:01:20.034653
131	25	CompletedDate	2025-11-18T17:00:00.000Z	2025-11-19T08:01:20.035Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-19 15:01:20.036258
132	25	Status	4	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-19 15:01:43.816713
133	34	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-19 17:26:51.050842
134	34	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-19 17:27:47.977915
135	34	CompletedDate		2025-11-19T10:27:47.978Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-19 17:27:47.979624
136	34	Status	4	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-19 17:27:48.015018
137	34	CompletedDate	2025-11-18T17:00:00.000Z		19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-19 17:27:48.016262
138	34	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-19 17:28:06.203853
139	34	CompletedDate		2025-11-19T10:28:06.204Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-19 17:28:06.205594
140	34	Status	4	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-19 17:28:06.239665
141	34	CompletedDate	2025-11-18T17:00:00.000Z		19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-19 17:28:06.240855
142	34	HandlerNotes		Đã bảo trì xong	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-19 17:34:09.006405
143	34	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-19 17:34:16.39936
144	34	CompletedDate		2025-11-19T10:34:16.399Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-19 17:34:16.400874
145	28	HandlerNotes	Kiểm tra, hư nguồn.\nHuy Thanh Thay nguồn	Kiểm tra, hư nguồn.\nHuy Thanh Thay nguồn\nĐã thay xong	159c2606-abc5-4006-9633-6926396c181b	2025-11-20 08:29:45.328386
146	28	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-20 08:30:03.096743
147	28	CompletedDate		2025-11-20T01:30:03.097Z	159c2606-abc5-4006-9633-6926396c181b	2025-11-20 08:30:03.099365
148	35	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-20 08:32:49.679212
149	35	HandlerNotes		Chờ hỗ trợ của A Trang, A Đen	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-20 08:33:18.064739
150	34	Status	4	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-20 08:46:35.869257
151	34	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-20 08:50:32.899108
152	34	CompletedDate	2025-11-18T17:00:00.000Z	2025-11-20T01:50:32.899Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-20 08:50:32.902238
153	35	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-20 11:10:20.8467
154	35	CompletedDate		2025-11-20T04:10:20.850Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-20 11:10:20.853272
155	36	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 15:27:04.781848
156	36	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 15:27:32.275439
157	36	CompletedDate	2025-11-23T17:00:00.000Z	2025-11-24T08:27:32.276Z	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 15:27:32.277851
158	25	HandlerNotes	Đang chờ báo giá.\nĐặt hàng cellphones\nHết hàng, chờ sếp duyệt mẫu khác	Đã mua được 1 cái	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-24 15:33:55.469695
159	12	HandlerNotes	Gửi phan thảo kiểm tra	Gửi phan thảo kiểm tra.\nĐã nhận về ngày 20/11	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-24 15:34:31.685355
160	11	HandlerNotes	Gưi Phan thảo kiểm tra	Gưi Phan thảo kiểm tra\nĐã nhận về ngày 20/11	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-24 15:34:40.906079
161	11	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-28 16:10:55.499484
162	11	CompletedDate		2025-11-28T09:10:55.510Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-28 16:10:55.515443
163	12	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-28 16:11:05.647003
164	12	CompletedDate		2025-11-28T09:11:05.646Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-28 16:11:05.648715
165	25	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-28 16:11:38.580896
166	25	CompletedDate		2025-11-28T09:11:38.580Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-28 16:11:38.582622
167	37	HandlerNotes		Đã thay nguồn,\nĐèn sáng bt	159c2606-abc5-4006-9633-6926396c181b	2025-11-30 07:14:46.022063
168	37	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2025-11-30 07:15:03.157264
169	37	CompletedDate		2025-11-30T00:15:03.157Z	159c2606-abc5-4006-9633-6926396c181b	2025-11-30 07:15:03.158875
170	38	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2025-11-30 10:40:51.229898
171	38	HandlerNotes		Kiểm tra đèn đang sáng tốt, nguồn ko có dấu hiệu chập chờn,\nTheo dõi thêm	159c2606-abc5-4006-9633-6926396c181b	2025-11-30 10:41:43.56578
172	39	HandlerNotes		Bảng đèn bị hư do nhóm bên ngoài đá banh trúng.\nTháo xuống cho Huy Thanh sửa chữa.	159c2606-abc5-4006-9633-6926396c181b	2025-11-30 10:48:40.332514
173	39	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2025-11-30 10:48:48.042685
174	9	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-30 10:49:52.066271
175	9	CompletedDate		2025-11-30T03:49:52.066Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-30 10:49:52.06806
176	9	HandlerNotes	Hư pin bộ đàm đời cũ. Đề xuất mua pin mới.\nĐã đặt mua hàng, chờ hàng về	Hư pin bộ đàm đời cũ. Đề xuất mua pin mới.\nĐã thay pin \nĐã đặt mua hàng, chờ hàng về	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-30 10:49:52.069503
177	35	HandlerNotes	Chờ hỗ trợ của A Trang, A Đen	Chờ hỗ trợ của A Trang, A Đen\nXong	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-30 10:55:17.607
178	41	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2025-12-04 10:08:56.708257
179	41	CompletedDate		2025-12-04T03:08:56.712Z	159c2606-abc5-4006-9633-6926396c181b	2025-12-04 10:08:56.714194
180	41	HandlerNotes		Nguồn cũ bị lỗi, đã xử lý \nĐèn sáng bình thường.	159c2606-abc5-4006-9633-6926396c181b	2025-12-04 10:08:56.715074
181	42	HandlerNotes		Đã báo Huy Thanh kiểm tra	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-12-05 07:47:20.661523
182	42	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-12-05 07:47:22.041849
183	42	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2026-02-25 13:42:53.786075
184	42	CompletedDate		2026-02-25T06:42:53.797Z	159c2606-abc5-4006-9633-6926396c181b	2026-02-25 13:42:53.799872
185	38	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2026-02-25 13:43:05.572836
186	38	CompletedDate		2026-02-25T06:43:05.573Z	159c2606-abc5-4006-9633-6926396c181b	2026-02-25 13:43:05.575653
187	39	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2026-02-25 13:43:25.788163
188	39	CompletedDate		2026-02-25T06:43:25.788Z	159c2606-abc5-4006-9633-6926396c181b	2026-02-25 13:43:25.790776
189	24	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2026-02-25 13:44:11.651362
190	24	CompletedDate		2026-02-25T06:44:11.651Z	159c2606-abc5-4006-9633-6926396c181b	2026-02-25 13:44:11.652696
191	29	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2026-02-25 13:45:06.303813
192	29	CompletedDate		2026-02-25T06:45:06.304Z	159c2606-abc5-4006-9633-6926396c181b	2026-02-25 13:45:06.305898
193	29	HandlerNotes		Thu hẹp led, xử lý xong	159c2606-abc5-4006-9633-6926396c181b	2026-02-25 13:45:06.307522
194	30	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2026-02-25 13:45:14.270465
195	30	CompletedDate		2026-02-25T06:45:14.270Z	159c2606-abc5-4006-9633-6926396c181b	2026-02-25 13:45:14.271889
196	43	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2026-02-26 08:42:02.507947
197	43	CompletedDate		2026-02-26T01:42:02.519Z	159c2606-abc5-4006-9633-6926396c181b	2026-02-26 08:42:02.522244
198	43	HandlerNotes		Hư banlun	159c2606-abc5-4006-9633-6926396c181b	2026-02-26 08:42:02.523342
199	44	HandlerNotes	Kiểm tra wifi	Wifi bị chàn ip	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-02-26 10:48:54.160572
200	44	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2026-02-28 15:53:53.439291
201	44	CompletedDate		2026-02-28T08:53:53.443Z	159c2606-abc5-4006-9633-6926396c181b	2026-02-28 15:53:53.446149
202	44	HandlerNotes	Wifi bị chàn ip	Wifi bị chàn ip, reset thiết bị và router	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-03-02 17:17:11.696006
203	45	HandlerNotes		Xử lý tạm, sửa lại sau tiệc ngày 10	159c2606-abc5-4006-9633-6926396c181b	2026-03-06 01:24:30.022858
204	46	Status	1	5	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-03-06 07:26:59.27802
205	46	Status	5	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-03-06 07:27:34.556696
206	46	CompletedDate		2026-03-06T07:27:32.805Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-03-06 07:27:34.808154
207	47	Status	3	1	159c2606-abc5-4006-9633-6926396c181b	2026-03-17 10:08:59.836744
208	47	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2026-03-17 10:09:04.093915
209	53	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2026-03-18 07:29:51.328105
210	53	HandlerNotes	Hư 1 tấm led	Hư 1 tấm led\nThay led dự phòng	159c2606-abc5-4006-9633-6926396c181b	2026-03-18 07:30:12.724832
211	53	HandlerNotes	Hư 1 tấm led\nThay led dự phòng	Hư 1 tấm led\nThay led dự phòng\nCòn tồn 18 tấm ok	159c2606-abc5-4006-9633-6926396c181b	2026-03-18 07:39:50.973733
212	53	HandlerNotes	Hư 1 tấm led\nThay led dự phòng\nCòn tồn 18 tấm ok	Hư 2 tấm led\nThay led dự phòng\nCòn tồn 18 tấm ok	159c2606-abc5-4006-9633-6926396c181b	2026-03-18 07:43:33.387458
213	53	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2026-03-18 07:43:52.316732
214	53	CompletedDate	2026-03-17T17:00:00.000Z	2026-03-18T07:43:50.123Z	159c2606-abc5-4006-9633-6926396c181b	2026-03-18 07:43:52.579803
215	54	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 00:02:07.789124
216	54	CompletedDate		2026-03-20T00:02:06.977Z	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 00:02:08.051199
217	55	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 07:50:25.659859
218	55	CompletedDate	2025-07-18T17:00:00.000Z	2026-03-20T07:50:23.376Z	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 07:50:25.919064
219	55	HandlerNotes		Đã xong, hoạt động bình thường	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 07:50:26.074904
220	58	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 08:15:12.218119
221	58	CompletedDate	2026-03-19T17:00:00.000Z	2026-03-20T08:15:09.881Z	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 08:15:12.470095
222	57	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 08:15:20.386096
223	57	CompletedDate	2026-03-19T17:00:00.000Z	2026-03-20T08:15:18.041Z	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 08:15:20.630158
224	56	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 08:15:37.842093
225	56	CompletedDate	2026-03-19T17:00:00.000Z	2026-03-20T08:15:35.496Z	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 08:15:38.104874
226	47	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2026-03-21 08:41:30.74402
227	47	CompletedDate		2026-03-21T08:41:28.833Z	159c2606-abc5-4006-9633-6926396c181b	2026-03-21 08:41:30.931122
228	47	HandlerNotes		Bảo trì nghiệm thu xong.	159c2606-abc5-4006-9633-6926396c181b	2026-03-21 08:42:39.783479
229	47	Status	4	3	159c2606-abc5-4006-9633-6926396c181b	2026-03-21 08:43:30.491758
230	47	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2026-03-21 10:37:17.121892
231	47	CompletedDate	2026-03-20T17:00:00.000Z	2026-03-21T10:37:14.952Z	159c2606-abc5-4006-9633-6926396c181b	2026-03-21 10:37:17.317888
232	47	Status	4	3	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 07:36:57.015472
233	47	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 07:37:04.756103
234	47	CompletedDate	2026-03-20T17:00:00.000Z	2026-03-22T07:37:02.899Z	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 07:37:05.013175
235	59	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 07:42:16.281374
236	59	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:35.7614
237	59	CompletedDate		2026-03-22T13:39:33.068Z	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:35.97745
238	59	HandlerNotes		Xong	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:50:00.44973
239	54	HandlerNotes	Hư 1 tấm led, thay led dự phòng.\nTồn led dự phòng 17 tấm	Hư 1 tấm led, thay led dự phòng.\nTồn led dự phòng 17 tấm + 1 nguồn	159c2606-abc5-4006-9633-6926396c181b	2026-03-23 10:21:03.34904
240	50	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2026-03-25 04:04:43.338799
241	50	CompletedDate		2026-03-25T04:04:42.424Z	159c2606-abc5-4006-9633-6926396c181b	2026-03-25 04:04:43.546565
242	52	HandlerNotes	Đang lên thiết kế.	Đã gửi huy thanh lên mẫu thiết kế demo\n	159c2606-abc5-4006-9633-6926396c181b	2026-03-25 04:05:20.653732
243	49	HandlerNotes		Kỹ thuật sửa xong	159c2606-abc5-4006-9633-6926396c181b	2026-03-25 04:06:10.97653
244	49	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2026-03-25 04:06:39.029756
245	49	CompletedDate		2026-03-25T04:06:38.098Z	159c2606-abc5-4006-9633-6926396c181b	2026-03-25 04:06:39.228466
246	49	HandlerNotes	Kỹ thuật sửa xong	Kỹ thuật sửa xong.	159c2606-abc5-4006-9633-6926396c181b	2026-03-25 04:06:39.344609
247	45	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2026-03-25 04:06:59.3351
248	45	CompletedDate		2026-03-25T04:06:58.403Z	159c2606-abc5-4006-9633-6926396c181b	2026-03-25 04:06:59.523648
249	52	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2026-03-25 04:07:06.739464
250	52	CompletedDate		2026-03-25T04:07:05.806Z	159c2606-abc5-4006-9633-6926396c181b	2026-03-25 04:07:06.926914
251	61	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-03-27 07:54:04.261817
252	61	CompletedDate	2026-03-26T17:00:00.000Z	2026-03-27T07:54:02.223Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-03-27 07:54:04.517188
253	60	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2026-03-29 09:25:43.728609
254	60	CompletedDate		2026-03-29T09:25:41.876Z	159c2606-abc5-4006-9633-6926396c181b	2026-03-29 09:25:43.99914
255	62	HandlerNotes	Đang xử lý	Đang xử lý 	159c2606-abc5-4006-9633-6926396c181b	2026-03-29 10:29:04.088679
256	62	HandlerNotes	Đang xử lý 	Đang xử lý dff	159c2606-abc5-4006-9633-6926396c181b	2026-03-29 10:29:07.546198
257	62	HandlerNotes	Đang xử lý dff	Đang xử lý dffđ	159c2606-abc5-4006-9633-6926396c181b	2026-03-29 10:29:11.750756
258	62	HandlerNotes	Đang xử lý dffđ	Đang xử lý	159c2606-abc5-4006-9633-6926396c181b	2026-03-29 10:29:25.307635
259	62	Priority	3	2	159c2606-abc5-4006-9633-6926396c181b	2026-03-29 13:21:39.27809
260	62	Priority	2	1	159c2606-abc5-4006-9633-6926396c181b	2026-03-29 13:21:39.693613
261	62	Priority	1	3	159c2606-abc5-4006-9633-6926396c181b	2026-03-29 13:21:46.902291
262	28	Priority	2	3	159c2606-abc5-4006-9633-6926396c181b	2026-03-30 13:48:00.0911
263	28	Priority	3	2	159c2606-abc5-4006-9633-6926396c181b	2026-03-30 13:48:08.085839
264	52	Status	4	3	159c2606-abc5-4006-9633-6926396c181b	2026-03-30 15:55:26.54856
265	64	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-03-31 01:45:17.512481
266	62	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2026-03-31 02:23:43.823937
267	62	CompletedDate		2026-03-31T02:23:43.941Z	159c2606-abc5-4006-9633-6926396c181b	2026-03-31 02:23:44.935939
268	62	HandlerNotes	Đã dọn đám cháy, Huy thanh kiểm tra sửa chữa.	Đã dọn đám cháy, Huy thanh kiểm tra sửa chữa.\nHuy thanh Đã thay nguồn và tủ.	159c2606-abc5-4006-9633-6926396c181b	2026-03-31 02:23:45.597857
269	64	HandlerNotes	Daikin kiểm tra	Daikin đang kiểm tra. Mạch hở mối hàn	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-03-31 02:41:37.130159
270	64	HandlerNotes	Daikin đang kiểm tra. Mạch hở mối hàn	Daikin đang kiểm tra. Mạch hở mối hàn, bể ống nước	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-03-31 02:41:52.798638
271	64	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-03-31 04:02:25.689649
272	64	CompletedDate		2026-03-31T04:02:25.807Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-03-31 04:02:26.835738
281	67	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2026-04-01 14:59:58.931447
282	67	CompletedDate		2026-04-01T14:59:59.049Z	159c2606-abc5-4006-9633-6926396c181b	2026-04-01 15:00:00.024155
310	70	HandlerNotes		Phòng có khách	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-02 07:13:08.614362
311	69	HandlerNotes		Phòng có khách	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-02 07:13:17.259648
312	71	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2026-04-02 10:06:04.555056
313	71	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2026-04-02 10:08:42.766125
314	71	CompletedDate		2026-04-02T10:08:43.081Z	159c2606-abc5-4006-9633-6926396c181b	2026-04-02 10:08:44.019615
315	71	HandlerNotes		Đứt dây nguồn, đấu lại dây nguồn. Máy hđ bình thường.	159c2606-abc5-4006-9633-6926396c181b	2026-04-02 10:08:44.647211
316	69	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 01:53:26.744362
317	70	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 01:53:34.455972
318	72	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 02:30:59.2598
319	72	HandlerNotes		Ổ ghim điện bị lỏng ko ăn điện	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 02:31:36.508858
320	72	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 02:32:38.601472
321	72	CompletedDate		2026-04-03T02:32:38.921Z	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 02:32:39.870153
322	72	HandlerNotes	Ổ ghim điện bị lỏng ko ăn điện	Ổ ghim điện bị lỏng ko ăn điện, thay ổ ghim	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 02:32:40.505188
323	71	Status	4	3	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 03:10:39.8268
324	71	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 03:10:55.346115
325	71	CompletedDate	2026-04-02T00:00:00.000Z	2026-04-03T03:10:55.666Z	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 03:10:56.636605
326	73	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 03:11:34.093923
327	73	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 03:12:14.848964
328	73	CompletedDate		2026-04-03T03:12:15.190Z	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 03:12:16.212081
329	73	HandlerNotes		Kiểm tra, bơm gas	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 03:12:16.894555
330	72	Status	4	3	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 03:22:33.898299
331	72	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 03:23:27.332158
332	72	CompletedDate	2026-04-03T00:00:00.000Z	2026-04-03T03:23:27.665Z	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 03:23:28.649015
333	73	Status	4	3	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 03:27:40.683929
334	73	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 03:28:12.240722
335	73	CompletedDate	2026-04-02T17:00:00.000Z	2026-04-03T03:28:11.159Z	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 03:28:12.597941
336	80	HandlerNotes		Nước máy lạnh xả vào bồn cây, đường ống thoát bồn bị nghẹt.\nĐã xử lý đường ống thoát xong (Trang, Đen, Hôn).	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 09:07:58.333519
337	80	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 09:08:04.206519
338	80	CompletedDate		2026-04-05T09:08:04.322Z	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 09:08:05.360115
339	79	HandlerNotes		Đàm hư pin	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 09:11:08.766019
340	79	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 09:11:13.376172
341	82	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 09:48:56.023005
342	82	CompletedDate		2026-04-05T09:48:56.367Z	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 09:48:57.391563
343	82	HandlerNotes		Pv 5 đàm, sạc, tai nghe.\nBar 1 đàm, 1 sạc, 1 tai nghe	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 09:48:58.077007
344	81	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 09:49:55.553683
345	81	CompletedDate		2026-04-05T09:49:55.880Z	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 09:49:56.847635
346	81	HandlerNotes		Nhận 1 đàm, sạc, tai nghe	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 09:49:57.495769
348	75	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 09:53:41.553511
349	75	CompletedDate		2026-04-05T09:53:41.877Z	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 09:53:42.833417
350	75	HandlerNotes	Thay led dự phòng	Thay led dự phòng. Bình thường	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 09:53:43.474961
351	83	HandlerNotes		Cháy motor. Kỹ thuật hẹn t3, ngày 7/4/25	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 10:16:13.320309
352	83	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 10:26:39.620488
353	83	Status	3	1	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 10:26:51.744853
354	80	Status	4	3	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 11:00:55.103676
355	83	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 14:24:00.813981
356	83	Status	3	1	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 14:24:24.619304
357	83	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 14:30:30.801253
363	83	Status	3	1	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 15:15:56.516717
364	83	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 15:16:20.0826
365	78	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 15:33:09.358414
366	83	Status	3	1	159c2606-abc5-4006-9633-6926396c181b	2026-04-06 01:23:25.770112
367	100	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-06 02:52:28.449347
368	100	HandlerNotes		Đang kiểm tra	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-06 02:52:37.381943
369	99	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-06 02:53:03.638791
370	99	HandlerNotes		Đang nghiên cứu giải pháp	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-06 02:53:09.61506
371	98	HandlerNotes		Đã yêu cầu pham thảo qua kiểm tra	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-06 02:53:30.582354
372	98	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-06 02:53:32.799309
373	77	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2026-04-07 00:51:21.66623
374	100	HandlerNotes	Đang kiểm tra	Đang kiểm tra. Chân sạc lỏng, ổ ghim lỏng.\nTheo dõi sạc thử.	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 01:39:57.158513
375	99	HandlerNotes	Đang nghiên cứu giải pháp	Đang nghiên cứu giải pháp.\n1. Camera hồ bơi bị mái nhà xích đu che -> dời 2 nhà ra 2 bên, không cần dời cam.\n2. Camera hoa sứ bị cây che -> dời lên cao.\n	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 01:41:57.983601
376	99	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 01:42:12.117511
377	99	CompletedDate		2026-04-07T01:42:14.882Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 01:42:15.876644
378	103	HandlerNotes		Đã nhờ daikin qua xử lý	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 01:52:19.670665
379	103	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 01:52:23.171721
380	103	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 01:53:12.40718
381	103	CompletedDate		2026-04-07T01:53:15.189Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 01:53:16.210615
382	104	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 01:53:44.673093
383	104	HandlerNotes		Daikin đã kiểm tra. Máy hết kêu và hoạt động bình thường	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 01:54:30.287372
384	104	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 01:55:00.082189
385	104	CompletedDate		2026-04-07T01:55:03.363Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 01:55:04.305764
386	98	Status	3	1	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 02:11:17.535881
387	52	HandlerNotes	Đã gửi huy thanh lên mẫu thiết kế demo\n	Đã gửi huy thanh lên mẫu thiết kế demo\nĐã gửi mẫu thiết kế A Tuấn xem, chờ phản hồi	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 02:12:15.524433
388	105	Status	1	6	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 02:43:31.915407
389	105	HandlerNotes		test thử	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 02:43:46.009129
390	77	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 04:06:40.747894
391	77	CompletedDate		2026-04-07T04:06:42.876Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 04:06:43.858982
392	48	HandlerNotes	Nhờ sự hỗ trợ của A.Trang, A.Đen	Nhờ sự hỗ trợ của A.Trang, A.Đen, Cô Thắm	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 04:13:05.148659
393	102	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2026-04-07 06:22:46.207211
394	102	CompletedDate		2026-04-07T06:22:45.172Z	159c2606-abc5-4006-9633-6926396c181b	2026-04-07 06:22:47.119994
395	102	Status	4	1	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 06:35:14.355232
396	103	Status	4	1	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 06:35:31.949727
397	103	HandlerNotes	Đã nhờ daikin qua xử lý.\nDaikin đã xử lý xong, hết kêu, máy lạnh bình thường	Dời camera lên cao	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 06:36:01.03742
398	83	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 06:38:04.524224
399	78	HandlerNotes		Đề Xuất thay ổ cứng	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 06:39:18.448334
400	108	HandlerNotes		Đang xử lý	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 07:10:40.231889
401	108	Status	1	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 08:37:50.79753
402	108	CompletedDate		2026-04-07T08:37:53.650Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 08:37:54.650345
403	109	Status	1	4	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-07 08:45:50.426408
404	110	HandlerNotes		Chưa xong, hẹn sáng 8/4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 08:51:17.974308
405	110	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 08:51:25.650036
406	103	HandlerNotes	Dời camera lên cao		19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 08:53:46.758053
407	83	HandlerNotes	Cháy motor. Kỹ thuật hẹn t3, ngày 7/4/25	Cháy motor. Kỹ thuật hẹn t3, ngày 7/4/25\nĐã mang thợ kiểm tra	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 08:55:44.629078
408	100	HandlerNotes	Đang kiểm tra. Chân sạc lỏng, ổ ghim lỏng.\nTheo dõi sạc thử.	Đang kiểm tra. Chân sạc lỏng, ổ ghim lỏng.\nTheo dõi sạc thử.\nSạc vẫn dùng tốt	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 00:39:04.890673
409	100	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 00:39:08.984861
410	100	CompletedDate		2026-04-08T00:39:11.831Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 00:39:12.832339
411	111	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 00:49:52.712592
412	111	HandlerNotes		Fix Kaspersky chặn mạng lan	159c2606-abc5-4006-9633-6926396c181b	2026-04-08 01:00:32.091495
413	111	Status	3	4	159c2606-abc5-4006-9633-6926396c181b	2026-04-08 01:01:07.061787
414	111	CompletedDate		2026-04-08T01:01:09.125Z	159c2606-abc5-4006-9633-6926396c181b	2026-04-08 01:01:10.098343
415	111	HandlerNotes	Fix Kaspersky chặn mạng lan	Fix Kaspersky chặn mạng lan.	159c2606-abc5-4006-9633-6926396c181b	2026-04-08 01:01:10.757705
416	112	HandlerNotes		Nhờ Huy Thanh kiểm tra	159c2606-abc5-4006-9633-6926396c181b	2026-04-08 01:06:51.022278
417	113	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 01:46:40.074609
418	113	HandlerNotes		Đã nhờ smile hỗ trợ kiểm tra	159c2606-abc5-4006-9633-6926396c181b	2026-04-08 02:21:49.893082
419	102	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 02:34:30.279471
420	102	HandlerNotes		Dời 2 nhà xích đu	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 02:35:20.700386
421	114	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 03:07:12.613306
422	114	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 03:09:04.438993
423	114	CompletedDate		2026-04-08T03:09:07.895Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 03:09:08.888375
424	114	HandlerNotes		Đã hoàn thành, sử dụng bình thường	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 03:09:09.557913
425	110	HandlerNotes	Chưa xong, hẹn sáng 8/4	Chưa xong, hẹn sáng 8/4\nĐã cài đặt xong	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 09:14:58.223588
426	110	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 09:15:55.08672
427	110	CompletedDate		2026-04-08T09:15:58.635Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 09:15:59.652864
428	110	HandlerNotes	Chưa xong, hẹn sáng 8/4\nĐã cài đặt xong	Đã cài đặt xong	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 09:16:00.329323
429	83	HandlerNotes	Cháy motor. Kỹ thuật hẹn t3, ngày 7/4/25\nĐã mang thợ kiểm tra	Cháy motor. Kỹ thuật hẹn t3, ngày 7/4/25\nĐã mang thợ kiểm tra\nĐã sửa motor chưa lắp	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 10:21:04.200973
430	115	HandlerNotes	Đang kiểm tra	Đang kiểm tra\nReset wifi	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 10:36:20.101177
431	115	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 10:36:23.849227
432	115	CompletedDate		2026-04-08T10:36:26.677Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 10:36:27.650087
433	69	Status	3	4	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-09 01:54:42.774594
434	69	CompletedDate		2026-04-09T01:54:44.962Z	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-09 01:54:45.992089
435	112	HandlerNotes	Nhờ Huy Thanh kiểm tra	Nhờ Huy Thanh kiểm tra. Hẹn 9/7 kiểm tra.	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-09 03:00:39.914732
436	98	HandlerNotes	Đã yêu cầu pham thảo qua kiểm tra	Đã yêu cầu pham thảo qua kiểm tra. > Qua tiệc 12/4 kiểm tra	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-09 03:01:44.803534
437	76	HandlerNotes		Đã yêu cầu pham thảo qua kiểm tra. > Qua tiệc 12/4 kiểm tra	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-09 03:02:03.470071
438	51	HandlerNotes	Huy Thanh đã vá lại sử dụng tạm	Huy Thanh đã vá lại sử dụng tạm > Đã yêu cầu báo giá làm lại	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-09 03:02:30.743218
439	116	Status	1	4	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-09 08:23:54.294713
440	116	Priority	2	3	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-09 08:23:54.524597
441	72	Status	4	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 01:42:32.358543
442	72	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 01:42:48.133143
443	72	CompletedDate	2026-04-02T17:00:00.000Z	2026-04-10T01:42:47.522Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 01:42:48.73304
444	71	Status	4	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 01:43:36.976853
445	71	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 01:43:49.609979
446	71	CompletedDate	2026-04-02T17:00:00.000Z	2026-04-10T01:43:49.260Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 01:43:50.475023
478	136	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 04:39:19.004472
479	136	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 04:39:37.062939
480	136	CompletedDate		2026-04-10T04:39:35.860Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 04:39:37.473675
481	136	HandlerNotes		Kiểm tra, không có thật	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 04:39:37.562655
482	83	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 04:42:52.905093
483	83	CompletedDate		2026-04-10T04:42:51.738Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 04:42:53.378147
484	83	HandlerNotes	Cháy motor. Kỹ thuật hẹn t3, ngày 7/4/25 - Đã mang thợ kiểm tra - Đã sửa motor chưa lắp - Đang lắp motor	Cháy motor. Kỹ thuật hẹn t3, ngày 7/4/25 - Đã mang thợ kiểm tra - Đã sửa motor chưa lắp - Đang lắp motor - Đã sửa xong, hđbt	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 04:42:53.488087
485	137	Priority	2	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 08:54:39.39467
486	137	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 08:54:46.467368
487	138	Status	1	6	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 10:41:45.271887
488	137	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 10:43:33.374692
489	137	CompletedDate		2026-04-10T10:43:35.357Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 10:43:36.298447
490	137	HandlerNotes		Hư jack nguồn, đã sửa. Dời một số tấm led hư ở giữa xuống góc. Hđbt	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 10:43:36.926426
491	112	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 10:43:56.888269
492	113	HandlerNotes	Đã nhờ smile hỗ trợ kiểm tra	Đã nhờ smile hỗ trợ kiểm tra.\nLỗi do mạng không ổn định pos lấy user poswin đẩy order. Smile yêu cầu nâng cấp pm các phân hệ.	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 10:46:26.434414
493	112	HandlerNotes	Nhờ Huy Thanh kiểm tra. Hẹn 9/7 kiểm tra.	Nhờ Huy Thanh kiểm tra. Hẹn 9/7 kiểm tra. Hẹn 10/4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 10:46:53.05806
494	139	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 23:23:24.937813
495	139	CompletedDate		2026-04-10T23:23:27.130Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 23:23:28.181842
496	139	HandlerNotes		Bản lề bị lỏng chốt gài, đã cố định lại, hđbt	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 23:23:28.881217
497	140	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 06:06:06.376679
498	140	HandlerNotes		Hẹn 12/4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 06:06:18.35992
499	112	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 06:25:38.883584
500	112	CompletedDate		2026-04-11T06:25:37.661Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 06:25:39.545535
501	112	HandlerNotes	Nhờ Huy Thanh kiểm tra. Hẹn 9/7 kiểm tra. Hẹn 10/4	Nhờ Huy Thanh kiểm tra. Hẹn 9/7 kiểm tra. Hẹn 10/4\nHuy Thanh Nguồn	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 06:25:39.647448
502	112	Status	4	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 06:25:57.742959
503	112	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 06:26:11.887052
504	112	CompletedDate	2026-04-10T17:00:00.000Z	2026-04-11T06:26:10.647Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 06:26:12.52405
505	112	HandlerNotes	Nhờ Huy Thanh kiểm tra. Hẹn 9/7 kiểm tra. Hẹn 10/4\nHuy Thanh Nguồn	Nhờ Huy Thanh kiểm tra. Hẹn 9/7 kiểm tra. Hẹn 10/4\nHuy Thanh Nguồn, hđbt	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 06:26:12.628236
506	142	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 08:26:20.068776
507	142	HandlerNotes		Báo daikin tình trạng. Hẹn sáng 4/4 xử lý	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 08:27:04.993712
508	142	Priority	2	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 08:28:01.725564
509	142	HandlerNotes	Báo daikin tình trạng. Hẹn sáng 4/4 xử lý	Báo daikin tình trạng. Hẹn sáng 4/4 xử lý.\nSáng 4/4 daikin qua kiểm tra báo hư board -> Mượn board Phòng họp nhỏ sử dụng\n\n	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 08:29:32.227136
576	17	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 01:42:02.68358
577	17	CompletedDate	2025-11-13T00:00:00.000Z	2026-04-15T01:42:06.527Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 01:42:07.496947
578	204	Status	3	4	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-15 07:53:02.509058
579	80	Status	3	4	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-16 00:32:49.823119
580	80	CompletedDate		2026-04-16T00:32:51.807Z	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-16 00:32:52.775143
581	222	Status	3	4	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-17 01:16:41.471491
582	222	CompletedDate		2026-04-17T01:16:41.412Z	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-17 01:16:42.559528
583	222	CompletedDate	2026-04-16T17:00:00.000Z	2026-04-17T01:16:42.633Z	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-17 01:16:43.780097
584	203	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 04:00:19.246037
585	203	CompletedDate		2026-04-17T04:00:22.869Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 04:00:23.922891
586	205	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 04:21:24.527529
587	205	CompletedDate		2026-04-17T04:21:28.069Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 04:21:29.073397
588	48	Status	1	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 04:21:59.071067
589	48	CompletedDate		2026-04-17T04:22:02.561Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 04:22:03.60143
510	142	HandlerNotes	Báo daikin tình trạng. Hẹn sáng 4/4 xử lý.\nSáng 4/4 daikin qua kiểm tra báo hư board -> Mượn board Phòng họp nhỏ sử dụng\n\n	Báo daikin tình trạng. Hẹn sáng 4/4 xử lý.\nSáng 4/4 daikin qua kiểm tra báo hư board -> Mượn board Phòng họp nhỏ sử dụng.\n11/4 Daikn  thay board mới, hđbt.	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 08:30:44.319573
511	142	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 08:32:11.520315
512	142	CompletedDate		2026-04-11T08:32:15.023Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 08:32:16.029089
513	142	AfterImages	[]	["https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/1000007505_1775896317254-QEmKiZbaFt4fdNhSWYBadU8mI43Ovu.jpg"]	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 08:32:16.698966
514	143	Status	1	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 08:41:40.821941
515	143	CompletedDate	2026-04-04T00:00:00.000Z	2026-04-11T08:41:42.920Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 08:41:43.914201
516	144	Status	4	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:11:28.910324
517	144	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:12:01.770372
518	144	CompletedDate	2026-04-10T17:00:00.000Z	2026-04-11T09:12:00.732Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:12:02.978152
519	142	Status	4	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:12:56.219929
520	142	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:15:01.828383
521	142	CompletedDate	2026-04-10T17:00:00.000Z	2026-04-11T09:15:00.715Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:15:02.971853
522	145	Status	1	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:38:09.65703
523	145	CompletedDate	2026-04-10T17:00:00.000Z	2026-04-11T09:38:08.778Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:38:11.193961
524	140	HandlerNotes	Hẹn 12/4	Đã xử lý xong	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:41:48.647763
525	140	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:41:57.850258
526	140	CompletedDate		2026-04-11T09:41:56.613Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:41:58.934291
529	157	Status	4	1	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 03:53:06.452019
530	196	HandlerNotes		Hẹn 13/4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 10:50:01.508103
531	157	Status	1	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-13 00:51:12.606497
532	157	CompletedDate		2026-04-13T00:51:16.110Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-13 00:51:17.104591
533	199	Status	1	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-13 00:57:59.587257
534	199	CompletedDate		2026-04-13T00:58:01.754Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-13 00:58:02.760178
535	200	Status	1	4	159c2606-abc5-4006-9633-6926396c181b	2026-04-13 01:12:36.297555
536	200	CompletedDate		2026-04-13T01:12:40.497Z	159c2606-abc5-4006-9633-6926396c181b	2026-04-13 01:12:41.506301
537	201	HandlerNotes		Đàm lỗi pin	159c2606-abc5-4006-9633-6926396c181b	2026-04-13 01:40:06.832681
538	201	Status	1	3	159c2606-abc5-4006-9633-6926396c181b	2026-04-13 01:40:12.959385
539	196	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-13 02:37:29.796438
540	196	HandlerNotes	Hẹn 13/4	Máy nghẹt đầu phun, clean đầu phun	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-13 02:43:57.841457
541	196	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-13 03:26:12.422724
542	196	CompletedDate		2026-04-13T03:26:15.323Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-13 03:26:16.342466
543	196	HandlerNotes	Máy nghẹt đầu phun, clean đầu phun	Máy nghẹt đầu phun, clean đầu phun. Đầu phun đã nghẹt nặng không xử lý được, sử dụng tạm với chất lượng tương đối.	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-13 03:26:17.021304
544	203	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 00:18:19.119776
545	203	HandlerNotes		Đã gửi in	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 00:18:31.848126
546	70	Status	3	4	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-14 00:54:57.75459
547	70	CompletedDate		2026-04-14T00:55:00.329Z	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-14 00:55:01.314402
548	70	HandlerNotes	Phòng có khách	Tiếp tục theo dõi	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-14 00:55:01.967689
549	204	Status	4	1	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-14 01:34:49.997535
550	204	Status	4	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 01:34:50.696085
551	205	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 01:35:25.891469
552	205	HandlerNotes		Dây điện mỏng cấn tróc vỏ, chuôi ghim gãy cong	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 02:48:49.469131
553	207	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 07:01:37.01046
554	207	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 07:42:40.692003
555	207	CompletedDate		2026-04-14T07:42:37.214Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 07:42:41.546285
556	207	HandlerNotes		Lỗi spooler, Upadate windows	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 07:42:41.638014
557	208	Status	1	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 08:48:35.552678
558	208	CompletedDate		2026-04-14T08:48:31.668Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 08:48:36.180674
559	209	Status	1	4	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-14 16:38:37.331742
560	209	Status	1	4	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-14 16:38:37.361351
561	209	CompletedDate		2026-04-14T16:38:38.567Z	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-14 16:38:38.223813
562	209	CompletedDate	2026-04-13T17:00:00.000Z	2026-04-14T16:38:38.704Z	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-14 16:38:38.375225
563	209	CompletedDate	2026-04-13T17:00:00.000Z	2026-04-14T16:38:39.045Z	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-14 16:38:38.734297
564	209	Status	4	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 16:50:41.803765
565	209	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 16:50:58.936751
566	209	CompletedDate	2026-04-13T17:00:00.000Z	2026-04-14T16:50:59.870Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 16:50:59.551023
567	141	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 01:35:13.140783
568	141	HandlerNotes		Tháo đèn xuống không làm ảnh hướng các đèn khác. Ánh sáng đủ dùng. Đã báo Phan Thảo kiểm tra sửa chữa.	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 01:36:54.632225
569	141	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 01:37:39.936484
570	141	CompletedDate		2026-04-15T01:37:44.147Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 01:37:45.137679
571	113	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 01:37:59.969171
572	113	CompletedDate		2026-04-15T01:38:02.020Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 01:38:02.974001
573	52	HandlerNotes	Đã gửi huy thanh lên mẫu thiết kế demo\nĐã gửi mẫu thiết kế A Tuấn xem, chờ phản hồi	Bản thiết kế chưa đạt, cần sửa lại	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 01:39:17.009759
574	17	Status	4	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 01:41:07.588986
575	17	HandlerNotes	Kiểm tra đường dây và camera, \nCamera đứt cáp và hư balun	Kiểm tra đường dây và camera, \nCamera đứt cáp và hư balun\nThay camera IP, hđbt	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 01:41:33.782083
590	211	HandlerNotes		Chạm dây tín hiệu dưới hầm	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-17 09:44:36.27859
591	211	Status	1	4	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-17 09:44:53.497927
592	211	CompletedDate		2026-04-17T09:44:57.679Z	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-17 09:44:58.675428
593	131	Status	1	4	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-17 09:45:51.688052
594	131	CompletedDate		2026-04-17T09:45:55.809Z	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-17 09:45:56.800027
595	131	HandlerNotes		Đứt dây tín hiệu trên tầng 2 nhà hàng tròn	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-17 09:45:57.46005
596	103	Status	1	4	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-17 09:46:03.406258
597	103	CompletedDate	2026-04-07T00:00:00.000Z	2026-04-17T09:46:06.839Z	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-17 09:46:07.828997
598	103	CompletedDate	2026-04-17T00:00:00.000Z	2026-04-17T09:46:11.692Z	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-17 09:46:12.739556
599	98	HandlerNotes	Đã yêu cầu pham thảo qua kiểm tra. > Qua tiệc 12/4 kiểm tra	Đã yêu cầu pham thảo qua kiểm tra. Phan Thảo hẹn 19/4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 10:26:58.039018
600	76	HandlerNotes	Đã yêu cầu pham thảo qua kiểm tra. > Qua tiệc 12/4 kiểm tra	Đã yêu cầu pham thảo qua kiểm tra. > Thảo hẹn 19/4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 10:27:07.215569
601	224	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 10:32:56.962257
602	224	HandlerNotes		Phan Thảo hẹn 19/4 kiểm tra	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 10:33:11.043939
603	229	HandlerNotes		Phòng có khách	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-18 03:32:20.25815
604	209	Status	4	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 00:10:18.68425
605	209	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 00:11:31.223506
606	223	HandlerNotes		Đã lên lịch ngày 21/4 xử lý (Khiêm, Hoàng, Trang, Đen)	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 01:38:45.164249
607	232	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 09:41:53.409873
608	232	HandlerNotes		Đã xử lý xong	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 09:42:23.667746
609	232	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 09:43:30.549515
610	232	CompletedDate		2026-04-19T09:43:35.992Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 09:43:36.945949
611	231	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 09:47:09.040239
612	231	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 09:47:54.116473
613	231	CompletedDate		2026-04-19T09:47:56.240Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 09:47:57.243206
614	209	Status	4	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 09:53:22.976124
615	209	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 09:53:31.930622
616	209	CompletedDate	2026-04-18T17:00:00.000Z	2026-04-19T09:53:30.349Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 09:53:32.546257
617	231	Status	4	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 10:08:17.382649
618	231	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 10:15:23.052571
619	231	CompletedDate	2026-04-18T17:00:00.000Z	2026-04-19T10:15:21.418Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 10:15:23.666562
620	232	Status	4	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 10:15:30.744246
621	232	HandlerNotes	Đã xử lý xong	Cam bị rèm kéo làm rớt, cần thay đổi vị trí	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 10:16:15.854958
622	98	Status	1	3	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 10:18:19.299877
623	98	HandlerNotes	Đã yêu cầu pham thảo qua kiểm tra. Phan Thảo hẹn 19/4	Phan thảo kiểm tra khắc phục tình trạng âm thanh Hoa sen. Đã thấy chất câm ổn định. Micro bị yếu sóng không sửa được.	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 10:19:35.602762
624	98	Status	3	4	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 10:20:14.50342
625	98	CompletedDate		2026-04-19T10:20:12.932Z	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 10:20:15.208426
626	224	HandlerNotes	Phan Thảo hẹn 19/4 kiểm tra	Phan Thảo đã kiểm tra sửa chữa, chờ sửa chữa. Không ảnh hưởng nhiều đến chất lượng ánh sáng sân khấu.	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 10:22:54.07064
627	238	Status	1	4	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-20 02:23:59.14706
628	238	CompletedDate		2026-04-20T02:24:03.165Z	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-20 02:24:04.188662
629	238	HandlerNotes		Lỏng dây LAN	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-20 02:24:04.871216
630	78	HandlerNotes	Đề Xuất thay ổ cứng	Đề Xuất thay ổ cứng. Hẹn 22/4 xử lý	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-20 02:50:11.793171
631	237	Status	1	4	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-20 03:05:10.095325
632	237	CompletedDate		2026-04-20T03:05:13.331Z	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-20 03:05:14.364299
633	236	Status	1	4	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-20 03:06:38.30482
634	236	CompletedDate		2026-04-20T03:06:40.818Z	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-20 03:06:41.793654
635	236	AfterImages	[]	["https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/1001018817_1776654355317-NuYLxGwo6zzoHOqQYXxaFEXO7MVnZq.jpg"]	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-20 03:06:42.443417
636	235	Status	1	4	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-20 03:06:51.63963
637	235	CompletedDate		2026-04-20T03:06:54.168Z	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-20 03:06:55.16033
\.


--
-- Data for Name: Department; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Department" ("ID", "Name") FROM stdin;
1	Kỹ thuật
2	Phục vụ
3	Kế toán
4	Hành chánh
5	Kinh doanh
12	IT
13	Bảo vệ
14	Buồng Phòng
15	Bếp
16	Cây Xanh
17	Lễ Tân
19	Ban Giám Đốc
20	Tạp vụ
\.


--
-- Data for Name: Device; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Device" ("ID", "Name", "Serial", "Description", "Img", "WarrantyDate", "UseDate", "EndDate", "DepartmentID", "DeviceCategoryID", "Status", "LocationID") FROM stdin;
9	Switch 24 port tầng 2 khu B		<p>Switch chia mạng tầng 2</p><p>Đặt trên trần nhà</p>		2020-01-01	2020-01-01	\N	12	12	1	\N
10	Màn hình led Hoa sen trong		<p><br></p>		2000-01-01	2000-01-01	\N	1	4	1	\N
11	Màn hình led Hoa sen ngoài		<p><br></p>		2000-01-01	2000-01-01	\N	1	4	1	\N
15	Unifi AP AC LR (Bar)	d8:b3:70:bc:9d:57	<p>Thiết bị wifi Unifi</p><p>NCC: siêu thị viễn thông (Á Châu SG)</p><p>Bảo hành 12 tháng.</p><p>Lắp đặt ở quầy bar</p>		2025-10-25	2024-10-25	\N	12	13	1	\N
16	Két sắt P302		<p>Két sắt mini</p>		2000-01-01	2000-01-01	\N	12	14	1	\N
18	Tivi P202	RV1666394	<p>Tivi panasionic 32 inch</p>		2000-01-01	2000-01-01	\N	12	6	1	\N
19	Điện thoại P222		<p>Điện thoại pana màu trắng</p>		2024-11-25	2025-11-25	\N	12	7	1	\N
20	Điện thoại Bảo vệ		<p>Điện thoại pana</p>		2022-01-01	2022-01-01	\N	1	7	1	\N
21	Tivi Lễ Tân KS	0JBL3NEW700139P	Smart Tivi Samsung 65inch.		2025-10-03	2024-09-01	\N	12	6	1	\N
22	Máy in Canon 2900 (Lễ tân)		<p>Máy in Canon 2900 (Lễ tân)</p>		2000-01-01	2000-01-01	\N	12	10	1	\N
27	Tivi  P208	RV1664959	<p>Tivi panasonic 32inch.</p>		\N	\N	\N	12	6	1	\N
28	Khóa từ P102		<p><br></p>		\N	\N	\N	12	16	1	\N
29	Điện Thoại P314		<p><br></p>		2024-01-01	2025-01-01	\N	12	7	1	\N
30	Điện Thoại P218		<p><br></p>		2024-01-01	2025-01-01	\N	12	7	1	\N
31	Tivi P101		<p>Pana cũ</p>		\N	\N	\N	12	6	1	\N
32	Tivi P103		<p>Pana cũ</p>		\N	\N	\N	12	6	1	\N
33	Tivi P116		<p>Pana cũ</p>		\N	\N	\N	12	6	1	\N
34	Tivi P411		<p>Pana cũ</p>		\N	\N	\N	12	6	1	\N
35	Tivi P415		<p>Pana cũ</p>		\N	\N	\N	12	6	1	\N
36	Tivi P409		<p>Pana cũ</p>		\N	\N	\N	12	6	1	\N
37	Tivi P412		<p>Pana cũ</p>		\N	\N	\N	12	6	1	\N
38	Tivi P219		<p>LG cũ</p>		\N	\N	\N	12	6	1	\N
39	Tivi P220		<p>LG cũ</p>		\N	\N	\N	12	6	1	\N
43	Bộ đàm Anh Tuấn(1)		<p>1 đàm + 1 sạc</p>		\N	\N	\N	12	17	1	\N
48	Đầu ghi camera Nhà Hàng		<p>Đầu ghi 32 kênh đặt phòng server</p>		\N	\N	\N	12	2	1	\N
54	Khóa Adel P101		<p><br></p>		\N	\N	\N	12	16	1	\N
55	Khóa Adel P102		<p><br></p>		\N	\N	\N	12	16	1	\N
56	Khóa Adel P103		<p><br></p>		\N	\N	\N	12	16	1	\N
57	Khóa Adel P104		<p><br></p>		\N	\N	\N	12	16	1	\N
58	Khóa Adel P105		<p><br></p>		\N	\N	\N	12	16	1	\N
59	Khóa Adel P106		<p><br></p>		\N	\N	\N	12	16	1	\N
60	Khóa Adel P107		<p><br></p>		\N	\N	\N	12	16	1	\N
61	Khóa Adel P108		<p><br></p>		\N	\N	\N	12	16	1	\N
62	Khóa Adel P110		<p><br></p>		\N	\N	\N	12	16	1	\N
63	Khóa Adel P112		<p><br></p>		\N	\N	\N	12	16	1	\N
64	Khóa Adel P114		<p><br></p>		\N	\N	\N	12	16	1	\N
65	Khóa Adel P116		<p><br></p>		\N	\N	\N	12	16	1	\N
66	Khóa Adel P201		<p><br></p>		\N	\N	\N	12	16	1	\N
67	Khóa Adel P202		<p><br></p>		\N	\N	\N	12	16	1	\N
68	Khóa Adel P203		<p><br></p>		\N	\N	\N	12	16	1	\N
69	Khóa Adel P204		<p><br></p>		\N	\N	\N	12	16	1	\N
70	Khóa Adel P205		<p><br></p>		\N	\N	\N	12	16	1	\N
71	Khóa Adel P206		<p><br></p>		\N	\N	\N	12	16	1	\N
72	Khóa Adel P207		<p><br></p>		\N	\N	\N	12	16	1	\N
73	Khóa Adel P208		<p><br></p>		\N	\N	\N	12	16	1	\N
74	Khóa Adel P209		<p><br></p>		\N	\N	\N	12	16	1	\N
75	Khóa Adel P210		<p><br></p>		\N	\N	\N	12	16	1	\N
76	Khóa Adel P211		<p><br></p>		\N	\N	\N	12	16	1	\N
77	Khóa Adel P212		<p><br></p>		\N	\N	\N	12	16	1	\N
78	Khóa Adel P214		<p><br></p>		\N	\N	\N	12	16	1	\N
79	Khóa Adel P216		<p><br></p>		\N	\N	\N	12	16	1	\N
80	Khóa Adel P218		<p><br></p>		\N	\N	\N	12	16	1	\N
81	Khóa Adel P219		<p><br></p>		\N	\N	\N	12	16	1	\N
82	Khóa Adel P220		<p><br></p>		\N	\N	\N	12	16	1	\N
83	Khóa Adel P221		<p><br></p>		\N	\N	\N	12	16	1	\N
84	Khóa Adel P222		<p><br></p>		\N	\N	\N	12	16	1	\N
86	Khóa Adel P224		<p><br></p>		\N	\N	\N	12	16	1	\N
87	Khóa Adel P222		<p><br></p>		\N	\N	\N	12	16	1	\N
88	Khóa Adel P226		<p><br></p>		\N	\N	\N	12	16	1	\N
89	Khóa Adel P226		<p><br></p>		\N	\N	\N	12	16	1	\N
90	Khóa Adel P230		<p><br></p>		\N	\N	\N	12	16	1	\N
91	Khóa Adel P301		<p><br></p>		\N	\N	\N	12	16	1	\N
92	Khóa Adel P302		<p><br></p>		\N	\N	\N	12	16	1	\N
49	Bảng đèn Thực đơn Ẩm thực	\N	<p>Bảng đèn thực đơn in UV cổng 3</p><p>Bảo hành đèn 18 tháng</p><p>Bảo hành màu UV 36 tháng</p>	\N	2026-11-20	2025-05-20	\N	12	11	1	29
8	Bảng QC tiệc 1m1 x 5m	\N	<p>Biển Qc tiệc đường cô bắc, trước PKD</p>	/uploads/4_1762232764486.png	2000-01-01	2000-01-01	\N	1	11	1	28
40	Bộ đàm Lễ tân (1)	\N	<p>1 đàm+ 1 sạc loại cũ</p>	\N	\N	\N	\N	12	17	1	2
45	Bộ đàm Bếp (0)	\N	<p>2 đàm + 2 sạc mới 19/5/25</p><p>Đã chuyển cho phục vụ 12/11/2025</p><p>Hiện tại không giữ bộ đàm.</p>	\N	\N	\N	\N	15	17	1	\N
14	Bảng QC tour 1m1 x 5m26	\N	<p>Bảng quảng cáo tour 1m1x5m26 đường cô bắc</p>	\N	2000-01-01	2000-01-01	\N	1	11	1	28
26	Tivi  P204	RV1665825	<p>Tivi panasonic 32inch.</p>		\N	\N	\N	12	6	1	\N
25	Bộ chuyển đổi điện thoại cáp quang	\N	<p>Bộ chuyển cáp điện thoại từ cáp đồng sang cáp quang.</p><p>Của VNPT hỗ trợ miễn phí.</p>	\N	\N	\N	\N	12	15	1	30
42	Bộ đàm Buồng Phòng (5)	\N	<p>5 đàm + 5 sạc</p><p>(4 cũ + 1 mới cấp 19/5/25)</p>	\N	\N	\N	\N	12	17	2	31
46	Bộ đàm Quầy bar - Thu ngân (1)	\N	<p>1 đàm + 1 sạc mới 19/5/25</p>	\N	\N	\N	\N	12	17	1	33
41	Bộ đàm bảo vệ (3)	\N	<p>3 đàm + 3 sạc</p>	\N	\N	\N	\N	12	17	1	32
17	CAM 10-NV2 (Bx KS)	\N	<p><br></p>	\N	2024-10-20	2025-10-31	\N	12	1	1	34
12	Bảng chữ HBRGRS tầng 6	\N	<p>Bảng chữ HOA BINH RACH GIA RESORT</p>	\N	2000-01-01	2000-01-01	\N	1	5	1	4
93	Khóa Adel P303		<p><br></p>		\N	\N	\N	12	16	1	\N
94	Khóa Adel P304		<p><br></p>		\N	\N	\N	12	16	1	\N
95	Khóa Adel P305		<p><br></p>		\N	\N	\N	12	16	1	\N
96	Khóa Adel P306		<p><br></p>		\N	\N	\N	12	16	1	\N
97	Khóa Adel P307		<p><br></p>		\N	\N	\N	12	16	1	\N
98	Khóa Adel P308		<p><br></p>		\N	\N	\N	12	16	1	\N
99	Khóa Adel P309		<p><br></p>		\N	\N	\N	12	16	1	\N
100	Khóa Adel P310		<p><br></p>		\N	\N	\N	12	16	1	\N
102	Khóa Adel P312		<p><br></p>		\N	\N	\N	12	16	1	\N
103	Khóa Adel P314		<p><br></p>		\N	\N	\N	12	16	1	\N
104	Khóa Adel P315		<p><br></p>		\N	\N	\N	12	16	1	\N
105	Khóa Adel P316		<p><br></p>		\N	\N	\N	12	16	1	\N
106	Khóa Adel P317		<p><br></p>		\N	\N	\N	12	16	1	\N
107	Khóa Adel P401		<p><br></p>		\N	\N	\N	12	16	1	\N
108	Khóa Adel P402		<p><br></p>		\N	\N	\N	12	16	1	\N
109	Khóa Adel P403		<p><br></p>		\N	\N	\N	12	16	1	\N
110	Khóa Adel P404		<p><br></p>		\N	\N	\N	12	16	1	\N
111	Khóa Adel P405		<p><br></p>		\N	\N	\N	12	16	1	\N
112	Khóa Adel P406		<p><br></p>		\N	\N	\N	12	16	1	\N
113	Khóa Adel P407		<p><br></p>		\N	\N	\N	12	16	1	\N
114	Khóa Adel P408		<p><br></p>		\N	\N	\N	12	16	1	\N
115	Khóa Adel P409		<p><br></p>		\N	\N	\N	12	16	1	\N
116	Khóa Adel P410		<p><br></p>		\N	\N	\N	12	16	1	\N
117	Khóa Adel P411		<p><br></p>		\N	\N	\N	12	16	1	\N
118	Khóa Adel P412		<p><br></p>		\N	\N	\N	12	16	1	\N
119	Khóa Adel P414		<p><br></p>		\N	\N	\N	12	16	1	\N
120	Khóa Adel P415		<p><br></p>		\N	\N	\N	12	16	1	\N
121	Khóa Adel P416		<p><br></p>		\N	\N	\N	12	16	1	\N
123	Khóa Adel P501		<p><br></p>		\N	\N	\N	12	16	1	\N
124	Khóa Adel P502		<p><br></p>		\N	\N	\N	12	16	1	\N
125	Khóa Adel P503		<p><br></p>		\N	\N	\N	12	16	1	\N
126	Khóa Adel P504		<p><br></p>		\N	\N	\N	12	16	1	\N
127	Khóa Adel P505		<p><br></p>		\N	\N	\N	12	16	1	\N
128	Khóa Adel P506		<p><br></p>		\N	\N	\N	12	16	1	\N
129	Khóa Adel P507		<p><br></p>		\N	\N	\N	12	16	1	\N
130	Khóa Adel P508		<p><br></p>		\N	\N	\N	12	16	1	\N
131	Khóa Adel P509		<p><br></p>		\N	\N	\N	12	16	1	\N
132	Khóa Adel P510		<p><br></p>		\N	\N	\N	12	16	1	\N
133	Khóa Adel P511		<p><br></p>		\N	\N	\N	12	16	1	\N
134	Khóa Adel P512		<p><br></p>		\N	\N	\N	12	16	1	\N
135	Khóa Adel P514		<p><br></p>		\N	\N	\N	12	16	1	\N
136	Khóa Adel P515		<p><br></p>		\N	\N	\N	12	16	1	\N
137	Khóa Adel P516		<p><br></p>		\N	\N	\N	12	16	1	\N
138	Khóa Adel P518		<p><br></p>		\N	\N	\N	12	16	1	\N
141	Tivi P101		<p><br></p>		\N	\N	\N	12	6	1	\N
142	Tivi P102		<p><br></p>		\N	\N	\N	12	6	1	\N
143	Tivi P103		<p><br></p>		\N	\N	\N	12	6	1	\N
144	Tivi P104		<p><br></p>		\N	\N	\N	12	6	1	\N
145	Tivi P105		<p><br></p>		\N	\N	\N	12	6	1	\N
146	Tivi P106		<p><br></p>		\N	\N	\N	12	6	1	\N
148	Tivi P108		<p><br></p>		\N	\N	\N	12	6	1	\N
149	Tivi P110		<p><br></p>		\N	\N	\N	12	6	1	\N
150	Tivi P112		<p><br></p>		\N	\N	\N	12	6	1	\N
151	Tivi P114		<p><br></p>		\N	\N	\N	12	6	1	\N
152	Tivi P116		<p><br></p>		\N	\N	\N	12	6	1	\N
153	Tivi P201		<p><br></p>		\N	\N	\N	12	6	1	\N
154	Tivi P202		<p><br></p>		\N	\N	\N	12	6	1	\N
155	Tivi P203		<p><br></p>		\N	\N	\N	12	6	1	\N
156	Tivi P204		<p><br></p>		\N	\N	\N	12	6	1	\N
157	Tivi P205		<p><br></p>		\N	\N	\N	12	6	1	\N
158	Tivi P206		<p><br></p>		\N	\N	\N	12	6	1	\N
159	Tivi P207		<p><br></p>		\N	\N	\N	12	6	1	\N
160	Tivi P208		<p><br></p>		\N	\N	\N	12	6	1	\N
161	Tivi P209		<p><br></p>		\N	\N	\N	12	6	1	\N
162	Tivi P210		<p><br></p>		\N	\N	\N	12	6	1	\N
163	Tivi P211		<p><br></p>		\N	\N	\N	12	6	1	\N
164	Tivi P212		<p><br></p>		\N	\N	\N	12	6	1	\N
165	Tivi P214		<p><br></p>		\N	\N	\N	12	6	1	\N
167	Tivi P218		<p><br></p>		\N	\N	\N	12	6	1	\N
168	Tivi P219		<p><br></p>		\N	\N	\N	12	6	1	\N
169	Tivi P220		<p><br></p>		\N	\N	\N	12	6	1	\N
170	Tivi P221		<p><br></p>		\N	\N	\N	12	6	1	\N
171	Tivi P222		<p><br></p>		\N	\N	\N	12	6	1	\N
172	Tivi P223		<p><br></p>		\N	\N	\N	12	6	1	\N
173	Tivi P224		<p><br></p>		\N	\N	\N	12	6	1	\N
174	Tivi P225		<p><br></p>		\N	\N	\N	12	6	1	\N
175	Tivi P226		<p><br></p>		\N	\N	\N	12	6	1	\N
176	Tivi P228		<p><br></p>		\N	\N	\N	12	6	1	\N
177	Tivi P230		<p><br></p>		\N	\N	\N	12	6	1	\N
178	Tivi P301		<p><br></p>		\N	\N	\N	12	6	1	\N
179	Tivi P302		<p><br></p>		\N	\N	\N	12	6	1	\N
180	Tivi P303		<p><br></p>		\N	\N	\N	12	6	1	\N
181	Tivi P304		<p><br></p>		\N	\N	\N	12	6	1	\N
182	Tivi P305		<p><br></p>		\N	\N	\N	12	6	1	\N
183	Tivi P306		<p><br></p>		\N	\N	\N	12	6	1	\N
184	Tivi P307		<p><br></p>		\N	\N	\N	12	6	1	\N
186	Tivi P309		<p><br></p>		\N	\N	\N	12	6	1	\N
187	Tivi P310		<p><br></p>		\N	\N	\N	12	6	1	\N
189	Tivi P312		<p><br></p>		\N	\N	\N	12	6	1	\N
190	Tivi P314		<p><br></p>		\N	\N	\N	12	6	1	\N
191	Tivi P315		<p><br></p>		\N	\N	\N	12	6	1	\N
192	Tivi P316		<p><br></p>		\N	\N	\N	12	6	1	\N
193	Tivi P317		<p><br></p>		\N	\N	\N	12	6	1	\N
194	Tivi P401		<p><br></p>		\N	\N	\N	12	6	1	\N
195	Tivi P402		<p><br></p>		\N	\N	\N	12	6	1	\N
196	Tivi P403		<p><br></p>		\N	\N	\N	12	6	1	\N
197	Tivi P404		<p><br></p>		\N	\N	\N	12	6	1	\N
198	Tivi P405		<p><br></p>		\N	\N	\N	12	6	1	\N
199	Tivi P406		<p><br></p>		\N	\N	\N	12	6	1	\N
200	Tivi P407		<p><br></p>		\N	\N	\N	12	6	1	\N
201	Tivi P408		<p><br></p>		\N	\N	\N	12	6	1	\N
202	Tivi P409		<p><br></p>		\N	\N	\N	12	6	1	\N
203	Tivi P410		<p><br></p>		\N	\N	\N	12	6	1	\N
204	Tivi P411		<p><br></p>		\N	\N	\N	12	6	1	\N
205	Tivi P412		<p><br></p>		\N	\N	\N	12	6	1	\N
206	Tivi P414		<p><br></p>		\N	\N	\N	12	6	1	\N
208	Tivi P416		<p><br></p>		\N	\N	\N	12	6	1	\N
209	Tivi P417		<p><br></p>		\N	\N	\N	12	6	1	\N
210	Tivi P501		<p><br></p>		\N	\N	\N	12	6	1	\N
211	Tivi P502		<p><br></p>		\N	\N	\N	12	6	1	\N
213	Tivi P504		<p><br></p>		\N	\N	\N	12	6	1	\N
214	Tivi P505		<p><br></p>		\N	\N	\N	12	6	1	\N
215	Tivi P506		<p><br></p>		\N	\N	\N	12	6	1	\N
216	Tivi P507		<p><br></p>		\N	\N	\N	12	6	1	\N
217	Tivi P508		<p><br></p>		\N	\N	\N	12	6	1	\N
218	Tivi P509		<p><br></p>		\N	\N	\N	12	6	1	\N
219	Tivi P510		<p><br></p>		\N	\N	\N	12	6	1	\N
220	Tivi P511		<p><br></p>		\N	\N	\N	12	6	1	\N
221	Tivi P512		<p><br></p>		\N	\N	\N	12	6	1	\N
222	Tivi P514		<p><br></p>		\N	\N	\N	12	6	1	\N
223	Tivi P515		<p><br></p>		\N	\N	\N	12	6	1	\N
224	Tivi P516		<p><br></p>		\N	\N	\N	12	6	1	\N
225	Tivi P518		<p><br></p>		\N	\N	\N	12	6	1	\N
228	Điện thoại P103		<p><br></p>		\N	\N	\N	12	7	1	\N
229	Điện thoại P104		<p><br></p>		\N	\N	\N	12	7	1	\N
230	Điện thoại P105		<p><br></p>		\N	\N	\N	12	7	1	\N
231	Điện thoại P106		<p><br></p>		\N	\N	\N	12	7	1	\N
232	Điện thoại P107		<p><br></p>		\N	\N	\N	12	7	1	\N
233	Điện thoại P108		<p><br></p>		\N	\N	\N	12	7	1	\N
234	Điện thoại P110		<p><br></p>		\N	\N	\N	12	7	1	\N
235	Điện thoại P112		<p><br></p>		\N	\N	\N	12	7	1	\N
236	Điện thoại P114		<p><br></p>		\N	\N	\N	12	7	1	\N
237	Điện thoại P116		<p><br></p>		\N	\N	\N	12	7	1	\N
238	Điện thoại P201		<p><br></p>		\N	\N	\N	12	7	1	\N
239	Điện thoại P202		<p><br></p>		\N	\N	\N	12	7	1	\N
240	Điện thoại P203		<p><br></p>		\N	\N	\N	12	7	1	\N
241	Điện thoại P204		<p><br></p>		\N	\N	\N	12	7	1	\N
242	Điện thoại P205		<p><br></p>		\N	\N	\N	12	7	1	\N
243	Điện thoại P206		<p><br></p>		\N	\N	\N	12	7	1	\N
244	Điện thoại P207		<p><br></p>		\N	\N	\N	12	7	1	\N
245	Điện thoại P208		<p><br></p>		\N	\N	\N	12	7	1	\N
247	Điện thoại P210		<p><br></p>		\N	\N	\N	12	7	1	\N
248	Điện thoại P211		<p><br></p>		\N	\N	\N	12	7	1	\N
249	Điện thoại P212		<p><br></p>		\N	\N	\N	12	7	1	\N
250	Điện thoại P214		<p><br></p>		\N	\N	\N	12	7	1	\N
251	Điện thoại P216		<p><br></p>		\N	\N	\N	12	7	1	\N
252	Điện thoại P218		<p><br></p>		\N	\N	\N	12	7	1	\N
253	Điện thoại P219		<p><br></p>		\N	\N	\N	12	7	1	\N
254	Điện thoại P220		<p><br></p>		\N	\N	\N	12	7	1	\N
255	Điện thoại P221		<p><br></p>		\N	\N	\N	12	7	1	\N
256	Điện thoại P222		<p><br></p>		\N	\N	\N	12	7	1	\N
257	Điện thoại P223		<p><br></p>		\N	\N	\N	12	7	1	\N
258	Điện thoại P224		<p><br></p>		\N	\N	\N	12	7	1	\N
259	Điện thoại P225		<p><br></p>		\N	\N	\N	12	7	1	\N
260	Điện thoại P226		<p><br></p>		\N	\N	\N	12	7	1	\N
261	Điện thoại P228		<p><br></p>		\N	\N	\N	12	7	1	\N
262	Điện thoại P230		<p><br></p>		\N	\N	\N	12	7	1	\N
264	Điện thoại P302		<p><br></p>		\N	\N	\N	12	7	1	\N
265	Điện thoại P303		<p><br></p>		\N	\N	\N	12	7	1	\N
266	Điện thoại P304		<p><br></p>		\N	\N	\N	12	7	1	\N
268	Điện thoại P306		<p><br></p>		\N	\N	\N	12	7	1	\N
269	Điện thoại P307		<p><br></p>		\N	\N	\N	12	7	1	\N
270	Điện thoại P308		<p><br></p>		\N	\N	\N	12	7	1	\N
271	Điện thoại P309		<p><br></p>		\N	\N	\N	12	7	1	\N
272	Điện thoại P310		<p><br></p>		\N	\N	\N	12	7	1	\N
273	Điện thoại P311		<p><br></p>		\N	\N	\N	12	7	1	\N
274	Điện thoại P312		<p><br></p>		\N	\N	\N	12	7	1	\N
275	Điện thoại P314		<p><br></p>		\N	\N	\N	12	7	1	\N
276	Điện thoại P315		<p><br></p>		\N	\N	\N	12	7	1	\N
277	Điện thoại P316		<p><br></p>		\N	\N	\N	12	7	1	\N
278	Điện thoại P317		<p><br></p>		\N	\N	\N	12	7	1	\N
280	Điện thoại P402		<p><br></p>		\N	\N	\N	12	7	1	\N
281	Điện thoại P403		<p><br></p>		\N	\N	\N	12	7	1	\N
282	Điện thoại P404		<p><br></p>		\N	\N	\N	12	7	1	\N
283	Điện thoại P405		<p><br></p>		\N	\N	\N	12	7	1	\N
284	Điện thoại P406		<p><br></p>		\N	\N	\N	12	7	1	\N
285	Điện thoại P407		<p><br></p>		\N	\N	\N	12	7	1	\N
286	Điện thoại P408		<p><br></p>		\N	\N	\N	12	7	1	\N
287	Điện thoại P409		<p><br></p>		\N	\N	\N	12	7	1	\N
263	Điện thoại P301		<p><br></p>		\N	\N	\N	12	7	1	\N
24	Unifi Snife ngoài trời		<p>MAC:&nbsp;9c:05:d6:76:3c:7e</p><p>Thiết bị wifi Unifi ngoài trời</p><p>NCC: siêu thị viễn thông (Á Châu SG)</p><p>Bảo hành 12 tháng.</p><p>Lắp đặt ở quầy bar</p>		2025-10-25	2024-10-25	\N	12	13	1	\N
85	Khóa Adel P223		<p><br></p>		\N	\N	\N	12	16	1	\N
101	Khóa Adel P311		<p><br></p>		\N	\N	\N	12	16	1	\N
122	Khóa Adel P417		<p><br></p>		\N	\N	\N	12	16	1	\N
147	Tivi P107		<p><br></p>		\N	\N	\N	12	6	1	\N
166	Tivi P216		<p><br></p>		\N	\N	\N	12	6	1	\N
185	Tivi P308		<p><br></p>		\N	\N	\N	12	6	1	\N
188	Tivi P311		<p><br></p>		\N	\N	\N	12	6	1	\N
207	Tivi P415		<p><br></p>		\N	\N	\N	12	6	1	\N
227	Điện thoại P102		<p><br></p>		\N	\N	\N	12	7	1	\N
246	Điện thoại P209		<p><br></p>		\N	\N	\N	12	7	1	\N
267	Điện thoại P305		<p><br></p>		\N	\N	\N	12	7	1	\N
289	Điện thoại P411		<p><br></p>		\N	\N	\N	12	7	1	\N
290	Điện thoại P412		<p><br></p>		\N	\N	\N	12	7	1	\N
291	Điện thoại P414		<p><br></p>		\N	\N	\N	12	7	1	\N
279	Điện thoại P401		<p><br></p>		\N	\N	\N	12	7	5	\N
288	Điện thoại P410		<p><br></p>		\N	\N	\N	12	7	1	\N
292	Điện thoại P415		<p><br></p>		\N	\N	\N	12	7	1	\N
293	Điện thoại P416		<p><br></p>		\N	\N	\N	12	7	1	\N
294	Điện thoại P417		<p><br></p>		\N	\N	\N	12	7	1	\N
295	Điện thoại P501		<p><br></p>		\N	\N	\N	12	7	1	\N
296	Điện thoại P502		<p><br></p>		\N	\N	\N	12	7	1	\N
297	Điện thoại P503		<p><br></p>		\N	\N	\N	12	7	1	\N
298	Điện thoại P504		<p><br></p>		\N	\N	\N	12	7	1	\N
299	Điện thoại P505		<p><br></p>		\N	\N	\N	12	7	1	\N
300	Điện thoại P506		<p><br></p>		\N	\N	\N	12	7	1	\N
301	Điện thoại P507		<p><br></p>		\N	\N	\N	12	7	1	\N
302	Điện thoại P508		<p><br></p>		\N	\N	\N	12	7	1	\N
303	Điện thoại P509		<p><br></p>		\N	\N	\N	12	7	1	\N
304	Điện thoại P510		<p><br></p>		\N	\N	\N	12	7	1	\N
305	Điện thoại P511		<p><br></p>		\N	\N	\N	12	7	1	\N
306	Điện thoại P512		<p><br></p>		\N	\N	\N	12	7	1	\N
307	Điện thoại P514		<p><br></p>		\N	\N	\N	12	7	1	\N
308	Điện thoại P515		<p><br></p>		\N	\N	\N	12	7	1	\N
309	Điện thoại P516		<p><br></p>		\N	\N	\N	12	7	1	\N
310	Điện thoại P518		<p><br></p>		\N	\N	\N	12	7	1	\N
311	Điện thoại P112		<p><br></p>		\N	\N	\N	12	7	1	\N
347	Crossover 260 HS Trong		<p><br></p>		2025-10-31	2025-10-31	\N	12	18	1	\N
348	Mixer âm thanh Dynacord CMS1000		<p>Hoa sen ngoài</p>		2025-10-31	2025-10-31	\N	12	18	1	\N
349	Đầu processer LED HS Trước		<p>Hoa sen trước</p>		2025-10-31	2025-10-31	\N	12	18	1	\N
350	Main MA-3850  HS trước (x2 cái)		<p>Hoa sen trước&nbsp;</p><p>Main đời cũ</p>		2025-10-31	2025-10-31	\N	12	18	1	\N
351	Main CMC-3000 HS trước (x1 cái)		<p>Hoa sen trước&nbsp;</p><p>Main đời cũ</p>		2025-10-31	2025-10-31	\N	12	18	1	\N
353	Đầu ghi camera NGOẠI VI 1	\N	<p>Đầu ghi 16 kênh</p>	\N	\N	\N	\N	12	2	1	\N
354	Tổng đài Panasonic TDA 100D	\N	<p>Tổng đài điện thoại Analog</p>	\N	2008-01-01	2008-01-01	\N	12	19	1	\N
357	Tablet Samsung A11 Wifi	R8YY9001N3N	<p>Máy mới mua Điện Máy Chợ Lớn ngày 24/11/2025</p>	\N	2026-11-24	2025-11-24	\N	2	8	1	\N
366	Bộ máy vi tính Thủy  - PHC	\N	<p>Máy cũ của Tiên</p>	\N	\N	\N	\N	4	3	1	\N
374	Laptop MSI	\N	\N	\N	\N	\N	\N	12	3	1	\N
386	Máy lạnh Hoa đăng sảnh đón	\N	<p>Máy lạnh dùng cục nóng riêng.</p>	\N	\N	\N	\N	1	21	1	8
355	Máy lạnh Toshiba RAS-H81C3KCVG-V	12200419	<p><br></p>	\N	2007-01-01	2007-01-01	\N	5	21	1	\N
381	Bộ máy vi tính Cô Việt Nữ	\N	<p>Máy HP cũ, thay SSD tháng 3/2026</p>	\N	\N	\N	\N	19	3	1	20
375	Bộ máy vi tính buồng phòng	\N	<p>Máy yếu</p>	\N	\N	\N	\N	14	3	1	\N
378	Bộ máy vi tính business 1	\N	<p>Yếu</p>	\N	\N	\N	\N	17	3	1	\N
379	Bộ máy vi tính business 2	\N	<p>Yếu</p>	\N	\N	\N	\N	17	3	1	\N
380	Bộ máy vi tính Thu Ngân - PKT	\N	\N	\N	\N	\N	\N	3	3	1	\N
2	Mixer âm thanh yamaha 	\N	<p>Mixer 12 line hoa hồng</p>	/uploads/1000005342_1762358866107.jpg	\N	\N	\N	12	18	1	\N
345	Mixer đèn DMX512 HS trước	\N	<p>Hư không lên nguồn</p>	\N	2025-10-31	2025-10-31	\N	12	18	1	\N
370	Bộ máy vi tính mượn HBS (KD2)	\N	<p>Mượn máy bộ máy HBS bao gồm màn hình.</p><p>Thay ổ cứng + nguồn cho Quân dùng.</p>	\N	\N	\N	\N	5	3	1	\N
385	Máy lạnh Hoa đăng trong	\N	<p>Máy điều hòa trung tâm DAIKIN</p>	\N	\N	\N	\N	1	21	1	8
358	Bản đèn cổng phụ cặp cầu 3/2	\N	<p>Bảng đèn nhỏ cổng phụ đường cô bắc</p><p>Huy Thanh</p>	\N	\N	\N	\N	1	5	1	27
7	Bảng QC tiệc 1m7 x 4m	\N	<p>Biển Qc tiệc đường cô bắc, trước nhà bv cổng 1</p>	/uploads/hon-son.png	2000-01-01	2000-01-01	\N	1	11	1	28
384	Máy lạnh Toshiba - Hoa Mai	\N	<p>Máy lạnh Toshia đời cũ</p>	\N	\N	\N	\N	1	21	1	\N
6	Màn hình led Hoa đăng	\N	<p>Màn Led P5</p><p>Kích thước 528x240cm</p><p>Đã thay dàn nguồn 23/10/2024</p>	\N	2012-01-01	2010-01-01	\N	1	4	1	\N
383	Tivi di động SS-55inch	10ZD3NFL101133H	<p>Tivi di động kèm chân di động</p><p>Tivi samsung 55inch</p>	/1000007423_1775114646955-9EeOBiIjr5eROpcbD8wZeF9vCi0uKu.jpg	2028-04-02	2026-04-02	\N	12	6	1	\N
356	Bộ máy vi tính Thúy - PKT	\N	<p>Máy cũ chị Trang</p>	\N	2020-01-01	2020-01-01	\N	3	3	1	\N
340	Điện thoại PKD (3917989)		<p>Điện thoại bàn trực tiếp của PKD</p>		\N	\N	\N	12	7	5	\N
346	Crossover 260 HS trước		<p><br></p>		2025-10-31	2025-10-31	\N	12	18	1	\N
368	Bộ máy vi tính Kiên - PKT	\N	<p>Máy cũ, yếu</p>	\N	\N	\N	\N	3	3	1	24
4	CAM 16-NV3 (Cong 1->2)	\N	\N	\N	\N	\N	\N	12	1	1	28
359	Bảng đèn logo cổng 1	\N	<p>Bảng đèn logo tròn</p>	\N	\N	\N	\N	1	5	1	28
364	Bộ máy tính Huế - PKT	\N	<p>Máy cũ HP chị trang. Cũ hơn máy Thúy</p>	\N	\N	\N	\N	3	3	1	19
362	Bộ máy vi tính Hiền - PKT	\N	<p>Máy cũ từ máy tú.</p>	\N	\N	\N	\N	3	3	1	19
371	Bộ máy vi tính Hoa Cau	\N	<p>Màn hư, dùng màn server tạm.</p>	\N	\N	\N	\N	12	3	1	7
373	Bộ máy vi tính Hoa Sen	\N	\N	\N	\N	\N	\N	12	3	1	9
372	Bộ máy vi tính Hoa Đăng	\N	\N	\N	\N	\N	\N	12	3	1	8
363	Bộ máy vi tính Hân - PKT	\N	<p>Kế toán doanh thu</p>	\N	\N	\N	\N	3	3	1	19
369	Bộ máy vi tính Hạnh - PKD	\N	<p><br></p>	\N	\N	\N	\N	5	3	2	6
376	Bộ máy vi tính Lễ tân 2	\N	<p>Máy HP đời cũ</p>	\N	\N	\N	\N	17	3	1	2
377	Bộ máy vi tính Lễ tân 2	\N	<p><br></p>	\N	\N	\N	\N	17	3	1	2
367	Bộ máy vi tính Nhi - PKT	\N	<p>Mua hàng</p>	\N	\N	\N	\N	3	3	1	24
44	Bộ đàm Khiêm giữ (2)	\N	<p>+ 2 đàm hư + 1 sạc hư (của buồng phòng loại cũ) -&gt; thanh lý.</p><p>Hiện tại giữ <strong>2 đàm + 2 sạc bình thường</strong></p>	\N	\N	\N	\N	12	17	1	25
361	Bục nâng Hoa cau	\N	\N	\N	\N	2007-10-01	\N	1	22	1	7
360	CAM 25-NV3 (Hoa Lan)	\N	\N	\N	\N	\N	\N	12	1	1	29
5	CAM 8-NV2 (KS -> Hoa sen)	\N	\N	\N	\N	\N	\N	12	1	1	34
3	Máy Photo xerox S2520	cv5cvv55	\N	\N	2022-01-01	2023-01-01	\N	5	10	1	6
23	Bộ máy vi tính Tú - PKT	\N	<p><br></p>	\N	2000-01-01	2000-01-01	\N	1	3	1	\N
400	CAM 12-NV3 (Cổng NTH)	\N	<p>Analog</p>	\N	\N	\N	\N	12	1	2	18
390	Cụm PCCC khách sạn	\N	\N	\N	\N	\N	\N	1	30	1	\N
387	Máy lạnh Hoa sen Daikin	\N	<p>Máy lạnh âm trần chung tâm</p>	\N	\N	\N	\N	1	21	1	9
47	Bộ đàm Phục Vụ (5)	\N	<p>3 đàm + 3 sạc mới 19/5/25.</p><p>Nhận 1 đàm + 1 sạc từ Thu Ngân 13/11/2025 chuyển cho Quầy bar sử dụng.</p><p>Nhận thêm 2 đàm + sạc từ Bếp 25/11/2025</p><p>Hiện đang giữ 5 đàm + 5 sạc</p>	\N	\N	\N	\N	12	17	1	32
395	Máy lạnh Toshiba RAS 18SKCV	02500183	<p>Máy lạnh Hoa Hồng - máy trong</p>	\N	\N	\N	\N	1	21	1	11
13	Màn hình led Hoa cau	\N	<p>Màn led gồm 3 màn: chính, trái, phải.</p><p>màn chính p4 nhỏ</p><p>Màn trái, phải: p4 lớn</p><p>Đầu phát dùng 2 card, hư cổng HDMI</p><p>Thay đầu led 18/7/2025 (ko card)</p>	https://9sddgyotod6gnhxv.public.blob.vercel-storage.com/1000007478_1775534782738-G0w23jOHx8VLr1vwQAOnvfq6QQ1doa.jpg	2000-01-01	2000-01-01	\N	1	4	1	7
392	Hố vi sinh xử lý nước thảy	\N	<p>Các hố vi sinh trong nhà xủ lý nước thảy</p>	\N	\N	\N	\N	1	24	1	\N
394	Máy lạnh Toshiba RAS-18SKCV	12900058	<p>Phòng Họp nhỏ</p>	\N	\N	\N	\N	1	21	1	23
391	Két sắt P101	\N	\N	\N	\N	\N	\N	1	14	1	1
212	Tivi P503		<p><br></p>		\N	\N	\N	12	6	1	\N
397	Máy in màu EPSON L310	\N	\N	\N	\N	\N	\N	12	10	1	6
399	Các hố nước thảy, bể mỡ các khu vực	\N	\N	\N	\N	\N	\N	1	24	1	27
398	CAM 30-KS (Cua sau ks)	\N	<p>Analog</p>	\N	\N	\N	\N	12	1	1	15
388	CAM 3 - NhaHang (San sau Hoa Cau)	\N	\N	\N	\N	\N	\N	12	1	1	34
393	Hệ thống đèn sân khấu Hoa cau	cau	\N	\N	\N	\N	\N	12	18	2	7
401	Đầu ghi PLV IP	\N	\N	\N	\N	\N	\N	12	2	1	30
402	Đầu ghi camera PLV	K21620240319CCRRFB6125837WCVU	\N	\N	\N	\N	\N	12	2	1	30
365	Bộ máy vi tính Trang - PKT	\N	<p>Máy bộ dell</p>	\N	\N	\N	\N	3	3	1	\N
404	CAM 29-NV3 (Nha Banh)	\N	\N	\N	\N	\N	\N	12	1	1	29
403	CAM 28-PLV(Nha xe Hoa sen)	\N	\N	\N	\N	\N	\N	12	1	1	35
\.


--
-- Data for Name: DeviceCategory; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."DeviceCategory" ("ID", "Name", "DisplayOrder") FROM stdin;
1	Camera	1
2	Đầu ghi hình	2
4	Màn hình led	4
5	Bảng đèn	5
6	Tivi	6
7	Điện thoại bàn	7
8	Máy order	8
11	Bảng quảng cáo	11
12	Switch mạng	12
13	Wifi	13
14	Két sắt khách sạn	14
15	Tổng đài điện thoại	15
16	Khóa từ ADEL	16
17	Bộ đàm TL	17
18	Thiết bị HN-TC	18
21	Máy lạnh	\N
22	Máy Kỹ Thuật	\N
3	Máy vi tính, Laptop	3
19	Tổng đài điện thoại	19
20	Thiết bị ẩm thực	20
24	Hệ thống hố nước thảy	\N
25	Kho lạnh	\N
26	Hệ thống hầm cầu	\N
27	Hệ thống điện, tủ điện	\N
23	Hệ thống máy bơm	\N
28	Hệ thống quạt	\N
29	Hệ thống máy phát điện	\N
30	Hệ thống PCCC	\N
31	Phòng chức năng	\N
32	Hệ thống thang máy	\N
33	Hệ thống máy giặt, ủi	\N
10	Máy in, Photo, Scan	9
\.


--
-- Data for Name: DeviceReminderPlan; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."DeviceReminderPlan" ("ID", "DeviceID", "ReminderType", "EventTypeID", "Title", "Description", "IntervalValue", "IntervalUnit", "CronExpression", "StartFrom", "EndAt", "NextDueDate", "LastTriggeredAt", "IsActive", "Metadata", "CreatedBy", "CreatedAt", "UpdatedBy", "UpdatedAt") FROM stdin;
23	156	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.541Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.531Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.101+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.168081+00
22	155	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.571Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.556Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.101+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.200529+00
16	151	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.696Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.698Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.099+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.373237+00
15	150	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.718Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.722Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.098+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.399803+00
11	146	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.802Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.814Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.097+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.52369+00
10	145	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.824Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.839Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.097+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.568482+00
8	32	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.865Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.899Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.096+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.602077+00
4	141	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.957Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.996Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.094+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.668612+00
3	21	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.977Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:51.017Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.093+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.685702+00
1	26	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:18.021Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:51.059Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.069+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.727781+00
50	181	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.947Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.888Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.113+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.613558+00
49	180	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.968Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.912Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.113+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.630887+00
43	174	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.099Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.050Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.11+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.744399+00
42	173	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.125Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.075Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.109+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.763121+00
38	169	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.209Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.176Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.108+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.833406+00
37	39	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.240Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.196Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.107+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.850834+00
35	168	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.280Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.246Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.107+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.889359+00
31	164	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.370Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.334Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.105+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.964932+00
30	163	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.392Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.355Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.104+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.9826+00
28	161	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.435Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.403Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.103+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.025356+00
77	37	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.341Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.245Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.122+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.119894+00
76	205	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.361Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.266Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.121+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.137212+00
70	201	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.497Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.408Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.119+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.243101+00
69	200	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.523Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.432Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.119+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.262414+00
65	196	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.614Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.528Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.118+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.336794+00
64	195	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.637Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.550Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.118+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.354823+00
62	193	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.676Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.596Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.117+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.398837+00
58	189	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.763Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.693Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.116+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.471965+00
57	188	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.785Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.713Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.115+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.489514+00
55	186	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.831Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.760Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.115+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.52572+00
95	222	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:15.897Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:48.846Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.127+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:52.778463+00
92	219	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:15.968Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:48.912Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.126+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:52.839715+00
104	355	maintenance	1	Bảo trì định kỳ máy lạnh	Vệ sinh, kiểm tra vận hành	6	month	\N	2025-11-18 07:00:00	\N	2026-09-22 00:00:00	2026-03-22 14:37:03.208	t	{"maintenanceType": "outsource", "rescheduleHistory": [{"reason": "Bảo trì tháng 3 theo lịch Daikin", "toDate": "2026-03-10", "fromDate": "2026-05-18", "rescheduledAt": "2026-02-25T06:52:13.965Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-18-1763430857529", "maintenanceProvider": "Daikin Cần Thơ"}	lhkhiem@gmail.com	2025-11-18 01:54:17.529+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 07:37:05.542335+00
91	218	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:15.991Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:48.935Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.126+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:52.859096+00
89	216	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.048Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:48.978Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.125+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:52.896948+00
85	212	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.145Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.061Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.124+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:52.968666+00
84	211	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.168Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.083Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.124+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:52.986159+00
82	209	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.233Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.137Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.123+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.025638+00
88	215	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.079Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:48.998Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.125+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:52.914821+00
86	213	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.126Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.041Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.124+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:52.951527+00
83	210	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.191Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.106Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.124+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.00795+00
80	207	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.277Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.180Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.123+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.069326+00
78	206	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.320Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.224Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.122+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.102921+00
75	34	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.387Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.296Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.121+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.154658+00
71	36	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.474Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.385Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.12+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.225455+00
68	199	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.544Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.457Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.119+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.279898+00
66	197	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.593Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.508Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.118+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.318425+00
54	185	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.854Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.782Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.115+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.542675+00
53	184	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.875Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.806Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.114+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.560762+00
48	179	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.989Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.938Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.113+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.647769+00
46	177	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.032Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.983Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.111+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.682201+00
44	175	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.077Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.029Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.11+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.726855+00
39	170	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.191Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.143Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.108+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.816269+00
36	38	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.259Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.220Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.107+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.868685+00
34	167	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.303Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.265Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.106+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.907595+00
29	162	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.413Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.376Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.104+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.003543+00
27	160	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.457Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.428Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.102+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.05591+00
94	221	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:15.921Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:48.868Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.127+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:52.797896+00
93	220	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:15.943Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:48.891Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.126+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:52.817637+00
24	157	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.520Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.497Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.101+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.120638+00
21	18	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.592Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.583Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.1+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.232849+00
19	153	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.632Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.629Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.1+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.290967+00
14	149	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.739Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.748Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.098+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.42134+00
12	147	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.780Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.792Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.097+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.496621+00
9	144	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.844Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.865Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.096+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.585744+00
5	31	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.938Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.972Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.094+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.651815+00
2	27	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.998Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:51.039Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.092+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.707206+00
87	214	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.105Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.021Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.125+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:52.933809+00
81	208	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.257Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.161Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.123+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.051513+00
74	204	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.408Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.317Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.121+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.17215+00
73	203	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.429Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.339Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.12+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.190935+00
67	198	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.574Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.488Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.119+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.301358+00
63	194	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.655Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.575Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.118+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.381169+00
61	192	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.697Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.619Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.117+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.415872+00
60	191	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.722Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.644Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.116+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.434447+00
59	190	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.743Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.666Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.116+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.451653+00
52	183	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.907Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.843Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.114+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.577911+00
47	178	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.010Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.961Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.112+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.665092+00
41	172	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.146Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.096Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.109+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.781494+00
33	166	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.324Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.289Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.106+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.926322+00
32	165	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.346Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.311Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.105+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.946172+00
26	159	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.477Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.452Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.102+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.075211+00
25	158	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.497Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.476Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.102+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.096324+00
20	154	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.612Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.607Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.1+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.262386+00
17	33	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.675Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.677Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.099+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.344175+00
13	148	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.760Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.769Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.098+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.463397+00
7	143	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.895Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.923Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.095+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.618897+00
102	353	maintenance	1	Đầu ghi camera	Vệ sinh, kiểm tra ổ cứng	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"assignedStaffId": 3, "maintenanceType": "internal", "rescheduleHistory": [{"reason": "test quá hạn", "toDate": "2026-11-14", "fromDate": "2026-11-16", "rescheduledAt": "2025-11-16T08:50:24.966Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "Test quá hạn", "toDate": "2025-11-14", "fromDate": "2026-11-14", "rescheduledAt": "2025-11-16T08:50:55.972Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "Dời lịch", "toDate": "2025-12-14", "fromDate": "2025-11-14", "rescheduledAt": "2025-11-16T09:43:35.134Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "Dời  sau 1 năm", "toDate": "2026-11-14", "fromDate": "2025-12-14", "rescheduledAt": "2025-11-24T09:04:49.047Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-16-1763281121668"}	admin@quanlyvt.com	2025-11-16 08:18:41.669+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 08:12:41.495005+00
97	224	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:15.837Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:48.803Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.128+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:52.733997+00
96	223	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:15.876Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:48.827Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.127+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:52.758241+00
90	217	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.018Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:48.956Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.125+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:52.877887+00
79	35	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.297Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.201Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.122+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.086088+00
107	364	maintenance	1	BT Máy tính	Vệ sinh, backup data	6	month	\N	2025-11-24 07:00:00	\N	2026-09-21 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Bận việc khác", "toDate": "2025-12-01", "fromDate": "2025-11-24", "rescheduledAt": "2025-11-19T04:21:44.903Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "làm sớm", "toDate": "2025-11-19", "fromDate": "2025-12-01", "rescheduledAt": "2025-11-19T08:36:48.921Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Dời muộn", "toDate": "2025-11-23", "fromDate": "2025-11-19", "rescheduledAt": "2025-11-19T08:53:13.734Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Bảo trì sớm", "toDate": "2026-03-21", "fromDate": "2026-05-24", "rescheduledAt": "2026-03-21T08:40:16.131Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-21 08:24:28.986+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-26 01:43:34.819185+00
6	142	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.916Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.949Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.095+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.635126+00
72	202	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.451Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.361Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.12+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.208763+00
56	187	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.810Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.739Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.115+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.508583+00
51	182	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:16.926Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:49.863Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.114+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.596372+00
45	176	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.056Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.008Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.11+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.710292+00
40	171	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.170Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.122Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.108+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:53.799156+00
18	152	maintenance	1	Bảo trì định kỳ tivi	Vệ sinh, kiểm tra kênh	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "làm sớm", "toDate": "2025-11-16", "fromDate": "2025-12-16", "rescheduledAt": "2025-11-16T08:04:17.654Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lại", "toDate": "2025-12-16", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-16T08:07:50.656Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763130804069"}	admin@quanlyvt.com	2025-11-14 14:33:24.099+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 09:05:54.316363+00
103	48	maintenance	1	Đầu ghi camera	Vệ sinh, kiểm tra ổ cứng	6	month	\N	2025-11-16 07:00:00	\N	2026-05-16 07:00:00	\N	t	{"assignedStaffId": 3, "maintenanceType": "internal", "rescheduleHistory": [{"reason": "test quá hạn", "toDate": "2026-11-14", "fromDate": "2026-11-16", "rescheduledAt": "2025-11-16T08:50:24.927Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "Test quá hạn", "toDate": "2025-11-14", "fromDate": "2026-11-14", "rescheduledAt": "2025-11-16T08:50:55.949Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "Dời lịch", "toDate": "2025-12-14", "fromDate": "2025-11-14", "rescheduledAt": "2025-11-16T09:43:35.102Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "Dời  sau 1 năm", "toDate": "2026-11-14", "fromDate": "2025-12-14", "rescheduledAt": "2025-11-24T09:04:49.008Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-16-1763281121668"}	admin@quanlyvt.com	2025-11-16 08:18:41.678+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 08:12:41.268018+00
105	23	maintenance	1	BT Máy tính	Vệ sinh, backup data	6	month	\N	2025-11-24 07:00:00	\N	2026-09-21 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Bận việc khác", "toDate": "2025-12-01", "fromDate": "2025-11-24", "rescheduledAt": "2025-11-19T04:21:44.903Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "làm sớm", "toDate": "2025-11-19", "fromDate": "2025-12-01", "rescheduledAt": "2025-11-19T08:36:48.921Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Dời muộn", "toDate": "2025-11-23", "fromDate": "2025-11-19", "rescheduledAt": "2025-11-19T08:53:13.734Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Bảo trì sớm", "toDate": "2026-03-21", "fromDate": "2026-05-24", "rescheduledAt": "2026-03-21T08:40:16.614Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	admin@quanlyvt.com	2025-11-18 09:21:07.195+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-26 01:43:35.284542+00
114	368	maintenance	1	BT Máy tính	Vệ sinh, backup data	6	month	\N	2025-11-24 07:00:00	\N	2026-09-21 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Bận việc khác", "toDate": "2025-12-01", "fromDate": "2025-11-24", "rescheduledAt": "2025-11-19T04:21:44.903Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "làm sớm", "toDate": "2025-11-19", "fromDate": "2025-12-01", "rescheduledAt": "2025-11-19T08:36:48.921Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Dời muộn", "toDate": "2025-11-23", "fromDate": "2025-11-19", "rescheduledAt": "2025-11-19T08:53:13.734Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Bảo trì sớm", "toDate": "2026-03-21", "fromDate": "2026-05-24", "rescheduledAt": "2026-03-21T08:40:14.426Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-21 08:24:30.274+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-26 01:43:33.203257+00
108	362	maintenance	1	BT Máy tính	Vệ sinh, backup data	6	month	\N	2025-11-24 07:00:00	\N	2026-09-21 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Bận việc khác", "toDate": "2025-12-01", "fromDate": "2025-11-24", "rescheduledAt": "2025-11-19T04:21:44.903Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "làm sớm", "toDate": "2025-11-19", "fromDate": "2025-12-01", "rescheduledAt": "2025-11-19T08:36:48.921Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Dời muộn", "toDate": "2025-11-23", "fromDate": "2025-11-19", "rescheduledAt": "2025-11-19T08:53:13.734Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Bảo trì sớm", "toDate": "2026-03-21", "fromDate": "2026-05-24", "rescheduledAt": "2026-03-21T08:40:15.893Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-21 08:24:29.21+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-26 01:43:34.592651+00
129	399	maintenance	1	Thu gôm, vệ sinh các hố nước thảy, bễ mỡ	Thu gôm, vệ sinh các hố nước thảy, bễ mỡ	15	day	\N	2026-04-15 07:00:00	\N	2026-04-30 00:00:00	2026-04-15 11:13:17.805	t	{"assignedStaffId": 6, "maintenanceType": "internal", "maintenanceBatchId": "batch-2026-04-15-1776217824281"}	lhkhiem@gmail.com	2026-04-15 01:50:24.281+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 04:13:24.85576+00
127	392	maintenance	1	Xử lý bồn vi sinh nước thảy	Thêm mật, clo	3	day	\N	2026-04-12 07:00:00	\N	2026-04-20 00:00:00	2026-04-17 08:17:47.762	t	{"assignedStaffId": 15, "maintenanceType": "internal", "rescheduleHistory": [{"reason": "sớm", "toDate": "2026-04-17", "fromDate": "2026-04-17", "rescheduledAt": "2026-04-17T00:59:19.706Z", "rescheduledBy": "lhkhiem@gmail.com"}], "maintenanceBatchId": "batch-2026-04-11-1775891024445"}	lhkhiem@gmail.com	2026-04-11 07:03:44.445+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 01:17:48.95847+00
128	392	maintenance	1	Theo dõi chỉ số nước thảy	Ghi chỉ số nước trên đồng hồ	1	day	\N	2026-04-12 00:00:00	\N	2026-04-20 00:00:00	2026-04-19 16:53:30.535	t	{"assignedStaffId": 15, "maintenanceType": "internal", "rescheduleHistory": [{"reason": "test", "toDate": "2026-04-14", "fromDate": "2026-04-14", "rescheduledAt": "2026-04-14T15:57:41.928Z", "rescheduledBy": "lhkhiem@gmail.com"}], "maintenanceBatchId": "batch-2026-04-11-1775899621533"}	lhkhiem@gmail.com	2026-04-11 09:27:01.533+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 09:53:32.767285+00
116	366	maintenance	1	BT Máy tính	Vệ sinh, backup data	6	month	\N	2025-11-24 07:00:00	\N	2026-09-21 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Bận việc khác", "toDate": "2025-12-01", "fromDate": "2025-11-24", "rescheduledAt": "2025-11-19T04:21:44.903Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "làm sớm", "toDate": "2025-11-19", "fromDate": "2025-12-01", "rescheduledAt": "2025-11-19T08:36:48.921Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Dời muộn", "toDate": "2025-11-23", "fromDate": "2025-11-19", "rescheduledAt": "2025-11-19T08:53:13.734Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Bảo trì sớm", "toDate": "2026-03-21", "fromDate": "2026-05-24", "rescheduledAt": "2026-03-21T08:40:13.944Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-21 08:24:30.631+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-26 01:43:32.742622+00
115	367	maintenance	1	BT Máy tính	Vệ sinh, backup data	6	month	\N	2025-11-24 07:00:00	\N	2026-09-21 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Bận việc khác", "toDate": "2025-12-01", "fromDate": "2025-11-24", "rescheduledAt": "2025-11-19T04:21:44.903Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "làm sớm", "toDate": "2025-11-19", "fromDate": "2025-12-01", "rescheduledAt": "2025-11-19T08:36:48.921Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Dời muộn", "toDate": "2025-11-23", "fromDate": "2025-11-19", "rescheduledAt": "2025-11-19T08:53:13.734Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Bảo trì sớm", "toDate": "2026-03-21", "fromDate": "2026-05-24", "rescheduledAt": "2026-03-21T08:40:14.179Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-21 08:24:30.443+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-26 01:43:32.970197+00
118	370	maintenance	1	BT Máy tính	Vệ sinh, backup data	6	month	\N	2025-11-24 07:00:00	\N	2026-09-21 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Bận việc khác", "toDate": "2025-12-01", "fromDate": "2025-11-24", "rescheduledAt": "2025-11-19T04:21:44.903Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "làm sớm", "toDate": "2025-11-19", "fromDate": "2025-12-01", "rescheduledAt": "2025-11-19T08:36:48.921Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Dời muộn", "toDate": "2025-11-23", "fromDate": "2025-11-19", "rescheduledAt": "2025-11-19T08:53:13.734Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Bảo trì sớm", "toDate": "2026-03-21", "fromDate": "2026-05-24", "rescheduledAt": "2026-03-21T08:40:13.460Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-21 08:24:31.015+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-26 01:43:32.273588+00
117	365	maintenance	1	BT Máy tính	Vệ sinh, backup data	6	month	\N	2025-11-24 07:00:00	\N	2026-09-21 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Bận việc khác", "toDate": "2025-12-01", "fromDate": "2025-11-24", "rescheduledAt": "2025-11-19T04:21:44.903Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "làm sớm", "toDate": "2025-11-19", "fromDate": "2025-12-01", "rescheduledAt": "2025-11-19T08:36:48.921Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Dời muộn", "toDate": "2025-11-23", "fromDate": "2025-11-19", "rescheduledAt": "2025-11-19T08:53:13.734Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Bảo trì sớm", "toDate": "2026-03-21", "fromDate": "2026-05-24", "rescheduledAt": "2026-03-21T08:40:13.698Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-21 08:24:30.819+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-26 01:43:32.503342+00
122	378	maintenance	1	BT Máy tính	Vệ sinh, backup data	6	month	\N	2025-11-24 07:00:00	\N	2026-09-21 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Bận việc khác", "toDate": "2025-12-01", "fromDate": "2025-11-24", "rescheduledAt": "2025-11-19T04:21:44.903Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "làm sớm", "toDate": "2025-11-19", "fromDate": "2025-12-01", "rescheduledAt": "2025-11-19T08:36:48.921Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Dời muộn", "toDate": "2025-11-23", "fromDate": "2025-11-19", "rescheduledAt": "2025-11-19T08:53:13.734Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Bảo trì sớm", "toDate": "2026-03-21", "fromDate": "2026-05-24", "rescheduledAt": "2026-03-21T08:40:12.491Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-21 08:38:34.453+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-26 01:43:31.344182+00
120	377	maintenance	1	BT Máy tính	Vệ sinh, backup data	6	month	\N	2025-11-24 07:00:00	\N	2026-09-21 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Bận việc khác", "toDate": "2025-12-01", "fromDate": "2025-11-24", "rescheduledAt": "2025-11-19T04:21:44.903Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "làm sớm", "toDate": "2025-11-19", "fromDate": "2025-12-01", "rescheduledAt": "2025-11-19T08:36:48.921Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Dời muộn", "toDate": "2025-11-23", "fromDate": "2025-11-19", "rescheduledAt": "2025-11-19T08:53:13.734Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Bảo trì sớm", "toDate": "2026-03-21", "fromDate": "2026-05-24", "rescheduledAt": "2026-03-21T08:40:12.974Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-21 08:38:34.109+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-26 01:43:31.812086+00
119	376	maintenance	1	BT Máy tính	Vệ sinh, backup data	6	month	\N	2025-11-24 07:00:00	\N	2026-09-21 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Bận việc khác", "toDate": "2025-12-01", "fromDate": "2025-11-24", "rescheduledAt": "2025-11-19T04:21:44.903Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "làm sớm", "toDate": "2025-11-19", "fromDate": "2025-12-01", "rescheduledAt": "2025-11-19T08:36:48.921Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Dời muộn", "toDate": "2025-11-23", "fromDate": "2025-11-19", "rescheduledAt": "2025-11-19T08:53:13.734Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Bảo trì sớm", "toDate": "2026-03-21", "fromDate": "2026-05-24", "rescheduledAt": "2026-03-21T08:40:13.214Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-21 08:38:33.932+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-26 01:43:32.037985+00
126	390	maintenance	1	Hệ thống PCCC	Bảo trì hệ thống	1	month	\N	2026-04-24 07:00:00	\N	2026-05-15 07:00:00	2026-04-15 11:58:47.879	t	{"assignedStaffId": 6, "maintenanceType": "internal", "rescheduleHistory": [{"reason": "dời lịch", "toDate": "2026-04-25", "fromDate": "2026-04-24", "rescheduledAt": "2026-04-10T04:00:23.776Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "test", "toDate": "2026-04-15", "fromDate": "2026-04-25", "rescheduledAt": "2026-04-15T04:14:39.318Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "quay lại bảo trì", "toDate": "2026-04-15", "fromDate": "2026-05-14", "rescheduledAt": "2026-04-15T04:51:08.923Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Quay lại để test", "toDate": "2026-04-15", "fromDate": "2026-05-14", "rescheduledAt": "2026-04-15T04:57:56.553Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Dời sớm test", "toDate": "2026-05-16", "fromDate": "2026-05-14", "rescheduledAt": "2026-04-15T05:00:31.026Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Dời sớm test", "toDate": "2026-04-16", "fromDate": "2026-05-16", "rescheduledAt": "2026-04-15T05:00:54.185Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "dời lịch test", "toDate": "2026-05-15", "fromDate": "2026-04-16", "rescheduledAt": "2026-04-15T05:42:41.483Z", "rescheduledBy": "lhkhiem@gmail.com"}], "maintenanceBatchId": "batch-2026-04-10-1775793592116"}	lhkhiem@gmail.com	2026-04-10 03:59:52.116+00	lhkhiem@gmail.com	2026-04-15 05:42:42.250722+00
123	379	maintenance	1	BT Máy tính	Vệ sinh, backup data	6	month	\N	2025-11-24 07:00:00	\N	2026-09-21 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Bận việc khác", "toDate": "2025-12-01", "fromDate": "2025-11-24", "rescheduledAt": "2025-11-19T04:21:44.903Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "làm sớm", "toDate": "2025-11-19", "fromDate": "2025-12-01", "rescheduledAt": "2025-11-19T08:36:48.921Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Dời muộn", "toDate": "2025-11-23", "fromDate": "2025-11-19", "rescheduledAt": "2025-11-19T08:53:13.734Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Bảo trì sớm", "toDate": "2026-03-21", "fromDate": "2026-05-24", "rescheduledAt": "2026-03-21T08:40:12.246Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-21 08:38:34.626+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-26 01:43:31.10756+00
121	380	maintenance	1	BT Máy tính	Vệ sinh, backup data	6	month	\N	2025-11-24 07:00:00	\N	2026-09-21 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Bận việc khác", "toDate": "2025-12-01", "fromDate": "2025-11-24", "rescheduledAt": "2025-11-19T04:21:44.903Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "làm sớm", "toDate": "2025-11-19", "fromDate": "2025-12-01", "rescheduledAt": "2025-11-19T08:36:48.921Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Dời muộn", "toDate": "2025-11-23", "fromDate": "2025-11-19", "rescheduledAt": "2025-11-19T08:53:13.734Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Bảo trì sớm", "toDate": "2026-03-21", "fromDate": "2026-05-24", "rescheduledAt": "2026-03-21T08:40:12.729Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-21 08:38:34.282+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-26 01:43:31.5775+00
106	356	maintenance	1	BT Máy tính	Vệ sinh, backup data	6	month	\N	2025-11-24 07:00:00	\N	2026-09-21 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Bận việc khác", "toDate": "2025-12-01", "fromDate": "2025-11-24", "rescheduledAt": "2025-11-19T04:21:44.903Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "làm sớm", "toDate": "2025-11-19", "fromDate": "2025-12-01", "rescheduledAt": "2025-11-19T08:36:48.921Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Dời muộn", "toDate": "2025-11-23", "fromDate": "2025-11-19", "rescheduledAt": "2025-11-19T08:53:13.734Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Bảo trì sớm", "toDate": "2026-03-21", "fromDate": "2026-05-24", "rescheduledAt": "2026-03-21T08:40:16.376Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-19 09:02:29.861+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-26 01:43:35.055575+00
113	369	maintenance	1	BT Máy tính	Vệ sinh, backup data	6	month	\N	2025-11-24 07:00:00	\N	2026-09-21 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Bận việc khác", "toDate": "2025-12-01", "fromDate": "2025-11-24", "rescheduledAt": "2025-11-19T04:21:44.903Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "làm sớm", "toDate": "2025-11-19", "fromDate": "2025-12-01", "rescheduledAt": "2025-11-19T08:36:48.921Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Dời muộn", "toDate": "2025-11-23", "fromDate": "2025-11-19", "rescheduledAt": "2025-11-19T08:53:13.734Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Bảo trì sớm", "toDate": "2026-03-21", "fromDate": "2026-05-24", "rescheduledAt": "2026-03-21T08:40:14.669Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-21 08:24:30.098+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-26 01:43:33.431584+00
124	375	maintenance	1	BT Máy tính	Vệ sinh, backup data	6	month	\N	2025-11-24 07:00:00	\N	2026-09-21 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Bận việc khác", "toDate": "2025-12-01", "fromDate": "2025-11-24", "rescheduledAt": "2025-11-19T04:21:44.903Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "làm sớm", "toDate": "2025-11-19", "fromDate": "2025-12-01", "rescheduledAt": "2025-11-19T08:36:48.921Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Dời muộn", "toDate": "2025-11-23", "fromDate": "2025-11-19", "rescheduledAt": "2025-11-19T08:53:13.734Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Bảo trì sớm", "toDate": "2026-03-21", "fromDate": "2026-05-24", "rescheduledAt": "2026-03-21T08:40:12.008Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-21 08:38:34.798+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-26 01:43:30.877514+00
112	363	maintenance	1	BT Máy tính	Vệ sinh, backup data	6	month	\N	2025-11-24 07:00:00	\N	2026-09-21 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Bận việc khác", "toDate": "2025-12-01", "fromDate": "2025-11-24", "rescheduledAt": "2025-11-19T04:21:44.903Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "làm sớm", "toDate": "2025-11-19", "fromDate": "2025-12-01", "rescheduledAt": "2025-11-19T08:36:48.921Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Dời muộn", "toDate": "2025-11-23", "fromDate": "2025-11-19", "rescheduledAt": "2025-11-19T08:53:13.734Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Bảo trì sớm", "toDate": "2026-03-21", "fromDate": "2026-05-24", "rescheduledAt": "2026-03-21T08:40:14.926Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-21 08:24:29.913+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-26 01:43:33.665194+00
110	373	maintenance	1	BT Máy tính	Vệ sinh, backup data	6	month	\N	2025-11-24 07:00:00	\N	2026-09-21 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Bận việc khác", "toDate": "2025-12-01", "fromDate": "2025-11-24", "rescheduledAt": "2025-11-19T04:21:44.903Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "làm sớm", "toDate": "2025-11-19", "fromDate": "2025-12-01", "rescheduledAt": "2025-11-19T08:36:48.921Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Dời muộn", "toDate": "2025-11-23", "fromDate": "2025-11-19", "rescheduledAt": "2025-11-19T08:53:13.734Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Bảo trì sớm", "toDate": "2026-03-21", "fromDate": "2026-05-24", "rescheduledAt": "2026-03-21T08:40:15.408Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-21 08:24:29.564+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-26 01:43:34.130772+00
125	381	maintenance	1	BT Máy tính	Vệ sinh, backup data	6	month	\N	2025-11-24 07:00:00	\N	2026-09-21 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Bận việc khác", "toDate": "2025-12-01", "fromDate": "2025-11-24", "rescheduledAt": "2025-11-19T04:21:44.903Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "làm sớm", "toDate": "2025-11-19", "fromDate": "2025-12-01", "rescheduledAt": "2025-11-19T08:36:48.921Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Dời muộn", "toDate": "2025-11-23", "fromDate": "2025-11-19", "rescheduledAt": "2025-11-19T08:53:13.734Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Bảo trì sớm", "toDate": "2026-03-21", "fromDate": "2026-05-24", "rescheduledAt": "2026-03-21T08:40:11.760Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-21 08:38:34.97+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-26 01:43:30.642583+00
109	371	maintenance	1	BT Máy tính	Vệ sinh, backup data	6	month	\N	2025-11-24 07:00:00	\N	2026-09-21 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Bận việc khác", "toDate": "2025-12-01", "fromDate": "2025-11-24", "rescheduledAt": "2025-11-19T04:21:44.903Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "làm sớm", "toDate": "2025-11-19", "fromDate": "2025-12-01", "rescheduledAt": "2025-11-19T08:36:48.921Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Dời muộn", "toDate": "2025-11-23", "fromDate": "2025-11-19", "rescheduledAt": "2025-11-19T08:53:13.734Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Bảo trì sớm", "toDate": "2026-03-21", "fromDate": "2026-05-24", "rescheduledAt": "2026-03-21T08:40:15.646Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-21 08:24:29.384+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-26 01:43:34.358733+00
111	372	maintenance	1	BT Máy tính	Vệ sinh, backup data	6	month	\N	2025-11-24 07:00:00	\N	2026-09-21 07:00:00	\N	t	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Bận việc khác", "toDate": "2025-12-01", "fromDate": "2025-11-24", "rescheduledAt": "2025-11-19T04:21:44.903Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "làm sớm", "toDate": "2025-11-19", "fromDate": "2025-12-01", "rescheduledAt": "2025-11-19T08:36:48.921Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Dời muộn", "toDate": "2025-11-23", "fromDate": "2025-11-19", "rescheduledAt": "2025-11-19T08:53:13.734Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Bảo trì sớm", "toDate": "2026-03-21", "fromDate": "2026-05-24", "rescheduledAt": "2026-03-21T08:40:15.162Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-21 08:24:29.74+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-26 01:43:33.894196+00
\.


--
-- Data for Name: Event; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Event" ("ID", "Title", "DeviceID", "EventTypeID", "Description", "StartDate", "EndDate", "StaffID", "Notes", "Status", "EventDate", "RelatedReportID", "Metadata", "CreatedBy", "CreatedAt", "UpdatedBy", "UpdatedAt") FROM stdin;
1	Hoàn thành xử lý - Máy Photo xerox S2520	3	5	Máy hư ko sài đc	2025-11-10	2025-11-10	3	Hư cụm sấy. Đã thay mới	completed	2025-11-10 17:24:20.858	10	{"source": "damage-report-completion", "handlerNotes": "Hư cụm sấy. Đã thay mới", "damageReportId": 10, "previousStatus": 1}	159c2606-abc5-4006-9633-6926396c181b	2025-11-10 10:24:20.858+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-10 10:24:20.858+00
2073	Hoàn thành xử lý - Bộ đàm Bếp (2)	45	10	Chuyển 2 bộ đàm bếp cho phục vụ sử dụng.	2025-11-13	2025-11-13	3	Hiền PV nhận	completed	2025-11-13 09:07:24.483	20	{"source": "damage-report-completion", "handlerNotes": "Hiền PV nhận", "damageReportId": 20, "previousStatus": 1}	159c2606-abc5-4006-9633-6926396c181b	2025-11-13 02:07:24.483+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-13 02:07:24.483+00
2077	Bảo trì camera	5	1	Bảo trì camera	2025-11-15	2025-11-15	3	Đã bt xong	completed	2025-11-15 07:00:00	\N	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Phát sinh tiệc", "toDate": "2025-11-16", "fromDate": "2025-11-15", "rescheduledAt": "2025-11-15T03:54:13.712Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "làm sớm", "toDate": "2025-11-15", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-15T07:41:03.749Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lịch", "toDate": "2026-03-12", "fromDate": "2025-11-15", "rescheduledAt": "2025-11-15T08:17:48.424Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763138025285"}	159c2606-abc5-4006-9633-6926396c181b	2025-11-15 08:33:29.193+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-15 08:33:29.193+00
2083	Bảo trì định kỳ máy lạnh	355	1	Vệ sinh, kiểm tra vận hành	2025-11-19	2025-11-19	6	Đã bảo trì xong	completed	2025-11-19 07:00:00	\N	{"maintenanceType": "outsource", "maintenanceBatchId": "batch-2025-11-18-1763430857529", "maintenanceProvider": "Daikin Cần Thơ"}	159c2606-abc5-4006-9633-6926396c181b	2025-11-19 09:07:32.921+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-19 09:07:32.921+00
2090	Hoàn thành xử lý - Bảng chữ HBRGRS tầng 6	12	7	Chữ T trong chữ RESORT không sáng đèn.	2025-11-24	2025-11-24	3	Đã kiểm tra, đèn sáng bình thường	completed	2025-11-24 15:27:32.276	36	{"source": "damage-report-completion", "handlerNotes": "Đã kiểm tra, đèn sáng bình thường", "damageReportId": 36, "previousStatus": 3}	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 08:27:32.276+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-24 08:27:32.276+00
2091	Hoàn thành xử lý - Mixer đèn DMX512 HS trước	345	2	Mixer đèn hư ko hoạt động	2025-11-28	2025-11-28	3	Gưi Phan thảo kiểm tra\nĐã nhận về ngày 20/11	completed	2025-11-28 16:10:55.51	11	{"source": "damage-report-completion", "handlerNotes": "Gưi Phan thảo kiểm tra\\nĐã nhận về ngày 20/11", "damageReportId": 11, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-28 09:10:55.51+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-28 09:10:55.51+00
2095	Hoàn thành xử lý - Bảng chữ HBRGRS tầng 6	12	2	Chử S trong chữ RESORT hư	2025-12-04	2025-12-04	3	Nguồn cũ bị lỗi, đã xử lý \nĐèn sáng bình thường.	completed	2025-12-04 10:08:56.712	41	{"source": "damage-report-completion", "handlerNotes": "Nguồn cũ bị lỗi, đã xử lý \\nĐèn sáng bình thường.", "damageReportId": 41, "previousStatus": 3}	159c2606-abc5-4006-9633-6926396c181b	2025-12-04 03:08:56.712+00	159c2606-abc5-4006-9633-6926396c181b	2025-12-04 03:08:56.712+00
2096	Hoàn thành xử lý - Bảng đèn logo cổng 1	359	2	Bảng đèn logo vị trí chim bồ câu hư đèn, đen góc.	2025-12-05	2026-02-25	3	Đã báo Huy Thanh kiểm tra	completed	2026-02-25 13:42:53.797	42	{"source": "damage-report-completion", "handlerNotes": "Đã báo Huy Thanh kiểm tra", "damageReportId": 42, "previousStatus": 3}	159c2606-abc5-4006-9633-6926396c181b	2026-02-25 06:42:53.797+00	159c2606-abc5-4006-9633-6926396c181b	2026-02-25 06:42:53.797+00
2101	Hoàn thành xử lý - CAM 25-NV3 (Hoa Lan)	360	2	Mất hình ảnh	2026-02-26	2026-02-26	3	Hư banlun	completed	2026-02-26 08:42:02.519	43	{"source": "damage-report-completion", "handlerNotes": "Hư banlun", "damageReportId": 43, "previousStatus": 3}	159c2606-abc5-4006-9633-6926396c181b	2026-02-26 01:42:02.519+00	159c2606-abc5-4006-9633-6926396c181b	2026-02-26 01:42:02.519+00
2071	Hoàn thành xử lý - CAM 8-NV2 (KS -> Hoa sen)	5	2	Camera bị rơi ra khỏi vị trí.	2025-11-11	2025-11-11	3	Đã gắn lại xong.	completed	2025-11-11 16:26:14.214	18	{"source": "damage-report-completion", "handlerNotes": "Đã gắn lại xong.", "damageReportId": 18, "previousStatus": 3}	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 09:26:14.214+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 09:26:14.214+00
2074	Hoàn thành xử lý - Bộ đàm Quầy bar - Thu ngân (1)	46	10	Chuyển bộ đàm quầy Bar cho Phục vụ sử dụng	2025-11-13	2025-11-13	3	Hiền PV nhận	completed	2025-11-13 09:08:29.936	21	{"source": "damage-report-completion", "handlerNotes": "Hiền PV nhận", "damageReportId": 21, "previousStatus": 1}	159c2606-abc5-4006-9633-6926396c181b	2025-11-13 02:08:29.936+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-13 02:08:29.936+00
2078	Bảo trì camera	4	1	Bảo trì camera	2025-11-15	2025-11-15	3	Xong	completed	2025-11-15 07:00:00	\N	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Phát sinh tiệc", "toDate": "2025-11-16", "fromDate": "2025-11-15", "rescheduledAt": "2025-11-15T03:54:13.744Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "làm sớm", "toDate": "2025-11-15", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-15T07:41:03.771Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lịch", "toDate": "2026-03-12", "fromDate": "2025-11-15", "rescheduledAt": "2025-11-15T08:17:48.454Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763138025285"}	159c2606-abc5-4006-9633-6926396c181b	2025-11-15 08:50:56.737+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-15 08:50:56.737+00
2086	Bảo trì định kỳ - Bảo trì máy tính định kỳ	\N	1	xxxx	2025-11-19	2025-11-19	3	Đã bảo trì xong	completed	2025-11-19 17:34:16.399	34	{"source": "damage-report-completion", "handlerNotes": "Đã bảo trì xong", "damageReportId": 34, "previousStatus": 3, "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-19 10:34:16.399+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-19 10:34:16.399+00
2092	Hoàn thành xử lý - Mixer âm thanh yamaha	2	2	Mixer hư	2025-11-28	2025-11-28	3	Gửi phan thảo kiểm tra.\nĐã nhận về ngày 20/11	completed	2025-11-28 16:11:05.646	12	{"source": "damage-report-completion", "handlerNotes": "Gửi phan thảo kiểm tra.\\nĐã nhận về ngày 20/11", "damageReportId": 12, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-28 09:11:05.646+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-28 09:11:05.646+00
2097	Hoàn thành xử lý - Bảng chữ HBRGRS tầng 6	12	2	RẠCH chữ H lúc tắc lúc cháy trên sân thượng khách sạn	2025-11-30	2026-02-25	3	Kiểm tra đèn đang sáng tốt, nguồn ko có dấu hiệu chập chờn,\nTheo dõi thêm	completed	2026-02-25 13:43:05.573	38	{"source": "damage-report-completion", "handlerNotes": "Kiểm tra đèn đang sáng tốt, nguồn ko có dấu hiệu chập chờn,\\nTheo dõi thêm", "damageReportId": 38, "previousStatus": 3}	159c2606-abc5-4006-9633-6926396c181b	2026-02-25 06:43:05.573+00	159c2606-abc5-4006-9633-6926396c181b	2026-02-25 06:43:05.573+00
2035	Thay remote	32	5	<p><br></p>	2025-05-19	2025-05-19	3	BT	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2036	Thay remote	33	5	<p><br></p>	2025-05-19	2025-05-19	3	BT	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2072	Hoàn thành xử lý - Tivi Lễ Tân KS	21	7	Tivi không mở được	2025-11-11	2025-11-11	3	Lỏng cáp nguồn, Tivi bình thường	completed	2025-11-11 16:30:07.674	15	{"source": "damage-report-completion", "handlerNotes": "Lỏng cáp nguồn, Tivi bình thường", "damageReportId": 15, "previousStatus": 3}	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 09:30:07.674+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-11 09:30:07.674+00
2079	Bảo trì camera	17	1	Bảo trì camera	2025-11-15	2025-11-15	3	Xong	completed	2025-11-15 07:00:00	\N	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Phát sinh tiệc", "toDate": "2025-11-16", "fromDate": "2025-11-15", "rescheduledAt": "2025-11-15T03:54:13.771Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "làm sớm", "toDate": "2025-11-15", "fromDate": "2025-11-16", "rescheduledAt": "2025-11-15T07:41:03.794Z", "rescheduledBy": "admin@quanlyvt.com"}, {"reason": "dời lịch", "toDate": "2026-03-12", "fromDate": "2025-11-15", "rescheduledAt": "2025-11-15T08:17:48.475Z", "rescheduledBy": "admin@quanlyvt.com"}], "maintenanceBatchId": "batch-2025-11-14-1763138025285"}	159c2606-abc5-4006-9633-6926396c181b	2025-11-15 08:50:57.025+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-15 08:50:57.025+00
2087	Hoàn thành xử lý - Bảng chữ HBRGRS tầng 6	12	5	Chữ O Trong chữ "HOA" không sáng.	2025-11-19	2025-11-20	3	Kiểm tra, hư nguồn.\nHuy Thanh Thay nguồn\nĐã thay xong	completed	2025-11-20 08:30:03.097	28	{"source": "damage-report-completion", "handlerNotes": "Kiểm tra, hư nguồn.\\nHuy Thanh Thay nguồn\\nĐã thay xong", "damageReportId": 28, "previousStatus": 3}	159c2606-abc5-4006-9633-6926396c181b	2025-11-20 01:30:03.097+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-20 01:30:03.097+00
2093	Hoàn thành xử lý - Bảng chữ HBRGRS tầng 6	12	5	Chử T trong chữ REOST không sáng đèn.	2025-11-30	2025-11-30	3	Đã thay nguồn,\nĐèn sáng bt	completed	2025-11-30 07:15:03.157	37	{"source": "damage-report-completion", "handlerNotes": "Đã thay nguồn,\\nĐèn sáng bt", "damageReportId": 37, "previousStatus": 1}	159c2606-abc5-4006-9633-6926396c181b	2025-11-30 00:15:03.157+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-30 00:15:03.157+00
2098	Hoàn thành xử lý - Bản đèn cổng phụ cặp cầu 3/2	358	2	Bảng đèn bị hư mặt trong, rớt gãy không rõ nguyên nhân.	2025-11-30	2026-02-25	3	Bảng đèn bị hư do nhóm bên ngoài đá banh trúng.\nTháo xuống cho Huy Thanh sửa chữa.	completed	2026-02-25 13:43:25.788	39	{"source": "damage-report-completion", "handlerNotes": "Bảng đèn bị hư do nhóm bên ngoài đá banh trúng.\\nTháo xuống cho Huy Thanh sửa chữa.", "damageReportId": 39, "previousStatus": 3}	159c2606-abc5-4006-9633-6926396c181b	2026-02-25 06:43:25.788+00	159c2606-abc5-4006-9633-6926396c181b	2026-02-25 06:43:25.788+00
2076	Hoàn thành xử lý - CAM 16-NV3 (Cong 1->2)	4	2	Camera mất hình	2025-11-13	2025-11-13	3	Kiểm tra đường dây và camera	completed	2025-11-13 16:40:05.889	16	{"source": "damage-report-completion", "handlerNotes": "Kiểm tra đường dây và camera\\nCamera hư điện, đã sửa", "damageReportId": 16, "previousStatus": 3}	159c2606-abc5-4006-9633-6926396c181b	2025-11-13 09:40:05.889+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-13 09:40:05.889+00
2080	Bảo trì đầu ghi	48	1	Vệ sinh, kiểm tra ổ cứng	2025-11-16	2025-11-16	3	Đã bảo trì xong	completed	2025-11-16 07:00:00	\N	{"maintenanceType": "internal", "maintenanceBatchId": "batch-2025-11-16-1763281121668"}	159c2606-abc5-4006-9633-6926396c181b	2025-11-16 08:19:10.409+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-16 08:19:10.409+00
2088	Bảo trì định kỳ - Bảo trì máy tính định kỳ	23	1	xxxx	2025-11-19	2025-11-24	3	xong	completed	2025-11-24 07:00:00	\N	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Bận việc khác", "toDate": "2025-12-01", "fromDate": "2025-11-24", "rescheduledAt": "2025-11-19T04:21:44.903Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "làm sớm", "toDate": "2025-11-19", "fromDate": "2025-12-01", "rescheduledAt": "2025-11-19T08:36:48.921Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Dời muộn", "toDate": "2025-11-23", "fromDate": "2025-11-19", "rescheduledAt": "2025-11-19T08:53:13.734Z", "rescheduledBy": "lhkhiem@gmail.com"}], "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-20 01:50:32.899+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-24 08:53:22.508337+00
2094	Hoàn thành xử lý - Bộ đàm bảo vệ (3)	41	5	Bộ đàm bảo vệ hư 1 cái	2025-11-30	2025-11-30	3	Hư pin bộ đàm đời cũ. Đề xuất mua pin mới.\nĐã thay pin \nĐã đặt mua hàng, chờ hàng về	completed	2025-11-30 10:49:52.066	9	{"source": "damage-report-completion", "handlerNotes": "Hư pin bộ đàm đời cũ. Đề xuất mua pin mới.\\nĐã thay pin \\nĐã đặt mua hàng, chờ hàng về", "damageReportId": 9, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-30 03:49:52.066+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-30 03:49:52.066+00
2099	Hoàn thành xử lý - Tổng đài Panasonic TDA 100D	354	1	Kiểm tra, theo dõi xử lý lỗi tổng đài báo cước phát sinh sai trên phần mền Smile	2026-02-25	2026-02-25	3	Đề xuất thay cáp Rs232 theo dõi.	completed	2026-02-25 13:44:11.651	24	{"source": "damage-report-completion", "handlerNotes": "Đề xuất thay cáp Rs232 theo dõi.", "damageReportId": 24, "previousStatus": 3}	159c2606-abc5-4006-9633-6926396c181b	2026-02-25 06:44:11.651+00	159c2606-abc5-4006-9633-6926396c181b	2026-02-25 06:44:11.651+00
2081	Bảo trì đầu ghi	353	1	Vệ sinh, kiểm tra ổ cứng	2025-11-16	2025-11-16	3	Đã bảo trì xong	completed	2025-11-16 07:00:00	\N	{"maintenanceType": "internal", "maintenanceBatchId": "batch-2025-11-16-1763281121668"}	159c2606-abc5-4006-9633-6926396c181b	2025-11-16 08:19:10.905+00	159c2606-abc5-4006-9633-6926396c181b	2025-11-16 08:19:10.905+00
2089	Bảo trì định kỳ - Bảo trì máy tính định kỳ	356	1	xxxx	2025-11-19	2025-11-24	3	xong	completed	2025-11-24 07:00:00	\N	{"maintenanceType": "internal", "rescheduleHistory": [{"reason": "Bận việc khác", "toDate": "2025-12-01", "fromDate": "2025-11-24", "rescheduledAt": "2025-11-19T04:21:44.903Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "làm sớm", "toDate": "2025-11-19", "fromDate": "2025-12-01", "rescheduledAt": "2025-11-19T08:36:48.921Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Dời muộn", "toDate": "2025-11-23", "fromDate": "2025-11-19", "rescheduledAt": "2025-11-19T08:53:13.734Z", "rescheduledBy": "lhkhiem@gmail.com"}], "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-20 01:50:32.899+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-24 08:53:21.822914+00
2100	Hoàn thành xử lý - Màn hình led Hoa đăng	6	2	Màn led hư 1 tấm led	2026-02-25	2026-02-25	3	Thu hẹp led, xử lý xong	completed	2026-02-25 13:45:06.304	29	{"source": "damage-report-completion", "handlerNotes": "Thu hẹp led, xử lý xong", "damageReportId": 29, "previousStatus": 1}	159c2606-abc5-4006-9633-6926396c181b	2026-02-25 06:45:06.304+00	159c2606-abc5-4006-9633-6926396c181b	2026-02-25 06:45:06.304+00
2037	Thay remote	34	5	<p><br></p>	2025-05-19	2025-05-19	3	BT	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
8	Thay nội dung quảng cáo	7	6	<p>Huy Thanh thay</p><p>Lưu ý; Khung sắt hư nhiều, đề nghị thay lần sau.</p>	2024-10-26	2024-10-26	3	Đã xong	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
9	Thay nội dung quảng cáo	8	6	<p>Thay nội dung quảng cáo</p><p>Huy Thanh xử lý</p>	2024-10-26	2024-10-26	3	Xong	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2041	Thay remote	38	5	<p><br></p>	2025-05-19	2025-05-19	3	BT	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
10	Kiểm tra switch lỗi port	9	2	<p>Switch lỗi port số 2 từ server qua gây rớt mạng khu vực tầng 2 khu B và BGĐ</p>	2024-10-25	2024-10-25	3	Sửa xong	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
13	Test màn led phục vụ hội nghị	11	7	<p><br></p>	2024-10-27	2024-10-27	2	Bình thường	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
11	Test màn led 	10	7	<p>Màn led hoạt động bình thường</p>	2024-10-26	2024-10-26	3	Bình thường	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
15	Thay nguồn chữ "O" bảng chữ tầng 6	12	5	<p><font color="#000000" style="background-color: rgb(255, 255, 255);">Thay nguồn chữ "O" trong chữ "RESOR<font style="">T</font>"</font></p>	2024-08-26	2024-08-26	3	Xong	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
16	Thay nguồn chữ "H" bảng chữ tầng 6	12	5	<p><font color="#000000" style="background-color: rgb(255, 255, 255);">Thay nguồn chữ "H" trong chữ "HOA"</font></p>	2024-10-08	2024-10-08	2	Xong	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
17	Thay đổi vị trí 2 cánh gà	13	2	<p>Di dời 2 cánh gà lên trên song song với màn chính</p><p>Cấu hình lại màn led</p><p>Than Thảo thực hiện</p><p>Làm bình phông CNC che khoảng trống</p>	2024-10-17	2024-10-19	3	Xong	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
18	Thay nội dung mới	14	6	<p>Thay xong cùng A Trang</p>	2024-10-14	2024-10-14	3	Xong	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
19	Lắp mới wifi quầy bar	15	8	<p>Lắp mới wifi quầy bar</p>	2024-10-25	2024-10-26	3	Xong	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
20	Sửa két sắt P302 bị kẹt	16	2	<p><br><img src="data:image/jpeg;base64,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" style="width: 353px;" data-filename="img3.jpg"></p>	2024-10-27	2024-10-28	3	Chưa xử lý - Phòng có khách\n	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
21	Thay mới camera	17	5	<p>Thay mới do camera cũ hư,mờ ống kính<br></p>	2024-10-31	2024-10-31	3	Xong	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
7	Sửa chữa và thay nguồn led hoa đăng	6	2	<p>Thay nguồn, sửa led, setup cấu hình</p>	2024-10-16	2024-10-23	3	Xong	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
14	Thay nguồn chữ "T" bảng chữ tầng 6	12	5	<p>Thay nguồn chữ "T" trong chữ "RESOR<font color="#000000" style="background-color: rgb(255, 0, 0);">T</font>"</p>	2024-08-06	2024-08-06	3	Xong	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2053	Thay  điện nguồn dàn đèn tầng 6	12	2	<p>Huy thanh thay dàn điện tầng 6.</p><p>Thay 4 nguồn hư.</p><p>Lắp thêm 2 tủ nguồng chia lại số nguồn: tổng 21 nguồn, 7 trạm.</p><ul><li>HOA: 3 nguồn; </li><li>BIN: 3 nguồn; </li><li>H-R****: 3 nguồn;&nbsp;</li><li>ACH: 3 nguồn;</li><li>GIA: 3 nguồn;</li><li>RES: 3 nguồn;</li><li>ORT: 3 nguồn;</li></ul><p><br></p>	2025-09-08	2025-09-11	3	BT	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2054	Tivi 108 hư nguồn, chớp đỏ	148	1	<p>Theo dõi</p>	2025-10-08	2025-10-08	3	Theo dõi	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2055	Tivi 207 hư nguồn, chớp đỏ	159	1	<p>Theo dõi</p>	2025-10-08	2025-10-08	3	Đổi với 210 dùng tạm	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2056	Tivi 220 hư nguồn, chớp đỏ	169	1	<p>Tivi LG 42inch hư nguồn.&nbsp;</p><p>Tháo xuống để phòng server.</p><p>Lấy tivi cũ của phòng vip cũ panasonic 32inch dùng tạm</p>	2025-10-05	2025-10-05	2	Dùng tạm tivi 32inch	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2057	Tivi 222 mất nguồn, hư màn	171	1	<p>Tivi samsung 42inch hư nguồn.&nbsp;</p><p>Đã thanh lý cho kế toán.</p><p>Lấy tivi cũ phòng khác 32inch dùng tạm</p>	2025-10-01	2025-10-01	2	Dùng tạm tivi 32inch	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2058	Thay Smart Tivi samsung	154	9	<p><br></p>	2025-08-01	2025-08-01	3	Tivi mới	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2059	Thay Smart Tivi samsung	167	9	<p><br></p>	2025-08-01	2025-08-01	3	Tivi mới	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2060	Thay Smart Tivi samsung	179	9	<p><br></p>	2025-08-01	2025-08-01	3	Tivi mới	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2061	Thay Smart Tivi samsung	196	9	<p><br></p>	2025-10-20	2025-10-31	3	Tivi mới	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2062	Thay Smart Tivi samsung	194	9	<p><br></p>	2025-10-21	2025-10-21	3	Tivi mới	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2063	Đổi tivi 401 cho 108	148	1	<p>Tivi hư, đổi tivi 401 thế (lắp mới cho 401 smart tivi)</p>	2025-10-21	2025-10-21	3	Xong	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2064	Đổi tivi 403 cho 207	159	1	<p>Tivi hư, đổi tivi 403 thế (lắp mới cho 4031 smart tivi)</p>	2025-10-21	2025-10-21	3	Xong	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
22	Thay bo nguồn Tivi	18	2	<ul><li>Thay bo nguồn tivi</li><li>Giá 800.000đ VAT</li><li>Bảo hành 6 tháng.</li><li>Đơn vị sửa chữa: Trung tâm bảo hành LG</li><li>Tivi hoạt động bình thường.</li></ul>	2024-11-11	2024-11-11	3	Xong.	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
23	Thay điện thoại hư	19	5	<p>Thay xong</p>	2024-12-01	2024-12-01	3	HĐ BT	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
24	Sửa điện thoại bảo vệ cổng 1	20	2	<p>Sửa điện thoại bảo vệ cổng 1 hư ống nge.</p><p>Thay bằng ống nghe khác.</p>	2024-12-02	2024-12-02	3	HĐ BT	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
25	Thay remote tivi lễ tân hư	21	5	Thay remote tivi lễ tân hư không khiển được.	2024-12-03	2024-12-03	3	HĐ BT	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
26	Kiểm tra máy in hư cụm sấy	22	7	<p>Máy in hư cụm sấy Tin Học Kiên Giang Kiểm tra.</p>	2024-12-03	2024-12-03	3	Chờ báo giá sửa chửa.	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
27	Test màn led cho hội nghị	13	7	<p><br></p>	2024-12-03	2024-12-03	2	HĐ BT	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
28	Thay bo chính	21	2	<p>Tivi hư không lên hình có tiếng.</p><p>Bảo hành samsung đến thay bo tại chổ.</p><p>Hoạt động bình thường.</p><p>Còn BH chính hãng đến: 03/10/2025.</p><p><br></p>	2025-02-06	2025-02-06	2	Đã sửa	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
1029	Sửa bo nguồn tivi	26	2	<p>Bảo hành 3 tháng.</p>	2025-02-11	2025-02-15	3	Đã sửa	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
1030	Sửa bo nguồn tivi	27	2	<p>Bảo hành 3 tháng.</p>	2025-02-11	2025-02-15	3	Đã sửa	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
1031	Sửa mất đèn chử A và R	12	2	<p>Huy Thanh sửa dây điện bị cháy&nbsp;</p><p>HOA BINH RACH GI<b><font style="background-color: rgb(255, 255, 0);" color="#ff0000">A R</font></b>ESORT</p><p>Chử "A" trong "Giá", chử "R" trong "Resort"</p>	2025-03-15	2025-03-15	3	Sửa xong	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2031	Kiểm tra sửa chữa	28	2	<p>Khóa hư mạch, không sửa được.</p>	2025-04-10	2025-04-10	2	Khóa hư	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2032	Thay điện thoại mới	30	5	<p>Xong</p>	2025-04-18	2025-04-18	2	BT	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2033	Thay điện thoại mới	29	5	<p>Xong</p>	2025-04-18	2025-04-18	2	BT	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2034	Thay remote	31	5	<p><br></p>	2025-05-19	2025-05-19	3	BT	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2038	Thay remote	35	5	<p><br></p>	2025-05-19	2025-05-19	3	BT	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2039	Thay remote	36	5	<p><br></p>	2025-05-19	2025-05-19	3	BT	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2040	Thay remote	37	5	<p><br></p>	2025-05-19	2025-05-19	3	BT	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2042	Thay remote	39	5	<p><br></p>	2025-05-19	2025-05-19	3	BT	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2043	Cấp mới 01 đàm cho Buồng Phòng	42	6	<p>Tổng 5 đàm+ 5 sạc</p><p>(04 đàm cũ &amp; 01 đàm mới cấp 19/5/25)</p><p>Người nhận: Tuyền</p>	2025-05-19	2025-05-19	3	5 đàm BT	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2044	Cấp mới 02 đàm cho Bếp	45	8	<p>Tổng 2 đàm+ 2 sạc mới cấp 19/5/25</p><p>Người nhận: Anh Tuấn Tạm giữ tại phòng</p>	2025-05-20	2025-05-20	3	2 đàm BT	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2045	Cấp mới 01 đàm cho Quầy bar & Thu Ngân	46	8	<p>Tổng 1 đàm+ 1 sạc mới cấp 19/5/25</p><p>Người nhận: Tuyến</p>	2025-05-19	2025-05-19	3	1 đàm BT	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2046	Cấp mới 03 đàm cho Phục vụ	47	8	<p>Tổng 3 đàm+ 3 sạc mới cấp 19/5/25</p><p>Người nhận: Hiền</p>	2025-05-19	2025-05-19	3	3 đàm BT	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2047	Sửa camera 6 nhiễu 	48	2	<p>Camera 6 - sân sau hoa cau</p><p> nhiễu do cáp, đang sửa chữa</p>	2025-05-20	2025-05-20	3	Đang sửa	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2048	Kiểm tra Switch lỗi 	9	2	<p>Switch lỗi&nbsp;gây mất mạng khu vực tầng 2 khu B</p><p>Tạm thời thay bằng switch Cisco POE cũ của khách sạn.</p>	2025-05-20	2025-05-20	3	Đang KT	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2049	Lắp mới bảng đèn thực đơn ẩm thực	49	8	<p><br></p>	2025-05-20	2025-05-20	3	BT	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2050	Thay nguồn chữ "ES" trong chữ "RESORT"	12	5	<p>Huy Thanh thay nguồn xong.</p>	2025-05-30	2025-05-31	3	Thay xong	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2051	Sửa chữ A trong chữ "GIA" hư dây	12	2	<p>Anh trang hỗ trợ sữa chữa.</p>	2025-05-30	2025-05-30	3	Sửa xong	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2052	Thay nguồn chữ H & R	12	2	<p>Thay nguồn chữ "H" trong "BINH" và "R" trong "RACH"</p><p>Huy Thanh thay 1 nguồn.</p><p><img src="data:image/png;base64,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k50RCuaNOidD2Zubm81wWJzeoHU65AyJw+mxUVFR4egGKgJ775PQE5DWEHaLk6HsqbBqOOJHvCTinK4kf8S0aWYoanpec42j6k4nc6kCHSHZmaKam5sdTZYb7eHrpgkTJpihTrnd7ojOi2EnKWxeEDoZyu50mF6qcPLennLKKWYo4eXk5NieJPvBBx+MeAICQPxzssheR//uTEtLi60bhaF4+umnzVCn0tPToza/OOKHnfM0S15eHsdGBH28c5+jIewWJ0PZn38ntEp1wNTdQRHE13PmxEV154G//90MdSqtTx/1juH8/d3691fPK64ww506QMEPIoxkZ4pychHicrliPueV3Qssy7p168yQIx6Px1ZSONDzNStkOmNnTrVUZPe9dblcMatGjjW7FUstLS167LHHzDCAOGL3Blko7Hzn+w9htzgZym6nkrQzzc3NjhYmcrJAFBKL3fM0i93REeiYncSj/xB2i5Oh7HYqSRG6E47tZYaSjpOqw0NbtujLwsIuT3judzCC0UniMVw9R440Q506tGWLDr7+uhlOCqw50TVIdqaojRs3mqFO2b3QiQSn82Js3rzZDDliZ2iUOYTdEigB2pFoLu6QDBYuXGiGOtQVx200rV692vf/BQUFjqo7nVTHArDPSSW13c90KOz0m8Fu0JkjFzqzePFiR68/kLVr15qhkFx77bVmCEnGTiLf4nK5lJOTY4YRhk0ffWGGgjKHsFsYyh55X+07aIY65WQF90TT/eyzzVBIDtTX64tRo7o04XnQwTW8k8RjuHo5GJ0pSYfef98MxR275zbp6ekBcwSIPpKdKcrJvJbf/e53zVBMXOpg1Tj/hFA4FixYYIaCCnYh6GQoezQWd0gG9fX1tqt77K5cnmicVHc6XbUWgD1OEjGXXHKJGQqLx+Ox1W8Gu0EXLN4RJ68/kE2bNpmhTqWnp8d8NApiz8n0BrfeeqsZQhg2ffSltuzYa4aDMoewW+wOZZfNitJU5GQhpzNPspd0TkQ9/vM/zVDIDm7apF2DBulrh4vwhOugg+/DcF5vOHo4uKkU7/N2OhlNMLILks04jGRnirL7IZWkCy+80AzFxMCBA81Qp5qamsyQbY2NjXK73WY4qI4uBINVygRTWVlp+65RsmtsbNT3v/99M9yhWC6o1VUuv/xypafbu0CorKykuhOIASdDZS+66CIz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" style="width: 353px;" data-filename="image.png"><br></p>	2025-07-07	2025-07-08	3	Đã thay nguồn	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2065	Tivi 404 hư remote	197	2	<p>Lấy remote tivi hư của 108 dùng</p>	2025-10-21	2025-10-21	3	Xong	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2066	Điện thoại 301 hư dây cáp	263	2	<p>Đã kiểm tra, dây cáp đứt, chập dây không thể khắc phục</p><p>Cần đi lại cáp mới.</p>	2025-10-21	2025-10-21	3	Chưa xong!	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2067	Kiểm tra line điện thoại 3917989 mất tone	340	2	<p>Kiểm tra line điện thoại 3917989 mất tone do cáp</p>	2025-10-22	2025-10-22	3	Chưa xong!	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2068	Sửa chử "H" trong "RACH" không sáng	12	7	<p><br></p>	2025-10-22	2025-10-22	3	Đang kt	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2069	Luân chuyển bộ đàm Kỹ thuật và bảo vệ	44	10	<p>Đã chuyển 2 đàm hư của buồng phòng cũ cho kế toán.</p><p>Chuyển đổi 1 đàm cho bảo vệ (Đàm bvhư.) thu về.</p>	2025-11-03	2025-11-03	3		completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2070	Sửa cáp điện thoại tầng 3	263	2	<p><br></p>	2025-11-03	2025-11-03	3	Đã xong	completed	\N	\N	\N	\N	2025-11-10 02:45:32.49416+00	\N	2025-11-10 02:45:32.49416+00
2082	Hoàn thành xử lý - Đầu ghi camera NGOẠI VI 1	353	7	Đầu ghi thường xuyên treo chức năng ghi hình	2025-11-17	2025-11-17	3	Kiểm tra tìm nguyên nhân,\nĐang theo dõi thiết bị\nĐã theo dõi 1 tuần không phát hiện tình trạng lặp lại.	completed	2025-11-17 08:51:57.326	19	{"source": "damage-report-completion", "handlerNotes": "Kiểm tra tìm nguyên nhân,\\nĐang theo dõi thiết bị\\nĐã theo dõi 1 tuần không phát hiện tình trạng lặp lại.", "damageReportId": 19, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-17 01:51:57.326+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2025-11-17 01:51:57.326+00
2102	Hoàn thành xử lý - Màn hình led Hoa đăng	6	2	Màn led hư 3 tấm led.\nLúc sắp bắt đầu hội nghị 8/3 điện lực.(6/3/26)	2026-03-06	2026-03-06	3	Hư led, thay 3 tấm led dự phòng.	completed	2026-03-06 14:27:32.805	46	{"source": "damage-report-completion", "handlerNotes": "Hư led, thay 3 tấm led dự phòng.", "damageReportId": 46, "previousStatus": 5}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-03-06 07:27:32.805+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-03-06 07:27:32.805+00
2105	Hoàn thành xử lý - Màn hình led Hoa đăng	6	2	Test màn led hoa đăng.	2026-03-18	2026-03-18	3	Hư 2 tấm led\nThay led dự phòng\nCòn tồn 18 tấm ok	completed	2026-03-18 14:43:50.123	53	{"source": "damage-report-completion", "damageReportId": 53, "previousStatus": 3}	159c2606-abc5-4006-9633-6926396c181b	2026-03-18 07:43:50.123+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-18 07:43:50.123+00
2106	Hoàn thành xử lý - Màn hình led Hoa đăng	6	2	Led hư 1 tấm bốc khói lúc trước diễn ra hội nghị Sở Công Thương	2026-03-20	2026-03-20	3	Hư 1 tấm led, thay led dự phòng.\nTồn led dự phòng 17 tấm	completed	2026-03-20 07:02:06.977	54	{"source": "damage-report-completion", "damageReportId": 54, "previousStatus": 1}	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 00:02:06.977+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 00:02:06.977+00
2107	Hoàn thành xử lý - Màn hình led Hoa cau	13	5	Thay đầu led Hoa cau (không bao gồm 2 card phát)	2026-03-20	2026-03-20	3	Đã xong, hoạt động bình thường	completed	2026-03-20 14:50:23.376	55	{"source": "damage-report-completion", "damageReportId": 55, "previousStatus": 1}	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 07:50:23.376+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 07:50:23.376+00
2108	Hoàn thành xử lý - Màn hình led Hoa cau	13	7	Kiểm trra màn led và kho dự phòng	2026-03-20	2026-03-20	3	-Màn led chính chết nhiều điểm ảnh (đốm, sâu). Tồn 2 tấm led màn chính + 1 nguồn.\n- 2 cánh gà bình thường. Không còn hàng dự phòng.\n	completed	2026-03-20 15:15:09.881	58	{"source": "damage-report-completion", "damageReportId": 58, "previousStatus": 1}	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 08:15:09.881+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 08:15:09.881+00
2109	Hoàn thành xử lý - Màn hình led Hoa sen trong	10	7	Kiểm tra màn led và kiểm hàng dự phòng	2026-03-20	2026-03-20	3	Màn led bình thường.\nTồn 3 tấm led + 1 nguồn.	completed	2026-03-20 15:15:18.041	57	{"source": "damage-report-completion", "damageReportId": 57, "previousStatus": 1}	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 08:15:18.041+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 08:15:18.041+00
2110	Hoàn thành xử lý - Màn hình led Hoa sen ngoài	11	7	Kiểm tra màn led, kho dự phòng.	2026-03-20	2026-03-20	3	Màn bình thường\nKhông tồn ki dự phòng	completed	2026-03-20 15:15:35.496	56	{"source": "damage-report-completion", "damageReportId": 56, "previousStatus": 1}	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 08:15:35.496+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-20 08:15:35.496+00
2112	Bảo trì định kỳ - Bảo trì định kỳ máy lạnh	355	1	Bảo trì máy lạnh định kỳ	2026-03-17	2026-03-22	6	Bảo trì nghiệm thu xong.	completed	2026-03-22 14:37:03.208	47	{"source": "damage-report-sync", "syncAt": "2026-03-22T07:37:03.208Z", "damageReportId": 47, "maintenanceBatchId": "batch-2025-11-18-1763430857529"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 07:37:03.208+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 07:37:03.208+00
2155	Bảo trì định kỳ - Bảo trì định kỳ - Bảo trì máy tính định kỳ	366	1	Bảo trì máy, vệ sinh, kiểm  tra tình trạng máy, backup dữ liệu	2026-03-22	2026-03-22	3		completed	2026-03-22 20:39:33.319	59	{"source": "damage-report-sync", "syncAt": "2026-03-22T13:39:33.319Z", "damageReportId": 59, "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00
2157	Bảo trì định kỳ - Bảo trì định kỳ - Bảo trì máy tính định kỳ	381	1	Bảo trì máy, vệ sinh, kiểm  tra tình trạng máy, backup dữ liệu	2026-03-22	2026-03-22	3		completed	2026-03-22 20:39:33.319	59	{"source": "damage-report-sync", "syncAt": "2026-03-22T13:39:33.319Z", "damageReportId": 59, "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00
2158	Bảo trì định kỳ - Bảo trì định kỳ - Bảo trì máy tính định kỳ	367	1	Bảo trì máy, vệ sinh, kiểm  tra tình trạng máy, backup dữ liệu	2026-03-22	2026-03-22	3		completed	2026-03-22 20:39:33.319	59	{"source": "damage-report-sync", "syncAt": "2026-03-22T13:39:33.319Z", "damageReportId": 59, "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00
2159	Bảo trì định kỳ - Bảo trì định kỳ - Bảo trì máy tính định kỳ	379	1	Bảo trì máy, vệ sinh, kiểm  tra tình trạng máy, backup dữ liệu	2026-03-22	2026-03-22	3		completed	2026-03-22 20:39:33.319	59	{"source": "damage-report-sync", "syncAt": "2026-03-22T13:39:33.319Z", "damageReportId": 59, "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00
2160	Bảo trì định kỳ - Bảo trì định kỳ - Bảo trì máy tính định kỳ	380	1	Bảo trì máy, vệ sinh, kiểm  tra tình trạng máy, backup dữ liệu	2026-03-22	2026-03-22	3		completed	2026-03-22 20:39:33.319	59	{"source": "damage-report-sync", "syncAt": "2026-03-22T13:39:33.319Z", "damageReportId": 59, "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00
2161	Bảo trì định kỳ - Bảo trì định kỳ - Bảo trì máy tính định kỳ	378	1	Bảo trì máy, vệ sinh, kiểm  tra tình trạng máy, backup dữ liệu	2026-03-22	2026-03-22	3		completed	2026-03-22 20:39:33.319	59	{"source": "damage-report-sync", "syncAt": "2026-03-22T13:39:33.319Z", "damageReportId": 59, "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00
2165	Bảo trì định kỳ - Bảo trì định kỳ - Bảo trì máy tính định kỳ	372	1	Bảo trì máy, vệ sinh, kiểm  tra tình trạng máy, backup dữ liệu	2026-03-22	2026-03-22	3		completed	2026-03-22 20:39:33.319	59	{"source": "damage-report-sync", "syncAt": "2026-03-22T13:39:33.319Z", "damageReportId": 59, "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00
2167	Bảo trì định kỳ - Bảo trì định kỳ - Bảo trì máy tính định kỳ	376	1	Bảo trì máy, vệ sinh, kiểm  tra tình trạng máy, backup dữ liệu	2026-03-22	2026-03-22	3		completed	2026-03-22 20:39:33.319	59	{"source": "damage-report-sync", "syncAt": "2026-03-22T13:39:33.319Z", "damageReportId": 59, "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00
2176	Hoàn thành xử lý - Bục nâng Hoa cau	361	2	Sửa bục nâng không hoạt động	2026-03-25	2026-03-25	6	Kỹ thuật sửa xong.	completed	2026-03-25 11:06:38.098	49	{"source": "damage-report-completion", "damageReportId": 49, "previousStatus": 1}	159c2606-abc5-4006-9633-6926396c181b	2026-03-25 04:06:38.098+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-25 04:06:38.098+00
2156	Bảo trì định kỳ - Bảo trì định kỳ - Bảo trì máy tính định kỳ	23	1	Bảo trì máy, vệ sinh, kiểm  tra tình trạng máy, backup dữ liệu	2026-03-22	2026-03-22	3		completed	2026-03-22 20:39:33.319	59	{"source": "damage-report-sync", "syncAt": "2026-03-22T13:39:33.319Z", "damageReportId": 59, "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00
2162	Bảo trì định kỳ - Bảo trì định kỳ - Bảo trì máy tính định kỳ	362	1	Bảo trì máy, vệ sinh, kiểm  tra tình trạng máy, backup dữ liệu	2026-03-22	2026-03-22	3		completed	2026-03-22 20:39:33.319	59	{"source": "damage-report-sync", "syncAt": "2026-03-22T13:39:33.319Z", "damageReportId": 59, "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00
2163	Bảo trì định kỳ - Bảo trì định kỳ - Bảo trì máy tính định kỳ	365	1	Bảo trì máy, vệ sinh, kiểm  tra tình trạng máy, backup dữ liệu	2026-03-22	2026-03-22	3		completed	2026-03-22 20:39:33.319	59	{"source": "damage-report-sync", "syncAt": "2026-03-22T13:39:33.319Z", "damageReportId": 59, "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00
2164	Bảo trì định kỳ - Bảo trì định kỳ - Bảo trì máy tính định kỳ	370	1	Bảo trì máy, vệ sinh, kiểm  tra tình trạng máy, backup dữ liệu	2026-03-22	2026-03-22	3		completed	2026-03-22 20:39:33.319	59	{"source": "damage-report-sync", "syncAt": "2026-03-22T13:39:33.319Z", "damageReportId": 59, "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00
2166	Bảo trì định kỳ - Bảo trì định kỳ - Bảo trì máy tính định kỳ	377	1	Bảo trì máy, vệ sinh, kiểm  tra tình trạng máy, backup dữ liệu	2026-03-22	2026-03-22	3		completed	2026-03-22 20:39:33.319	59	{"source": "damage-report-sync", "syncAt": "2026-03-22T13:39:33.319Z", "damageReportId": 59, "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00
2168	Bảo trì định kỳ - Bảo trì định kỳ - Bảo trì máy tính định kỳ	364	1	Bảo trì máy, vệ sinh, kiểm  tra tình trạng máy, backup dữ liệu	2026-03-22	2026-03-22	3		completed	2026-03-22 20:39:33.319	59	{"source": "damage-report-sync", "syncAt": "2026-03-22T13:39:33.319Z", "damageReportId": 59, "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00
2169	Bảo trì định kỳ - Bảo trì định kỳ - Bảo trì máy tính định kỳ	371	1	Bảo trì máy, vệ sinh, kiểm  tra tình trạng máy, backup dữ liệu	2026-03-22	2026-03-22	3		completed	2026-03-22 20:39:33.319	59	{"source": "damage-report-sync", "syncAt": "2026-03-22T13:39:33.319Z", "damageReportId": 59, "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00
2170	Bảo trì định kỳ - Bảo trì định kỳ - Bảo trì máy tính định kỳ	369	1	Bảo trì máy, vệ sinh, kiểm  tra tình trạng máy, backup dữ liệu	2026-03-22	2026-03-22	3		completed	2026-03-22 20:39:33.319	59	{"source": "damage-report-sync", "syncAt": "2026-03-22T13:39:33.319Z", "damageReportId": 59, "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00
2171	Bảo trì định kỳ - Bảo trì định kỳ - Bảo trì máy tính định kỳ	363	1	Bảo trì máy, vệ sinh, kiểm  tra tình trạng máy, backup dữ liệu	2026-03-22	2026-03-22	3		completed	2026-03-22 20:39:33.319	59	{"source": "damage-report-sync", "syncAt": "2026-03-22T13:39:33.319Z", "damageReportId": 59, "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00
2172	Bảo trì định kỳ - Bảo trì định kỳ - Bảo trì máy tính định kỳ	356	1	Bảo trì máy, vệ sinh, kiểm  tra tình trạng máy, backup dữ liệu	2026-03-22	2026-03-22	3		completed	2026-03-22 20:39:33.319	59	{"source": "damage-report-sync", "syncAt": "2026-03-22T13:39:33.319Z", "damageReportId": 59, "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00
2173	Bảo trì định kỳ - Bảo trì định kỳ - Bảo trì máy tính định kỳ	375	1	Bảo trì máy, vệ sinh, kiểm  tra tình trạng máy, backup dữ liệu	2026-03-22	2026-03-22	3		completed	2026-03-22 20:39:33.319	59	{"source": "damage-report-sync", "syncAt": "2026-03-22T13:39:33.319Z", "damageReportId": 59, "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00
2174	Bảo trì định kỳ - Bảo trì định kỳ - Bảo trì máy tính định kỳ	373	1	Bảo trì máy, vệ sinh, kiểm  tra tình trạng máy, backup dữ liệu	2026-03-22	2026-03-22	3		completed	2026-03-22 20:39:33.319	59	{"source": "damage-report-sync", "syncAt": "2026-03-22T13:39:33.319Z", "damageReportId": 59, "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00
2175	Bảo trì định kỳ - Bảo trì định kỳ - Bảo trì máy tính định kỳ	368	1	Bảo trì máy, vệ sinh, kiểm  tra tình trạng máy, backup dữ liệu	2026-03-22	2026-03-22	3		completed	2026-03-22 20:39:33.319	59	{"source": "damage-report-sync", "syncAt": "2026-03-22T13:39:33.319Z", "damageReportId": 59, "maintenanceBatchId": "batch-2025-11-18-1763457667195"}	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-22 13:39:33.319+00
2177	Test Màn hình led Hoa cau	13	7	Test màn led hoa cau.	2026-03-27	2026-03-27	3	Màn hình bình thường, không lỗi mới phát sinh	completed	2026-03-27 14:54:02.223	61	{"source": "damage-report-completion", "damageReportId": 61, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-03-27 07:54:02.223+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-03-27 07:54:02.223+00
2178	Hoàn thành xử lý - Bảng chữ HBRGRS tầng 6	12	2	Tủ điện đèn tầng 6 cháy CB điện.\nTủ nguồn đèn led cháy	2026-03-31	2026-03-31	6	Đã dọn đám cháy, Huy thanh kiểm tra sửa chữa.\nHuy thanh Đã thay nguồn và tủ.	completed	2026-03-31 02:23:43.941	62	{"source": "damage-report-completion", "damageReportId": 62, "previousStatus": 3}	159c2606-abc5-4006-9633-6926396c181b	2026-03-31 02:23:43.941+00	159c2606-abc5-4006-9633-6926396c181b	2026-03-31 02:23:43.941+00
2179	Hoàn thành xử lý - Máy lạnh Toshiba - Hoa Mai	384	2	Máy lạnh không có nguồn	2026-04-02	2026-04-02	6	Đứt dây nguồn, đấu lại dây nguồn. Máy hđ bình thường.	completed	2026-04-02 10:08:43.081	71	{"source": "damage-report-completion", "damageReportId": 71, "previousStatus": 3}	159c2606-abc5-4006-9633-6926396c181b	2026-04-02 10:08:43.081+00	159c2606-abc5-4006-9633-6926396c181b	2026-04-02 10:08:43.081+00
2180	Hoàn thành xử lý - Bộ máy vi tính Thúy - PKT	356	2	Máy không lên nguồn	2026-04-03	2026-04-03	2	Ổ ghim điện bị lỏng ko ăn điện, thay ổ ghim	completed	2026-04-03 02:32:38.921	72	{"source": "damage-report-completion", "damageReportId": 72, "previousStatus": 3}	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 02:32:38.921+00	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 02:32:38.921+00
2181	Hoàn thành xử lý - Máy lạnh Toshiba - Hoa Mai	384	2	Máy lạnh không có nguồn	2026-04-02	2026-04-03	6	Đứt dây nguồn, đấu lại dây nguồn. Máy hđ bình thường.	completed	2026-04-03 03:10:55.666	71	{"source": "damage-report-completion", "damageReportId": 71, "previousStatus": 3}	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 03:10:55.666+00	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 03:10:55.666+00
2182	Hoàn thành xử lý - Máy lạnh Hoa đăng sảnh đón	386	2	Máy lạnh ko lạnh. Chạy lúc rồi chớp đèn liên tục.	2026-04-03	2026-04-03	3	Kiểm tra, bơm gas	completed	2026-04-03 03:12:15.19	73	{"source": "damage-report-completion", "damageReportId": 73, "previousStatus": 3}	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 03:12:15.19+00	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 03:12:15.19+00
2183	Hoàn thành xử lý - Bộ máy vi tính Thúy - PKT	356	2	Máy không lên nguồn	2026-04-03	2026-04-03	2	Ổ ghim điện bị lỏng ko ăn điện, thay ổ ghim	completed	2026-04-03 03:23:27.665	72	{"source": "damage-report-completion", "damageReportId": 72, "previousStatus": 3}	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 03:23:27.665+00	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 03:23:27.665+00
2184	Hoàn thành xử lý - Máy lạnh Hoa đăng sảnh đón	386	2	Máy lạnh ko lạnh. Chạy lúc rồi chớp đèn liên tục.	2026-04-03	2026-04-03	3	Kiểm tra, bơm gas	completed	2026-04-03 10:28:11.159	73	{"source": "damage-report-completion", "damageReportId": 73, "previousStatus": 3}	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 03:28:11.159+00	159c2606-abc5-4006-9633-6926396c181b	2026-04-03 03:28:11.159+00
2185	Hoàn thành xử lý - Bộ đàm Phục Vụ (5)	47	10	Nhận 5 tai nghe từ Khiêm\nBàn giao lại cho Quầy bar sử dụng 1 đàm + 1 sạc + 1 tai nghe	2026-04-05	2026-04-05	4	Pv 5 đàm, sạc, tai nghe.\nBar 1 đàm, 1 sạc, 1 tai nghe	completed	2026-04-05 09:48:56.367	82	{"source": "damage-report-completion", "damageReportId": 82, "previousStatus": 1}	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 09:48:56.367+00	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 09:48:56.367+00
2186	Hoàn thành xử lý - Bộ đàm Quầy bar - Thu ngân (1)	46	10	Nhận 1 bộ đàm + 1 sạc + tai nghe từ Phục vụ (Hiền)	2026-04-05	2026-04-05	3	Nhận 1 đàm, sạc, tai nghe	completed	2026-04-05 09:49:55.88	81	{"source": "damage-report-completion", "damageReportId": 81, "previousStatus": 1}	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 09:49:55.88+00	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 09:49:55.88+00
2187	Hoàn thành xử lý - Màn hình led Hoa đăng	6	2	Màn led hư 1 tấm.	2026-04-05	2026-04-05	3	Thay led dự phòng. Bình thường	completed	2026-04-05 09:53:41.877	75	{"source": "damage-report-completion", "damageReportId": 75, "previousStatus": 1}	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 09:53:41.877+00	159c2606-abc5-4006-9633-6926396c181b	2026-04-05 09:53:41.877+00
2188	Hoàn thành xử lý - Máy lạnh Hoa sen Daikin	387	2	Máy lạnh sảnh trước có 1 dàn lạnh kêu to	2026-04-07	2026-04-07	\N	Daikin đã kiểm tra. Máy hết kêu và hoạt động bình thường	completed	2026-04-07 01:55:03.363	104	{"source": "damage-report-completion", "damageReportId": 104, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 01:55:03.363+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 01:55:03.363+00
2189	Hoàn thành thay CB Màn hình led Hoa cau	13	2	CB điện Màn led hoa cau nhá điện khi bật.	2026-04-07	2026-04-07	3	Thay CB điện cho màn led.	completed	2026-04-07 04:06:42.876	77	{"source": "damage-report-completion", "damageReportId": 77, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 04:06:42.876+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-07 04:06:42.876+00
2190	Hoàn thành xử lý - Bộ máy vi tính Tú - PKT	23	2	Máy tính không kết nối máy in, không in được	2026-04-08	2026-04-08	3	Fix Kaspersky chặn mạng lan.	completed	2026-04-08 01:01:09.125	111	{"source": "damage-report-completion", "damageReportId": 111, "previousStatus": 3}	159c2606-abc5-4006-9633-6926396c181b	2026-04-08 01:01:09.125+00	159c2606-abc5-4006-9633-6926396c181b	2026-04-08 01:01:09.125+00
2191	Hoàn thành chuyển tivi lên phòng họp	383	10	Dời tivi lên phòng họp để sử dụng cho các cuộc họp trực tuyến	2026-04-08	2026-04-08	3	Đã hoàn thành, sử dụng bình thường	completed	2026-04-08 03:09:07.895	114	{"source": "damage-report-completion", "damageReportId": 114, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 03:09:07.895+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 03:09:07.895+00
2192	Hoàn thành xử lý - Bộ máy vi tính mượn HBS (KD2)	370	2	Máy tính không kết nối với máy in màu, không in được thực đơn	2026-04-07	2026-04-08	3	Đã cài đặt xong	completed	2026-04-08 09:15:58.635	110	{"source": "damage-report-completion", "damageReportId": 110, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 09:15:58.635+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-08 09:15:58.635+00
2193	Hoàn thành xử lý - Tivi  P204	26	7	Tivi bị hột mè	2026-04-03	2026-04-09	2	Phòng có khách	completed	2026-04-09 01:54:44.962	69	{"source": "damage-report-completion", "damageReportId": 69, "previousStatus": 3}	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-09 01:54:44.962+00	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-09 01:54:44.962+00
2194	Hoàn thành xử lý - Bộ máy vi tính Thúy - PKT	356	2	Máy không lên nguồn	2026-04-03	2026-04-10	2	Ổ ghim điện bị lỏng ko ăn điện, thay ổ ghim	completed	2026-04-10 08:42:47.522	72	{"source": "damage-report-completion", "damageReportId": 72, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 01:42:47.522+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 01:42:47.522+00
2195	Hoàn thành xử lý - Máy lạnh Toshiba - Hoa Mai	384	2	Máy lạnh không có nguồn	2026-04-02	2026-04-10	6	Đứt dây nguồn, đấu lại dây nguồn. Máy hđ bình thường.	completed	2026-04-10 08:43:49.26	71	{"source": "damage-report-completion", "damageReportId": 71, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 01:43:49.26+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 01:43:49.26+00
2199	Hoàn thành xử lý - Máy lạnh Toshiba RAS-H81C3KCVG-V	355	7	Kiem tra trung lap su kien	2026-04-10	2026-04-10	\N	Đây là sự kiện test, không có thật	completed	2026-04-10 04:26:46.025	\N	{"source": "damage-report-completion", "damageReportId": 134, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 04:26:46.025+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 04:26:46.025+00
2201	Hoàn thành xử lý - Máy lạnh Toshiba RAS-H81C3KCVG-V	355	7	Test sự kiện	2026-04-10	2026-04-10	6	Kiểm tra, không có thật	completed	2026-04-10 11:39:35.86	136	{"source": "damage-report-completion", "damageReportId": 136, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 04:39:35.86+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 04:39:35.86+00
2202	Hoàn thành sửa chữa bục nâng hoa cau	361	2	Bục nâng Hoa cau hư không sử dụng đc.	2026-04-07	2026-04-10	6	Cháy motor. Kỹ thuật hẹn t3, ngày 7/4/25 - Đã mang thợ kiểm tra - Đã sửa motor chưa lắp - Đang lắp motor - Đã sửa xong, hđbt	completed	2026-04-10 11:42:51.738	83	{"source": "damage-report-completion", "damageReportId": 83, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 04:42:51.738+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 04:42:51.738+00
2203	Hoàn thành xử lý - Màn hình led Hoa cau	13	2	Màn led hoa đăng hư 2 tấm led	2026-04-10	2026-04-10	3	Hư jack nguồn, đã sửa. Dời một số tấm led hư ở giữa xuống góc. Hđbt	completed	2026-04-10 10:43:35.357	137	{"source": "damage-report-completion", "damageReportId": 137, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 10:43:35.357+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 10:43:35.357+00
2204	Hoàn thành xử lý - Két sắt P101	391	2	Két sắt hư bản lề	2026-04-10	2026-04-10	3	Bản lề bị lỏng chốt gài, đã cố định lại, hđbt	completed	2026-04-10 23:23:27.13	139	{"source": "damage-report-completion", "damageReportId": 139, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 23:23:27.13+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 23:23:27.13+00
2205	Hoàn thành xử lý - Bảng chữ HBRGRS tầng 6	12	5	Hư chữ "H" trong chữ RẠCH	2026-04-10	2026-04-11	3	Nhờ Huy Thanh kiểm tra. Hẹn 9/7 kiểm tra. Hẹn 10/4\nHuy Thanh Nguồn, hđbt	completed	2026-04-11 13:26:10.647	112	{"source": "damage-report-completion", "damageReportId": 112, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 06:25:37.661+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 06:26:12.766881+00
2207	Hoàn thành xử lý - Máy lạnh Toshiba RAS-18SKCV	394	10	Tháo board nóng cho Phòng Hoa hồng mượn.	2026-04-11	2026-04-11	3	Đã tháo board. Máy ko hoạt động.	completed	2026-04-11 08:41:42.92	143	{"source": "damage-report-completion", "damageReportId": 143, "previousStatus": 1}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 08:41:42.92+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 08:41:42.92+00
2208	Hoàn thành xử lý - Máy lạnh Toshiba RAS 18SKCV	395	5	Thay board nóng Máy lạnh Hoa hồng.	2026-04-11	2026-04-11	3	Đã thay xong - > Bình thường	completed	2026-04-11 16:12:00.732	144	{"source": "damage-report-completion", "damageReportId": 144, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:12:00.732+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:12:00.732+00
2206	Hoàn thành xử lý - Máy lạnh Toshiba RAS 18SKCV	395	12	Máy lỗi chớp đèn đỏ. Lúc chuẩn bị hội nghị	2026-04-11	2026-04-11	3	Báo daikin tình trạng. Hẹn sáng 4/4 xử lý.\nSáng 4/4 daikin qua kiểm tra báo hư board -> Mượn board Phòng họp nhỏ sử dụng.\n11/4 Daikn  thay board mới, hđbt.	completed	2026-04-11 16:15:00.715	142	{"source": "damage-report-completion", "damageReportId": 142, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 08:32:15.023+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:15:03.186656+00
2209	Hoàn thành xử lý - Máy lạnh Toshiba RAS-18SKCV	394	10	Trả board nóng máy lạnh	2026-04-11	2026-04-11	3	Đã xong, hoạt động bình thường.	completed	2026-04-11 16:38:08.778	145	{"source": "damage-report-completion", "damageReportId": 145, "previousStatus": 1}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:38:08.778+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:38:08.778+00
2210	Hoàn thành xử lý - Bộ máy vi tính Tú - PKT	23	2	Máy tính không kết nối máy in nữa rồi	2026-04-11	2026-04-11	3	Đã xử lý xong	completed	2026-04-11 16:41:56.613	140	{"source": "damage-report-completion", "damageReportId": 140, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:41:56.613+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:41:56.613+00
2212	Hoàn thành xử lý - Tivi P503	212	2	Tivi tự kích hoạt kênh digital, chuyển về analog	2026-04-13	2026-04-13	3	Tivi tự kích hoạt kênh digital, chuyển về analog 	completed	2026-04-13 01:12:40.497	200	{"source": "damage-report-completion", "damageReportId": 200, "previousStatus": 1}	159c2606-abc5-4006-9633-6926396c181b	2026-04-13 01:12:40.497+00	159c2606-abc5-4006-9633-6926396c181b	2026-04-13 01:12:40.497+00
2213	Hoàn thành xử lý - Máy in màu EPSON L310	397	2	Máy nghẹt đầu phun, clean đầu phun	2026-04-13	2026-04-13	3	Máy nghẹt đầu phun, clean đầu phun. Đầu phun đã nghẹt nặng không xử lý được, sử dụng tạm với chất lượng tương đối.	completed	2026-04-13 03:26:15.323	196	{"source": "damage-report-completion", "damageReportId": 196, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-13 03:26:15.323+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-13 03:26:15.323+00
2198	Hoàn thành xử lý - Máy lạnh Toshiba RAS-H81C3KCVG-V	355	7	Kiem tra trung lap su kien	2026-04-10	2026-04-10	\N	Đây là sự kiện test, không có thật	completed	2026-04-10 04:21:36.605	\N	{"source": "damage-report-completion", "damageReportId": 134, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 04:21:36.605+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 04:21:36.605+00
2200	Hoàn thành xử lý - Máy lạnh Toshiba RAS-H81C3KCVG-V	355	7	Kiem tra trung lap su kien (5)	2026-04-10	2026-04-10	\N	Đây là sự kiện test, không có thật	completed	2026-04-10 11:35:47.094	\N	{"source": "damage-report-completion", "damageReportId": 134, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 04:27:57.883+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-10 04:35:48.823892+00
2214	Hoàn thành xử lý - Điện thoại P410	288	12	Điện thoại tự động gọi số tổng đài, có tiếng chuông chờ	2026-04-03	2026-04-14	2	Tiếp tục theo dõi	completed	2026-04-14 00:55:00.329	70	{"source": "damage-report-completion", "damageReportId": 70, "previousStatus": 3}	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-14 00:55:00.329+00	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-14 00:55:00.329+00
2215	Hoàn thành xử lý - Bộ máy vi tính Tú - PKT	23	2	không kết nối được máy in	2026-04-14	2026-04-14	3	Lỗi spooler, Upadate windows	completed	2026-04-14 14:42:37.214	207	{"source": "damage-report-completion", "damageReportId": 207, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 07:42:37.214+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 07:42:37.214+00
2075	Hoàn thành xử lý - CAM 10-NV2 (Bx KS)	17	9	Camera mất hình	2025-11-13	2026-04-15	3	Kiểm tra đường dây và camera	completed	2026-04-15 01:42:06.527	17	{"source": "damage-report-completion", "handlerNotes": "Kiểm tra đường dây và camera, \\nCamera đứt cáp và hư balun", "damageReportId": 17, "previousStatus": 3}	159c2606-abc5-4006-9633-6926396c181b	2025-11-13 09:39:23.473+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 01:42:08.579057+00
2217	Hoàn thành xử lý - Hệ thống đèn sân khấu Hoa cau	393	12	Đèn mặt sân khấu hư 1 cây	2026-04-15	2026-04-15	3	Tháo đèn xuống không làm ảnh hướng các đèn khác. Ánh sáng đủ dùng. Đã báo Phan Thảo kiểm tra sửa chữa.	completed	2026-04-15 01:37:44.147	141	{"source": "damage-report-completion", "damageReportId": 141, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 01:37:44.147+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 01:37:44.147+00
2219	Thu gôm, vệ sinh các hố nước thảy, bễ mỡ	399	1	Thu gôm, vệ sinh các hố nước thảy, bễ mỡ	2026-04-15	2026-04-15	3		completed	2026-04-15 07:00:00	\N	{"assignedStaffId": 6, "maintenanceType": "internal", "maintenanceBatchId": "batch-2026-04-15-1776217824281"}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 04:13:16.619+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 04:13:24.762038+00
2220	Hệ thống PCCC	390	1	Bảo trì hệ thống	2026-04-15	2026-04-15	6	Đã xong	completed	2026-04-15 07:00:00	221	{"assignedStaffId": 6, "maintenanceType": "internal", "rescheduleHistory": [{"reason": "dời lịch", "toDate": "2026-04-25", "fromDate": "2026-04-24", "rescheduledAt": "2026-04-10T04:00:23.776Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "test", "toDate": "2026-04-15", "fromDate": "2026-04-25", "rescheduledAt": "2026-04-15T04:14:39.318Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "quay lại bảo trì", "toDate": "2026-04-15", "fromDate": "2026-05-14", "rescheduledAt": "2026-04-15T04:51:08.923Z", "rescheduledBy": "lhkhiem@gmail.com"}, {"reason": "Quay lại để test", "toDate": "2026-04-15", "fromDate": "2026-05-14", "rescheduledAt": "2026-04-15T04:57:56.553Z", "rescheduledBy": "lhkhiem@gmail.com"}], "maintenanceBatchId": "batch-2026-04-10-1775793592116"}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 04:37:08.874+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 04:58:54.949223+00
2216	Bảo trì định kỳ - Hố vi sinh xử lý nước thảy	392	1	Báo cáo bảo trì định kỳ cho đợt: Xử lý bồn vi sinh nước thảy. Ghi chú: Lập báo cáo thủ công từ danh sách bảo trì	2026-04-15	2026-04-17	15		completed	2026-04-15 07:00:00	222	{"assignedStaffId": 15, "maintenanceType": "internal", "maintenanceBatchId": "batch-2026-04-11-1775891024445"}	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-15 01:28:15.884+00	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-17 01:17:48.70796+00
2211	Bảo trì định kỳ - Hố vi sinh xử lý nước thảy	392	1	Số nước 123	2026-04-19	2026-04-19	15	Xong. Chỉ số 123	completed	2026-04-19 00:00:00	209	{"assignedStaffId": 15, "maintenanceType": "internal", "rescheduleHistory": [{"reason": "test", "toDate": "2026-04-14", "fromDate": "2026-04-14", "rescheduledAt": "2026-04-14T15:57:41.928Z", "rescheduledBy": "lhkhiem@gmail.com"}], "maintenanceBatchId": "batch-2026-04-11-1775899621533"}	dd27e8f9-50a0-4de0-9a5a-9b9f1396f9c9	2026-04-12 00:16:42.628+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 09:53:32.609463+00
2218	Bảo trì định kỳ - Hố vi sinh xử lý nước thảy	392	1	Báo cáo bảo trì định kỳ cho đợt: Xử lý bồn vi sinh nước thảy. Ghi chú: Lập báo cáo thủ công từ danh sách bảo trì	2026-04-17	2026-04-17	15	Bảo trì xong	completed	2026-04-17 07:00:00	222	{"assignedStaffId": 15, "maintenanceType": "internal", "rescheduleHistory": [{"reason": "sớm", "toDate": "2026-04-17", "fromDate": "2026-04-17", "rescheduledAt": "2026-04-17T00:59:19.706Z", "rescheduledBy": "lhkhiem@gmail.com"}], "maintenanceBatchId": "batch-2026-04-11-1775891024445"}	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-15 04:10:55.409+00	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-17 01:17:48.70796+00
2221	Hoàn thành xử lý - CAM 30-KS (Cua sau ks)	398	2	Tín hiệu không ổn định	2026-04-17	2026-04-17	3	Chạm dây tín hiệu dưới hầm	completed	2026-04-17 09:44:57.679	211	{"source": "damage-report-completion", "damageReportId": 211, "previousStatus": 1}	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-17 09:44:57.679+00	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-17 09:44:57.679+00
2224	Hoàn thành xử lý - Bộ máy vi tính Trang - PKT	365	2	Xử lý máy tính không có internet	2026-04-20	2026-04-20	2	Lỏng dây LAN	completed	2026-04-20 02:24:03.165	238	{"source": "damage-report-completion", "damageReportId": 238, "previousStatus": 1}	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-20 02:24:03.165+00	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-20 02:24:03.165+00
2222	Hoàn thành xử lý - CAM 3 - NhaHang (San sau Hoa Cau)	388	2	Mất hình. Nguồn đủ 12V. Không có tín hiệu từ dây	2026-04-17	2026-04-17	3	Đứt dây tín hiệu trên tầng 2 nhà hàng tròn	completed	2026-04-17 09:45:55.809	131	{"source": "damage-report-completion", "damageReportId": 131, "previousStatus": 1}	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-17 09:45:55.809+00	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-17 09:45:55.809+00
2223	Hoàn thành xử lý - CAM 12-NV3 (Cổng NTH)	400	2	Camera bị rơi	2026-04-19	2026-04-19	3	Đã xử lý xong	in_progress	2026-04-19 09:43:35.992	232	{"source": "damage-report-completion", "damageReportId": 232, "previousStatus": 3}	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 09:43:35.992+00	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 10:15:31.496533+00
2225	Hoàn thành xử lý - CAM 29-NV3 (Nha Banh)	404	2	Xử lý camera mất màu	2026-04-20	2026-04-20	2		completed	2026-04-20 03:06:40.818	236	{"source": "damage-report-completion", "damageReportId": 236, "previousStatus": 1}	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-20 03:06:40.818+00	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-20 03:06:40.818+00
2226	Hoàn thành xử lý - CAM 28-PLV(Nha xe Hoa sen)	403	2	Xử lý camera bị lệch góc quay	2026-04-20	2026-04-20	2		completed	2026-04-20 03:06:54.168	235	{"source": "damage-report-completion", "damageReportId": 235, "previousStatus": 1}	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-20 03:06:54.168+00	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-20 03:06:54.168+00
\.


--
-- Data for Name: EventType; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."EventType" ("ID", "Name", "Code", "Description", "Category", "Color", "IsReminder", "DefaultStatus", "DefaultLeadTimeDays") FROM stdin;
1	Bảo trì	\N	\N	\N	\N	f	planned	\N
2	Sửa chữa	\N	\N	\N	\N	f	planned	\N
3	Nâng cấp	\N	\N	\N	\N	f	planned	\N
5	Thay thế linh kiện	\N	\N	\N	\N	f	planned	\N
6	Cập nhật mới	\N	\N	\N	\N	f	planned	\N
7	Kiểm tra, vận hành	\N	\N	\N	\N	f	planned	\N
8	Lắp đặt mới	\N	\N	\N	\N	f	planned	\N
9	Thay mới thiết bị	\N	\N	\N	\N	f	planned	\N
10	Luân chuyển	\N	\N	\N	\N	f	planned	\N
11	Hư hỏng/bất thường	\N	\N	\N	\N	f	planned	\N
12	Xử lý dùng tạm	\N	\N	\N	\N	f	planned	\N
\.


--
-- Data for Name: Location; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Location" ("ID", "Name") FROM stdin;
1	Phòng khách sạn
2	Lễ tân
3	Tầng 6 - Nhà giặt
4	Tầng 6 - Sân thượng
5	Bếp Hoa cau
6	Phòng kinh doanh
7	Sảnh Hoa cau
8	Sảnh Hoa đăng
9	Sảnh Hoa sen
10	Phòng Hoa mai
11	Phòng Hoa hồng
12	Phòng Hoa phượng
13	Phòng Hoa quỳnh
14	Hoa hướng dương
15	Bếp Buffet
16	Bếp Hoa sen
17	Bếp Ẩm thực
18	Hoa sứ
19	Phòng Kế toán
20	Phòng Cô Việt Nữ
21	Phòng BGĐ
22	Phòng Họp lớn
23	Phòng Họp nhỏ
24	Phòng Hành chánh
25	Phòng Kỹ thuật
26	Nhà xử lý nước thảy
27	Khác
28	Khu vực dọc đường Cô Bắc
29	Khu Ẩm thực
30	Phòng Server
31	Buồng phòng T5
32	Nhà Bảo vệ cổng 1
33	Quầy bar
34	Khu vực sân vườn
35	Nhà xe Hoa sen
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Notification" ("ID", "Title", "Content", "Type", "Category", "TargetUrl", "StaffId", "IsRead", "CreatedBy", "CreatedAt") FROM stdin;
20	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: vsdfsdf sdfsd fsdf s	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 11:02:38.378731
19	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: hghhhhhh	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 11:00:55.219406
21	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: jjjjjjjjjjjjjjjjjjjj	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 11:04:28.7608
18	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: hhhhhhhhhhhh	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 10:56:47.461644
1	Có 1 bảo trì sắp đến hạn 📅	Có 1 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-11 08:48:54.29578
2	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: Thay board nóng Máy lạnh Hoa hồng.	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:10:53.178283
3	Báo cáo đang được xử lý 🛠️	Lê Hoàng Khiêm đang xử lý báo cáo: Thay board nóng Máy lạnh Hoa hồng....	report	in_progress	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:11:29.390952
4	Báo cáo đã hoàn thành ✅	Báo cáo: Thay board nóng Máy lạnh Hoa hồng.... đã được hoàn thành.	report	completed	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:12:02.46771
5	Báo cáo đang được xử lý 🛠️	Lê Hoàng Khiêm đang xử lý báo cáo: Máy lỗi chớp đèn đỏ. Lúc chuẩn bị hội nghị...	report	in_progress	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:12:56.877737
6	Báo cáo đã hoàn thành ✅	Báo cáo: Máy lỗi chớp đèn đỏ. Lúc chuẩn bị hội nghị... đã được hoàn thành.	report	completed	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:15:02.359061
7	Sự kiện hoàn thành ✅	Lê Hoàng Khiêm đã hoàn thành: Hoàn thành xử lý - Máy lạnh Toshiba RAS 18SKCV	system	completed	/dashboard/events	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:15:03.247935
8	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: Trả board nóng máy lạnh	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:22:16.179782
9	Có 2 bảo trì sắp đến hạn 📅	Có 2 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-11 09:27:16.874142
10	Báo cáo đã hoàn thành ✅	Báo cáo: Trả board nóng máy lạnh... đã được hoàn thành.	report	completed	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:38:10.458079
11	Báo cáo đã hoàn thành ✅	Báo cáo: Máy tính không kết nối máy in nữa rồi... đã được hoàn thành.	report	completed	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 09:41:58.369027
12	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: Hoàn thanmhf	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 10:44:26.92028
13	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: ttttttttttt	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 10:48:52.684033
14	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: ttttttttt	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 10:50:01.164953
15	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: tttttttttttt	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 10:54:25.838989
16	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: fffffffffffffffffff	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 10:54:43.210631
17	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: test	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-11 10:55:22.855645
22	Có 2 bảo trì sắp đến hạn 📅	Có 2 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-11 13:13:49.522213
23	Có 2 bảo trì sắp đến hạn 📅	Có 2 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-11 13:14:07.793602
24	Có 2 bảo trì sắp đến hạn 📅	Có 2 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-11 13:14:33.402241
26	Báo cáo hư hỏng mới ⚠️	Dương Hoàng Trang: Số nước 123	report	new	/dashboard/damage-reports	\N	t	dd27e8f9-50a0-4de0-9a5a-9b9f1396f9c9	2026-04-12 00:16:44.624378
25	Có 2 bảo trì sắp đến hạn 📅	Có 2 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-12 00:11:02.968865
27	Có 1 bảo trì sắp đến hạn 📅	Có 1 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-12 00:48:21.071055
28	Báo cáo đã hoàn thành ✅	Báo cáo: Số nước 123... đã được hoàn thành.	report	completed	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 00:50:32.123184
29	Bảo trì đã thực hiện 🔧	Dương Hoàng Trang đã hoàn thành bảo trì: Theo dõi chỉ số nước thảy	maintenance	completed	/dashboard/maintenance	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 00:50:33.012234
30	Có 2 bảo trì sắp đến hạn 📅	Có 2 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-12 01:04:57.155708
31	Báo cáo hư hỏng mới ⚠️	Nguyễn Thị Hạnh: DẸP TOÀN BỘ TRANGTRI  - CỔNG, LỐI ĐI - KHÁCH TỰ TRANG TRÍ MANG VÀO	report	new	/dashboard/damage-reports	\N	t	2240c223-f17f-41b0-bc48-fe421f619f5e	2026-04-12 03:50:09.6764
32	Báo cáo hư hỏng mới ⚠️	Nguyễn Thị Hạnh: DẸP TOÀN BỘ TRANGTRI  - CỔNG, LỐI ĐI - KHÁCH TỰ TRANG TRÍ MANG VÀO	report	new	/dashboard/damage-reports	\N	t	2240c223-f17f-41b0-bc48-fe421f619f5e	2026-04-12 03:50:11.145817
33	Báo cáo hư hỏng mới ⚠️	Nguyễn Thị Hạnh: DẸP TOÀN BỘ TRANGTRI  - CỔNG, LỐI ĐI - KHÁCH TỰ TRANG TRÍ MANG VÀO	report	new	/dashboard/damage-reports	\N	t	2240c223-f17f-41b0-bc48-fe421f619f5e	2026-04-12 03:50:12.036169
34	Có 2 bảo trì sắp đến hạn 📅	Có 2 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-12 03:55:25.984
35	Có 2 bảo trì sắp đến hạn 📅	Có 2 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-12 03:55:31.648767
36	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: đâsdasd	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 04:15:47.796612
37	Báo cáo hư hỏng mới ⚠️	Nguyễn Thanh Hiền: test thông báo	report	new	/dashboard/damage-reports	\N	t	2a0fbc05-83e4-4d21-a867-8c54d3509ff6	2026-04-12 07:46:06.446167
38	Báo cáo hư hỏng mới ⚠️	Nguyễn Thanh Hiền: test 2	report	new	/dashboard/damage-reports	\N	t	2a0fbc05-83e4-4d21-a867-8c54d3509ff6	2026-04-12 07:49:34.521079
39	Báo cáo hư hỏng mới ⚠️	Nguyễn Thanh Hiền: t1	report	new	/dashboard/damage-reports	\N	t	2a0fbc05-83e4-4d21-a867-8c54d3509ff6	2026-04-12 07:56:56.996862
40	Có 2 bảo trì sắp đến hạn 📅	Có 2 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-12 08:04:13.239496
41	Báo cáo hư hỏng mới ⚠️	Nguyễn Thanh Hiền: t2	report	new	/dashboard/damage-reports	\N	t	2a0fbc05-83e4-4d21-a867-8c54d3509ff6	2026-04-12 08:08:44.193273
42	Có 2 bảo trì sắp đến hạn 📅	Có 2 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-12 08:12:21.575826
43	Báo cáo hư hỏng mới ⚠️	Nguyễn Thanh Hiền: t1	report	new	/dashboard/damage-reports	\N	t	2a0fbc05-83e4-4d21-a867-8c54d3509ff6	2026-04-12 08:17:00.695731
44	Báo cáo hư hỏng mới ⚠️	Nguyễn Thanh Hiền: t2	report	new	/dashboard/damage-reports	\N	t	2a0fbc05-83e4-4d21-a867-8c54d3509ff6	2026-04-12 08:17:42.919774
45	Báo cáo hư hỏng mới ⚠️	Nguyễn Thanh Hiền: t3	report	new	/dashboard/damage-reports	\N	t	2a0fbc05-83e4-4d21-a867-8c54d3509ff6	2026-04-12 08:18:20.055381
46	Báo cáo hư hỏng mới ⚠️	Nguyễn Thanh Hiền: t4	report	new	/dashboard/damage-reports	\N	t	2a0fbc05-83e4-4d21-a867-8c54d3509ff6	2026-04-12 08:19:33.646991
47	Báo cáo hư hỏng mới ⚠️	Nguyễn Thanh Hiền: t5	report	new	/dashboard/damage-reports	\N	t	2a0fbc05-83e4-4d21-a867-8c54d3509ff6	2026-04-12 08:20:29.795732
48	Báo cáo hư hỏng mới ⚠️	Nguyễn Thanh Hiền: 66	report	new	/dashboard/damage-reports	\N	t	2a0fbc05-83e4-4d21-a867-8c54d3509ff6	2026-04-12 08:25:29.168356
49	Có 2 bảo trì sắp đến hạn 📅	Có 2 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-12 08:31:51.140525
50	Báo cáo hư hỏng mới ⚠️	Nguyễn Thanh Hiền: t1	report	new	/dashboard/damage-reports	\N	t	2a0fbc05-83e4-4d21-a867-8c54d3509ff6	2026-04-12 08:34:49.253479
51	Báo cáo hư hỏng mới ⚠️	Nguyễn Thanh Hiền: t2	report	new	/dashboard/damage-reports	\N	t	2a0fbc05-83e4-4d21-a867-8c54d3509ff6	2026-04-12 08:37:58.261328
52	Báo cáo hư hỏng mới ⚠️	Nguyễn Thanh Hiền: t3	report	new	/dashboard/damage-reports	\N	t	2a0fbc05-83e4-4d21-a867-8c54d3509ff6	2026-04-12 08:44:50.224601
53	Báo cáo hư hỏng mới ⚠️	Nguyễn Thanh Hiền: t4	report	new	/dashboard/damage-reports	\N	t	2a0fbc05-83e4-4d21-a867-8c54d3509ff6	2026-04-12 08:45:23.837681
54	Báo cáo hư hỏng mới ⚠️	Nguyễn Thanh Hiền: t4	report	new	/dashboard/damage-reports	\N	t	2a0fbc05-83e4-4d21-a867-8c54d3509ff6	2026-04-12 08:46:51.587467
55	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: t5	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 08:47:27.847525
56	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: t6	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 08:48:11.041034
57	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: t1	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 08:49:36.014034
58	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: t2	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 08:51:36.000659
59	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: t3	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 08:52:24.657833
60	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: t4	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 08:52:54.035575
61	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: t5	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 08:53:10.730293
62	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: t6	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 08:54:00.755149
63	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: t7	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 08:54:45.952132
64	Có 2 bảo trì sắp đến hạn 📅	Có 2 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-12 08:56:08.479199
65	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: t1	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 09:03:40.327525
66	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: t2	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 09:03:54.309668
67	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: t2	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 09:05:40.608745
68	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: t1	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 09:08:03.711543
69	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: t2	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 09:14:46.589573
70	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: t3	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 09:33:50.388642
71	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: t1	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 09:40:02.545535
72	Có 2 bảo trì sắp đến hạn 📅	Có 2 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-12 09:55:10.078845
73	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: t2	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 09:55:36.0917
74	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: t3	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 09:58:32.743098
75	Có 2 bảo trì sắp đến hạn 📅	Có 2 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-12 10:22:02.766502
76	Có 2 bảo trì sắp đến hạn 📅	Có 2 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-12 10:22:32.060039
88	Báo cáo đã hoàn thành ✅	Báo cáo: Máy in Bill Thu Ngân lỗi không in ra bill... đã được hoàn thành.	report	completed	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-13 00:58:01.151727
91	Báo cáo đã hoàn thành ✅	Báo cáo: Tivi nhiễu kênh... đã được hoàn thành.	report	completed	/dashboard/damage-reports	3	t	159c2606-abc5-4006-9633-6926396c181b	2026-04-13 01:12:39.934969
92	Báo cáo hư hỏng mới ⚠️	Ngô Thanh Tuyền: Đàm hư	report	new	/dashboard/damage-reports	\N	t	159c2606-abc5-4006-9633-6926396c181b	2026-04-13 01:15:57.846589
93	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Đàm hư	report	new	/dashboard/damage-reports	3	t	159c2606-abc5-4006-9633-6926396c181b	2026-04-13 01:15:58.524479
77	Có 2 bảo trì sắp đến hạn 📅	Có 2 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-12 10:22:46.520487
78	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: t1	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 10:23:48.579171
79	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: t2	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 10:25:41.395571
80	Báo cáo hư hỏng mới ⚠️	Nguyễn Thị Hạnh: ĐỀ NGHỊ SỬA MÁY IN MÀU GẤP - LÝ DO KÉO KO ĐỀU MÀU	report	new	/dashboard/damage-reports	\N	t	2240c223-f17f-41b0-bc48-fe421f619f5e	2026-04-12 10:42:02.784369
81	Báo cáo hư hỏng mới ⚠️	Nguyễn Thị Hạnh: ĐỀ NGHỊ SỬA MÁY IN MÀU GẤP - LÝ DO KÉO KO ĐỀU MÀU	report	new	/dashboard/damage-reports	\N	t	2240c223-f17f-41b0-bc48-fe421f619f5e	2026-04-12 10:42:04.447715
82	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: T1	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 10:55:05.25885
83	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: T1	report	new	/dashboard/damage-reports	6	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-12 10:55:05.960174
84	Có 1 bảo trì sắp đến hạn 📅	Có 1 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-13 00:21:14.088911
85	Báo cáo đã hoàn thành ✅	Báo cáo: DẸP TOÀN BỘ TRANGTRI  - CỔNG, LỐI ĐI - KHÁCH TỰ TR... đã được hoàn thành.	report	completed	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-13 00:51:15.535962
86	Báo cáo hư hỏng mới ⚠️	Thu Ngân: Máy in Bill Thu Ngân lỗi không in ra bill	report	new	/dashboard/damage-reports	\N	t	939462c9-dfc3-4721-b7e4-78b50203369b	2026-04-13 00:57:16.3839
87	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Máy in Bill Thu Ngân lỗi không in ra bill	report	new	/dashboard/damage-reports	3	t	939462c9-dfc3-4721-b7e4-78b50203369b	2026-04-13 00:57:17.117126
89	Báo cáo hư hỏng mới ⚠️	Trần Văn Đen: Tivi nhiễu kênh	report	new	/dashboard/damage-reports	\N	t	159c2606-abc5-4006-9633-6926396c181b	2026-04-13 01:09:55.257997
90	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Tivi nhiễu kênh	report	new	/dashboard/damage-reports	3	t	159c2606-abc5-4006-9633-6926396c181b	2026-04-13 01:09:55.736667
94	Báo cáo đang được xử lý 🛠️	Lê Hoàng Khiêm đang xử lý báo cáo: Đàm hư...	report	in_progress	/dashboard/damage-reports	3	t	159c2606-abc5-4006-9633-6926396c181b	2026-04-13 01:40:14.997251
95	Báo cáo hư hỏng mới ⚠️	Nguyễn Thị Kim Huế: Họp nội dung trực tuyến, trực tiếp trên VTV1	report	new	/dashboard/damage-reports	\N	t	159c2606-abc5-4006-9633-6926396c181b	2026-04-13 01:42:08.211546
96	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Họp nội dung trực tuyến, trực tiếp trên VTV1	report	new	/dashboard/damage-reports	3	t	159c2606-abc5-4006-9633-6926396c181b	2026-04-13 01:42:08.906551
97	Có 2 bảo trì sắp đến hạn 📅	Có 2 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-13 02:24:16.966346
98	Báo cáo đang được xử lý 🛠️	Lê Hoàng Khiêm đang xử lý báo cáo: ĐỀ NGHỊ SỬA MÁY IN MÀU GẤP - LÝ DO KÉO KO ĐỀU MÀU...	report	in_progress	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-13 02:37:33.308759
99	Báo cáo đã hoàn thành ✅	Báo cáo: ĐỀ NGHỊ SỬA MÁY IN MÀU GẤP - LÝ DO KÉO KO ĐỀU MÀU... đã được hoàn thành.	report	completed	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-13 03:26:14.73528
100	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: Thiết kế tem thùng rác sân vườn.\nTem số, tem "RÁC HỮU CƠ", tem "RÁC VÔ CƠ"	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-13 03:46:54.986075
101	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Thiết kế tem thùng rác sân vườn.\nTem số, tem "RÁC HỮU CƠ", tem "RÁC VÔ CƠ"	report	new	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-13 03:46:55.67196
102	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #201 (Bộ đàm Buồng Phòng (5)). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	3	t	\N	2026-04-13 04:27:24.013586
103	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #203 (Thiết kế tem thùng rác). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	3	t	lhkhiem@gmail.com	2026-04-13 05:14:25.399647
104	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Mất hình. Nguồn đủ 12V. Không có tín hiệu từ dây	report	new	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-13 05:36:34.383991
105	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #80 (Nước chảy từ vách cột hoa đăng). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	6	t	lhkhiem@gmail.com	2026-04-13 05:36:49.546553
106	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #141 (Hệ thống đèn sân khấu Hoa cau). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	3	t	lhkhiem@gmail.com	2026-04-13 10:14:45.726106
107	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #203 (Thiết kế tem thùng rác). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	3	t	lhkhiem@gmail.com	2026-04-13 10:29:18.221578
108	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #203 (Thiết kế tem thùng rác). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	3	t	lhkhiem@gmail.com	2026-04-13 13:31:55.138114
248	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #233 (Âm thanh Hoa sen). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	3	t	lhkhiem@gmail.com	2026-04-20 01:53:07.823072
253	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: Xử lý máy tính không có internet	report	new	/dashboard/damage-reports	\N	f	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-20 02:04:36.415407
254	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Xử lý máy tính không có internet	report	new	/dashboard/damage-reports	2	f	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-20 02:04:36.523982
249	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #233 (Âm thanh Hoa sen). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	3	t	lhkhiem@gmail.com	2026-04-20 01:53:42.540029
250	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #230 (Quạt ẩm thực). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	6	t	lhkhiem@gmail.com	2026-04-20 01:54:35.994826
251	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #230 (Quạt ẩm thực). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	6	t	lhkhiem@gmail.com	2026-04-20 01:56:05.494705
252	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #237 (Hoa sứ, Hoa Phượng). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	2	t	lhkhiem@gmail.com	2026-04-20 01:56:38.721225
256	Báo cáo đã hoàn thành ✅	Báo cáo: Xử lý máy tính không có internet... đã được hoàn thành.	report	completed	/dashboard/damage-reports	2	f	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-20 02:24:02.821386
120	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Nước chảy ra từ vách ko rõ nguyên nhân.	report	new	/dashboard/damage-reports	15	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 02:05:57.490218
134	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Thực hiện bảo trì cho đợt batch-2026-04-11-1775899621533	report	new	/dashboard/damage-reports	15	t	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-14 16:37:32.558372
135	Báo cáo đã hoàn thành ✅	Báo cáo: Thực hiện bảo trì cho đợt batch-2026-04-11-1775899... đã được hoàn thành.	report	completed	/dashboard/damage-reports	15	t	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-14 16:38:38.003727
136	Báo cáo đã hoàn thành ✅	Báo cáo: Thực hiện bảo trì cho đợt batch-2026-04-11-1775899... đã được hoàn thành.	report	completed	/dashboard/damage-reports	15	t	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-14 16:38:38.168143
141	Báo cáo đã hoàn thành ✅	Báo cáo: Thực hiện bảo trì cho đợt batch-2026-04-11-1775899... đã được hoàn thành.	report	completed	/dashboard/damage-reports	15	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 16:50:59.344705
121	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: Test thông báo	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 02:14:37.921458
255	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #238 (Bộ máy vi tính Trang - PKT). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	2	f	lhkhiem@gmail.com	2026-04-20 02:04:46.78
257	Báo cáo đã hoàn thành ✅	Báo cáo: Thu dọn backdrop, Trả lại dàn âm thanh cho Hoa Mai... đã được hoàn thành.	report	completed	/dashboard/damage-reports	2	f	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-20 03:05:12.99338
259	Báo cáo đã hoàn thành ✅	Báo cáo: Xử lý camera bị lệch góc quay... đã được hoàn thành.	report	completed	/dashboard/damage-reports	2	f	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-20 03:06:53.83897
260	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #230 (Quạt ẩm thực). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	6	f	lhkhiem@gmail.com	2026-04-20 09:14:59.261066
147	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Báo cáo bảo trì định kỳ cho đợt: Xử lý bồn vi sinh nước thảy. Ghi chú: Lập báo cáo thủ công từ danh ...	report	new	/dashboard/damage-reports	15	t	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-15 01:28:15.686331
150	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Báo cáo bảo trì định kỳ cho đợt: Xử lý bồn vi sinh nước thảy.	report	new	/dashboard/damage-reports	15	t	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-15 01:29:32.767417
159	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Báo cáo bảo trì định kỳ cho đợt: Xử lý bồn vi sinh nước thảy. Ghi chú: Lập báo cáo thủ công từ danh ...	report	new	/dashboard/damage-reports	15	t	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-15 04:11:02.837128
174	Báo cáo đã hoàn thành ✅	Báo cáo: Nước chảy ra từ vách ko rõ nguyên nhân.... đã được hoàn thành.	report	completed	/dashboard/damage-reports	15	t	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-16 00:32:51.458084
182	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Bảo trì định kỳ: Xử lý bồn vi sinh nước thảy [Batch: batch-2026-04-11-1775891024445]	report	new	/dashboard/damage-reports	15	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 01:00:36.38472
184	Báo cáo đã hoàn thành ✅	Báo cáo: Bảo trì định kỳ: Xử lý bồn vi sinh nước thảy [Batc... đã được hoàn thành.	report	completed	/dashboard/damage-reports	15	t	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-17 01:16:42.250107
258	Báo cáo đã hoàn thành ✅	Báo cáo: Xử lý camera mất màu... đã được hoàn thành.	report	completed	/dashboard/damage-reports	2	f	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-20 03:06:40.479861
109	Có 2 bảo trì sắp đến hạn 📅	Có 2 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-13 16:26:33.036819
110	Có 1 bảo trì sắp đến hạn 📅	Có 1 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-14 00:17:55.60153
111	Báo cáo đang được xử lý 🛠️	Lê Hoàng Khiêm đang xử lý báo cáo: Thiết kế tem thùng rác sân vườn.\nTem số, tem "RÁC ...	report	in_progress	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 00:18:20.701702
112	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #70 (Điện thoại P410). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	2	t	lhkhiem@gmail.com	2026-04-14 00:29:52.052817
113	Báo cáo đã hoàn thành ✅	Báo cáo: Điện thoại tự động gọi lễ tân... đã được hoàn thành.	report	completed	/dashboard/damage-reports	2	t	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-14 00:54:59.983294
114	Báo cáo hư hỏng mới ⚠️	Trần Minh Hoàng: In thêm menu ẩm thực sáng 10 cuốn	report	new	/dashboard/damage-reports	\N	t	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-14 01:04:12.91404
115	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: In thêm menu ẩm thực sáng 10 cuốn	report	new	/dashboard/damage-reports	2	t	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-14 01:04:13.642014
116	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: Đèn trang trí lối đi hoa Sen và Hoa cau hư dây điện và chuôi điện.	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 01:34:26.820239
117	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Đèn trang trí lối đi hoa Sen và Hoa cau hư dây điện và chuôi điện.	report	new	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 01:34:27.538045
118	Báo cáo đang được xử lý 🛠️	Trần Minh Hoàng đang xử lý báo cáo: In thêm menu ẩm thực sáng 10 cuốn...	report	in_progress	/dashboard/damage-reports	2	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 01:34:53.719169
119	Báo cáo đang được xử lý 🛠️	Lê Hoàng Khiêm đang xử lý báo cáo: Đèn trang trí lối đi hoa Sen và Hoa cau hư dây điệ...	report	in_progress	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 01:35:28.751292
122	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Test thông báo	report	new	/dashboard/damage-reports	4	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 02:14:38.622005
123	Báo cáo hư hỏng mới ⚠️	Nguyễn Thị Cẩm Tú: không kết nối được máy in	report	new	/dashboard/damage-reports	\N	t	5f9697ab-2baf-4ade-a4e6-cb385d1ba051	2026-04-14 06:39:38.154723
124	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: không kết nối được máy in	report	new	/dashboard/damage-reports	3	t	5f9697ab-2baf-4ade-a4e6-cb385d1ba051	2026-04-14 06:39:38.877729
125	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #207 (Bộ máy vi tính Tú - PKT). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	3	t	ntctu@gmail.com	2026-04-14 06:52:49.32687
126	Báo cáo đang được xử lý 🛠️	Lê Hoàng Khiêm đang xử lý báo cáo: không kết nối được máy in...	report	in_progress	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 07:01:40.584954
127	Báo cáo đã hoàn thành ✅	Báo cáo: không kết nối được máy in... đã được hoàn thành.	report	completed	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 07:42:41.284007
128	Báo cáo hư hỏng mới ⚠️	Nguyễn Thị Cẩm Tú: không kết nối được máy in	report	new	/dashboard/damage-reports	\N	t	5f9697ab-2baf-4ade-a4e6-cb385d1ba051	2026-04-14 07:54:51.653291
129	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: không kết nối được máy in	report	new	/dashboard/damage-reports	3	t	5f9697ab-2baf-4ade-a4e6-cb385d1ba051	2026-04-14 07:54:52.341888
130	Báo cáo đã hoàn thành ✅	Báo cáo: không kết nối được máy in... đã được hoàn thành.	report	completed	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 08:48:35.92215
131	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: không kết nối được máy in	report	new	/dashboard/damage-reports	2	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 08:48:50.170306
132	Có 2 bảo trì sắp đến hạn 📅	Có 2 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-14 10:17:19.33426
133	Báo cáo hư hỏng mới ⚠️	Trần Văn Đen: Thực hiện bảo trì cho đợt batch-2026-04-11-1775899621533	report	new	/dashboard/damage-reports	\N	t	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-14 16:37:32.411497
137	Bảo trì đã thực hiện 🔧	Trần Văn Đen đã hoàn thành bảo trì: Theo dõi chỉ số nước thảy	maintenance	completed	/dashboard/maintenance	\N	t	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-14 16:38:38.501783
138	Bảo trì đã thực hiện 🔧	Trần Văn Đen đã hoàn thành bảo trì: Theo dõi chỉ số nước thảy	maintenance	completed	/dashboard/maintenance	\N	t	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-14 16:38:38.699284
139	Bảo trì đã thực hiện 🔧	Trần Văn Đen đã hoàn thành bảo trì: Theo dõi chỉ số nước thảy	maintenance	completed	/dashboard/maintenance	\N	t	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-14 16:38:39.062369
140	Bảo trì đã thực hiện 🔧	Trần Văn Đen đã hoàn thành bảo trì: Theo dõi chỉ số nước thảy	maintenance	completed	/dashboard/maintenance	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 16:42:47.906973
142	Bảo trì đã thực hiện 🔧	Trần Văn Đen đã hoàn thành bảo trì: Theo dõi chỉ số nước thảy	maintenance	completed	/dashboard/maintenance	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-14 16:50:59.870842
143	Có 2 bảo trì sắp đến hạn 📅	Có 2 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-15 00:21:01.673144
144	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: Tín hiệu không ổn định	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 01:23:15.491517
145	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Tín hiệu không ổn định	report	new	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 01:23:15.987486
146	Báo cáo hư hỏng mới ⚠️	Trần Văn Đen: Báo cáo bảo trì định kỳ cho đợt: Xử lý bồn vi sinh nước thảy. Ghi chú: Lập báo cáo thủ công từ danh ...	report	new	/dashboard/damage-reports	\N	t	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-15 01:28:15.590359
148	Sự kiện hoàn thành ✅	Trần Văn Đen đã hoàn thành: Bảo trì định kỳ - Hố vi sinh xử lý nước thảy	system	completed	/dashboard/events	\N	t	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-15 01:29:31.064167
149	Báo cáo hư hỏng mới ⚠️	Trần Văn Đen: Báo cáo bảo trì định kỳ cho đợt: Xử lý bồn vi sinh nước thảy.	report	new	/dashboard/damage-reports	\N	t	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-15 01:29:32.672056
151	Báo cáo đang được xử lý 🛠️	Lê Hoàng Khiêm đang xử lý báo cáo: Đèn mặt sân khấu hư 1 cây...	report	in_progress	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 01:35:16.617906
152	Báo cáo đã hoàn thành ✅	Báo cáo: Đèn mặt sân khấu hư 1 cây... đã được hoàn thành.	report	completed	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 01:37:43.553611
153	Báo cáo đã hoàn thành ✅	Báo cáo: Order ẩm thực sai tên nhân viên order... đã được hoàn thành.	report	completed	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 01:38:01.454407
154	Báo cáo đang được xử lý 🛠️	Lê Hoàng Khiêm đang xử lý báo cáo: Camera mất hình...	report	in_progress	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 01:41:09.539291
155	Báo cáo đã hoàn thành ✅	Báo cáo: Camera mất hình... đã được hoàn thành.	report	completed	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 01:42:06.176642
156	Sự kiện hoàn thành ✅	Lê Hoàng Khiêm đã hoàn thành: Hoàn thành xử lý - CAM 10-NV2 (Bx KS)	system	completed	/dashboard/events	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 01:42:09.012475
157	Bảo trì đã thực hiện 🔧	Trần Văn Đen đã hoàn thành bảo trì: Xử lý bồn vi sinh nước thảy	maintenance	completed	/dashboard/maintenance	\N	t	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-15 04:11:02.608923
158	Báo cáo hư hỏng mới ⚠️	Trần Văn Đen: Báo cáo bảo trì định kỳ cho đợt: Xử lý bồn vi sinh nước thảy. Ghi chú: Lập báo cáo thủ công từ danh ...	report	new	/dashboard/damage-reports	\N	t	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-15 04:11:02.764851
160	Bảo trì đã thực hiện 🔧	Lê Hoàng Khiêm đã hoàn thành bảo trì: Thu gôm, vệ sinh các hố nước thảy, bễ mỡ	maintenance	completed	/dashboard/maintenance	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 04:13:24.917374
161	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: Báo cáo bảo trì định kỳ cho đợt: Thu gôm, vệ sinh các hố nước thảy, bễ mỡ.	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 04:13:25.063819
162	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Báo cáo bảo trì định kỳ cho đợt: Thu gôm, vệ sinh các hố nước thảy, bễ mỡ.	report	new	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 04:13:25.139722
163	Bảo trì đã thực hiện 🔧	Dương Hoàng Trang đã hoàn thành bảo trì: Hệ thống PCCC	maintenance	completed	/dashboard/maintenance	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 04:37:17.395499
164	Báo cáo hư hỏng mới ⚠️	Dương Hoàng Trang: Báo cáo bảo trì định kỳ cho đợt: Hệ thống PCCC.	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 04:37:17.562334
165	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Báo cáo bảo trì định kỳ cho đợt: Hệ thống PCCC.	report	new	/dashboard/damage-reports	6	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 04:37:17.677359
166	Bảo trì đã thực hiện 🔧	Dương Hoàng Trang đã hoàn thành bảo trì: Hệ thống PCCC	maintenance	completed	/dashboard/maintenance	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 04:51:50.492663
167	Báo cáo hư hỏng mới ⚠️	Dương Hoàng Trang: Báo cáo bảo trì định kỳ cho đợt: Hệ thống PCCC.	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 04:51:50.64873
168	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Báo cáo bảo trì định kỳ cho đợt: Hệ thống PCCC.	report	new	/dashboard/damage-reports	6	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 04:51:50.732846
169	Bảo trì đã thực hiện 🔧	Dương Hoàng Trang đã hoàn thành bảo trì: Hệ thống PCCC	maintenance	completed	/dashboard/maintenance	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 04:58:55.123088
170	Báo cáo hư hỏng mới ⚠️	Dương Hoàng Trang: Báo cáo bảo trì định kỳ cho đợt: Hệ thống PCCC.	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 04:58:55.278978
171	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Báo cáo bảo trì định kỳ cho đợt: Hệ thống PCCC.	report	new	/dashboard/damage-reports	6	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-15 04:58:55.361225
172	Có 3 bảo trì sắp đến hạn 📅	Có 3 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-15 05:01:09.877893
173	Có 2 bảo trì sắp đến hạn 📅	Có 2 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-16 00:27:59.337749
175	Có 1 bảo trì sắp đến hạn 📅	Có 1 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-16 05:37:41.008353
176	Có 1 bảo trì sắp đến hạn 📅	Có 1 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-17 00:26:47.08758
177	Sự kiện hoàn thành ✅	Trần Văn Đen đã hoàn thành: Bảo trì định kỳ - Hố vi sinh xử lý nước thảy	system	completed	/dashboard/events	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 00:54:47.240972
178	Bảo trì đã thực hiện 🔧	Trần Văn Đen đã hoàn thành bảo trì: Theo dõi chỉ số nước thảy	maintenance	completed	/dashboard/maintenance	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 00:54:49.469328
179	Có 2 bảo trì sắp đến hạn 📅	Có 2 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-17 00:55:02.170659
180	Bảo trì đã thực hiện 🔧	Trần Văn Đen đã hoàn thành bảo trì: Theo dõi chỉ số nước thảy	maintenance	completed	/dashboard/maintenance	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 00:57:31.213401
181	Báo cáo hư hỏng mới ⚠️	Trần Văn Đen: Bảo trì định kỳ: Xử lý bồn vi sinh nước thảy [Batch: batch-2026-04-11-1775891024445]	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 01:00:36.265837
183	Sự kiện hoàn thành ✅	Trần Văn Đen đã hoàn thành: Bảo trì định kỳ - Hố vi sinh xử lý nước thảy	system	completed	/dashboard/events	\N	t	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-17 01:02:16.577392
185	Bảo trì đã thực hiện 🔧	Trần Văn Đen đã hoàn thành bảo trì: Xử lý bồn vi sinh nước thảy	maintenance	completed	/dashboard/maintenance	\N	t	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-17 01:16:43.01746
186	Bảo trì đã thực hiện 🔧	Trần Văn Đen đã hoàn thành bảo trì: Xử lý bồn vi sinh nước thảy	maintenance	completed	/dashboard/maintenance	\N	t	e71a19da-50d2-4fed-8cd2-08e38caa740e	2026-04-17 01:16:44.237017
187	Bảo trì đã thực hiện 🔧	Trần Văn Đen đã hoàn thành bảo trì: Xử lý bồn vi sinh nước thảy	maintenance	completed	/dashboard/maintenance	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 01:17:49.058128
188	Báo cáo đã hoàn thành ✅	Báo cáo: Thiết kế tem thùng rác sân vườn.\nTem số, tem "RÁC ... đã được hoàn thành.	report	completed	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 04:00:22.266488
189	Báo cáo đã hoàn thành ✅	Báo cáo: Đèn trang trí lối đi hoa Sen và Hoa cau hư dây điệ... đã được hoàn thành.	report	completed	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 04:21:27.458258
190	Báo cáo đã hoàn thành ✅	Báo cáo: Sửa rèm kéo hoa đăng, hoa cau.... đã được hoàn thành.	report	completed	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 04:22:01.985154
191	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: Sửa lại rèm sảnh hoa đăng	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 04:24:00.231882
192	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Sửa lại rèm sảnh hoa đăng	report	new	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 04:24:00.931243
193	Báo cáo đã hoàn thành ✅	Báo cáo: Tín hiệu không ổn định... đã được hoàn thành.	report	completed	/dashboard/damage-reports	3	t	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-17 09:44:57.074357
194	Báo cáo đã hoàn thành ✅	Báo cáo: Mất hình. Nguồn đủ 12V. Không có tín hiệu từ dây... đã được hoàn thành.	report	completed	/dashboard/damage-reports	3	t	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-17 09:45:55.236246
195	Báo cáo đã hoàn thành ✅	Báo cáo: Camera lắp nhà hoa sứ bị cây xanh che khuất -> dời... đã được hoàn thành.	report	completed	/dashboard/damage-reports	3	t	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-17 09:46:06.268644
196	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: Sửa đèn mặt hoa cau	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 10:32:41.772551
197	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Sửa đèn mặt hoa cau	report	new	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 10:32:41.962488
198	Báo cáo đang được xử lý 🛠️	Lê Hoàng Khiêm đang xử lý báo cáo: Sửa đèn mặt hoa cau...	report	in_progress	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-17 10:32:57.418174
199	Có 1 bảo trì sắp đến hạn 📅	Có 1 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-18 00:29:16.836396
200	Báo cáo hư hỏng mới ⚠️	Trần Minh Hoàng: Mất tín hiệu	report	new	/dashboard/damage-reports	\N	t	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-18 03:31:40.642561
201	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Mất tín hiệu	report	new	/dashboard/damage-reports	2	t	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-18 03:31:41.353581
202	Có 1 bảo trì sắp đến hạn 📅	Có 1 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-19 00:09:07.578967
203	Sự kiện hoàn thành ✅	Trần Văn Đen đã hoàn thành: Bảo trì định kỳ - Hố vi sinh xử lý nước thảy	system	completed	/dashboard/events	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 00:11:27.730605
204	Bảo trì đã thực hiện 🔧	Trần Văn Đen đã hoàn thành bảo trì: Theo dõi chỉ số nước thảy	maintenance	completed	/dashboard/maintenance	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 00:11:33.20845
205	Có 2 bảo trì sắp đến hạn 📅	Có 2 đợt bảo trì dự kiến thực hiện trong 7 ngày tới.	maintenance	upcoming	/dashboard/maintenance	\N	t	\N	2026-04-19 00:11:40.327492
206	Bảo trì đã thực hiện 🔧	Trần Văn Đen đã hoàn thành bảo trì: Theo dõi chỉ số nước thảy	maintenance	completed	/dashboard/maintenance	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 01:10:59.944704
207	Báo cáo hư hỏng mới ⚠️	Nguyễn Thanh Hiền: Vệ sinh bụi và vô dầu	report	new	/dashboard/damage-reports	\N	t	2a0fbc05-83e4-4d21-a867-8c54d3509ff6	2026-04-19 01:21:06.278742
208	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Vệ sinh bụi và vô dầu	report	new	/dashboard/damage-reports	6	t	2a0fbc05-83e4-4d21-a867-8c54d3509ff6	2026-04-19 01:21:06.985078
209	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: Xử lý tủ cáp gọn ràng hơn	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 01:41:47.338975
210	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Xử lý tủ cáp gọn ràng hơn	report	new	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 01:41:47.445962
211	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #231 (Tủ cáp bên ngoài Hoa sen). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	3	t	ntmtrang@gmail.com	2026-04-19 02:20:58.326106
212	Báo cáo hư hỏng mới ⚠️	Trần Minh Hoàng: Camera bị rơi	report	new	/dashboard/damage-reports	\N	t	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-19 09:23:17.640282
213	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Camera bị rơi	report	new	/dashboard/damage-reports	3	t	5d7432c9-6978-4b4c-8e32-2228c776a1e3	2026-04-19 09:23:18.127622
214	Báo cáo đang được xử lý 🛠️	Lê Hoàng Khiêm đang xử lý báo cáo: Camera bị rơi...	report	in_progress	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 09:41:55.426044
215	Báo cáo đã hoàn thành ✅	Báo cáo: Camera bị rơi... đã được hoàn thành.	report	completed	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 09:43:35.421593
216	Báo cáo đang được xử lý 🛠️	Lê Hoàng Khiêm đang xử lý báo cáo: Xử lý tủ cáp gọn ràng hơn...	report	in_progress	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 09:47:09.476213
217	Báo cáo đã hoàn thành ✅	Báo cáo: Xử lý tủ cáp gọn ràng hơn... đã được hoàn thành.	report	completed	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 09:47:55.666406
218	Báo cáo đang được xử lý 🛠️	Trần Văn Đen đang xử lý báo cáo: Báo cáo bảo trì định kỳ cho đợt: Theo dõi chỉ số n...	report	in_progress	/dashboard/damage-reports	15	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 09:53:23.49256
227	Báo cáo đang được xử lý 🛠️	Lê Hoàng Khiêm đang xử lý báo cáo: Camera bị rơi...	report	in_progress	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 10:15:31.265994
219	Báo cáo đã hoàn thành ✅	Báo cáo: Báo cáo bảo trì định kỳ cho đợt: Theo dõi chỉ số n... đã được hoàn thành.	report	completed	/dashboard/damage-reports	15	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 09:53:32.353362
220	Bảo trì đã thực hiện 🔧	Trần Văn Đen đã hoàn thành bảo trì: Theo dõi chỉ số nước thảy	maintenance	completed	/dashboard/maintenance	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 09:53:32.831588
221	Báo cáo đang được xử lý 🛠️	Lê Hoàng Khiêm đang xử lý báo cáo: Xử lý tủ cáp gọn ràng hơn...	report	in_progress	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 10:08:17.588953
222	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #231 (Tủ cáp bên ngoài Hoa sen). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	3	t	lhkhiem@gmail.com	2026-04-19 10:11:02.474466
223	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #231 (Tủ cáp bên ngoài Hoa sen). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	3	t	lhkhiem@gmail.com	2026-04-19 10:11:41.825879
224	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #223 (Sửa rèm Hoa đăng). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	3	t	lhkhiem@gmail.com	2026-04-19 10:12:54.138927
225	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #231 (Tủ cáp bên ngoài Hoa sen). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	3	t	lhkhiem@gmail.com	2026-04-19 10:13:38.097101
226	Báo cáo đã hoàn thành ✅	Báo cáo: Xử lý tủ cáp gọn ràng hơn... đã được hoàn thành.	report	completed	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 10:15:23.437807
228	Báo cáo đang được xử lý 🛠️	Lê Hoàng Khiêm đang xử lý báo cáo: Nhờ Phan Thảo thẩm định âm thanh sành Hoa sen, có ...	report	in_progress	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 10:18:19.717001
229	Báo cáo đã hoàn thành ✅	Báo cáo: Nhờ Phan Thảo thẩm định âm thanh sành Hoa sen, có ... đã được hoàn thành.	report	completed	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 10:20:14.955546
230	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: Di dời là kệ để micro Hoa sen khắc phục tình trạng yếu sóng	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 10:21:18.476652
231	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Di dời là kệ để micro Hoa sen khắc phục tình trạng yếu sóng	report	new	/dashboard/damage-reports	3	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 10:21:18.588098
232	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #233 (Âm thanh Hoa sen). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	3	t	lhkhiem@gmail.com	2026-04-19 10:23:31.626957
233	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #233 (Âm thanh Hoa sen). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	3	t	lhkhiem@gmail.com	2026-04-19 13:56:39.118919
234	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: test	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 15:17:06.166941
235	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: test	report	new	/dashboard/damage-reports	6	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-19 15:17:06.28692
236	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #230 (Quạt ẩm thực). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	6	t	lhkhiem@gmail.com	2026-04-20 00:34:48.479366
237	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: Xử lý camera bị lệch góc quay	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-20 01:15:48.733355
238	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Xử lý camera bị lệch góc quay	report	new	/dashboard/damage-reports	2	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-20 01:15:48.871997
239	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: Xử lý camera mất màu	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-20 01:19:17.328385
240	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Xử lý camera mất màu	report	new	/dashboard/damage-reports	2	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-20 01:19:17.499195
241	Báo cáo hư hỏng mới ⚠️	Lê Hoàng Khiêm: Thu dọn backdrop, Trả lại dàn âm thanh cho Hoa Mai	report	new	/dashboard/damage-reports	\N	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-20 01:21:23.640015
242	Công việc mới được giao 📋	Bạn được giao xử lý báo cáo: Thu dọn backdrop, Trả lại dàn âm thanh cho Hoa Mai	report	new	/dashboard/damage-reports	2	t	19bc5494-ab7c-4339-ae84-3e3d25355d07	2026-04-20 01:21:23.801562
243	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #229 (Điện thoại P401). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	2	t	lhkhiem@gmail.com	2026-04-20 01:27:19.021092
244	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #230 (Quạt ẩm thực). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	6	t	lhkhiem@gmail.com	2026-04-20 01:30:52.648231
245	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #230 (Quạt ẩm thực). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	6	t	lhkhiem@gmail.com	2026-04-20 01:44:51.249576
246	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #230 (Quạt ẩm thực). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	6	t	lhkhiem@gmail.com	2026-04-20 01:46:18.802108
247	🔔 Nhắc nhở tiến độ công việc	Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #233 (Âm thanh Hoa sen). Vui lòng sớm hoàn thành.	report	reminder	/dashboard/damage-reports	3	t	lhkhiem@gmail.com	2026-04-20 01:52:08.2956
\.


--
-- Data for Name: PushSubscription; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."PushSubscription" ("ID", "UserId", "Endpoint", "P256dh", "Auth", "CreatedAt") FROM stdin;
1	159c2606-abc5-4006-9633-6926396c181b	https://fcm.googleapis.com/fcm/send/duhqtfxlkYE:APA91bEcasFLCskjhkUlBOSaCGKCIuSPOfoVkqCWyNMI89sqrPhMdH1ozz82KJ0h-6rEGjmOdF9W0tE1YfBnYYbmdyuXez-z-qXmtPV0TqUqfq746T78qD8Ov5HnvNeEkM5SO-xO6nPi	BBqLJ2wJNiuDOKnsQuGNFC9TZ-ecQnLL2wWsLO-jA91vaTDwwJbHA-Ozdo3zBQhNqIJpThjyjQZyGq92G5TiTbY	O4ndP6ol4LOTImqnvsR-wA	2026-04-06 00:17:34.670541
4	19bc5494-ab7c-4339-ae84-3e3d25355d07	https://fcm.googleapis.com/fcm/send/fmx3Iysen1M:APA91bGPs7SabrF4YknH0F5XD_tzpRg7SSwS62wze8DZz1lmzqFdjg4ICmJxdDqtDJ2tpwvukQM3d5VvpnJXLfh8WVei8BYhuiPrulvS8tRwV7-JmZdFsHIP6RPdy8gARLOFu9kv8Ou1	BM25gxF-BA3ScWc8e5NES2z3J395Q9auqQSFNHCL29S-sDp5v71om0Fv-aGm-rjBUUwGt8dM-8OcNreEsLVANlQ	z0ty1QePBSEBP1FqVTF2Aw	2026-04-07 01:34:15.098678
5	5d7432c9-6978-4b4c-8e32-2228c776a1e3	https://fcm.googleapis.com/fcm/send/cRfjIedVliA:APA91bEO2IbBzqe_cSTJ4igajm3IG4B9Hr5W9TeWCk9Les48jpnbiZpP2j-won9CT2c19JeH4sJeIpm1chkKCbYvaXn3i_YIYpXsTmxY61cZRotc_61wtDwv3rMgcqNDFjsmTdnUKutn	BILUb2yvlnXWwWfcbruw7J199JX1QPQznpLUcML2iyWx4snihR2saV-JLAgixEbH-VWcnCDYa3zr8t-jWZclWpU	EZ5nJR6iXS6zEzkleeThow	2026-04-07 03:44:23.797194
9	19bc5494-ab7c-4339-ae84-3e3d25355d07	https://fcm.googleapis.com/fcm/send/c86mqdZujig:APA91bGNztCxJur-SHfSBcOw8WaTHFIMrP5hD_XAA9LMoFqGFLc98V8xoN1H0SxazYtFzd6odrKvfd7zSXCPfWQKFOpKujYfgcYYg-TRO6lfsTf7viQ9TkeESPiCezpIKh0MfEQmowIn	BFiXd6bzq9Fw-soIdbQWNw0ataMQnpnEgIF9q0E12p4MA2QEGiNfCrnGl1rZK3BXKm9Auxmgy0d2j0Z5OQgmf7o	YAXxuw-MRZLRcCfAeBvjTA	2026-04-12 07:53:57.252111
10	19bc5494-ab7c-4339-ae84-3e3d25355d07	https://fcm.googleapis.com/fcm/send/flBZSQhw1Pg:APA91bEwykNbx6v8H0ee9fTmb5xFluXRbkD9BAtbBDZnxcgG9liElLEevZ3k5XnNLJQ2rZuXXOsNTkLWsADiUtGRfBBhOVroa3lYdRsZ9Q8JqFdtsMjR-BPHi9pPvOGfJm6ZlYRcwg43	BNkg0irMfbQzM5egUrD6nt6MeJEKaIJLSCThrlQcusfh6bEA8ACZYpxp3N9tz7sUEJb_lGjel6OaUmf-3pv9Af0	IVLtNX67NNvFd7LVIerfMw	2026-04-12 07:53:57.451931
11	19bc5494-ab7c-4339-ae84-3e3d25355d07	https://fcm.googleapis.com/fcm/send/cVHgXFqvpIU:APA91bH_TJS2f0EpCWJASQAnoW0UHWofa8Az3lWpagaN2be8wrMSqL7fxLBrpGbEcEWcXRHgGA4WK6PKbiUyvG2OBvf9akioJk40HVeQRvfdX2rQtdfb3t8LDaMEGMvFjBi5FFkQsxkl	BIxw6x5UzGVfr3T00jBMb-fpSh4_Zy8G0lFfLDVvfKzrV-AMG-5ZOBqIrKEUwqkgWpbOfEZ6ujSy5hZp7j-UAOM	Ju73aeNaZXcPzPuRouXF8w	2026-04-12 08:07:53.814676
12	19bc5494-ab7c-4339-ae84-3e3d25355d07	https://fcm.googleapis.com/fcm/send/d9Zyx2AI33I:APA91bGKpAFFaG7rk-0iHs-Hux8d9hrg5U97cLavspbJdg6qi8Ebrejygza8ahoWgjXC3-b0-hkJ8zA9IhmFePznmM1FaQ0kGWjCJHQjQmGQpg8jQu1t45aH2TJJ92pVsr4QOrMJBesV	BMs2T5CZNaVnCKecroQn0uwv87ANjt9_X1eggoTls5ufDNjEpEziCXrJgYLm6hckM95v0EnlREk-gN3Jy-EnBmQ	FGT6mZrKQPm-W4bHz7QsDA	2026-04-12 08:07:54.09817
13	19bc5494-ab7c-4339-ae84-3e3d25355d07	https://fcm.googleapis.com/fcm/send/cPektmD4W-w:APA91bF19sVBcGkiVDCsmB6Kwh_kxgyO4TpZ-I1yEqXDX3a8ZLtogg8h7RM-XNfBBNJh7G0lKEGl1bD7hz4sH9kpIxQwVTMtEFYgS2g05RmDxWcyvDZAJfmuLI8VLRU2wE8czuXBuu_m	BIgDkrLk2D9R9qfMu7rLiG8LR5Rj40L1tT6tW4e0mg6Ma2Pf_WnZUZ3lwR3471UvgOwMu37W6xIFVlRLqfIUDYc	GLQ1CJHkfLJuL7eE7H1B7A	2026-04-12 08:15:52.32998
14	2a0fbc05-83e4-4d21-a867-8c54d3509ff6	https://fcm.googleapis.com/fcm/send/elDDlfnH_Fo:APA91bFjwEIcN8V0IHZzVJUNCOLG6t6b7525bVDwI-zzBi6AjZgdk6qP6lw1X9KN8-iiZD3pGprXO24KK6xd_U4QrntxnCAnPvfJu8qVDXpNcqhRKaKebk3kM7dVredfuJiltxIJGTyH	BNq8dwFaGcyORmkOgDlACP97m9C0cQHi-Ke3D5r3IWIXMEpWHrEFi_p0XJSQFNd_vE78md51GyedPpc7yosHNzI	WhysgKApNxR8JJbPm3yP2Q	2026-04-12 08:34:13.615004
15	19bc5494-ab7c-4339-ae84-3e3d25355d07	https://fcm.googleapis.com/fcm/send/fgA5MjKk4XI:APA91bHVKn-vITM72Uk-AYHPF22TWkWwAM88_lggwBw--Hi417FpvpvPpuRWnhqqtVhSorK49qPE3b7x04KwilYhUEZYZ7mWe38Ych8D-WegzwasUuxX3_89SNd05NbYxlg0vxDSSSkr	BIk1zA5sPnL1jixEOgW6j8rp-Ivib_Rn5bfVDPwoQ050Am03Qc0PE2vsM8eC7m-GqMvx6S9BUtt65m7Vvv3mRuY	7aBqkjOsq8J6bxM4agsb6w	2026-04-12 08:47:49.799486
16	19bc5494-ab7c-4339-ae84-3e3d25355d07	https://fcm.googleapis.com/fcm/send/c_V4sNmO_zE:APA91bF87S1aLk7mqXYmDnE7h_Dk6FXWq1w29GT_-tiKziXjmTMi6e4aYw54QQfFSg9ePwTWZTZcGWoCngeeE4wxv2-N_rb7GgvPpuDrzIBj9xFBjo2TwbrEEEi-v1TFths3k2zkl87I	BPOQjqHSbJmb5ft3TW99T0N8fRpJgmmGFkolHdqAzOYao1MUr8Xy66wct4-TyZlFzodvl7MVIc-WTYpfwJXfDo8	eIKBd6bOJJtq2AAvdhDhFQ	2026-04-12 08:48:54.98037
17	2a0fbc05-83e4-4d21-a867-8c54d3509ff6	https://fcm.googleapis.com/fcm/send/fqrifIVQE1w:APA91bGxGrCGaQKVePP9wgSJ_YBur4gZTkmahtClOsFNuw2VUn0dDBWOQH2iMQrAV4fGjYKbtBWlfljQyiIsDHTvS7T37PAgeGHGHA1ZeOAvekXChRNF9992LqNYTkrWPjkoiWYfokbx	BObev--86cPVtkGr6k6BeR9THhZMpky6ajiJq43MyWoPXLcMvHZ-7v-sCfoSN8D08HkF39iX8tzYP193xMQ70_c	TsNqFVWXJ48XJJ6uKYHe1g	2026-04-12 08:51:27.653729
18	dd27e8f9-50a0-4de0-9a5a-9b9f1396f9c9	https://fcm.googleapis.com/fcm/send/c_V4sNmO_zE:APA91bF87S1aLk7mqXYmDnE7h_Dk6FXWq1w29GT_-tiKziXjmTMi6e4aYw54QQfFSg9ePwTWZTZcGWoCngeeE4wxv2-N_rb7GgvPpuDrzIBj9xFBjo2TwbrEEEi-v1TFths3k2zkl87I	BPOQjqHSbJmb5ft3TW99T0N8fRpJgmmGFkolHdqAzOYao1MUr8Xy66wct4-TyZlFzodvl7MVIc-WTYpfwJXfDo8	eIKBd6bOJJtq2AAvdhDhFQ	2026-04-12 08:55:20.03353
19	2a0fbc05-83e4-4d21-a867-8c54d3509ff6	https://fcm.googleapis.com/fcm/send/fY9RDYgKqqM:APA91bEWsEN1NyfMdi9CTs7G1XGAzH-40bLfm2vPe1h5LJLwSbIR_TI9eU4jBlqj95bWZTXacXnE1HJcMxkh6GnCcGoMqh7lZWB_Pd05j3_VbGGOKtxCQ6KBk7F2YPMKBmTuHN9nFUWf	BEWuiAZ1Cu-gNa_hA_XLPEHeUEL5ls6CsgNGNPRKTn0LbiADlAOlWs4XmzB_s0UDSvM3hKpdRE4FXwM8t3sGgMQ	65w_DXhDh9vdqGJx8Wnqng	2026-04-12 09:02:26.389838
20	dd27e8f9-50a0-4de0-9a5a-9b9f1396f9c9	https://fcm.googleapis.com/fcm/send/cqK-OO5vk4A:APA91bFbTrNlFXQ9C6BE_XNaAmWEQteSdixRld6lvSD8p3FvPGDZ9IXtsitzlCwAAgkRJCM9aVVNJb7dqjDx7K7R61FfaPW8e7NUiXRYHgdS7-WqbUY2ZyRGAIoFtyVjGuwh3K1QRsm0	BIvqotwnC_JW6fbJOGWd1mUcYbQ9OYXpJaRogg-N0D_876NDwJRdANyCwSuYFr43mUXRx1IDqXLkBpngoPGHKkM	ag07gY6AiyPEc_8la_ah5g	2026-04-12 09:21:01.580543
21	dd27e8f9-50a0-4de0-9a5a-9b9f1396f9c9	https://permanently-removed.invalid/fcm/send/cPLU6gNOOiI:APA91bEfUWIBaqmHgZ1RIRtzx1JvBTPzjqneTEk-vpWLG9gXjBQWeEDVlIweKby_qPvwV3amFe86Ywk-MDqcN4CYIbciwYo6x-uOnjaKXI9LHZ43ZNYelvuGyvwHEMC0c6ZoF66NXJaH	BBY-mGqGxJLC8nCpCGUlG8gM75YMyWfOQZsCTmRHJI4IpINpJNOBKoicZxvrRZj7Gb4Mx0JKTGb5XdhBtjZsquQ	yKyb2UjU6tmNofouuC4XLg	2026-04-12 09:39:36.059932
22	19bc5494-ab7c-4339-ae84-3e3d25355d07	https://fcm.googleapis.com/fcm/send/c_SsljW56Gk:APA91bFTIEoTVISPSkjN68gP6NkKPUW1iOHymnwJMuc85v3atpV7sspOwFwFaTrOK5KD33Led2lxnYYEFmg3cR8TQmYhH70r5ckbGKjE-ZPd8G4u7UkTc7Ry8zek5Z2cwbt14vo1Db9r	BGbdsk4MBR8Qjxy_n6n_BSn9zg_bsVuGCQ1p0FH_lU2jmpfMr5_aPP_V2Rju2Z2dpZicCjEpPm4TbiFOyaHw2Mg	0TQ9424ORKkEq9-SHHPgyA	2026-04-12 10:20:48.126541
23	19bc5494-ab7c-4339-ae84-3e3d25355d07	https://fcm.googleapis.com/fcm/send/drBNaWM9nIg:APA91bEWdMoqrKX1SqeZGW4FFpg1Ju0kM676OJ5vpx5msF4Pux5zTGPjktdqboYyMVQkfemV5uPR83rC-hw2qiYXGlY8_6ZOEya-WTWxk9MrLErAOM_EZ9_8swObTnG-gelBpMslihA-	BBehvaswHU5tlrBKVOaCUeMGN02_vRSMgpWPKdvuiAbH89-bMpl5XbSV_VYCfL_VLhLN3K69IuO_fUEs2RKNb58	0gbut7ppEH0AM22Axiflmg	2026-04-12 10:20:48.444607
24	dd27e8f9-50a0-4de0-9a5a-9b9f1396f9c9	https://fcm.googleapis.com/fcm/send/dhBZnd-M9Wo:APA91bFR6wz0M3AVp_g-XCEwA3Yxhb5ezYUFawWOZf8NQcmQpi3CXG77Qp7EgX3lvD0PxCoSLSwvCHImQ9I-wFyr-_rl7pXTilzdf9VLOsIOV-D8yDQRP6ARpd84CQhbn1PFjoHe5IBK	BFTA1EX9Gz0QKTqraV1yv5Nix9Kp-6OYMXFACH6l4-oKjC_KLsz2YOlYy_Rv1s9NUXAyee44qqh1vA3qgFIM6DQ	8SDqM52MtloLl8iTFgiQYw	2026-04-12 10:25:26.246253
25	19bc5494-ab7c-4339-ae84-3e3d25355d07	https://fcm.googleapis.com/fcm/send/dhBZnd-M9Wo:APA91bFR6wz0M3AVp_g-XCEwA3Yxhb5ezYUFawWOZf8NQcmQpi3CXG77Qp7EgX3lvD0PxCoSLSwvCHImQ9I-wFyr-_rl7pXTilzdf9VLOsIOV-D8yDQRP6ARpd84CQhbn1PFjoHe5IBK	BFTA1EX9Gz0QKTqraV1yv5Nix9Kp-6OYMXFACH6l4-oKjC_KLsz2YOlYy_Rv1s9NUXAyee44qqh1vA3qgFIM6DQ	8SDqM52MtloLl8iTFgiQYw	2026-04-13 00:57:31.208943
26	939462c9-dfc3-4721-b7e4-78b50203369b	https://fcm.googleapis.com/fcm/send/fVkKwzrkMvQ:APA91bHsGInCtCTRwUJwu92wyqHMZ4hQkyWNOie1tAJM-yQ4Ck28zWsTNbUkHcSEuSaSJsZhu_lOegI71U0hDGslqNyUf--IMrUVyg9KMi2l5I3Y2fbIsiBErrB3t-uZ0RwtWUxYk8No	BPFhCMl3ERFSR50mtpISJNiRGp4_njgUmg2KJh2MExtOwIq5o744urq2sHwVXeDLn4QS33q0Q9w-_AW82uCPStA	y6cBvk0kf2NnPmq9B0zkLw	2026-04-13 00:59:28.051186
27	159c2606-abc5-4006-9633-6926396c181b	https://fcm.googleapis.com/fcm/send/dhBZnd-M9Wo:APA91bFR6wz0M3AVp_g-XCEwA3Yxhb5ezYUFawWOZf8NQcmQpi3CXG77Qp7EgX3lvD0PxCoSLSwvCHImQ9I-wFyr-_rl7pXTilzdf9VLOsIOV-D8yDQRP6ARpd84CQhbn1PFjoHe5IBK	BFTA1EX9Gz0QKTqraV1yv5Nix9Kp-6OYMXFACH6l4-oKjC_KLsz2YOlYy_Rv1s9NUXAyee44qqh1vA3qgFIM6DQ	8SDqM52MtloLl8iTFgiQYw	2026-04-13 01:06:55.575664
28	2a0fbc05-83e4-4d21-a867-8c54d3509ff6	https://fcm.googleapis.com/fcm/send/e9IGfeKD5bM:APA91bFunl9OfyyqPD6w796hVKdDLOMcdp05pGVdEYF8q_zRXTPTJuU15GwXkDXIjjQdvPS0Un6g-aYJvw24LrFZ6KVU8IhzzcmV3OH4XAp3IwF5SH2DauYy8uKjl7PXy9mSLYQmPDsf	BGs1dD0djqu2FCqNl-iEUYD2YTa5k9ZeQtR2XEOjav30Qh-bZO_vQacANQQ-uTwGpHRj0s2HHcp5wN8R05g-JcU	-wsi1f9n3wbUmbyysNJY-w	2026-04-14 02:15:23.600031
29	e71a19da-50d2-4fed-8cd2-08e38caa740e	https://web.push.apple.com/QLOivNYWJL_02dQBwF2ekoeTKB-M6-rLsbpPk0hlxwWOwYwG0qK0irYK7FRgcS0ylY_rbl04lVAFKPPTIGqW6eZzHrsFIqB9K9ArWMzEWvo-Oj8q5fXzhRbkQOp2xI3MHOwwDEcWt8igRB2keQt78nnYAXMChf-yZNXO_mUBHOs	BMQjp7-lKL7GXI6J1CNO4zdfUsTAI0dihAD-x3J36TQ0T0cpSdTYqOwmfSixw24fr40KqwoVquhrytvJFiiyqOQ	rVM-Ul5yt-hxiH5I9V1V9g	2026-04-14 06:11:53.390862
30	dd27e8f9-50a0-4de0-9a5a-9b9f1396f9c9	https://fcm.googleapis.com/fcm/send/eztCRzZQOuY:APA91bFV_p-Qy1x2D1Ci_gfOI8n7pb4UqJMoWHdXoJ_2f-CL15ag7QMgPM9x-ozhf68v5JtdZh0dgXFER2Qo20gV9QeM5KKOUxhK9yNRgZYCTJXLpKryCo7G6R48R3Ii0HW85670NgJI	BMAUpe0H9mcSQsaBn-5otTR-ElIBQu665MK0UyXz27ws6TzAvTo7OYp30SokckdUBQ71NjbBNRD24HRzRUBV9i0	VPxdapxQKlX4oqM-BU8Urw	2026-04-20 01:55:47.695461
31	2240c223-f17f-41b0-bc48-fe421f619f5e	https://fcm.googleapis.com/fcm/send/eBIqdjncW60:APA91bFGcYRUNRoPoZbEQm4I4-DqJrNTUYPtuWzBiCrquARjuPeSDRUkuGyLl_H00VEBCOUXTsLN0GBKovPH5F4oKcEt0-YD9cohkDbBW6mntlPe13K8VgR_ZidILC3kHYNQ5faJLfsC	BLFaISx5Hz-gbRof96hr3u5Sp8-XFIM3OB2Km98Q2ojJ4um0Sisqd5XYzenEA0tNUIE6rNHj5YiTjxcBprsZiMo	2RqnzekSM19VOoGzarX5EQ	2026-04-20 02:52:07.873944
\.


--
-- Data for Name: Staff; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Staff" ("ID", "Name", "Gender", "Birthday", "DepartmentID", "UserId") FROM stdin;
10	Nguyễn Thị Hạnh	f	1988-11-07	5	2240c223-f17f-41b0-bc48-fe421f619f5e
3	Lê Hoàng Khiêm	t	1989-05-08	12	19bc5494-ab7c-4339-ae84-3e3d25355d07
2	Trần Minh Hoàng	t	1995-09-28	12	5d7432c9-6978-4b4c-8e32-2228c776a1e3
5	Nguyễn Văn Hảo	t	1985-01-03	13	97b82a13-8261-4e04-8fd1-e9f0506166a8
12	Lê Thị Thủy	f	1992-01-01	4	b882839f-9945-43a5-991e-9a42c76ff8da
13	Huỳnh Thị Mộng Thúy	f	1994-01-01	3	127c9922-c533-4246-8e84-9bd217bed5ad
14	Diệp Kim Tuấn	t	1974-03-27	19	b924fb2a-9c27-4201-a7eb-ad5b7d829491
11	Huỳnh Chí Công	t	1987-01-01	2	5627ab1c-0360-4989-beba-bfe151993ec1
6	Dương Hoàng Trang	t	1983-01-01	1	dd27e8f9-50a0-4de0-9a5a-9b9f1396f9c9
4	Nguyễn Thanh Hiền	t	1987-12-30	2	2a0fbc05-83e4-4d21-a867-8c54d3509ff6
8	Ngô Thanh Tuyền	f	1985-11-04	14	c6f9b9a4-f2c1-4bf7-ba60-61787ca39c5f
9	Đặng Thùy Linh	f	1985-11-05	14	a4f50c39-8439-429c-a2da-341abcb5e400
15	Trần Văn Đen	t	1986-04-06	1	e71a19da-50d2-4fed-8cd2-08e38caa740e
16	Nguyễn Thị Cẩm Tú	f	1989-02-09	3	5f9697ab-2baf-4ade-a4e6-cb385d1ba051
17	Quách Kiến Quang	t	1994-01-01	17	7d54368f-c08c-4315-b902-79e4444718ac
18	Nguyễn Thị Kim Huế	f	1983-01-01	3	eff8338a-dcc2-4935-b55c-3e3b653a89fd
19	Thu Ngân	f	1988-05-13	3	939462c9-dfc3-4721-b7e4-78b50203369b
20	Nguyễn Thị Mỹ Trang	f	\N	3	cd1a1264-4bb8-4dec-bc32-4ba1f8631abf
\.


--
-- Name: AspNetRoleClaims_Id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public."AspNetRoleClaims_Id_seq"', 1, false);


--
-- Name: AspNetUserClaims_Id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public."AspNetUserClaims_Id_seq"', 1, false);


--
-- Name: DamageReportHistory_ID_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public."DamageReportHistory_ID_seq"', 637, true);


--
-- Name: DamageReport_ID_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public."DamageReport_ID_seq"', 238, true);


--
-- Name: DeviceReminderPlan_ID_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public."DeviceReminderPlan_ID_seq"', 129, true);


--
-- Name: Device_ID_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public."Device_ID_seq"', 404, true);


--
-- Name: Event_ID_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public."Event_ID_seq"', 2226, true);


--
-- Name: Location_ID_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public."Location_ID_seq"', 35, true);


--
-- Name: Notification_ID_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public."Notification_ID_seq"', 260, true);


--
-- Name: PushSubscription_ID_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public."PushSubscription_ID_seq"', 31, true);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: neon_auth
--

ALTER TABLE ONLY neon_auth.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: invitation invitation_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: neon_auth
--

ALTER TABLE ONLY neon_auth.invitation
    ADD CONSTRAINT invitation_pkey PRIMARY KEY (id);


--
-- Name: jwks jwks_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: neon_auth
--

ALTER TABLE ONLY neon_auth.jwks
    ADD CONSTRAINT jwks_pkey PRIMARY KEY (id);


--
-- Name: member member_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: neon_auth
--

ALTER TABLE ONLY neon_auth.member
    ADD CONSTRAINT member_pkey PRIMARY KEY (id);


--
-- Name: organization organization_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: neon_auth
--

ALTER TABLE ONLY neon_auth.organization
    ADD CONSTRAINT organization_pkey PRIMARY KEY (id);


--
-- Name: organization organization_slug_key; Type: CONSTRAINT; Schema: neon_auth; Owner: neon_auth
--

ALTER TABLE ONLY neon_auth.organization
    ADD CONSTRAINT organization_slug_key UNIQUE (slug);


--
-- Name: project_config project_config_endpoint_id_key; Type: CONSTRAINT; Schema: neon_auth; Owner: neon_auth
--

ALTER TABLE ONLY neon_auth.project_config
    ADD CONSTRAINT project_config_endpoint_id_key UNIQUE (endpoint_id);


--
-- Name: project_config project_config_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: neon_auth
--

ALTER TABLE ONLY neon_auth.project_config
    ADD CONSTRAINT project_config_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: neon_auth
--

ALTER TABLE ONLY neon_auth.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: session session_token_key; Type: CONSTRAINT; Schema: neon_auth; Owner: neon_auth
--

ALTER TABLE ONLY neon_auth.session
    ADD CONSTRAINT session_token_key UNIQUE (token);


--
-- Name: user user_email_key; Type: CONSTRAINT; Schema: neon_auth; Owner: neon_auth
--

ALTER TABLE ONLY neon_auth."user"
    ADD CONSTRAINT user_email_key UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: neon_auth
--

ALTER TABLE ONLY neon_auth."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: neon_auth
--

ALTER TABLE ONLY neon_auth.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);


--
-- Name: AspNetRoleClaims AspNetRoleClaims_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AspNetRoleClaims"
    ADD CONSTRAINT "AspNetRoleClaims_pkey" PRIMARY KEY ("Id");


--
-- Name: AspNetRoles AspNetRoles_NormalizedName_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AspNetRoles"
    ADD CONSTRAINT "AspNetRoles_NormalizedName_key" UNIQUE ("NormalizedName");


--
-- Name: AspNetRoles AspNetRoles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AspNetRoles"
    ADD CONSTRAINT "AspNetRoles_pkey" PRIMARY KEY ("Id");


--
-- Name: AspNetUserClaims AspNetUserClaims_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AspNetUserClaims"
    ADD CONSTRAINT "AspNetUserClaims_pkey" PRIMARY KEY ("Id");


--
-- Name: AspNetUserLogins AspNetUserLogins_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AspNetUserLogins"
    ADD CONSTRAINT "AspNetUserLogins_pkey" PRIMARY KEY ("LoginProvider", "ProviderKey");


--
-- Name: AspNetUserRoles AspNetUserRoles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AspNetUserRoles"
    ADD CONSTRAINT "AspNetUserRoles_pkey" PRIMARY KEY ("UserId", "RoleId");


--
-- Name: AspNetUserTokens AspNetUserTokens_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AspNetUserTokens"
    ADD CONSTRAINT "AspNetUserTokens_pkey" PRIMARY KEY ("UserId", "LoginProvider", "Name");


--
-- Name: AspNetUsers AspNetUsers_NormalizedEmail_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AspNetUsers"
    ADD CONSTRAINT "AspNetUsers_NormalizedEmail_key" UNIQUE ("NormalizedEmail");


--
-- Name: AspNetUsers AspNetUsers_NormalizedUserName_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AspNetUsers"
    ADD CONSTRAINT "AspNetUsers_NormalizedUserName_key" UNIQUE ("NormalizedUserName");


--
-- Name: AspNetUsers AspNetUsers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AspNetUsers"
    ADD CONSTRAINT "AspNetUsers_pkey" PRIMARY KEY ("Id");


--
-- Name: DamageReportHistory DamageReportHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DamageReportHistory"
    ADD CONSTRAINT "DamageReportHistory_pkey" PRIMARY KEY ("ID");


--
-- Name: DamageReport DamageReport_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DamageReport"
    ADD CONSTRAINT "DamageReport_pkey" PRIMARY KEY ("ID");


--
-- Name: Department Department_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Department"
    ADD CONSTRAINT "Department_pkey" PRIMARY KEY ("ID");


--
-- Name: DeviceCategory DeviceCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DeviceCategory"
    ADD CONSTRAINT "DeviceCategory_pkey" PRIMARY KEY ("ID");


--
-- Name: DeviceReminderPlan DeviceReminderPlan_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DeviceReminderPlan"
    ADD CONSTRAINT "DeviceReminderPlan_pkey" PRIMARY KEY ("ID");


--
-- Name: Device Device_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Device"
    ADD CONSTRAINT "Device_pkey" PRIMARY KEY ("ID");


--
-- Name: EventType EventType_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."EventType"
    ADD CONSTRAINT "EventType_pkey" PRIMARY KEY ("ID");


--
-- Name: Event Event_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_pkey" PRIMARY KEY ("ID");


--
-- Name: Location Location_Name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Location"
    ADD CONSTRAINT "Location_Name_key" UNIQUE ("Name");


--
-- Name: Location Location_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Location"
    ADD CONSTRAINT "Location_pkey" PRIMARY KEY ("ID");


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY ("ID");


--
-- Name: PushSubscription PushSubscription_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."PushSubscription"
    ADD CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("ID");


--
-- Name: Staff Staff_UserId_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Staff"
    ADD CONSTRAINT "Staff_UserId_unique" UNIQUE ("UserId");


--
-- Name: Staff Staff_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Staff"
    ADD CONSTRAINT "Staff_pkey" PRIMARY KEY ("ID");


--
-- Name: account_userId_idx; Type: INDEX; Schema: neon_auth; Owner: neon_auth
--

CREATE INDEX "account_userId_idx" ON neon_auth.account USING btree ("userId");


--
-- Name: invitation_email_idx; Type: INDEX; Schema: neon_auth; Owner: neon_auth
--

CREATE INDEX invitation_email_idx ON neon_auth.invitation USING btree (email);


--
-- Name: invitation_organizationId_idx; Type: INDEX; Schema: neon_auth; Owner: neon_auth
--

CREATE INDEX "invitation_organizationId_idx" ON neon_auth.invitation USING btree ("organizationId");


--
-- Name: member_organizationId_idx; Type: INDEX; Schema: neon_auth; Owner: neon_auth
--

CREATE INDEX "member_organizationId_idx" ON neon_auth.member USING btree ("organizationId");


--
-- Name: member_userId_idx; Type: INDEX; Schema: neon_auth; Owner: neon_auth
--

CREATE INDEX "member_userId_idx" ON neon_auth.member USING btree ("userId");


--
-- Name: organization_slug_uidx; Type: INDEX; Schema: neon_auth; Owner: neon_auth
--

CREATE UNIQUE INDEX organization_slug_uidx ON neon_auth.organization USING btree (slug);


--
-- Name: session_userId_idx; Type: INDEX; Schema: neon_auth; Owner: neon_auth
--

CREATE INDEX "session_userId_idx" ON neon_auth.session USING btree ("userId");


--
-- Name: verification_identifier_idx; Type: INDEX; Schema: neon_auth; Owner: neon_auth
--

CREATE INDEX verification_identifier_idx ON neon_auth.verification USING btree (identifier);


--
-- Name: idx_aspnet_users_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_aspnet_users_email ON public."AspNetUsers" USING btree ("NormalizedEmail");


--
-- Name: idx_aspnet_users_username; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_aspnet_users_username ON public."AspNetUsers" USING btree ("NormalizedUserName");


--
-- Name: idx_damage_report_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_damage_report_date ON public."DamageReport" USING btree ("ReportDate");


--
-- Name: idx_damage_report_department; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_damage_report_department ON public."DamageReport" USING btree ("ReportingDepartmentID");


--
-- Name: idx_damage_report_device; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_damage_report_device ON public."DamageReport" USING btree ("DeviceID");


--
-- Name: idx_damage_report_handler; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_damage_report_handler ON public."DamageReport" USING btree ("HandlerID");


--
-- Name: idx_damage_report_history_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_damage_report_history_date ON public."DamageReportHistory" USING btree ("ChangedAt");


--
-- Name: idx_damage_report_history_report; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_damage_report_history_report ON public."DamageReportHistory" USING btree ("DamageReportID");


--
-- Name: idx_damage_report_maintenance_batch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_damage_report_maintenance_batch ON public."DamageReport" USING btree ("MaintenanceBatchId") WHERE ("MaintenanceBatchId" IS NOT NULL);


--
-- Name: idx_damage_report_reporter; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_damage_report_reporter ON public."DamageReport" USING btree ("ReporterID");


--
-- Name: idx_damage_report_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_damage_report_status ON public."DamageReport" USING btree ("Status");


--
-- Name: idx_device_category; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_device_category ON public."Device" USING btree ("DeviceCategoryID");


--
-- Name: idx_device_department; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_device_department ON public."Device" USING btree ("DepartmentID");


--
-- Name: idx_device_reminder_plan_active_due; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_device_reminder_plan_active_due ON public."DeviceReminderPlan" USING btree ("NextDueDate") WHERE ("IsActive" IS TRUE);


--
-- Name: idx_device_reminder_plan_device; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_device_reminder_plan_device ON public."DeviceReminderPlan" USING btree ("DeviceID");


--
-- Name: idx_event_device; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_event_device ON public."Event" USING btree ("DeviceID");


--
-- Name: idx_event_related_report; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_event_related_report ON public."Event" USING btree ("RelatedReportID");


--
-- Name: idx_event_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_event_status ON public."Event" USING btree ("Status");


--
-- Name: idx_staff_department; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_staff_department ON public."Staff" USING btree ("DepartmentID");


--
-- Name: ux_eventtype_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX ux_eventtype_code ON public."EventType" USING btree ("Code") WHERE ("Code" IS NOT NULL);


--
-- Name: account account_userId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: neon_auth
--

ALTER TABLE ONLY neon_auth.account
    ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: invitation invitation_inviterId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: neon_auth
--

ALTER TABLE ONLY neon_auth.invitation
    ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: invitation invitation_organizationId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: neon_auth
--

ALTER TABLE ONLY neon_auth.invitation
    ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES neon_auth.organization(id) ON DELETE CASCADE;


--
-- Name: member member_organizationId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: neon_auth
--

ALTER TABLE ONLY neon_auth.member
    ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES neon_auth.organization(id) ON DELETE CASCADE;


--
-- Name: member member_userId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: neon_auth
--

ALTER TABLE ONLY neon_auth.member
    ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: session session_userId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: neon_auth
--

ALTER TABLE ONLY neon_auth.session
    ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: AspNetRoleClaims AspNetRoleClaims_RoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AspNetRoleClaims"
    ADD CONSTRAINT "AspNetRoleClaims_RoleId_fkey" FOREIGN KEY ("RoleId") REFERENCES public."AspNetRoles"("Id") ON DELETE CASCADE;


--
-- Name: AspNetUserClaims AspNetUserClaims_UserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AspNetUserClaims"
    ADD CONSTRAINT "AspNetUserClaims_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES public."AspNetUsers"("Id") ON DELETE CASCADE;


--
-- Name: AspNetUserLogins AspNetUserLogins_UserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AspNetUserLogins"
    ADD CONSTRAINT "AspNetUserLogins_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES public."AspNetUsers"("Id") ON DELETE CASCADE;


--
-- Name: AspNetUserRoles AspNetUserRoles_RoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AspNetUserRoles"
    ADD CONSTRAINT "AspNetUserRoles_RoleId_fkey" FOREIGN KEY ("RoleId") REFERENCES public."AspNetRoles"("Id") ON DELETE CASCADE;


--
-- Name: AspNetUserRoles AspNetUserRoles_UserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AspNetUserRoles"
    ADD CONSTRAINT "AspNetUserRoles_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES public."AspNetUsers"("Id") ON DELETE CASCADE;


--
-- Name: AspNetUserTokens AspNetUserTokens_UserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AspNetUserTokens"
    ADD CONSTRAINT "AspNetUserTokens_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES public."AspNetUsers"("Id") ON DELETE CASCADE;


--
-- Name: DamageReportHistory DamageReportHistory_DamageReportID_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DamageReportHistory"
    ADD CONSTRAINT "DamageReportHistory_DamageReportID_fkey" FOREIGN KEY ("DamageReportID") REFERENCES public."DamageReport"("ID") ON DELETE CASCADE;


--
-- Name: DamageReport DamageReport_DeviceID_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DamageReport"
    ADD CONSTRAINT "DamageReport_DeviceID_fkey" FOREIGN KEY ("DeviceID") REFERENCES public."Device"("ID") ON DELETE SET NULL;


--
-- Name: DamageReport DamageReport_HandlerID_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DamageReport"
    ADD CONSTRAINT "DamageReport_HandlerID_fkey" FOREIGN KEY ("HandlerID") REFERENCES public."Staff"("ID");


--
-- Name: DamageReport DamageReport_ReporterID_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DamageReport"
    ADD CONSTRAINT "DamageReport_ReporterID_fkey" FOREIGN KEY ("ReporterID") REFERENCES public."Staff"("ID");


--
-- Name: DamageReport DamageReport_ReportingDepartmentID_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DamageReport"
    ADD CONSTRAINT "DamageReport_ReportingDepartmentID_fkey" FOREIGN KEY ("ReportingDepartmentID") REFERENCES public."Department"("ID");


--
-- Name: DeviceReminderPlan DeviceReminderPlan_DeviceID_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DeviceReminderPlan"
    ADD CONSTRAINT "DeviceReminderPlan_DeviceID_fkey" FOREIGN KEY ("DeviceID") REFERENCES public."Device"("ID") ON DELETE CASCADE;


--
-- Name: DeviceReminderPlan DeviceReminderPlan_EventTypeID_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DeviceReminderPlan"
    ADD CONSTRAINT "DeviceReminderPlan_EventTypeID_fkey" FOREIGN KEY ("EventTypeID") REFERENCES public."EventType"("ID") ON DELETE SET NULL;


--
-- Name: Device Device_DepartmentID_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Device"
    ADD CONSTRAINT "Device_DepartmentID_fkey" FOREIGN KEY ("DepartmentID") REFERENCES public."Department"("ID");


--
-- Name: Device Device_DeviceCategoryID_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Device"
    ADD CONSTRAINT "Device_DeviceCategoryID_fkey" FOREIGN KEY ("DeviceCategoryID") REFERENCES public."DeviceCategory"("ID");


--
-- Name: Event Event_DeviceID_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_DeviceID_fkey" FOREIGN KEY ("DeviceID") REFERENCES public."Device"("ID");


--
-- Name: Event Event_EventTypeID_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_EventTypeID_fkey" FOREIGN KEY ("EventTypeID") REFERENCES public."EventType"("ID");


--
-- Name: Event Event_RelatedReportID_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_RelatedReportID_fkey" FOREIGN KEY ("RelatedReportID") REFERENCES public."DamageReport"("ID") ON DELETE SET NULL;


--
-- Name: Event Event_StaffID_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_StaffID_fkey" FOREIGN KEY ("StaffID") REFERENCES public."Staff"("ID");


--
-- Name: Staff Staff_DepartmentID_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Staff"
    ADD CONSTRAINT "Staff_DepartmentID_fkey" FOREIGN KEY ("DepartmentID") REFERENCES public."Department"("ID");


--
-- Name: Staff Staff_UserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Staff"
    ADD CONSTRAINT "Staff_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES public."AspNetUsers"("Id") ON DELETE SET NULL;


--
-- Name: Device fk_device_location; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Device"
    ADD CONSTRAINT fk_device_location FOREIGN KEY ("LocationID") REFERENCES public."Location"("ID") ON DELETE SET NULL;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: neondb_owner
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT CREATE ON SCHEMA public TO PUBLIC;


--
-- Name: SCHEMA pgrst; Type: ACL; Schema: -; Owner: neon_service
--

GRANT USAGE ON SCHEMA pgrst TO authenticator;


--
-- Name: FUNCTION pre_config(); Type: ACL; Schema: pgrst; Owner: neon_service
--

GRANT ALL ON FUNCTION pgrst.pre_config() TO authenticator;


--
-- PostgreSQL database dump complete
--

\unrestrict 6LxBZUt4tNqgAlhfki1UUCu44vDDSV66o9DetSnJdOWrGFzQJTh6T116qwV00ik

