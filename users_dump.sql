--
-- PostgreSQL database dump
--

-- Dumped from database version 16.11 (b740647)
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

--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.users VALUES ('xm-1imDrcC', 'jordancrowther@chadlaw.co.uk', 'Jordan', 'Crowther', NULL, NULL, '2025-07-23 17:51:50.915875', '2025-08-06 11:06:37.657', false, '', '1868e9e0fd94740682fb7deb3a942b6738ce145a685499a76a107490a87dd2b06fcb087971f8501013d636224ec182c46589550232aaedbfaca8a9fcccd7fdb0.d3e04eae89904821dfafc3bde595cde5', NULL, false, NULL, true, true);
INSERT INTO public.users VALUES ('43000315', 'danhirst@chadlaw.co.uk', 'Dan', 'Hirst', NULL, 3, '2025-07-11 17:07:05.530534', '2025-08-06 13:46:43.784', true, '01132258811', '6ba8e17c2e5a2f1048049745f227c8161eca55e19b8ae78ed44c3f90941cb68bf1129202562eb0f85a40f7644affd8f148cb2bbd7952c078b6d3a0218a535a38.97de72625d8b9afce9e9f18ad79c9656', 'admin123', false, NULL, true, true);
INSERT INTO public.users VALUES ('admin_1753292574.014698', 'Email@acclaim.law', 'Admin', 'User', NULL, NULL, '2025-07-23 17:42:54.014698', '2025-07-23 17:42:54.014698', true, NULL, '$2b$10$bhv9qcJt0Qu7IB8ZGqB9ZuTE8n3FipK6vBltsP4.MV9t0pGx75VaK', NULL, false, NULL, true, true);
INSERT INTO public.users VALUES ('44821844', 'perry367@gmail.com', 'Matt', 'Perry', NULL, 4, '2025-07-12 08:42:50.58667', '2025-08-21 16:04:00.427', false, NULL, '56a54e19afd7bc60ae2dadd8016bdb1ac0e9b2eccb56cd86a30279afefbc2ec0f4ca4f5e4b92970cf8a03f50daf0b1a6d327d87a6c7287f7e3e8dfa3865c7b67.f4a82d871d7253cf6a2f9620d61a0323', NULL, false, NULL, true, true);
INSERT INTO public.users VALUES ('TwbHhZRCUt', 'seanthornhill@chadlaw.co.uk', 'Sean', 'Thornhill-Adey', NULL, 4, '2025-07-24 15:53:31.667104', '2025-07-25 09:13:01.241', false, '', '$2b$10$60dZmPdy.6wuenagKui8buGIsS6y85K5klqpi5upjCuHg6M1W9Oca', NULL, false, NULL, true, true);
INSERT INTO public.users VALUES ('jZJVUVcC3I', 'mattperry@chadlaw.co.uk', 'Matthew', 'Perry', NULL, 2, '2025-07-13 07:41:58.985119', '2025-07-19 21:35:16.688', true, '01132258847', '$2b$10$yU0Tcr.O2uMBoi16qkxcZugGjJRZaVlIsCuqR.QYWr4SHv6yR5X62', 'Ky3X1ryyPiUN', true, NULL, true, true);


--
-- PostgreSQL database dump complete
--

