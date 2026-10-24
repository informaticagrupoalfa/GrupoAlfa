package com.example.grupoalfa.ui.theme

import android.os.Build
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val LightColorScheme = lightColorScheme(
    primary = Blue,
    onPrimary = AlfaWhite,
    primaryContainer = BlueWash,
    onPrimaryContainer = Navy,
    secondary = Amber,
    onSecondary = NavyDeep,
    tertiary = Present,
    background = Paper,
    onBackground = Navy,
    surface = AlfaWhite,
    onSurface = Navy,
    surfaceVariant = Paper,
    onSurfaceVariant = Muted,
    outline = Border,
    outlineVariant = Border,
    error = Absent,
    onError = AlfaWhite
)

private val DarkColorScheme = darkColorScheme(
    primary = BlueLight,
    onPrimary = AlfaWhite,
    primaryContainer = Blue,
    onPrimaryContainer = AlfaWhite,
    secondary = Amber,
    onSecondary = NavyDeep,
    tertiary = Color(0xFF8FD6B0),
    background = NavyDeep,
    onBackground = AlfaWhite,
    surface = Navy,
    onSurface = AlfaWhite,
    surfaceVariant = Color(0xFF12375C),
    onSurfaceVariant = Border,
    outline = Muted,
    outlineVariant = Color(0xFF284A70),
    error = Color(0xFFFFB4AB),
    onError = Color(0xFF690005)
)

@Composable
fun GrupoAlfaTheme(
    darkTheme: Boolean = false,
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }

        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
