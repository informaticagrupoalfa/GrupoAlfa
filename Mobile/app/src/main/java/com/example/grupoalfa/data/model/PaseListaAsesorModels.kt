package com.example.grupoalfa.data.model

import com.google.gson.annotations.SerializedName

data class AsignacionAsesor(
    @SerializedName("id_asesor_paralelo_materia") val idAsignacion: Int,
    @SerializedName("id_paralelo") val idParalelo: Int,
    @SerializedName("nombre_paralelo") val nombreParalelo: String,
    @SerializedName("nombre_materia") val nombreMateria: String,
    @SerializedName("nivel") val nivel: String?,
    @SerializedName("dias") val dia: String?,
    @SerializedName("hora_inicio") val horaInicio: String?,
    @SerializedName("hora_fin") val horaFin: String?,
    @SerializedName("aula_codigo") val aulaCodigo: String?
) {
    val horario: String? get() = horaInicio?.take(5)?.let { inicio ->
        horaFin?.take(5)?.let { fin -> "$inicio–$fin" } ?: inicio
    }
}

data class ClaseAsesor(
    @SerializedName("id_clase") val idClase: Int,
    @SerializedName("id_asesor_paralelo_materia") val idAsignacion: Int?,
    @SerializedName("fecha") val fecha: String?,
    @SerializedName("inicioclase") val inicioClase: String?,
    @SerializedName("nombre_paralelo") val nombreParalelo: String?,
    @SerializedName("nombre_materia") val nombreMateria: String?,
    @SerializedName("total_asistencias") val totalAsistencias: Int?
) {
    val fechaVisible: String get() = (fecha ?: inicioClase)?.take(10) ?: "Sin fecha"
}

data class EstudianteParalelo(
    @SerializedName("id_estudiante") val idEstudiante: Int,
    @SerializedName("nombre") val nombre: String?,
    @SerializedName("apellido_paterno") val apellidoPaterno: String?,
    @SerializedName("apellido_materno") val apellidoMaterno: String?,
    @SerializedName("nro_carnet") val nroCarnet: String?
) {
    val nombreCompleto: String get() =
        listOfNotNull(nombre, apellidoPaterno, apellidoMaterno)
            .filter { it.isNotBlank() }.joinToString(" ").ifBlank { "Estudiante $idEstudiante" }
}

data class CreateClaseAsesorRequest(
    @SerializedName("id_asesor_paralelo_materia") val idAsignacion: Int,
    @SerializedName("inicioclase") val fecha: String
)
