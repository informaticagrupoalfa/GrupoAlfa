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
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.grupoalfa.ui.components.BrandMark
import com.example.grupoalfa.ui.components.GrupoAlfaBottomBar
import com.example.grupoalfa.ui.components.MainTab
import com.example.grupoalfa.ui.llamarlista.LlamarListaScreen
import com.example.grupoalfa.ui.login.LoginScreen
import com.example.grupoalfa.ui.theme.AlfaWhite
import com.example.grupoalfa.ui.theme.Navy
import com.example.grupoalfa.ui.usuario.UsuarioScreen

@Composable
fun GrupoAlfaApp() {
    var loggedIn by rememberSaveable { mutableStateOf(false) }
    var selectedTabIndex by rememberSaveable { mutableIntStateOf(0) }

    val selectedTab = MainTab.entries[selectedTabIndex]

    if (!loggedIn) {
        LoginScreen(
            onLogin = {
                selectedTabIndex = MainTab.Usuario.ordinal
                loggedIn = true
            }
        )
        return
    }

    MainShell(
        selectedTab = selectedTab,
        onTabSelected = { selectedTabIndex = it.ordinal },
        onLogout = { loggedIn = false }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MainShell(
    selectedTab: MainTab,
    onTabSelected: (MainTab) -> Unit,
    onLogout: () -> Unit
) {
    BackHandler(enabled = selectedTab == MainTab.LlamarLista) {
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
                )
            )
        },
        bottomBar = {
            GrupoAlfaBottomBar(
                selectedTab = selectedTab,
                onTabSelected = onTabSelected
            )
        }
    ) { innerPadding ->
        when (selectedTab) {
            MainTab.Usuario -> UsuarioScreen(
                modifier = Modifier.padding(innerPadding),
                onLogout = onLogout,
                onGoToLista = { onTabSelected(MainTab.LlamarLista) }
            )

            MainTab.LlamarLista -> LlamarListaScreen(
                modifier = Modifier.padding(innerPadding)
            )
        }
    }
}
