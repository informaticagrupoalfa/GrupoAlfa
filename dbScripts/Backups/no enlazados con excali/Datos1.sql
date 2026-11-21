--
-- PostgreSQL database dump
--

\restrict 1VQWfkZSsu1qm59D0lUu0hu3cf6naR9QgqQdc4ixILWIQLmAOvpOXPJnKPvlGQE

-- Dumped from database version 17.11
-- Dumped by pg_dump version 18.4

-- Started on 2026-11-11 14:13:57

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
-- TOC entry 4049 (class 0 OID 18381)
-- Dependencies: 328
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usuarios (id_usuario, nro_carnet, apellido_paterno, apellido_materno, nombre, fecha_nacimiento, correo_electronico, "contraseña", usuario_vigente) FROM stdin;
53	41204201	apoderado1_ap	apoderado1_am	apoderado1	2000-10-10	apoderado1_ap@gmail.com	$2b$10$Iw9JRHXexd.UMjrSXqAHbeMljXXy0fxmmCMwPYgt0SbWsJsRFoDs6	t
4	1000004	Fernández	Torres	Ana Lucía	1988-01-30	ana.fernandez@mail.com	hash_pbkdf2_004	t
5	1000005	Ramos	Vargas	Diego Armando	1992-05-17	diego.ramos@mail.com	hash_pbkdf2_005	t
6	1000006	Salazar	Mendoza	Carla Patricia	1987-09-09	carla.salazar@mail.com	hash_pbkdf2_006	t
7	1000007	Torrez	Flores	Miguel Ángel	1980-12-01	miguel.torrez@mail.com	hash_pbkdf2_007	t
8	1000008	Vargas	Cruz	Lucía Fernanda	1995-04-14	lucia.vargas@mail.com	hash_pbkdf2_008	t
9	1000009	Condori	Huanca	Jorge Luis	1983-06-25	jorge.condori@mail.com	hash_pbkdf2_009	t
10	1000010	Quispe	Lima	Sofía Alejandra	1991-10-11	sofia.quispe@mail.com	hash_pbkdf2_010	t
11	1000011	Paredes	Siles	Roberto Carlos	1979-02-18	roberto.paredes@mail.com	hash_pbkdf2_011	t
12	1000012	Mendoza	Aguilar	Paola Andrea	1986-08-27	paola.mendoza@mail.com	hash_pbkdf2_012	t
13	1000013	Castro	Bravo	Fernando José	1984-03-03	fernando.castro@mail.com	hash_pbkdf2_013	t
15	1000015	Acuña	Zegarra	Marco Antonio	1981-07-07	marco.acuna@mail.com	hash_pbkdf2_015	t
18	1000018	Delgado	Iriarte	Valeria	1994-11-23	valeria.delgado@mail.com	hash_pbkdf2_018	t
19	1000019	Espinoza	Nina	Cristian David	1987-01-08	cristian.espinoza@mail.com	hash_pbkdf2_019	t
20	1000020	Fuentes	Orellana	Natalia	1990-06-16	natalia.fuentes@mail.com	hash_pbkdf2_020	t
21	1000021	Galarza	Patiño	Hugo René	1975-04-20	hugo.galarza@mail.com	hash_pbkdf2_021	t
22	1000022	Herrera	Quiroga	Rosa María	1980-10-02	rosa.herrera@mail.com	hash_pbkdf2_022	t
23	1000023	Ibáñez	Rengel	Luis Fernando	1977-12-12	luis.ibanez@mail.com	hash_pbkdf2_023	t
24	1000024	Jiménez	Soria	Carmen Rosa	1982-05-06	carmen.jimenez@mail.com	hash_pbkdf2_024	t
25	1000025	Kuno	Ticona	Óscar	1979-08-08	oscar.kuno@mail.com	hash_pbkdf2_025	t
26	1000026	López	Ugarte	Mónica	1985-02-14	monica.lopez@mail.com	hash_pbkdf2_026	t
27	1000027	Miranda	Vaca	Raúl Ernesto	1976-09-30	raul.miranda@mail.com	hash_pbkdf2_027	t
28	1000028	Núñez	Walls	Elena	1983-03-21	elena.nunez@mail.com	hash_pbkdf2_028	t
29	1000029	Ochoa	Yáñez	Pablo César	1981-07-11	pablo.ochoa@mail.com	hash_pbkdf2_029	t
30	1000030	Pacheco	Zambrana	Teresa	1978-11-17	teresa.pacheco@mail.com	hash_pbkdf2_030	t
31	1000031	Colque	Mamani	Kevin Brandon	2006-02-10	kevin.colque@mail.com	hash_pbkdf2_031	t
32	1000032	Santos	Paredes	Ariana Nicole	2007-05-24	ariana.santos@mail.com	hash_pbkdf2_032	t
33	1000033	Tola	Ramos	Dilan Mateo	2006-09-12	dilan.tola@mail.com	hash_pbkdf2_033	t
34	1000034	Uria	Salas	Camila	2007-01-19	camila.uria@mail.com	hash_pbkdf2_034	t
35	1000035	Venegas	Tapia	Rodrigo	2005-11-03	rodrigo.venegas@mail.com	hash_pbkdf2_035	t
36	1000036	Zárate	Uño	Fernanda	2006-06-28	fernanda.zarate@mail.com	hash_pbkdf2_036	t
37	1000037	Alarcón	Villarroel	Matías	2007-03-15	matias.alarcon@mail.com	hash_pbkdf2_037	t
38	1000038	Blanco	Wella	Jimena	2006-08-09	jimena.blanco@mail.com	hash_pbkdf2_038	t
39	1000039	Callisaya	Yujra	Sebastián	2005-12-25	sebastian.callisaya@mail.com	hash_pbkdf2_039	t
40	1000040	Dorado	Zenteno	Alison	2007-07-07	alison.dorado@mail.com	hash_pbkdf2_040	t
41	1000041	Eyzaguirre	Aguirre	Thiago	2006-04-04	thiago.eyzaguirre@mail.com	hash_pbkdf2_041	t
42	1000042	Flores	Borda	Nayeli	2007-10-31	nayeli.flores@mail.com	hash_pbkdf2_042	t
43	1000043	Gómez	Callapa	Alexandra	1996-03-08	alexandra.gomez@mail.com	hash_pbkdf2_043	t
44	1000044	Huanca	Daza	Sergio	1998-09-20	sergio.huanca@mail.com	hash_pbkdf2_044	f
45	1000045	Inca	Escobar	Beatriz	2000-01-25	beatriz.inca@mail.com	hash_pbkdf2_045	t
48	5555	Quispe	Gutierrez	Pablo	2002-02-08	pablo@gmail.com	$2b$10$0XI4FZ2f1z970GXOFBJs..dvyFXlzgtrtbPaVnL42Teg1bqXfcEjS	t
50	101011	Lopez	Perez	Juan	2002-10-10	Juan2@gmail.com	$2b$10$f4TcZfClPlaZfDSRbJOPdu/Fvx2IFfT5Osmas/2WwPvKfJuuJz5Be	t
49	10101	Lopez	Perez	Juan	2002-10-10	Juan@gmail.com	$2b$10$.R0xRwMIpPDMjo8I.70BOuHVQx76bP.nB0TGUVPZEYglvHwyknXQa	t
51	111111	Sals	Guerrero	Adán	2000-01-01	adan@gmail.com	$2b$10$ifmm4GGcxDZMgq4ubdXUTOgRn6Mmn2muDNUwMrZ1ip1yiEvFIExcS	t
46	123421421	Luque	Tarqui	Marcelo	2002-02-10	luque2219@gmail.com	$2b$10$YnOrhNYsGpS1tYDyiTxL5.mHNIjp839o/FEMrCpfHXsNdeS8zWRAO	t
52	15	AP1_AP	AP1_AM	ASESOR_P1	2003-01-01	ASESOR_P1@gmail.com	$2b$10$orXJ2zjx47CWfC6ya2MQMuUUCd8UCTr6k9BKJquMtg638uyfQ.hpW	t
\.


