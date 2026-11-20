package com.example.grupoalfa.ui.usuario

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.grupoalfa.data.model.Usuario
import com.example.grupoalfa.data.remote.mensajeAmigable
import com.example.grupoalfa.data.repository.UsuarioRepository
import kotlinx.coroutines.launch

data class UsuarioUiState(
    val usuario: Usuario? = null,
    val cargando: Boolean = true,
    val error: String? = null,
    val idEstudiante: Int? = null,
    val cargandoQr: Boolean = false,
    val errorQr: String? = null
)

class UsuarioViewModel(
    private val repository: UsuarioRepository = UsuarioRepository()
) : ViewModel() {

    var uiState by mutableStateOf(UsuarioUiState())
        private set

    init {
        cargarPerfil()
    }

    fun cargarPerfil() {
        viewModelScope.launch {
            uiState = UsuarioUiState(cargando = true)
            runCatching { repository.getPerfil() }
                .onSuccess { usuario ->
                    val esEstudiante = usuario.roles?.any {
                        it.equals("Estudiante", ignoreCase = true)
                    } == true
                    uiState = UsuarioUiState(
                        usuario = usuario,
                        cargando = false,
                        cargandoQr = esEstudiante
                    )
                    if (esEstudiante) {
                        runCatching { repository.getIdEstudiante(usuario.idUsuario) }
                            .onSuccess { id ->
                                uiState = uiState.copy(idEstudiante = id, cargandoQr = false)
                            }
                            .onFailure { error ->
                                uiState = uiState.copy(
                                    cargandoQr = false,
                                    errorQr = error.mensajeAmigable()
                                )
                            }
                    }
                }
                .onFailure { error ->
                    uiState = uiState.copy(cargando = false, error = error.mensajeAmigable())
                }
        }
    }
}
