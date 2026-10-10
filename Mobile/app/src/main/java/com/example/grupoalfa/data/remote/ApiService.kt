package com.example.grupoalfa.data.remote

import com.example.grupoalfa.data.model.AsignacionRol
import com.example.grupoalfa.data.model.Rol
import com.example.grupoalfa.data.model.Usuario
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {

    @GET("usuarios/{id}")
    suspend fun getUsuarioById(
        @Path("id") id: Int,
        @Header("Authorization") token: String? = null
    ): Usuario

    @GET("asignaciones-rol")
    suspend fun getAsignacionesRol(
        @Query("id_usuario") idUsuario: Int,
        @Header("Authorization") token: String? = null
    ): List<AsignacionRol>

    @GET("roles/{id}")
    suspend fun getRolById(
        @Path("id") id: Int,
        @Header("Authorization") token: String? = null
    ): Rol
}
