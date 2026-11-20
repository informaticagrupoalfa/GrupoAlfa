package com.example.grupoalfa.ui.misparalelos

import android.graphics.Bitmap
import android.graphics.Color
import androidx.compose.foundation.Image
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.example.grupoalfa.data.model.MiParalelo
import com.example.grupoalfa.ui.theme.AlfaWhite
import com.example.grupoalfa.ui.theme.BlueWash
import com.example.grupoalfa.ui.theme.Navy
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter

@Composable
fun ParaleloDetalleScreen(
    paralelo: MiParalelo,
    onVolver: () -> Unit,
    modifier: Modifier = Modifier
) {
    val codigo = paralelo.idEstudiante?.takeIf { it > 0 }?.toString()
    val qr = remember(codigo) {
        codigo?.let { value -> runCatching { generarQr(value) }.getOrNull() }
    }

    Column(
        modifier = modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        TextButton(onClick = onVolver) { Text("← Mis paralelos") }

        Surface(shape = RoundedCornerShape(22.dp), color = Navy) {
            Column(Modifier.fillMaxWidth().padding(22.dp)) {
                Text(paralelo.nombre, color = AlfaWhite, style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold)
                paralelo.facultad?.takeIf { it.isNotBlank() }?.let {
                    Spacer(Modifier.height(5.dp))
                    Text(it, color = AlfaWhite.copy(alpha = 0.85f))
                }
                Text("Capacitación · ${paralelo.modalidad ?: "Modalidad pendiente"}",
                    color = AlfaWhite.copy(alpha = 0.75f), style = MaterialTheme.typography.bodySmall)
            }
        }

        Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surface) {
            Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Información del paralelo", style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold)
                DetailRow("Días", paralelo.dias ?: "Por definir")
                DetailRow("Horario", paralelo.horario ?: "Por definir")
                DetailRow("Aula", paralelo.aulaCodigo ?: "Por definir")
                paralelo.nivel?.let { DetailRow("Nivel", it) }
                paralelo.fechaInicio?.let { DetailRow("Inicio", it) }
                paralelo.fechaFin?.let { DetailRow("Fin", it) }
                paralelo.nroCredencial?.let { DetailRow("Credencial", it.toString()) }
            }
        }

        Surface(shape = RoundedCornerShape(20.dp), color = BlueWash) {
            Column(
                Modifier.fillMaxWidth().padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text("Mi QR de asistencia", style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold, color = Navy)
                Text("Es el mismo QR para todos tus paralelos. Muéstralo al asesor al ingresar a clase.", textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.bodyMedium)
                if (qr != null && codigo != null) {
                    Box(Modifier.background(AlfaWhite, RoundedCornerShape(16.dp)).padding(14.dp)) {
                        Image(bitmap = qr.asImageBitmap(), contentDescription = "QR de asistencia $codigo",
                            modifier = Modifier.size(248.dp), filterQuality = FilterQuality.None)
                    }
                    Text(codigo, style = MaterialTheme.typography.labelLarge, color = Navy)
                } else {
                    Text("El QR aún no está disponible. Vuelve a cargar tus paralelos.",
                        textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.error)
                }
            }
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium)
        Text(value, modifier = Modifier.padding(start = 12.dp), textAlign = TextAlign.End,
            style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
    }
    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
}

private fun generarQr(value: String): Bitmap {
    val matrix = QRCodeWriter().encode(value, BarcodeFormat.QR_CODE, 744, 744)
    val pixels = IntArray(matrix.width * matrix.height) { index ->
        if (matrix[index % matrix.width, index / matrix.width]) Color.BLACK else Color.WHITE
    }
    return Bitmap.createBitmap(matrix.width, matrix.height, Bitmap.Config.ARGB_8888).apply {
        setPixels(pixels, 0, matrix.width, 0, 0, matrix.width, matrix.height)
    }
}