--
-- TOC entry 4003 (class 0 OID 18264)
-- Dependencies: 282
-- Data for Name: administrativos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.administrativos (id_administrativo, id_usuario) FROM stdin;
4	4
5	5
6	6
7	7
8	8
9	9
10	10
11	51
12	46
\.


--
-- TOC entry 4005 (class 0 OID 18268)
-- Dependencies: 284
-- Data for Name: apoderados; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.apoderados (id_apoderado, id_usuario, celular) FROM stdin;
4	24	70444555
5	25	70555666
6	26	70666777
7	27	70777888
8	28	70888999
9	29	70999000
10	30	71000111
11	46	69987205
12	53	60202020
\.


--
-- TOC entry 4007 (class 0 OID 18275)
-- Dependencies: 286
-- Data for Name: asesores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.asesores (id_asesor, id_usuario) FROM stdin;
2	12
3	13
5	15
8	18
9	19
10	20
4	\N
6	\N
7	\N
11	51
12	46
\.


--
-- TOC entry 4013 (class 0 OID 18292)
-- Dependencies: 292
-- Data for Name: aulas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.aulas (id_aula, capacidad, codigo) FROM stdin;
1	30	A1
2	25	A2
3	40	A3
4	35	A4
5	20	A5
6	50	A6
7	28	A7
8	32	A8
9	45	A9
10	22	A10
\.


