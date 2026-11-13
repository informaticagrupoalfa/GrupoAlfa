package com.example.grupoalfa.data.model

import com.google.gson.annotations.SerializedName

/** Paralelo en el que está inscrito el estudiante autenticado. */
data class MiParalelo(
    @SerializedName("id_matriculacion") val idMatriculacion: Int,
    @SerializedName("esta_vigente") val estaVigente: Boolean?,
    @SerializedName("nro_comprobante") val nroComprobante: Int?,
    @SerializedName("nro_credencial") val nroCredencial: Int?,
    @SerializedName("id_paralelo") val idParalelo: Int,
    @SerializedName("nombre_paralelo") val nombreParalelo: String?,
    @SerializedName("nivel") val nivel: String?,
    @SerializedName("modalidad") val modalidad: String?,
    @SerializedName("hora_inicio") val horaInicio: String?,
    @SerializedName("hora_fin") val horaFin: String?,
    @SerializedName("dias") val dias: String?,
    @SerializedName("activo") val activo: Boolean?,
    @SerializedName("capacitacion_fecha_inicio") val capacitacionFechaInicio: String?,
    @SerializedName("capacitacion_fecha_fin") val capacitacionFechaFin: String?,
    @SerializedName("facultad") val facultad: String?,
    @SerializedName("aula_codigo") val aulaCodigo: String?,
    @SerializedName("aula_capacidad") val aulaCapacidad: Int?
) {
    val nombre: String
        get() = nombreParalelo?.takeIf { it.isNotBlank() } ?: "Paralelo $idParalelo"

    val horario: String?
        get() {
            val inicio = horaInicio?.take(5)?.takeIf { it.isNotBlank() }
            val fin = horaFin?.take(5)?.takeIf { it.isNotBlank() }
            return when {
                inicio != null && fin != null -> "$inicio - $fin"
                inicio != null -> inicio
                else -> null
            }
        }

    val fechaInicio: String?
        get() = capacitacionFechaInicio?.take(10)?.takeIf { it.isNotBlank() }

    val fechaFin: String?
        get() = capacitacionFechaFin?.take(10)?.takeIf { it.isNotBlank() }
}
