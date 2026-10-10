package com.example.grupoalfa.ui.home

import com.example.grupoalfa.data.model.UsuarioConRol

sealed interface HomeUiState {
    data object Loading : HomeUiState
    data class Success(val data: UsuarioConRol) : HomeUiState
    data class Error(val message: String) : HomeUiState
}