--
-- TOC entry 4031 (class 0 OID 18337)
-- Dependencies: 310
-- Data for Name: facultades; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.facultades (id_facultad, nombre) FROM stdin;
4	Ciencias Económicas y Financieras
2	Medicina, Enfermería, Nutrición y Tecnología Médica
7	Odontología
1	Ingeniería
12	Ciencias Farmacéuticas y Bioquímicas
\.


--
-- TOC entry 4023 (class 0 OID 18316)
-- Dependencies: 302
-- Data for Name: convocatorias_preuniversitario; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.convocatorias_preuniversitario (id_convocatoria, id_facultad, fecha_inicio) FROM stdin;
1	1	2025-01-15
2	2	2025-02-01
4	4	2025-03-01
7	1	2025-07-15
10	2	2026-01-10
9	\N	2025-08-15
8	\N	2025-08-01
5	\N	2025-03-15
6	\N	2025-04-01
3	\N	2025-02-15
\.


--
-- TOC entry 4056 (class 0 OID 18738)
-- Dependencies: 335
-- Data for Name: capacitaciones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.capacitaciones (id_capacitacion, id_convocatoria, fecha_inicio, fecha_fin, activo) FROM stdin;
1	1	2026-09-01	2027-02-28	t
2	2	2026-10-01	2027-03-31	t
3	3	2026-11-01	2027-04-30	t
\.


--
-- TOC entry 4025 (class 0 OID 18320)
-- Dependencies: 304
-- Data for Name: paralelos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.paralelos (id_paralelo, id_aula, nivel, nombre_paralelo, modalidad, hora_inicio, hora_fin, activo, id_capacitacion, dias) FROM stdin;
1	1	Iniciando	Paralelo A - Mañana	Presencial	08:00:00	12:00:00	t	1	Lunes, Miércoles, Viernes
2	2	Iniciando	Paralelo B - Tarde	Presencial	14:00:00	18:00:00	t	1	Martes, Jueves
3	3	Intermedio	Paralelo A - Intensivo	Presencial	08:00:00	12:30:00	t	2	Lunes a Viernes
4	4	Intermedio	Paralelo B - Virtual	Virtual	19:00:00	21:30:00	t	2	Lunes, Miércoles
5	5	Avanzado	Paralelo A - Fin de semana	Híbrida	09:00:00	13:00:00	t	3	Sábado, Domingo
6	6	Avanzado	Paralelo B - Noche	Presencial	18:30:00	21:30:00	t	3	Martes, Jueves
\.


