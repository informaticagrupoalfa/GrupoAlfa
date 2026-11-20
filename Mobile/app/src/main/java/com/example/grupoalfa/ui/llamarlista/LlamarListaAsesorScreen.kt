package com.example.grupoalfa.ui.llamarlista

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.grupoalfa.data.model.AsignacionAsesor
import com.example.grupoalfa.data.model.ClaseAsesor
import com.example.grupoalfa.data.model.EstudianteParalelo
import com.example.grupoalfa.ui.theme.AlfaWhite
import com.example.grupoalfa.ui.theme.BlueWash
import com.example.grupoalfa.ui.theme.Navy
import com.example.grupoalfa.ui.theme.Present
import com.example.grupoalfa.ui.theme.PresentWash
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions

@Composable
fun LlamarListaAsesorScreen(
    modifier: Modifier = Modifier,
    viewModel: LlamarListaAsesorViewModel = viewModel()
) {
    val state = viewModel.uiState
    val scanner = rememberLauncherForActivityResult(ScanContract()) { result ->
        result.contents?.let(viewModel::registrarCodigo)
    }

    if (state.cargando && state.asignaciones.isEmpty()) {
        Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Surface(shape = RoundedCornerShape(22.dp), color = Navy) {
                Column(Modifier.fillMaxWidth().padding(22.dp)) {
                    Text("Mi jornada docente", color = AlfaWhite,
                        style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(6.dp))
                    Text("Elige un paralelo, abre una clase y registra a tus estudiantes.",
                        color = AlfaWhite.copy(alpha = 0.82f),
                        style = MaterialTheme.typography.bodyMedium)
                    Spacer(Modifier.height(12.dp))
                    Text("${state.asignaciones.size} asignaciones · ${state.clases.size} clases",
                        color = AlfaWhite, style = MaterialTheme.typography.labelLarge)
                }
            }
        }

        if (state.error != null) item {
            Surface(color = MaterialTheme.colorScheme.errorContainer,
                shape = RoundedCornerShape(12.dp)) {
                Column(Modifier.fillMaxWidth().padding(14.dp)) {
                    Text(state.error, color = MaterialTheme.colorScheme.onErrorContainer)
                    if (state.asignaciones.isEmpty()) {
                        OutlinedButton(onClick = viewModel::cargar) { Text("Reintentar") }
                    }
                }
            }
        }
        if (state.mensaje != null) item {
            Surface(color = PresentWash, shape = RoundedCornerShape(12.dp)) {
                Text(state.mensaje, modifier = Modifier.padding(14.dp), color = Present)
            }
        }

        item { SectionHeading("Mis asignaciones", "Solo aparecen los paralelos y días a tu cargo.") }
        if (state.asignaciones.isEmpty()) {
            item { EmptyCard("Sin asignaciones", "Cuando te asignen un paralelo aparecerá aquí.") }
        } else {
            items(state.asignaciones, key = { it.idAsignacion }) { asignacion ->
                AssignmentCard(
                    asignacion = asignacion,
                    selected = state.idAsignacion == asignacion.idAsignacion,
                    onClick = { viewModel.seleccionarAsignacion(asignacion.idAsignacion) }
                )
            }
        }

        state.asignacion?.let { asignacion ->
            item { SectionHeading("Clase", "${asignacion.nombreParalelo} · ${asignacion.nombreMateria}") }
            item {
                Surface(shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surface) {
                    Column(Modifier.fillMaxWidth().padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Button(onClick = viewModel::crearClase, enabled = !state.guardando,
                            modifier = Modifier.fillMaxWidth()) {
                            Text("Crear clase de hoy")
                        }
                        if (state.clasesDeAsignacion.isNotEmpty()) {
                            Text("O abre una clase existente", style = MaterialTheme.typography.labelLarge)
                            state.clasesDeAsignacion.forEach { clase ->
                                ClassChoice(clase, state.idClase == clase.idClase,
                                    onClick = { viewModel.seleccionarClase(clase.idClase) })
                            }
                        }
                    }
                }
            }
        }

        if (state.idClase != null) {
            item {
                Surface(shape = RoundedCornerShape(20.dp), color = BlueWash) {
                    Column(Modifier.fillMaxWidth().padding(18.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("Escanear asistencia", color = Navy,
                            style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        Text("Escanea el QR único del estudiante para registrar asistencia en esta clase.",
                            style = MaterialTheme.typography.bodyMedium)
                        Button(
                            onClick = {
                                scanner.launch(ScanOptions()
                                    .setDesiredBarcodeFormats(ScanOptions.QR_CODE)
                                    .setPrompt("Escanea el QR de asistencia")
                                    .setBeepEnabled(false))
                            },
                            enabled = !state.guardando,
                            modifier = Modifier.fillMaxWidth()
                        ) { Text("Abrir cámara") }
                        OutlinedTextField(
                            value = state.codigoManual,
                            onValueChange = viewModel::cambiarCodigo,
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Código manual") },
                            placeholder = { Text("ID del estudiante") },
                            singleLine = true
                        )
                        OutlinedButton(
                            onClick = { viewModel.registrarCodigo(state.codigoManual) },
                            enabled = state.codigoManual.isNotBlank() && !state.guardando,
                            modifier = Modifier.fillMaxWidth()
                        ) { Text("Registrar código") }
                    }
                }
            }
        }

        item {
            SectionHeading("Estudiantes", "${state.presentes.size} presentes · ${state.pendientes} pendientes")
        }
        when {
            state.asignacion == null -> item {
                EmptyCard("Selecciona un paralelo", "Su lista aparecerá aquí.")
            }
            state.cargandoEstudiantes -> item {
                Box(Modifier.fillMaxWidth().padding(20.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            state.estudiantes.isEmpty() -> item {
                EmptyCard("Sin estudiantes", "Este paralelo todavía no tiene estudiantes inscritos.")
            }
            else -> items(state.estudiantes, key = { it.idEstudiante }) { estudiante ->
                StudentCard(
                    estudiante = estudiante,
                    present = estudiante.idEstudiante in state.presentes,
                    canRegister = state.idClase != null && !state.guardando,
                    onRegister = { viewModel.registrarEstudiante(estudiante.idEstudiante) }
                )
            }
        }
    }
}

@Composable
private fun SectionHeading(title: String, subtitle: String) {
    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
        Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text(subtitle, style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun AssignmentCard(asignacion: AsignacionAsesor, selected: Boolean, onClick: () -> Unit) {
    Surface(onClick = onClick, modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = if (selected) BlueWash else MaterialTheme.colorScheme.surface,
        border = androidx.compose.foundation.BorderStroke(1.dp,
            if (selected) Navy else MaterialTheme.colorScheme.outlineVariant)) {
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Column(Modifier.weight(1f)) {
                Text(asignacion.nombreParalelo, fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.titleMedium)
                Text(asignacion.nombreMateria, style = MaterialTheme.typography.bodyMedium)
                Text(listOfNotNull(asignacion.dia, asignacion.horario,
                    asignacion.aulaCodigo, asignacion.nivel).joinToString(" · "),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall)
            }
            Text(if (selected) "✓" else "→", color = Navy,
                style = MaterialTheme.typography.titleLarge)
        }
    }
}

@Composable
private fun ClassChoice(clase: ClaseAsesor, selected: Boolean, onClick: () -> Unit) {
    FilterChip(selected = selected, onClick = onClick,
        label = { Text("${clase.fechaVisible} · Clase #${clase.idClase}") })
}

@Composable
private fun StudentCard(
    estudiante: EstudianteParalelo,
    present: Boolean,
    canRegister: Boolean,
    onRegister: () -> Unit
) {
    Surface(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface) {
        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.size(42.dp).background(if (present) PresentWash else BlueWash, CircleShape),
                contentAlignment = Alignment.Center) {
                Text(estudiante.nombreCompleto.take(1).uppercase(),
                    color = if (present) Present else Navy, fontWeight = FontWeight.Bold)
            }
            Column(Modifier.weight(1f)) {
                Text(estudiante.nombreCompleto, style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold)
                Text(if (present) "Presente" else "Pendiente",
                    color = if (present) Present else MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall)
            }
            if (!present) {
                OutlinedButton(onClick = onRegister, enabled = canRegister) { Text("Marcar") }
            }
        }
    }
}

@Composable
private fun EmptyCard(title: String, message: String) {
    Surface(shape = RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.surface) {
        Column(Modifier.fillMaxWidth().padding(22.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text(message, style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
