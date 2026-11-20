package com.example.grupoalfa.data.repository

import android.util.Log
import com.example.grupoalfa.data.model.LoginRequest
import com.example.grupoalfa.data.model.Usuario
import com.example.grupoalfa.data.model.UsuarioConRol
import com.example.grupoalfa.data.remote.ApiService
import com.example.grupoalfa.data.remote.RetrofitClient
import com.example.grupoalfa.data.session.SecureCredentialStore
import com.example.grupoalfa.data.session.SesionActual

class UsuarioRepository(
    private val api: ApiService = RetrofitClient.apiService
) {

    /** Autentica contra POST /usuarios/login y guarda el JWT para las siguientes llamadas. */
    suspend fun login(identificador: String, contrasena: String): Usuario {
        val texto = identificador.trim()
        val request = if (texto.all(Char::isDigit)) {
            LoginRequest(nroCarnet = texto.toLongOrNull(), contrasena = contrasena)
        } else {
            LoginRequest(correoElectronico = texto, contrasena = contrasena)
        }

        val response = api.login(request)
        RetrofitClient.authToken = response.token
        runCatching { SecureCredentialStore.saveToken(response.token) }
            .onFailure { Log.e("UsuarioRepository", "No se pudo guardar la sesión", it) }
        SesionActual.iniciar(response.datos)
        return response.datos
    }

    /** Perfil actualizado del usuario autenticado (GET /usuarios/me). */
    suspend fun getPerfil(): Usuario {
        val usuario = api.getMe()
        SesionActual.iniciar(usuario)
        return usuario
    }

    /** Usa el ID de sus paralelos; si aún no tiene, busca su registro de estudiante. */
    suspend fun getIdEstudiante(idUsuario: Int): Int? {
        val idEnParalelos = api.getMisParalelos()
            .firstNotNullOfOrNull { it.idEstudiante?.takeIf { id -> id > 0 } }
        return idEnParalelos ?: api.getEstudiantes()
            .firstOrNull { it.idUsuario == idUsuario }
            ?.idEstudiante
    }

    suspend fun getUsuarioConRol(idUsuario: Int): UsuarioConRol {
        val usuario = api.getUsuarioById(idUsuario)
        val asignaciones = api.getAsignacionesRol(idUsuario)
        val rol = asignaciones.firstOrNull()?.let { api.getRolById(it.idRol) }
        return UsuarioConRol(usuario, rol)
    }

    fun cerrarSesion() {
        RetrofitClient.authToken = null
        runCatching { SecureCredentialStore.clear() }
            .onFailure { Log.e("UsuarioRepository", "No se pudo limpiar la sesión", it) }
        SesionActual.cerrar()
    }
}
