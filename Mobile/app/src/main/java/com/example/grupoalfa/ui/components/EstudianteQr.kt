package com.example.grupoalfa.ui.components

import android.graphics.Bitmap
import android.graphics.Color
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.example.grupoalfa.ui.theme.AlfaWhite
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter

@Composable
fun EstudianteQr(idEstudiante: Int, size: Dp) {
    val codigo = idEstudiante.toString()
    val qr = remember(idEstudiante) { runCatching { generarQr(codigo) }.getOrNull() }

    if (qr == null) {
        Text(
            text = "No se pudo generar el QR.",
            color = MaterialTheme.colorScheme.error,
            textAlign = TextAlign.Center
        )
        return
    }

    Box(Modifier.background(AlfaWhite, RoundedCornerShape(16.dp)).padding(14.dp)) {
        Image(
            bitmap = qr.asImageBitmap(),
            contentDescription = "QR de asistencia $codigo",
            modifier = Modifier.size(size),
            filterQuality = FilterQuality.None
        )
    }
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