--
-- TOC entry 4060 (class 0 OID 18780)
-- Dependencies: 339
-- Data for Name: asesor_paralelo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.asesor_paralelo (id_asignacion_asesor, id_asesor, id_paralelo) FROM stdin;
1	2	1
2	3	2
3	4	3
4	5	4
5	6	5
6	7	6
\.


--
-- TOC entry 4019 (class 0 OID 18305)
-- Dependencies: 298
-- Data for Name: clases; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clases (id_clase, id_paralelo, id_asesor, id_tema, inicioclase) FROM stdin;
1	1	2	1	2026-11-09
2	3	4	1	2026-11-10
\.


--
-- TOC entry 4027 (class 0 OID 18325)
-- Dependencies: 306
-- Data for Name: estudiantes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.estudiantes (id_estudiante, id_usuario, id_apoderado, colegio_de_procedencia, direccion_de_domicilio, foto) FROM stdin;
4	34	4	Colegio Santa Ana	Calle Murillo 101, El Alto	\N
5	35	5	Colegio La Salle	Av. 6 de Marzo 202, El Alto	\N
6	36	6	Colegio San Ignacio	Calle Potosí 303, La Paz	\N
7	37	7	Colegio Alemán	Av. Ballivián 404, La Paz	\N
8	38	8	Colegio Amor de Dios	Calle Sagárnaga 505, La Paz	\N
9	39	9	Colegio Franco Boliviano	Av. Villazón 606, Cochabamba	\N
10	40	10	Colegio Domingo Savio	Calle Heroínas 707, Cochabamba	\N
13	49	\N	\N	\N	\N
11	41	\N	Colegio San Calixto	Av. Arce 999, La Paz	\N
2	32	\N	Colegio Loretto	Calle Loayza 456, La Paz	\N
12	42	\N	Colegio Loretto	Calle Loayza 888, La Paz	\N
3	33	\N	Colegio Don Bosco	Av. Busch 789, La Paz	\N
14	46	\N	\N	\N	\N
\.


--
-- TOC entry 4011 (class 0 OID 18288)
-- Dependencies: 290
-- Data for Name: asistencias; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.asistencias (id_asistencia, id_clase, id_estudiante, hora_entrada, salida_antes_de_tiempo, permiso, razon_permiso) FROM stdin;
1	1	2	2026-11-09 08:00:00	\N	t	\N
2	1	3	2026-11-09 08:00:00	\N	t	\N
\.


--
-- TOC entry 4047 (class 0 OID 18377)
-- Dependencies: 326
-- Data for Name: temas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.temas (id_tema, nombre_tema) FROM stdin;
1	Álgebra básica
2	Trigonometría
3	Cinemática
4	Dinámica
5	Tabla periódica
6	Genética
7	Gramática
8	Series numéricas
9	Algoritmos
10	Estequiometría
11	Comprensión lectora
12	Electromagnetismo
\.


--
-- TOC entry 4015 (class 0 OID 18297)
-- Dependencies: 294
-- Data for Name: avances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.avances (id_avance, id_clase, id_tema) FROM stdin;
\.


--
-- TOC entry 4017 (class 0 OID 18301)
-- Dependencies: 296
-- Data for Name: carreras; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.carreras (id_carrera, id_facultad, nombre) FROM stdin;
1	1	Ingeniería de Sistemas
2	1	Ingeniería Civil
3	2	Medicina
4	2	Enfermería
6	4	Administración de Empresas
11	4	Contaduría Pública
12	7	Odontología
10	\N	Psicología
9	\N	Electrónica
7	\N	Arquitectura
8	\N	Física
5	\N	Derecho
\.


--
-- TOC entry 4036 (class 0 OID 18353)
-- Dependencies: 315
-- Data for Name: materias; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.materias (id_materia, nombre_materia) FROM stdin;
1	Matemáticas
2	Física
3	Química
4	Biología
5	Lenguaje
6	Historia
7	Geografía
8	Inglés
9	Razonamiento Lógico
10	Informática
\.


