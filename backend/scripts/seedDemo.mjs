import { randomBytes } from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import bcrypt from "bcrypt";
import { app } from "../src/app.js";
import { pool } from "../src/db.js";
import { ROLE_NAMES } from "../src/config/roles.js";

// Referencias oficiales para facultades, carreras, modalidad y fechas de convocatoria:
// https://convocatorias.umsa.bo/convocatorias-vigentes/-/asset_publisher/qfkIadLzQGwG/content/c-p-u-carreras-de-bioquimica-y-quimica-farmaceutica
// https://fment.umsa.bo/noticias-de-la-facultad/-/asset_publisher/VECigELvgFaC/content/convocatoria-n-01-2026-prueba-de-suficiencia-academica-p-s-a-
// Cuentas, aulas, horarios, materias de preparación y asignaciones son datos ficticios de prueba.
const credentialsPath = resolve(fileURLToPath(new URL("../../dbScripts/credenciales_demo.json", import.meta.url)));
const roleNames = [...new Set(Object.values(ROLE_NAMES))];
const roleSlugs = {
  SysAdmin: "sysadmin", Rooter: "rooter", Gerencia: "gerencia", Cajero: "cajero",
  "Administración": "administracion", Asesor: "asesor", "Asesor Coordinador": "asesor-coordinador",
  Apoderado: "apoderado", Estudiante: "estudiante",
};
const firstNames = ["Ana", "Luis", "María", "Jorge", "Elena", "Carlos", "Lucía", "Diego", "Sofía", "Miguel"];
const surnames = ["Flores", "Mamani", "Quispe", "Rojas", "Vargas", "Condori", "Pérez", "Choque", "López", "Rivera"];
const accounts = [];
for (const role of roleNames) {
  const total = role === ROLE_NAMES.ESTUDIANTE ? 200 : 10;
  for (let i = 0; i < total; i++) {
    const serial = String(i + 1).padStart(3, "0");
    accounts.push({
      rol: role,
      nro_carnet: 99000000 + accounts.length + 1,
      correo_electronico: `demo.${roleSlugs[role]}.${serial}@example.com`,
      contraseña: randomBytes(18).toString("base64url"),
      nombre: firstNames[i % firstNames.length],
      apellido_paterno: surnames[(i + 2) % surnames.length],
      apellido_materno: surnames[(i + 5) % surnames.length],
      fecha_nacimiento: role === ROLE_NAMES.ESTUDIANTE ? `2007-0${(i % 9) + 1}-15` : `198${i % 10}-05-15`,
    });
  }
}

async function single(db, sql, values = []) {
  return (await db.query(sql, values)).rows[0];
}

async function assertEmpty() {
  const tables = ["roles", "usuarios", "facultades", "carreras", "convocatorias_preuniversitario", "capacitaciones", "aulas", "paralelos", "materias", "estudiantes", "inscripciones"];
  for (const table of tables) {
    const { n } = await single(pool, `SELECT count(*)::int AS n FROM ${table}`);
    if (n !== 0) throw new Error(`Carga cancelada: ${table} ya contiene ${n} registros.`);
  }
  const { character_maximum_length: maxLength } = await single(pool,
    "SELECT character_maximum_length FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'convocatorias_preuniversitario' AND column_name = 'modalidad'");
  if (maxLength !== 100) throw new Error("La columna convocatorias_preuniversitario.modalidad debe ser varchar(100).");
}

