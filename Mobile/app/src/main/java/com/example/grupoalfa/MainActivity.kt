package com.example.grupoalfa

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.example.grupoalfa.ui.GrupoAlfaApp
import com.example.grupoalfa.ui.theme.GrupoAlfaTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            GrupoAlfaTheme {
                GrupoAlfaApp()
            }
        }
    }
}
