package com.example.grupoalfa.ui.login

import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.grupoalfa.ui.components.BrandMark
import com.example.grupoalfa.ui.theme.AlfaWhite
import com.example.grupoalfa.ui.theme.Amber
import com.example.grupoalfa.ui.theme.Blue
import com.example.grupoalfa.ui.theme.GrupoAlfaTheme
import com.example.grupoalfa.ui.theme.Navy
import com.example.grupoalfa.ui.theme.NavyDeep

@Composable
fun LoginScreen(
    onLogin: () -> Unit,
    modifier: Modifier = Modifier
) {
    var email by rememberSaveable { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by rememberSaveable { mutableStateOf(false) }
    var error by rememberSaveable { mutableStateOf("") }

    val focusManager = LocalFocusManager.current
    val scrollState = rememberScrollState()

    val submitLogin: () -> Unit = {
        if (email.isBlank() || password.isBlank()) {
            error = "Completa tu correo y contraseña para continuar."
        } else {
            error = ""
            focusManager.clearFocus()
            onLogin()
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    colors = listOf(NavyDeep, Navy, Blue.copy(alpha = 0.92f))
                )
            )
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawCircle(
                color = Blue.copy(alpha = 0.34f),
                radius = size.width * 0.62f,
                center = Offset(size.width * 1.04f, size.height * 0.08f)
            )
            drawCircle(
                color = Amber.copy(alpha = 0.10f),
                radius = size.width * 0.34f,
                center = Offset(size.width * 0.02f, size.height * 0.92f)
            )
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .imePadding()
                .padding(horizontal = 24.dp, vertical = 28.dp)
        ) {
            BrandHeader()

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    modifier = Modifier
                        .widthIn(max = 460.dp)
                        .verticalScroll(scrollState)
                ) {
                    LoginCard(
                        email = email,
                        password = password,
                        passwordVisible = passwordVisible,
                        error = error,
                        onEmailChange = {
                            email = it
                            error = ""
                        },
                        onPasswordChange = {
                            password = it
                            error = ""
                        },
                        onTogglePassword = { passwordVisible = !passwordVisible },
                        onSubmit = submitLogin,
                        onPasswordDone = submitLogin,
                        onNextField = { focusManager.moveFocus(FocusDirection.Down) }
                    )
                }
            }

            Text(
                text = "Grupo Alfa · Plataforma académica",
                color = AlfaWhite.copy(alpha = 0.58f),
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier
                    .align(Alignment.CenterHorizontally)
                    .padding(top = 24.dp)
            )
        }
    }
}

@Composable
private fun BrandHeader() {
    Row(verticalAlignment = Alignment.CenterVertically) {
        BrandMark(size = 48.dp)
        Spacer(Modifier.width(14.dp))
        Column {
            Text(
                text = "Grupo Alfa",
                color = AlfaWhite,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Sistema académico",
                color = AlfaWhite.copy(alpha = 0.66f),
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

@Composable
private fun LoginCard(
    email: String,
    password: String,
    passwordVisible: Boolean,
    error: String,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onTogglePassword: () -> Unit,
    onSubmit: () -> Unit,
    onPasswordDone: () -> Unit,
    onNextField: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 18.dp
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .width(42.dp)
                    .height(4.dp)
                    .background(Amber, CircleShape)
            )

            Spacer(Modifier.height(4.dp))

            Text(
                text = "Bienvenido de nuevo",
                color = MaterialTheme.colorScheme.onSurface,
                style = MaterialTheme.typography.headlineMedium
            )
            Text(
                text = "Ingresa con tu cuenta para revisar tu jornada y tomar asistencia.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodyMedium
            )

            Spacer(Modifier.height(8.dp))

            OutlinedTextField(
                value = email,
                onValueChange = onEmailChange,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Correo o número de carnet") },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next
                ),
                keyboardActions = KeyboardActions(onNext = { onNextField() })
            )

            OutlinedTextField(
                value = password,
                onValueChange = onPasswordChange,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Contraseña") },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                visualTransformation = if (passwordVisible) {
                    VisualTransformation.None
                } else {
                    PasswordVisualTransformation()
                },
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Done
                ),
                keyboardActions = KeyboardActions(onDone = { onPasswordDone() }),
                trailingIcon = {
                    TextButton(
                        onClick = onTogglePassword,
                        contentPadding = PaddingValues(horizontal = 8.dp)
                    ) {
                        Text(
                            text = if (passwordVisible) "Ocultar" else "Ver",
                            style = MaterialTheme.typography.labelLarge
                        )
                    }
                }
            )

            if (error.isNotBlank()) {
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            Spacer(Modifier.height(4.dp))

            Button(
                onClick = onSubmit,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary
                )
            ) {
                Text(
                    text = "Ingresar",
                    style = MaterialTheme.typography.titleMedium
                )
            }

            Text(
                text = "Acceso exclusivo para personal autorizado.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.align(Alignment.CenterHorizontally)
            )
        }
    }
}

@Preview(showBackground = true, widthDp = 390, heightDp = 844)
@Composable
private fun LoginScreenPreview() {
    GrupoAlfaTheme {
        LoginScreen(onLogin = {})
    }
}
