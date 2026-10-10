package com.example.grupoalfa.data.repository

import com.example.grupoalfa.data.model.UsuarioConRol
import com.example.grupoalfa.data.remote.ApiService

class UsuarioRepository(
    private val api: ApiService
) {
    suspend fun getUsuarioConRol(idUsuario: Int): UsuarioConRol {
        val usuario = api.getUsuarioById(idUsuario)
        val asignaciones = api.getAsignacionesRol(idUsuario)
        val rol = asignaciones.firstOrNull()?.let { api.getRolById(it.idRol) }
        return UsuarioConRol(usuario, rol)
    }
}