async function seedBase() {
  const db = await pool.connect();
  let committed = false;
  try {
    await db.query("BEGIN");
    const roles = new Map();
    for (const name of roleNames) {
      const row = await single(db, "INSERT INTO roles (nombre) VALUES ($1) RETURNING id_rol", [name]);
      roles.set(name, row.id_rol);
    }
    const byRole = new Map(roleNames.map((name) => [name, []]));
    for (const account of accounts) {
      const hash = await bcrypt.hash(account.contraseña, 10);
      const row = await single(db, `INSERT INTO usuarios
        (nro_carnet, apellido_paterno, apellido_materno, nombre, fecha_nacimiento, correo_electronico, contraseña, usuario_vigente)
        VALUES ($1,$2,$3,$4,$5,$6,$7,true) RETURNING id_usuario`,
      [account.nro_carnet, account.apellido_paterno, account.apellido_materno, account.nombre,
        account.fecha_nacimiento, account.correo_electronico, hash]);
      account.id_usuario = row.id_usuario;
      await db.query("INSERT INTO usuario_rol (id_rol, id_usuario) VALUES ($1,$2)", [roles.get(account.rol), row.id_usuario]);
      byRole.get(account.rol).push(account);
    }
    for (const [i, account] of byRole.get(ROLE_NAMES.ADMINISTRACION).entries()) {
      const row = await single(db, "INSERT INTO administrativos (id_usuario) VALUES ($1) RETURNING id_administrativo", [account.id_usuario]);
      account.id_administrativo = row.id_administrativo;
    }
    const advisors = [...byRole.get(ROLE_NAMES.ASESOR), ...byRole.get(ROLE_NAMES.ASESOR_COORDINADOR)];
    for (const account of advisors) {
      const row = await single(db, "INSERT INTO asesores (id_usuario) VALUES ($1) RETURNING id_asesor", [account.id_usuario]);
      account.id_asesor = row.id_asesor;
    }
    const guardians = byRole.get(ROLE_NAMES.APOLDERADO);
    for (const account of guardians) {
      const row = await single(db, "INSERT INTO apoderados (id_usuario, parentesco) VALUES ($1,$2) RETURNING id_apoderado", [account.id_usuario, "Tutor (dato ficticio)"]);
      account.id_apoderado = row.id_apoderado;
    }
    const students = byRole.get(ROLE_NAMES.ESTUDIANTE);
    for (const [i, account] of students.entries()) {
      const guardian = guardians[i % guardians.length];
      const row = await single(db, `INSERT INTO estudiantes
        (id_usuario, id_apoderado, colegio_de_procedencia, direccion_de_domicilio)
        VALUES ($1,$2,$3,$4) RETURNING id_estudiante`,
      [account.id_usuario, guardian.id_apoderado, `Colegio de prueba ${String(i % 20 + 1).padStart(2, "0")}`, "La Paz (domicilio ficticio)"]);
      account.id_estudiante = row.id_estudiante;
    }

    const faculties = [];
    for (const name of ["Facultad de Ciencias Farmacéuticas y Bioquímicas", "Facultad de Medicina, Enfermería, Nutrición y Tecnología Médica"]) {
      faculties.push((await single(db, "INSERT INTO facultades (nombre) VALUES ($1) RETURNING id_facultad", [name])).id_facultad);
    }
    for (const [index, names] of [[0, ["Bioquímica", "Química Farmacéutica"]],
      [1, ["Medicina", "Enfermería", "Nutrición y Dietética", "Tecnología Médica", "Terapia Ocupacional", "Fonoaudiología"]]]) {
      for (const name of names) await db.query("INSERT INTO carreras (id_facultad, nombre) VALUES ($1,$2)", [faculties[index], name]);
    }
    const convocatorias = [];
    for (const [index, date, modality] of [
      [0, "2026-07-13", "Semipresencial"],
      [1, "2026-09-28", "Presencial"],
    ]) {
      const row = await single(db, "INSERT INTO convocatorias_preuniversitario (id_facultad, fecha_inicio, modalidad) VALUES ($1,$2,$3) RETURNING id_convocatoria",
        [faculties[index], date, modality]);
      convocatorias.push(row.id_convocatoria);
    }
    const capacitaciones = [];
    for (const [index, date, active] of [[0, "2026-07-13", false], [1, "2026-09-28", true]]) {
      const row = await single(db, "INSERT INTO capacitaciones (id_convocatoria, fecha_inicio, activo) VALUES ($1,$2,$3) RETURNING id_capacitacion",
        [convocatorias[index], date, active]);
      capacitaciones.push(row.id_capacitacion);
    }
    const subjectIds = new Map();
    for (const name of ["Biología", "Química", "Física"]) {
      subjectIds.set(name, (await single(db, "INSERT INTO materias (nombre_materia) VALUES ($1) RETURNING id_materia", [name])).id_materia);
    }
    const subjectsByProgram = [["Biología", "Química"], ["Biología", "Física"]];
    for (let program = 0; program < 2; program++) {
      for (const name of subjectsByProgram[program]) {
        await db.query("INSERT INTO materia_capacitacion (id_materia, id_capacitacion) VALUES ($1,$2)", [subjectIds.get(name), capacitaciones[program]]);
      }
    }
    const parallels = [];
    for (let i = 0; i < 10; i++) {
      const program = i < 5 ? 0 : 1;
      const room = await single(db, "INSERT INTO aulas (codigo, capacidad) VALUES ($1,20) RETURNING id_aula", [`A-${String(i + 1).padStart(2, "0")}`]);
      const row = await single(db, `INSERT INTO paralelos
        (id_aula, id_capacitacion, nombre_paralelo, nivel, modalidad, hora_inicio, hora_fin, dias, activo)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true) RETURNING id_paralelo`,
      [room.id_aula, capacitaciones[program], `${program === 0 ? "CPU" : "PSA"}-${String(i % 5 + 1).padStart(2, "0")}`,
        "Admisión 2027", program === 0 ? "Semipresencial" : "Presencial", "08:00", "10:00", "lunes, miercoles"]);
      parallels.push(row.id_paralelo);
      for (const [j, name] of subjectsByProgram[program].entries()) {
        const link = await single(db, "INSERT INTO paralelo_materia (id_paralelo, id_materia) VALUES ($1,$2) RETURNING id_paralelo_materia",
          [row.id_paralelo, subjectIds.get(name)]);
        await db.query("INSERT INTO asesor_paralelo_materia (id_asesor, id_paralelo_materia, dias) VALUES ($1,$2,$3)",
          [advisors[j * 10 + i].id_asesor, link.id_paralelo_materia, j === 0 ? "lunes" : "miercoles"]);
      }
    }
    await writeFile(credentialsPath, JSON.stringify({
      descripcion: "Cuentas ficticias para la carga de prueba UMSA 2027",
      creado_el: "2026-11-20",
      nota: "Las contraseñas son texto plano para ingreso de prueba. Archivo excluido de Git.",
      cuentas: accounts.map(({ id_usuario, rol, nro_carnet, correo_electronico, contraseña }) =>
        ({ id_usuario, rol, nro_carnet, correo_electronico, contraseña })),
    }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    await db.query("COMMIT");
    committed = true;
    return { students, admins: byRole.get(ROLE_NAMES.ADMINISTRACION), parallels, adminLogin: byRole.get(ROLE_NAMES.SYS_ADMIN)[0] };
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    if (!committed) await unlink(credentialsPath).catch(() => {});
    throw error;
  } finally {
    db.release();
  }
}

async function enrollViaApi({ students, admins, parallels, adminLogin }) {
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const login = await fetch(`${base}/usuarios/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo_electronico: adminLogin.correo_electronico, contraseña: adminLogin.contraseña }),
    });
    if (!login.ok) throw new Error(`No se pudo iniciar sesión en la API: ${login.status}`);
    const { token } = await login.json();
    let created = 0;
    const enroll = async (student, i) => {
      const program = i < 100 ? 0 : 1;
      const local = i % 100;
      const parallelId = parallels[program * 5 + Math.floor(local / 20)];
      const date = program === 0
        ? `2026-${local < 50 ? "07" : "08"}-${String(local < 50 ? 13 + local % 19 : 1 + local % 20).padStart(2, "0")}`
        : `2026-${local < 20 ? "09" : "10"}-${String(local < 20 ? 28 + local % 3 : 1 + local % 23).padStart(2, "0")}`;
      const response = await fetch(`${base}/inscripciones`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id_administrativo: admins[i % admins.length].id_administrativo,
          id_estudiante: student.id_estudiante, id_paralelo: parallelId,
          fecha_insc: date, num_credencial: 10001 + i,
          como_se_entero_de_nosotros: "Carga de prueba" }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(`Inscripción ${i + 1}: HTTP ${response.status}, ${body.message || body.error || "sin detalle"}`);
      }
      created++;
    };
    for (let start = 0; start < students.length; start += 10) {
      await Promise.all(students.slice(start, start + 10).map((student, offset) => enroll(student, start + offset)));
      console.log(`Inscripciones por API: ${created}/200`);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function verify() {
  const totals = {};
  for (const table of ["roles", "usuarios", "usuario_rol", "administrativos", "asesores", "apoderados", "estudiantes", "facultades", "carreras", "convocatorias_preuniversitario", "capacitaciones", "aulas", "paralelos", "inscripciones"]) {
    totals[table] = (await single(pool, `SELECT count(*)::int AS n FROM ${table}`)).n;
  }
  const distribution = (await pool.query(`SELECT p.nombre_paralelo, a.capacidad, count(i.id_inscripcion)::int AS inscritos
    FROM paralelos p JOIN aulas a ON a.id_aula = p.id_aula
    LEFT JOIN inscripciones i ON i.id_paralelo = p.id_paralelo
    GROUP BY p.id_paralelo, a.id_aula ORDER BY p.id_paralelo`)).rows;
  if (totals.inscripciones !== 200 || distribution.length !== 10 || distribution.some((r) => r.capacidad !== 20 || r.inscritos !== 20)) {
    throw new Error(`Verificación de inscripciones fallida: ${JSON.stringify({ totals, distribution })}`);
  }
  console.log(JSON.stringify({ ok: true, totals, distribution, credentialsPath }));
}

try {
  await assertEmpty();
  const base = await seedBase();
  await enrollViaApi(base);
  await verify();
} catch (error) {
  console.error(`Carga incompleta: ${error.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
