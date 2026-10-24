package com.example.grupoalfa.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

enum class MainTab(
    val title: String,
    val navLabel: String
) {
    Usuario(title = "Mi usuario", navLabel = "Usuario"),
    LlamarLista(title = "Llamar lista", navLabel = "Llamar lista")
}

@Composable
fun GrupoAlfaBottomBar(
    selectedTab: MainTab,
    onTabSelected: (MainTab) -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 12.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 12.dp, vertical = 8.dp)
                .selectableGroup(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            MainTab.entries.forEach { tab ->
                BottomTabItem(
                    tab = tab,
                    selected = selectedTab == tab,
                    onClick = { onTabSelected(tab) },
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun BottomTabItem(
    tab: MainTab,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val itemColor = if (selected) {
        MaterialTheme.colorScheme.primary
    } else {
        MaterialTheme.colorScheme.onSurfaceVariant
    }

    Column(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .selectable(
                selected = selected,
                onClick = onClick,
                role = Role.Tab
            )
            .background(
                if (selected) {
                    MaterialTheme.colorScheme.primary.copy(alpha = 0.09f)
                } else {
                    androidx.compose.ui.graphics.Color.Transparent
                }
            )
            .padding(vertical = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .width(24.dp)
                .height(3.dp)
                .clip(CircleShape)
                .background(
                    if (selected) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        androidx.compose.ui.graphics.Color.Transparent
                    }
                )
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = tab.navLabel,
            color = itemColor,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium
        )
    }
}