--
-- TOC entry 4029 (class 0 OID 18331)
-- Dependencies: 308
-- Data for Name: examenes_de_ingreso; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.examenes_de_ingreso (id_examen_de_ingreso, id_convocatoria, id_materia, foto) FROM stdin;
1	1	1	\N
2	1	2	\N
3	2	4	\N
4	3	5	\N
5	4	1	\N
6	5	2	\N
7	6	3	\N
8	7	9	\N
9	8	10	\N
10	9	5	\N
\.


--
-- TOC entry 4021 (class 0 OID 18309)
-- Dependencies: 300
-- Data for Name: contenidos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contenidos (id_contenido, id_examen_de_ingreso, id_tema) FROM stdin;
1	1	1
2	1	2
3	2	3
4	3	6
5	4	7
6	5	1
7	6	4
8	7	5
9	8	8
10	9	9
\.


--
-- TOC entry 4033 (class 0 OID 18341)
-- Dependencies: 312
-- Data for Name: inscripciones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inscripciones (id_inscripcion, id_administrativo, id_estudiante, como_se_entero_de_nosotros, recalculo, preparacion_previa, tiempo_de_preparacion_meses, lugar_de_preparacion) FROM stdin;
4	4	4	TikTok	f	f	0	\N
5	5	5	Radio	f	t	2	Casa
6	6	6	Feria	t	f	0	\N
7	7	7	Instagram	f	t	4	Colegio
8	8	8	Hermano	f	f	0	\N
9	9	9	Facebook	t	t	5	Preuniversitario Alfa
10	10	10	TikTok	f	f	0	\N
2	\N	2	Amigo	f	f	0	\N
3	\N	3	Volante	t	t	6	Academia Sigma
\.


--
-- TOC entry 4035 (class 0 OID 18350)
-- Dependencies: 314
-- Data for Name: materia_asesor; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.materia_asesor (id_materia_asesor, id_asesor, id_materia) FROM stdin;
2	2	2
3	3	3
4	4	4
5	5	5
6	6	9
7	7	10
8	8	1
9	9	2
10	10	5
\.


--
-- TOC entry 4058 (class 0 OID 18761)
-- Dependencies: 337
-- Data for Name: materia_capacitacion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.materia_capacitacion (id_asignacion_materia, id_materia, id_capacitacion) FROM stdin;
1	1	1
2	2	1
3	5	1
4	1	2
5	3	2
6	4	2
7	5	3
8	6	3
9	9	3
10	10	3
\.


--
-- TOC entry 4052 (class 0 OID 18662)
-- Dependencies: 331
-- Data for Name: materia_facultad; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.materia_facultad (id_materia_facultad, id_materia, id_facultad) FROM stdin;
\.


--
-- TOC entry 4054 (class 0 OID 18681)
-- Dependencies: 333
-- Data for Name: materia_facultad_temas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.materia_facultad_temas (id_materia_facultad_tema, id_materia_facultad, id_tema) FROM stdin;
\.


--
-- TOC entry 4039 (class 0 OID 18359)
-- Dependencies: 318
-- Data for Name: matriculaciones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.matriculaciones (id_matriculacion, id_estudiante, id_paralelo, esta_vigente, nro_comprobante, nro_credencial) FROM stdin;
1	4	5	t	1004	2004
2	2	1	t	1002	2002
3	3	3	t	1003	2003
\.


