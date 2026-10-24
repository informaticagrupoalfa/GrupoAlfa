package com.example.grupoalfa.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.grupoalfa.ui.theme.Amber
import com.example.grupoalfa.ui.theme.NavyDeep

@Composable
fun BrandMark(
    modifier: Modifier = Modifier,
    size: Dp = 46.dp
) {
    Box(
        modifier = modifier
            .size(size)
            .background(
                color = Amber,
                shape = RoundedCornerShape(size * 0.12f)
            ),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "GA",
            color = NavyDeep,
            fontSize = (size.value * 0.31f).sp,
            fontWeight = FontWeight.Black,
            letterSpacing = (-0.6).sp
        )
    }
}
