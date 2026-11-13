package com.example.grupoalfa.data.repository

import com.example.grupoalfa.data.model.AlumnoPaseLista
import com.example.grupoalfa.data.model.AlumnosCurso
import com.example.grupoalfa.data.model.CatalogosPaseLista
import com.example.grupoalfa.data.model.CreateAsistenciaRequest
import com.example.grupoalfa.data.model.CreateClaseRequest
import com.example.grupoalfa.data.model.CreateTemaRequest
import com.example.grupoalfa.data.model.Estudiante
import com.example.grupoalfa.data.model.Marcado
import com.example.grupoalfa.data.model.ResultadoGuardado
import com.example.grupoalfa.data.model.Tema
import com.example.grupoalfa.data.model.Usuario
import com.example.grupoalfa.data.remote.ApiService
import com.example.grupoalfa.data.remote.RetrofitClient
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class PaseListaRepository(
    private val api: ApiService = RetrofitClient.apiService
) {

    /** Carga en paralelo todos los catálogos que necesita el pase de lista. */
    suspend fun cargarCatalogos(): CatalogosPaseLista = coroutineScope {
        val materias = async { api.getMaterias() }
        val asesores = async { api.getAsesores() }
        val capacitaciones = async { api.getCapacitaciones() }
        val temas = async { api.getTemas() }
        val aulas = async { api.getAulas() }
        val estudiantes = async { api.getEstudiantes() }
        val usuarios = async { api.getUsuarioCatalogo() }
        val asignaciones = async { api.getAsignacionesMaterias() }

        CatalogosPaseLista(
            materias = materias.await(),
            asesores = asesores.await(),
            capacitaciones = capacitaciones.await(),
            temas = temas.await(),
            aulas = aulas.await(),
            estudiantes = estudiantes.await(),
            usuarios = usuarios.await(),
            asignacionesMaterias = asignaciones.await()
        )
    }

    suspend fun recargarTemas(): List<Tema> = api.getTemas()

    /** Estudiantes matriculados en el curso; si no hay matrículas usa el catálogo completo. */
    suspend fun cargarAlumnos(
        idCurso: Int,
        estudiantes: List<Estudiante>,
        usuarios: List<Usuario>
    ): AlumnosCurso {
        val matriculas = runCatching { api.getMatriculaciones() }
            .getOrDefault(emptyList())
            .filter { it.estaVigente != false }

        val idsMatriculados = matriculas.map { it.idEstudiante }.toSet()
        val usarMatriculas = idsMatriculados.isNotEmpty()

        val alumnosBase = if (usarMatriculas) {
            estudiantes.filter { it.idEstudiante in idsMatriculados }
        } else {
            estudiantes
        }

        val usuariosPorId = usuarios.associateBy { it.idUsuario }
        val alumnos = alumnosBase.map { estudiante ->
            val usuario = estudiante.idUsuario?.let { usuariosPorId[it] }
            AlumnoPaseLista(
                idEstudiante = estudiante.idEstudiante,
                nombre = usuario?.nombreCompleto
                    ?.takeIf { it.isNotBlank() }
                    ?: "Estudiante ${estudiante.idEstudiante}",
                colegio = estudiante.colegioDeProcedencia
            )
        }

        val nota = if (usarMatriculas) {
            null
        } else {
            "El curso no tiene matrículas registradas; se muestran todos los estudiantes del catálogo."
        }

        return AlumnosCurso(alumnos = alumnos, nota = nota)
    }

    suspend fun crearTema(idMateria: Int, nombre: String): Tema =
        api.createTema(CreateTemaRequest(nombreTema = nombre.trim(), idMateria = idMateria))

    /**
     * Crea la clase y una asistencia por cada estudiante marcado.
     * Presente: solo hora de entrada. Ausente: hora de entrada + permiso = false.
     */
    suspend fun guardarLista(
        idCurso: Int,
        idAsesor: Int,
        idTema: Int?,
        fecha: String,
        marcados: List<Marcado>
    ): ResultadoGuardado {
        val clase = api.createClase(
            CreateClaseRequest(
                idCursoCapacitacion = idCurso,
                idAsesor = idAsesor,
                idTema = idTema,
                inicioClase = fecha
            )
        )

        val horaEntrada = "${fecha}T${horaActual()}"
        val fallos = coroutineScope {
            marcados
                .map { marcado ->
                    async {
                        runCatching {
                            api.createAsistencia(
                                CreateAsistenciaRequest(
                                    idClase = clase.idClase,
                                    idEstudiante = marcado.idEstudiante,
                                    horaEntrada = horaEntrada,
                                    permiso = if (marcado.presente) null else false
                                )
                            )
                        }
                    }
                }
                .awaitAll()
                .count { it.isFailure }
        }

        return ResultadoGuardado(
            idClase = clase.idClase,
            total = marcados.size,
            fallos = fallos
        )
    }

    private fun horaActual(): String =
        SimpleDateFormat("HH:mm:ss", Locale.US).format(Date())
}
