package com.example.grupoalfa.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.grupoalfa.data.remote.RetrofitClient
import com.example.grupoalfa.data.repository.UsuarioRepository
import com.example.grupoalfa.data.session.SesionActual
import com.example.grupoalfa.ui.components.BrandMark
import com.example.grupoalfa.ui.components.GrupoAlfaBottomBar
import com.example.grupoalfa.ui.components.MainTab
import com.example.grupoalfa.ui.llamarlista.LlamarListaScreen
import com.example.grupoalfa.ui.login.LoginScreen
import com.example.grupoalfa.ui.misparalelos.MisParalelosScreen
import com.example.grupoalfa.ui.theme.AlfaWhite
import com.example.grupoalfa.ui.theme.Navy
import com.example.grupoalfa.ui.usuario.UsuarioScreen

@Composable
fun GrupoAlfaApp() {
    var loggedIn by rememberSaveable {
        mutableStateOf(RetrofitClient.authToken != null)
    }
    var selectedTabIndex by rememberSaveable { mutableIntStateOf(0) }
    var usuario by remember { mutableStateOf(SesionActual.usuario) }
    var studentTabApplied by rememberSaveable { mutableStateOf(false) }
    val usuarioRepository = remember { UsuarioRepository() }

    LaunchedEffect(loggedIn) {
        if (loggedIn) {
            usuario = SesionActual.usuario ?: runCatching { usuarioRepository.getPerfil() }.getOrNull()
        }
    }

    val esEstudiante = usuario?.roles
        ?.any { it.equals("Estudiante", ignoreCase = true) } == true
    val tabs = MainTab.entries.filter { tab -> !tab.soloEstudiante || esEstudiante }

    if (!loggedIn) {
        LoginScreen(
            onLogin = {
                usuario = SesionActual.usuario
                val ingresaComoEstudiante = usuario?.roles
                    ?.any { it.equals("Estudiante", ignoreCase = true) } == true
                selectedTabIndex = if (ingresaComoEstudiante) {
                    MainTab.MisParalelos.ordinal
                } else {
                    MainTab.Usuario.ordinal
                }
                studentTabApplied = ingresaComoEstudiante
                loggedIn = true
            }
        )
        return
    }

    LaunchedEffect(esEstudiante) {
        if (esEstudiante && !studentTabApplied) {
            selectedTabIndex = MainTab.MisParalelos.ordinal
            studentTabApplied = true
        }
    }

    val selectedTab = MainTab.entries.getOrElse(selectedTabIndex) { MainTab.Usuario }
    val selectedVisible = tabs.contains(selectedTab)

    LaunchedEffect(selectedVisible) {
        if (!selectedVisible) selectedTabIndex = MainTab.Usuario.ordinal
    }

    MainShell(
        selectedTab = if (selectedVisible) selectedTab else MainTab.Usuario,
        tabs = tabs,
        onTabSelected = { selectedTabIndex = it.ordinal },
        onLogout = {
            usuarioRepository.cerrarSesion()
            usuario = null
            studentTabApplied = false
            selectedTabIndex = MainTab.Usuario.ordinal
            loggedIn = false
        }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MainShell(
    selectedTab: MainTab,
    tabs: List<MainTab>,
    onTabSelected: (MainTab) -> Unit,
    onLogout: () -> Unit
) {
    BackHandler(enabled = selectedTab != MainTab.Usuario) {
        onTabSelected(MainTab.Usuario)
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        BrandMark(size = 32.dp)
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text(
                                text = selectedTab.title,
                                color = AlfaWhite,
                                style = MaterialTheme.typography.titleMedium
                            )
                            Text(
                                text = "Grupo Alfa",
                                color = AlfaWhite.copy(alpha = 0.62f),
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Navy,
                    titleContentColor = AlfaWhite
                ),
                actions = {
                    TextButton(onClick = onLogout) {
                        Text(
                            text = "Salir",
                            color = AlfaWhite,
                            style = MaterialTheme.typography.labelLarge
                        )
                    }
                }
            )
        },
        bottomBar = {
            GrupoAlfaBottomBar(
                selectedTab = selectedTab,
                onTabSelected = onTabSelected,
                tabs = tabs
            )
        }
    ) { innerPadding ->
        when (selectedTab) {
            MainTab.Usuario -> UsuarioScreen(
                modifier = Modifier.padding(innerPadding),
                onLogout = onLogout,
                onGoToLista = { onTabSelected(MainTab.LlamarLista) }
            )

            MainTab.MisParalelos -> MisParalelosScreen(
                modifier = Modifier.padding(innerPadding)
            )

            MainTab.LlamarLista -> LlamarListaScreen(
                modifier = Modifier.padding(innerPadding)
            )
        }
    }
}
