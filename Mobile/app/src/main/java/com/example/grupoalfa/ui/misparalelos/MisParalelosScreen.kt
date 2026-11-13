package com.example.grupoalfa.ui.misparalelos

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.grupoalfa.data.model.MiParalelo
import com.example.grupoalfa.ui.theme.AlfaWhite
import com.example.grupoalfa.ui.theme.Blue
import com.example.grupoalfa.ui.theme.BlueLight
import com.example.grupoalfa.ui.theme.BlueWash
import com.example.grupoalfa.ui.theme.Navy
import com.example.grupoalfa.ui.theme.Present
import com.example.grupoalfa.ui.theme.PresentWash

@Composable
fun MisParalelosScreen(
    modifier: Modifier = Modifier,
    viewModel: MisParalelosViewModel = viewModel()
) {
    val uiState = viewModel.uiState

    Box(modifier = modifier.fillMaxSize()) {
        when {
            uiState.cargando -> {
                Column(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    CircularProgressIndicator()
                    Text(
                        text = "Cargando tus paralelos…",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }

            uiState.error != null -> {
                Column(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(28.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "No pudimos cargar tus paralelos",
                        color = MaterialTheme.colorScheme.onSurface,
                        style = MaterialTheme.typography.titleMedium,
                        textAlign = TextAlign.Center
                    )
                    Text(
                        text = uiState.error.orEmpty(),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyMedium,
                        textAlign = TextAlign.Center
                    )
                    OutlinedButton(onClick = viewModel::cargarParalelos) {
                        Text("Reintentar")
                    }
                }
            }

            else -> {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    item {
                        ParalelosHero(cantidad = uiState.paralelos.size)
                    }

                    if (uiState.paralelos.isEmpty()) {
                        item { EmptyState() }
                    } else {
                        items(uiState.paralelos, key = { it.idParalelo }) { paralelo ->
                            ParaleloCard(paralelo = paralelo)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ParalelosHero(cantidad: Int) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        color = Blue
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.linearGradient(colors = listOf(BlueLight, Blue))
                )
                .padding(24.dp)
        ) {
            Text(
                text = "Mis paralelos",
                color = AlfaWhite,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = if (cantidad == 0) {
                    "Aún no tienes paralelos inscritos."
                } else {
                    "Estás inscrito en $cantidad ${if (cantidad == 1) "paralelo" else "paralelos"}."
                },
                color = AlfaWhite.copy(alpha = 0.9f),
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}

@Composable
private fun EmptyState() {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 2.dp
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "Sin paralelos por ahora",
                color = MaterialTheme.colorScheme.onSurface,
                style = MaterialTheme.typography.titleMedium,
                textAlign = TextAlign.Center
            )
            Text(
                text = "Cuando te matricules en un paralelo aparecerá aquí con su horario y aula.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun ParaleloCard(paralelo: MiParalelo) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 2.dp
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = paralelo.nombre,
                        color = MaterialTheme.colorScheme.onSurface,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    paralelo.facultad
                        ?.takeIf { it.isNotBlank() }
                        ?.let { facultad ->
                            Spacer(Modifier.height(4.dp))
                            Text(
                                text = facultad,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                }

                Surface(
                    shape = RoundedCornerShape(100.dp),
                    color = if (paralelo.activo == false) {
                        MaterialTheme.colorScheme.surfaceVariant
                    } else {
                        PresentWash
                    }
                ) {
                    Text(
                        text = if (paralelo.activo == false) "Inactivo" else "Inscrito",
                        color = if (paralelo.activo == false) {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        } else {
                            Present
                        },
                        style = MaterialTheme.typography.labelLarge,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                    )
                }
            }

            val etiquetas = listOfNotNull(
                paralelo.nivel?.takeIf { it.isNotBlank() },
                paralelo.modalidad?.takeIf { it.isNotBlank() }
            )
            if (etiquetas.isNotEmpty()) {
                Spacer(Modifier.height(14.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    etiquetas.forEach { etiqueta ->
                        Surface(
                            shape = RoundedCornerShape(100.dp),
                            color = BlueWash
                        ) {
                            Text(
                                text = etiqueta,
                                color = Navy,
                                style = MaterialTheme.typography.labelMedium,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(16.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Spacer(Modifier.height(12.dp))

            paralelo.horario?.let { InfoRow(label = "Horario", value = it) }
            paralelo.dias?.takeIf { it.isNotBlank() }?.let { InfoRow(label = "Días", value = it) }
            paralelo.aulaCodigo?.takeIf { it.isNotBlank() }?.let {
                val detalle = paralelo.aulaCapacidad?.let { capacidad -> "$it · $capacidad estudiantes" } ?: it
                InfoRow(label = "Aula", value = detalle)
            }
            paralelo.fechaInicio?.let { InfoRow(label = "Inicio", value = it) }
            paralelo.fechaFin?.let { InfoRow(label = "Fin", value = it) }
            paralelo.nroComprobante?.let { InfoRow(label = "Comprobante", value = it.toString()) }
            paralelo.nroCredencial?.let { InfoRow(label = "Credencial", value = it.toString()) }
        }
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = label,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.width(96.dp)
        )
        Text(
            text = value,
            color = MaterialTheme.colorScheme.onSurface,
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.weight(1f)
        )
    }
}
