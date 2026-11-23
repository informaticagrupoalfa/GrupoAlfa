INSERT INTO public.usuarios (
    nro_carnet,
    apellido_paterno,
    apellido_materno,
    nombre,
    fecha_nacimiento,
    correo_electronico,
    "contraseña",
    usuario_vigente,
    nro_telefono
)
VALUES
(10000001, 'Perez', 'Lopez', 'Brayan', '2002-03-15', 'brayan@example.com', '861pJ9GzqZrhmVlfQ3Y/SnG', TRUE, '70000001'),
(10000002, 'Garcia', 'Mamani', 'Adan', '2001-07-20', 'adan@example.com', 'ioPenB7xDeHbVkuKowXjRKvN', TRUE, '70000002'),
(10000003, 'Quispe', 'Flores', 'Mayte', '2003-01-10', 'mayte@example.com', 'sRkdYoJcXhbh+FxqJfjVrq8+', TRUE, '70000003'),
(10000004, 'Rodriguez', 'Vargas', 'Wanda', '2002-11-05', 'wanda@example.com', 'HASH_WANDA', TRUE, '70000004'),
(10000005, 'Fernandez', 'Rojas', 'Leo', '2001-05-25', 'leo@example.com', 'd+pfcvBlroV9PSaNlJYzi9rE', TRUE, '70000005'),
(10000006, 'Torres', 'Castro', 'Melissa', '2003-09-12', 'melissa@example.com', 'fpDq6sDjw8oBqLWg3ThadVeS', TRUE, '70000006'),
(10000007, 'Mendoza', 'Choque', 'Nickol', '2002-12-18', 'nickol@example.com', 'zpfeY43DrmJ4K+PFkgvkJuGY', TRUE, '70000007');


--UPDATE public.usuarios
--SET
--    fecha_nacimiento = '2000-01-01';