--
-- TOC entry 4041 (class 0 OID 18364)
-- Dependencies: 320
-- Data for Name: mensualidades; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mensualidades (id_mensualidad, id_administrativo, fecha_inicio_mensualidad, fecha_fin_mensualidad, pago, id_inscripcion) FROM stdin;
4	4	2025-03-05	2025-04-05	300.00	\N
5	5	2025-01-20	2025-02-20	350.00	\N
6	6	2025-03-20	2025-04-20	380.00	\N
7	7	2025-07-20	2025-08-20	350.00	\N
8	8	2025-08-20	2025-09-20	320.00	\N
9	9	2025-02-05	2025-03-05	400.00	\N
10	10	2025-08-05	2025-09-05	360.00	\N
11	\N	2025-01-20	2025-02-20	350.00	\N
2	\N	2025-02-05	2025-03-05	400.00	\N
12	\N	2026-01-15	2026-02-15	420.00	\N
3	\N	2025-02-20	2025-03-20	350.00	\N
1	\N	2025-01-20	2025-02-20	350.00	\N
\.


--
-- TOC entry 4043 (class 0 OID 18369)
-- Dependencies: 322
-- Data for Name: postulaciones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.postulaciones (id_postulacion, id_estudiante, id_carrera) FROM stdin;
2	2	3
3	3	5
4	4	6
5	5	2
6	6	7
7	7	1
8	8	10
9	9	3
10	10	9
11	11	4
12	12	12
\.


--
-- TOC entry 4045 (class 0 OID 18373)
-- Dependencies: 324
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roles (id_rol, nombre) FROM stdin;
1	SysAdmin
2	Rooter
3	Gerencia
4	Cajero
5	Administración
6	Asesor Coordinador
7	Asesor
8	Apoderado
9	Estudiante
10	Invitado
\.


--
-- TOC entry 4009 (class 0 OID 18279)
-- Dependencies: 288
-- Data for Name: usuario_rol; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usuario_rol (id_asignacion_rol, id_rol, id_usuario) FROM stdin;
4	3	4
5	5	5
6	7	11
7	7	12
8	6	13
9	8	21
10	8	22
11	9	31
12	9	32
18	9	49
19	5	51
20	7	51
21	1	51
45	5	46
46	8	46
47	7	46
48	6	46
49	4	46
50	9	46
51	3	46
52	10	46
53	2	46
54	1	46
55	8	53
\.


--
-- TOC entry 4066 (class 0 OID 0)
-- Dependencies: 283
-- Name: administrativos_id_administrativo_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.administrativos_id_administrativo_seq', 12, true);


--
-- TOC entry 4067 (class 0 OID 0)
-- Dependencies: 285
-- Name: apoderados_id_apoderado_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.apoderados_id_apoderado_seq', 12, true);


--
-- TOC entry 4068 (class 0 OID 0)
-- Dependencies: 338
-- Name: asesor_paralelo_id_asignacion_asesor_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.asesor_paralelo_id_asignacion_asesor_seq', 6, true);


--
-- TOC entry 4069 (class 0 OID 0)
-- Dependencies: 287
-- Name: asesores_id_asesor_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.asesores_id_asesor_seq', 12, true);


--
-- TOC entry 4070 (class 0 OID 0)
-- Dependencies: 289
-- Name: asignacion_rol_id_asignacion_rol_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.asignacion_rol_id_asignacion_rol_seq', 55, true);


--
-- TOC entry 4071 (class 0 OID 0)
-- Dependencies: 291
-- Name: asistencias_id_asistencia_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.asistencias_id_asistencia_seq', 2, true);


--
-- TOC entry 4072 (class 0 OID 0)
-- Dependencies: 293
-- Name: aulas_id_aula_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.aulas_id_aula_seq', 10, true);


--
-- TOC entry 4073 (class 0 OID 0)
-- Dependencies: 295
-- Name: avances_id_avance_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.avances_id_avance_seq', 1, false);


--
-- TOC entry 4074 (class 0 OID 0)
-- Dependencies: 334
-- Name: capacitaciones_id_capacitacion_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.capacitaciones_id_capacitacion_seq', 3, true);


--
-- TOC entry 4075 (class 0 OID 0)
-- Dependencies: 297
-- Name: carreras_id_carrera_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.carreras_id_carrera_seq', 12, true);


