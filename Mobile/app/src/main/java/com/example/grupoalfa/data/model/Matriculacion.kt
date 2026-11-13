package com.example.grupoalfa.data.model

import com.google.gson.annotations.SerializedName

data class Matriculacion(
    @SerializedName("id_matriculacion") val idMatriculacion: Int,
    @SerializedName("id_estudiante") val idEstudiante: Int?,
    @SerializedName("id_paralelo") val idParalelo: Int?,
    @SerializedName("esta_vigente") val estaVigente: Boolean? = null,
    @SerializedName("nro_comprobante") val nroComprobante: Int? = null,
    @SerializedName("nro_credencial") val nroCredencial: Int? = null
)
