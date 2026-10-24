package com.example.grupoalfa.ui.usuario

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.grupoalfa.ui.theme.AlfaWhite
import com.example.grupoalfa.ui.theme.Amber
import com.example.grupoalfa.ui.theme.BlueWash
import com.example.grupoalfa.ui.theme.GrupoAlfaTheme
import com.example.grupoalfa.ui.theme.Navy
import com.example.grupoalfa.ui.theme.NavyDeep
import com.example.grupoalfa.ui.theme.Present
import com.example.grupoalfa.ui.theme.PresentWash

private data class UsuarioUiModel(
    val nombre: String,
    val apellidoPaterno: String,
    val apellidoMaterno: String,
    val rol: String,
    val correo: String,
    val carnet: String,
    val estado: String
) {
    val nombreCompleto: String
        get() = listOf(nombre, apellidoPaterno, apellidoMaterno)
            .filter { it.isNotBlank() }
            .joinToString(" ")

    val iniciales: String
        get() = listOf(nombre, apellidoPaterno)
            .mapNotNull { it.firstOrNull()?.uppercaseChar() }
            .joinToString("")
}

private val usuarioDemo = UsuarioUiModel(
    nombre = "Camila",
    apellidoPaterno = "Rojas",
    apellidoMaterno = "Medina",
    rol = "Administración",
    correo = "camila.rojas@grupoalfa.cl",
    carnet = "2026-0041",
    estado = "Vigente"
)

@Composable
fun UsuarioScreen(
    onLogout: () -> Unit,
    onGoToLista: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        ProfileHero(usuario = usuarioDemo)

        AccountCard(
            usuario = usuarioDemo,
            onGoToLista = onGoToLista
        )

        OutlinedButton(
            onClick = onLogout,
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp),
            shape = RoundedCornerShape(12.dp),
            border = BorderStroke(
                width = 1.dp,
                color = MaterialTheme.colorScheme.error.copy(alpha = 0.38f)
            ),
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = MaterialTheme.colorScheme.error
            )
        ) {
            Text(
                text = "Cerrar sesión",
                style = MaterialTheme.typography.titleMedium
            )
        }
    }
}

@Composable
private fun ProfileHero(usuario: UsuarioUiModel) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        color = Navy
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.linearGradient(
                        colors = listOf(Navy, NavyDeep)
                    )
                )
                .padding(24.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Surface(
                    modifier = Modifier.size(76.dp),
                    shape = CircleShape,
                    color = Amber
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = usuario.iniciales,
                            color = NavyDeep,
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Black
                        )
                    }
                }

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = usuario.nombreCompleto,
                        color = AlfaWhite,
                        style = MaterialTheme.typography.titleLarge
                    )
                    Spacer(Modifier.height(8.dp))
                    Surface(
                        shape = RoundedCornerShape(100.dp),
                        color = AlfaWhite.copy(alpha = 0.12f)
                    ) {
                        Text(
                            text = usuario.rol,
                            color = AlfaWhite.copy(alpha = 0.92f),
                            style = MaterialTheme.typography.labelLarge,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        )
                    }
                }
            }

            Spacer(Modifier.height(24.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                HeroDatum(
                    label = "Carnet",
                    value = usuario.carnet,
                    modifier = Modifier.weight(1f)
                )
                Box(
                    modifier = Modifier
                        .width(1.dp)
                        .height(36.dp)
                        .background(AlfaWhite.copy(alpha = 0.16f))
                )
                HeroDatum(
                    label = "Estado",
                    value = usuario.estado,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun HeroDatum(
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier) {
        Text(
            text = label,
            color = AlfaWhite.copy(alpha = 0.58f),
            style = MaterialTheme.typography.bodySmall
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text = value,
            color = PresentWash,
            style = MaterialTheme.typography.titleMedium
        )
    }
}

@Composable
private fun AccountCard(
    usuario: UsuarioUiModel,
    onGoToLista: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 2.dp
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text(
                text = "Datos de la cuenta",
                color = MaterialTheme.colorScheme.onSurface,
                style = MaterialTheme.typography.titleLarge
            )
            Spacer(Modifier.height(16.dp))

            AccountRow(label = "Correo", value = usuario.correo)
            AccountDivider()
            AccountRow(label = "Rol", value = usuario.rol)
            AccountDivider()
            AccountRow(label = "Carnet", value = usuario.carnet)
            AccountDivider()
            AccountRow(
                label = "Estado",
                value = usuario.estado,
                valueColor = Present
            )

            Spacer(Modifier.height(20.dp))

            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                color = BlueWash
            ) {
                Row(
                    modifier = Modifier.padding(start = 16.dp, end = 8.dp, top = 14.dp, bottom = 14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Llamar lista",
                            color = Navy,
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            text = "Toma asistencia de la clase de hoy.",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                    TextButton(onClick = onGoToLista) {
                        Text(
                            text = "Abrir",
                            style = MaterialTheme.typography.labelLarge
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AccountRow(
    label: String,
    value: String,
    valueColor: Color? = null
) {
    val resolvedColor = valueColor ?: MaterialTheme.colorScheme.onSurface
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalAlignment = Alignment.Top
    ) {
        Text(
            text = label,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.weight(0.35f)
        )
        Text(
            text = value,
            color = resolvedColor,
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.weight(0.65f)
        )
    }
}

@Composable
private fun AccountDivider() {
    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
}

@Preview(showBackground = true, widthDp = 390, heightDp = 844)
@Composable
private fun UsuarioScreenPreview() {
    GrupoAlfaTheme {
        UsuarioScreen(
            onLogout = {},
            onGoToLista = {}
        )
    }
}
