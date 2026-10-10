package com.example.grupoalfa.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.grupoalfa.data.remote.RetrofitClient
import com.example.grupoalfa.data.repository.UsuarioRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException

class HomeViewModel(
    private val repository: UsuarioRepository = UsuarioRepository(RetrofitClient.apiService)
) : ViewModel() {

    private val _uiState = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    fun cargarUsuario(idUsuario: Int = 1) {
        viewModelScope.launch {
            _uiState.value = HomeUiState.Loading
            _uiState.value = try {
                HomeUiState.Success(repository.getUsuarioConRol(idUsuario))
            } catch (e: HttpException) {
                HomeUiState.Error("Error ${e.code()}: ${e.message()}")
            } catch (e: IOException) {
                HomeUiState.Error("Sin conexión: ${e.message}")
            } catch (e: Exception) {
                HomeUiState.Error(e.message ?: "Error desconocido")
            }
        }
    }
}
