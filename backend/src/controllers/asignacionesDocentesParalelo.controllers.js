import { pool } from "../db.js";

const rowsFor = async (db, idAsesor = null, idParalelo = null) => {
  const { rows } = await db.query(`
    SELECT apm.id_asesor, apm.id_paralelo, p.nombre_paralelo,
           concat_ws(' ',u.nombre,u.apellido_paterno,u.apellido_materno) AS nombre_asesor,
           json_agg(DISTINCT jsonb_build_object('id_materia',m.id_materia,'nombre_materia',m.nombre_materia)) AS materias,
           array_agg(DISTINCT apm.id_asesor_paralelo_materia) AS ids_asignacion
    FROM asesor_paralelo_materia apm
    JOIN asesores a ON a.id_asesor=apm.id_asesor
    JOIN usuarios u ON u.id_usuario=a.id_usuario
    JOIN paralelo_materia pm ON pm.id_paralelo_materia=apm.id_paralelo_materia
    JOIN paralelos p ON p.id_paralelo=pm.id_paralelo
    JOIN materias m ON m.id_materia=pm.id_materia
    WHERE ($1::int IS NULL OR apm.id_asesor=$1)
      AND ($2::int IS NULL OR apm.id_paralelo=$2)
    GROUP BY apm.id_asesor,apm.id_paralelo,p.nombre_paralelo,u.nombre,u.apellido_paterno,u.apellido_materno
    ORDER BY nombre_asesor,p.nombre_paralelo`, [idAsesor,idParalelo]);
  return rows;
};

export async function getAsignacionesDocentes(req,res,next){try{res.json(await rowsFor(pool));}catch(e){next(e);}}

async function insertGroup(client,idAsesor,idParalelo){
  const {rows: materias}=await client.query(`SELECT pm.id_paralelo_materia,pm.id_materia FROM paralelo_materia pm WHERE pm.id_paralelo=$1`,[idParalelo]);
  if(!materias.length) throw Object.assign(new Error("El paralelo no tiene materias asignadas."),{status:400});
  for(const m of materias){
    await client.query(`INSERT INTO asesor_paralelo_materia(id_asesor,id_paralelo,id_materia,id_paralelo_materia) VALUES($1,$2,$3,$4)`,[idAsesor,idParalelo,m.id_materia,m.id_paralelo_materia]);
  }
}

export async function createAsignacionDocente(req,res,next){
  const client=await pool.connect();try{const {id_asesor,id_paralelo}=req.body;await client.query("BEGIN");await insertGroup(client,Number(id_asesor),Number(id_paralelo));await client.query("COMMIT");res.status(201).json((await rowsFor(pool,Number(id_asesor),Number(id_paralelo)))[0]);}
  catch(e){await client.query("ROLLBACK");if(e.code==="23505")return res.status(409).json({message:"Ese asesor ya está asignado a ese paralelo."});if(e.status)return res.status(e.status).json({message:e.message});if(e.code==="23503")return res.status(409).json({message:"El asesor o el paralelo no existe."});next(e);}finally{client.release();}
}

export async function updateAsignacionDocente(req,res,next){
  const client=await pool.connect();try{const {id_asesor_anterior,id_paralelo_anterior,id_asesor,id_paralelo}=req.body;await client.query("BEGIN");
    const {rows:old}=await client.query(`SELECT id_asesor_paralelo_materia FROM asesor_paralelo_materia WHERE id_asesor=$1 AND id_paralelo=$2`,[id_asesor_anterior,id_paralelo_anterior]);
    if(!old.length){await client.query("ROLLBACK");return res.status(404).json({message:"Asignación no encontrada."});}
    const history=await client.query(`SELECT 1 FROM clases WHERE id_asesor_paralelo_materia=ANY($1::int[]) LIMIT 1`,[old.map(x=>x.id_asesor_paralelo_materia)]);
    if(history.rowCount){await client.query("ROLLBACK");return res.status(409).json({message:"No se puede cambiar una asignación que ya tiene clases registradas."});}
    await client.query(`DELETE FROM asesor_paralelo_materia WHERE id_asesor=$1 AND id_paralelo=$2`,[id_asesor_anterior,id_paralelo_anterior]);
    await insertGroup(client,Number(id_asesor),Number(id_paralelo));await client.query("COMMIT");res.json((await rowsFor(pool,Number(id_asesor),Number(id_paralelo)))[0]);
  }catch(e){await client.query("ROLLBACK");if(e.code==="23505")return res.status(409).json({message:"Ese asesor ya está asignado a ese paralelo."});if(e.status)return res.status(e.status).json({message:e.message});if(e.code==="23503")return res.status(409).json({message:"El asesor o el paralelo no existe."});next(e);}finally{client.release();}
}

export async function deleteAsignacionDocente(req,res,next){
  const client=await pool.connect();try{const {id_asesor,id_paralelo}=req.body;await client.query("BEGIN");const {rows}=await client.query(`SELECT id_asesor_paralelo_materia FROM asesor_paralelo_materia WHERE id_asesor=$1 AND id_paralelo=$2`,[id_asesor,id_paralelo]);if(!rows.length){await client.query("ROLLBACK");return res.status(404).json({message:"Asignación no encontrada."});}const history=await client.query(`SELECT 1 FROM clases WHERE id_asesor_paralelo_materia=ANY($1::int[]) LIMIT 1`,[rows.map(x=>x.id_asesor_paralelo_materia)]);if(history.rowCount){await client.query("ROLLBACK");return res.status(409).json({message:"No se puede eliminar una asignación que ya tiene clases registradas."});}await client.query(`DELETE FROM asesor_paralelo_materia WHERE id_asesor=$1 AND id_paralelo=$2`,[id_asesor,id_paralelo]);await client.query("COMMIT");res.sendStatus(204);}catch(e){await client.query("ROLLBACK");next(e);}finally{client.release();}
}
