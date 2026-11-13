package com.example.grupoalfa.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.example.grupoalfa.R
import com.example.grupoalfa.ui.theme.AlfaWhite

/**
 * Marca de la aplicación usando el logotipo personalizado ya incluido
 * en los recursos del proyecto (mipmap/ic_launcher_foreground).
 */
@Composable
fun BrandMark(
    modifier: Modifier = Modifier,
    size: Dp = 46.dp
) {
    Box(
        modifier = modifier
            .size(size)
            .clip(RoundedCornerShape(size * 0.22f))
            .background(AlfaWhite),
        contentAlignment = Alignment.Center
    ) {
        Image(
            painter = painterResource(R.mipmap.ic_launcher_foreground),
            contentDescription = "Logo de Grupo Alfa",
            modifier = Modifier
                .fillMaxSize()
                .padding(size * 0.05f),
            contentScale = ContentScale.Fit
        )
    }
}
