package com.example.grupoalfa.data.repository

import com.example.grupoalfa.data.model.AsignacionAsesor
import com.example.grupoalfa.data.model.ClaseAsesor
import com.example.grupoalfa.data.model.CreateAsistenciaRequest
import com.example.grupoalfa.data.model.CreateClaseAsesorRequest
import com.example.grupoalfa.data.model.EstudianteParalelo
import com.example.grupoalfa.data.remote.ApiService
import com.example.grupoalfa.data.remote.RetrofitClient
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class PaseListaAsesorRepository(
    private val api: ApiService = RetrofitClient.apiService
) {
    suspend fun cargarInicio(): Pair<List<AsignacionAsesor>, List<ClaseAsesor>> = coroutineScope {
        val asignaciones = async { api.getMisAsignaciones() }
        val clases = async { api.getMisClases() }
        asignaciones.await() to clases.await()
    }

    suspend fun cargarClases(): List<ClaseAsesor> = api.getMisClases()

    suspend fun cargarEstudiantes(idParalelo: Int): List<EstudianteParalelo> =
        api.getEstudiantesParalelo(idParalelo)

    suspend fun cargarAsistencia(idClase: Int): Set<Int> {
        val presentes = mutableSetOf<Int>()
        var offset = 0
        do {
            val pagina = api.getAsistencias(idClase, limit = 100, offset = offset)
            presentes += pagina.map { it.idEstudiante }.filter { it > 0 }
            offset += pagina.size
        } while (pagina.size == 100)
        return presentes
    }

    suspend fun crearClase(idAsignacion: Int): ClaseAsesor =
        api.createClaseAsesor(CreateClaseAsesorRequest(idAsignacion, fechaActual()))

    suspend fun registrarAsistencia(idClase: Int, idEstudiante: Int) {
        api.createAsistencia(CreateAsistenciaRequest(
            idClase = idClase, idEstudiante = idEstudiante, horaEntrada = fechaHoraActual()
        ))
    }

    private fun fechaActual(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
    private fun fechaHoraActual(): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).format(Date())
}
