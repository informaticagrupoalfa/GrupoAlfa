package com.example.grupoalfa.ui.misparalelos

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.grupoalfa.data.model.MiParalelo
import com.example.grupoalfa.data.remote.mensajeAmigable
import com.example.grupoalfa.data.repository.MisParalelosRepository
import kotlinx.coroutines.launch

data class MisParalelosUiState(
    val cargando: Boolean = true,
    val paralelos: List<MiParalelo> = emptyList(),
    val error: String? = null
)

class MisParalelosViewModel(
    private val repository: MisParalelosRepository = MisParalelosRepository()
) : ViewModel() {

    var uiState by mutableStateOf(MisParalelosUiState())
        private set

    init {
        cargarParalelos()
    }

    fun cargarParalelos() {
        viewModelScope.launch {
            uiState = uiState.copy(cargando = true, error = null)
            runCatching { repository.cargarParalelos() }
                .onSuccess { paralelos ->
                    uiState = MisParalelosUiState(cargando = false, paralelos = paralelos)
                }
                .onFailure { error ->
                    uiState = uiState.copy(cargando = false, error = error.mensajeAmigable())
                }
        }
    }
}