--
-- TOC entry 4076 (class 0 OID 0)
-- Dependencies: 299
-- Name: clases_id_clase_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clases_id_clase_seq', 2, true);


--
-- TOC entry 4077 (class 0 OID 0)
-- Dependencies: 301
-- Name: contenidos_id_contenido_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.contenidos_id_contenido_seq', 10, true);


--
-- TOC entry 4078 (class 0 OID 0)
-- Dependencies: 303
-- Name: convocatorias_preuniversitario_id_convocatoria_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.convocatorias_preuniversitario_id_convocatoria_seq', 10, true);


--
-- TOC entry 4079 (class 0 OID 0)
-- Dependencies: 305
-- Name: cursos_capacitacion_id_capacitacion_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cursos_capacitacion_id_capacitacion_seq', 6, true);


--
-- TOC entry 4080 (class 0 OID 0)
-- Dependencies: 307
-- Name: estudiantes_id_estudiante_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.estudiantes_id_estudiante_seq', 14, true);


--
-- TOC entry 4081 (class 0 OID 0)
-- Dependencies: 309
-- Name: examenes_de_ingreso_id_examen_de_ingreso_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.examenes_de_ingreso_id_examen_de_ingreso_seq', 10, true);


--
-- TOC entry 4082 (class 0 OID 0)
-- Dependencies: 311
-- Name: facultades_id_facultad_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.facultades_id_facultad_seq', 12, true);


--
-- TOC entry 4083 (class 0 OID 0)
-- Dependencies: 313
-- Name: inscripciones_id_inscripcion_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inscripciones_id_inscripcion_seq', 10, true);


--
-- TOC entry 4084 (class 0 OID 0)
-- Dependencies: 336
-- Name: materia_capacitacion_id_asignacion_materia_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.materia_capacitacion_id_asignacion_materia_seq', 10, true);


--
-- TOC entry 4085 (class 0 OID 0)
-- Dependencies: 330
-- Name: materia_facultad_id_materia_facultad_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.materia_facultad_id_materia_facultad_seq', 3, true);


--
-- TOC entry 4086 (class 0 OID 0)
-- Dependencies: 332
-- Name: materia_facultad_temas_id_materia_facultad_tema_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.materia_facultad_temas_id_materia_facultad_tema_seq', 3, true);


--
-- TOC entry 4087 (class 0 OID 0)
-- Dependencies: 316
-- Name: materias_asesores_id_materia_asesor_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.materias_asesores_id_materia_asesor_seq', 10, true);


--
-- TOC entry 4088 (class 0 OID 0)
-- Dependencies: 317
-- Name: materias_id_materia_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.materias_id_materia_seq', 14, true);


--
-- TOC entry 4089 (class 0 OID 0)
-- Dependencies: 319
-- Name: matriculaciones_id_matriculacion_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.matriculaciones_id_matriculacion_seq', 3, true);


--
-- TOC entry 4090 (class 0 OID 0)
-- Dependencies: 321
-- Name: mensualidades_id_mensualidad_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mensualidades_id_mensualidad_seq', 12, true);


--
-- TOC entry 4091 (class 0 OID 0)
-- Dependencies: 323
-- Name: postulaciones_id_postulacion_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.postulaciones_id_postulacion_seq', 12, true);


--
-- TOC entry 4092 (class 0 OID 0)
-- Dependencies: 325
-- Name: roles_id_rol_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roles_id_rol_seq', 10, true);


--
-- TOC entry 4093 (class 0 OID 0)
-- Dependencies: 327
-- Name: temas_id_tema_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.temas_id_tema_seq', 15, true);


--
-- TOC entry 4094 (class 0 OID 0)
-- Dependencies: 329
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.usuarios_id_usuario_seq', 53, true);


-- Completed on 2026-11-11 14:14:22

--
-- PostgreSQL database dump complete
--

\unrestrict 1VQWfkZSsu1qm59D0lUu0hu3cf6naR9QgqQdc4ixILWIQLmAOvpOXPJnKPvlGQE

