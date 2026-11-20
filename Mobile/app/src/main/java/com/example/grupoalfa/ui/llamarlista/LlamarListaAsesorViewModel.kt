package com.example.grupoalfa.ui.llamarlista

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.grupoalfa.data.model.AsignacionAsesor
import com.example.grupoalfa.data.model.ClaseAsesor
import com.example.grupoalfa.data.model.EstudianteParalelo
import com.example.grupoalfa.data.remote.mensajeAmigable
import com.example.grupoalfa.data.repository.PaseListaAsesorRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

data class ListaAsesorUiState(
    val cargando: Boolean = true,
    val cargandoEstudiantes: Boolean = false,
    val guardando: Boolean = false,
    val asignaciones: List<AsignacionAsesor> = emptyList(),
    val clases: List<ClaseAsesor> = emptyList(),
    val estudiantes: List<EstudianteParalelo> = emptyList(),
    val presentes: Set<Int> = emptySet(),
    val idAsignacion: Int? = null,
    val idClase: Int? = null,
    val codigoManual: String = "",
    val mensaje: String? = null,
    val error: String? = null
) {
    val asignacion: AsignacionAsesor?
        get() = asignaciones.firstOrNull { it.idAsignacion == idAsignacion }
    val clasesDeAsignacion: List<ClaseAsesor>
        get() = clases.filter { it.idAsignacion == idAsignacion }
    val pendientes: Int get() = (estudiantes.size - presentes.size).coerceAtLeast(0)
}

class LlamarListaAsesorViewModel(
    private val repository: PaseListaAsesorRepository = PaseListaAsesorRepository()
) : ViewModel() {
    var uiState by mutableStateOf(ListaAsesorUiState())
        private set

    private var estudiantesJob: Job? = null
    private var claseJob: Job? = null

    init { cargar() }

    fun cargar() {
        viewModelScope.launch {
            uiState = uiState.copy(cargando = true, error = null)
            runCatching { repository.cargarInicio() }
                .onSuccess { (asignaciones, clases) ->
                    val id = uiState.idAsignacion?.takeIf { actual ->
                        asignaciones.any { it.idAsignacion == actual }
                    } ?: asignaciones.firstOrNull()?.idAsignacion
                    uiState = uiState.copy(
                        cargando = false, asignaciones = asignaciones, clases = clases,
                        idAsignacion = id, idClase = null, presentes = emptySet(),
                        estudiantes = emptyList(), error = null
                    )
                    asignaciones.firstOrNull { it.idAsignacion == id }?.let { cargarEstudiantes(it.idParalelo) }
                }
                .onFailure { error -> uiState = uiState.copy(cargando = false, error = error.mensajeAmigable()) }
        }
    }

    fun seleccionarAsignacion(id: Int) {
        val asignacion = uiState.asignaciones.firstOrNull { it.idAsignacion == id } ?: return
        if (id == uiState.idAsignacion) return
        claseJob?.cancel()
        uiState = uiState.copy(
            idAsignacion = id, idClase = null, estudiantes = emptyList(), presentes = emptySet(),
            mensaje = null, error = null, codigoManual = ""
        )
        cargarEstudiantes(asignacion.idParalelo)
    }

    fun seleccionarClase(id: Int) {
        if (uiState.clasesDeAsignacion.none { it.idClase == id }) return
        claseJob?.cancel()
        claseJob = viewModelScope.launch {
            uiState = uiState.copy(idClase = id, presentes = emptySet(), guardando = true,
                error = null, mensaje = null)
            runCatching { repository.cargarAsistencia(id) }
                .onSuccess { presentes ->
                    if (uiState.idClase == id) uiState = uiState.copy(
                        presentes = presentes, guardando = false
                    )
                }
                .onFailure { error ->
                    if (uiState.idClase == id) uiState = uiState.copy(
                        idClase = null, guardando = false, error = error.mensajeAmigable()
                    )
                }
        }
    }

    fun crearClase() {
        val asignacion = uiState.asignacion ?: return
        if (uiState.guardando) return
        viewModelScope.launch {
            uiState = uiState.copy(guardando = true, error = null, mensaje = null)
            runCatching { repository.crearClase(asignacion.idAsignacion) }
                .onSuccess { clase ->
                    val clases = runCatching { repository.cargarClases() }
                        .getOrDefault(uiState.clases + clase)
                    uiState = uiState.copy(
                        guardando = false, clases = clases, idClase = clase.idClase,
                        presentes = emptySet(), mensaje = "Clase creada. Ya puedes registrar asistencia."
                    )
                }
                .onFailure { error -> uiState = uiState.copy(
                    guardando = false, error = error.mensajeAmigable()
                ) }
        }
    }

    fun cambiarCodigo(valor: String) {
        uiState = uiState.copy(codigoManual = valor.take(40), error = null)
    }

    fun registrarCodigo(codigo: String) {
        val valor = codigo.trim()
        val id = valor.takeIf { it.matches(Regex("[1-9][0-9]*")) }?.toIntOrNull()
        if (id == null) {
            uiState = uiState.copy(error = "QR no reconocido. Usa el código que muestra el estudiante.")
            return
        }
        registrarEstudiante(id)
    }

    fun registrarEstudiante(id: Int) {
        val clase = uiState.idClase
        val estudiante = uiState.estudiantes.firstOrNull { it.idEstudiante == id }
        when {
            clase == null -> uiState = uiState.copy(error = "Crea o selecciona una clase primero.")
            estudiante == null -> uiState = uiState.copy(error = "El estudiante no pertenece a este paralelo.")
            id in uiState.presentes -> uiState = uiState.copy(error = "${estudiante.nombreCompleto} ya está registrado.")
            uiState.guardando -> return
            else -> viewModelScope.launch {
                uiState = uiState.copy(guardando = true, error = null, mensaje = null)
                runCatching { repository.registrarAsistencia(clase, id) }
                    .onSuccess {
                        if (uiState.idClase == clase) uiState = uiState.copy(
                            guardando = false, presentes = uiState.presentes + id,
                            codigoManual = "", mensaje = "${estudiante.nombreCompleto} registrado."
                        )
                    }
                    .onFailure { error -> uiState = uiState.copy(
                        guardando = false, error = error.mensajeAmigable()
                    ) }
            }
        }
    }

    private fun cargarEstudiantes(idParalelo: Int) {
        estudiantesJob?.cancel()
        estudiantesJob = viewModelScope.launch {
            uiState = uiState.copy(cargandoEstudiantes = true)
            runCatching { repository.cargarEstudiantes(idParalelo) }
                .onSuccess { estudiantes ->
                    if (uiState.asignacion?.idParalelo == idParalelo) uiState = uiState.copy(
                        cargandoEstudiantes = false, estudiantes = estudiantes
                    )
                }
                .onFailure { error -> uiState = uiState.copy(
                    cargandoEstudiantes = false, error = error.mensajeAmigable()
                ) }
        }
    }
}
