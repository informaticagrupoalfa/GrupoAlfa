package com.example.grupoalfa.data.model

import com.google.gson.annotations.SerializedName

data class AsignacionRol(
    @SerializedName("id_asignacion_rol") val idAsignacionRol: Int,
    @SerializedName("id_rol") val idRol: Int,
    @SerializedName("id_usuario") val idUsuario: Int
)
