package com.example.grupoalfa.ui.llamarlista

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.grupoalfa.ui.theme.Amber
import com.example.grupoalfa.ui.theme.GrupoAlfaTheme
import com.example.grupoalfa.ui.theme.Navy
import com.example.grupoalfa.ui.theme.Present
import com.example.grupoalfa.ui.theme.PresentWash

private data class ClaseUiModel(
    val materia: String,
    val tema: String,
    val curso: String,
    val asesor: String,
    val aula: String,
    val fecha: String,
    val horaInicio: String,
    val horaFin: String
)

private data class EstudianteUiModel(
    val nombre: String,
    val horaRegistro: String
) {
    val iniciales: String
        get() = nombre
            .split(" ")
            .filter { it.isNotBlank() }
            .take(2)
            .mapNotNull { it.firstOrNull()?.uppercaseChar() }
            .joinToString("")
}

private val claseDemo = ClaseUiModel(
    materia = "Matemática",
    tema = "Ecuaciones de primer grado",
    curso = "1° Medio A",
    asesor = "Camila Rojas",
    aula = "Aula 204",
    fecha = "24 oct 2026",
    horaInicio = "09:00",
    horaFin = "10:30"
)

private val estudiantesDemo = listOf(
    EstudianteUiModel(nombre = "Antonia Fuentes", horaRegistro = "09:02"),
    EstudianteUiModel(nombre = "Benjamín Silva", horaRegistro = "09:03"),
    EstudianteUiModel(nombre = "Catalina Rivas", horaRegistro = "09:04"),
    EstudianteUiModel(nombre = "Diego Herrera", horaRegistro = "09:05"),
    EstudianteUiModel(nombre = "Emilia Torres", horaRegistro = "09:07")
)

@Composable
fun LlamarListaScreen(modifier: Modifier = Modifier) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            SessionCard(clase = claseDemo)
        }

        item {
            Spacer(Modifier.height(4.dp))
            StudentsHeader(count = estudiantesDemo.size)
        }

        items(
            items = estudiantesDemo,
            key = { it.nombre }
        ) { estudiante ->
            StudentRow(estudiante = estudiante)
        }

        item {
            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
private fun SessionCard(clase: ClaseUiModel) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 3.dp
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Clase de hoy",
                        color = MaterialTheme.colorScheme.onSurface,
                        style = MaterialTheme.typography.titleLarge
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = "Datos de la sesión",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }

                Surface(
                    shape = RoundedCornerShape(100.dp),
                    color = PresentWash
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(7.dp)
                                .background(Present, CircleShape)
                        )
                        Text(
                            text = "En curso",
                            color = Present,
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            Spacer(Modifier.height(18.dp))
            SessionField(label = "Materia", value = clase.materia)
            SessionDivider()
            SessionField(label = "Tema", value = clase.tema)
            SessionDivider()

            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                SessionField(
                    label = "Curso",
                    value = clase.curso,
                    modifier = Modifier.weight(1f)
                )
                SessionField(
                    label = "Asesor",
                    value = clase.asesor,
                    modifier = Modifier.weight(1f)
                )
            }

            SessionDivider()

            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                SessionField(
                    label = "Aula",
                    value = clase.aula,
                    modifier = Modifier.weight(1f)
                )
                SessionField(
                    label = "Fecha",
                    value = clase.fecha,
                    modifier = Modifier.weight(1f)
                )
            }

            SessionDivider()

            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                SessionField(
                    label = "Hora inicio",
                    value = clase.horaInicio,
                    modifier = Modifier.weight(1f),
                    accent = true
                )
                SessionField(
                    label = "Hora fin",
                    value = clase.horaFin,
                    modifier = Modifier.weight(1f),
                    accent = true
                )
            }
        }
    }
}

@Composable
private fun SessionField(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    accent: Boolean = false
) {
    Column(modifier = modifier.padding(vertical = 10.dp)) {
        Text(
            text = label,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodySmall
        )
        Spacer(Modifier.height(3.dp))
        Text(
            text = value,
            color = if (accent) Navy else MaterialTheme.colorScheme.onSurface,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = if (accent) FontWeight.Bold else FontWeight.SemiBold
        )
    }
}

@Composable
private fun SessionDivider() {
    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
}

@Composable
private fun StudentsHeader(count: Int) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Bottom
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "Estudiantes que vinieron",
                color = MaterialTheme.colorScheme.onSurface,
                style = MaterialTheme.typography.titleLarge
            )
            Spacer(Modifier.height(3.dp))
            Text(
                text = "$count registros de asistencia",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodyMedium
            )
        }

        Surface(
            shape = RoundedCornerShape(100.dp),
            color = Amber.copy(alpha = 0.18f)
        ) {
            Text(
                text = "$count presentes",
                color = Navy,
                style = MaterialTheme.typography.labelLarge,
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp)
            )
        }
    }
}

@Composable
private fun StudentRow(estudiante: EstudianteUiModel) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(
            width = 1.dp,
            color = MaterialTheme.colorScheme.outlineVariant
        )
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Surface(
                modifier = Modifier.size(44.dp),
                shape = CircleShape,
                color = PresentWash
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = estudiante.iniciales,
                        color = Present,
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = estudiante.nombre,
                    color = MaterialTheme.colorScheme.onSurface,
                    style = MaterialTheme.typography.titleMedium
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    text = "Registro ${estudiante.horaRegistro}",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            Surface(
                shape = RoundedCornerShape(100.dp),
                color = PresentWash
            ) {
                Text(
                    text = "Presente",
                    color = Present,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                )
            }
        }
    }
}

@Preview(showBackground = true, widthDp = 390, heightDp = 844)
@Composable
private fun LlamarListaScreenPreview() {
    GrupoAlfaTheme {
        LlamarListaScreen()
    }
}
