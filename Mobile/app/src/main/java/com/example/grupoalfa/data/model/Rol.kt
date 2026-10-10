package com.example.grupoalfa.data.model

import com.google.gson.annotations.SerializedName

data class Rol(
    @SerializedName("id_rol") val idRol: Int,
    @SerializedName("nombre") val nombre: String
)
