package com.example.grupoalfa.data.remote

import com.example.grupoalfa.data.model.Asesor
import com.example.grupoalfa.data.model.AsignacionMateria
import com.example.grupoalfa.data.model.AsignacionRol
import com.example.grupoalfa.data.model.Asistencia
import com.example.grupoalfa.data.model.Aula
import com.example.grupoalfa.data.model.Capacitacion
import com.example.grupoalfa.data.model.Clase
import com.example.grupoalfa.data.model.CreateAsistenciaRequest
import com.example.grupoalfa.data.model.CreateClaseRequest
import com.example.grupoalfa.data.model.CreateTemaRequest
import com.example.grupoalfa.data.model.Estudiante
import com.example.grupoalfa.data.model.LoginRequest
import com.example.grupoalfa.data.model.LoginResponse
import com.example.grupoalfa.data.model.Matriculacion
import com.example.grupoalfa.data.model.Materia
import com.example.grupoalfa.data.model.MiParalelo
import com.example.grupoalfa.data.model.Rol
import com.example.grupoalfa.data.model.Tema
import com.example.grupoalfa.data.model.Usuario
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {

    @POST("usuarios/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @GET("usuarios/me")
    suspend fun getMe(): Usuario

    @GET("usuarios/catalogo")
    suspend fun getUsuarioCatalogo(): List<Usuario>

    @GET("usuarios/{id}")
    suspend fun getUsuarioById(@Path("id") id: Int): Usuario

    @GET("asignaciones-rol")
    suspend fun getAsignacionesRol(@Query("id_usuario") idUsuario: Int): List<AsignacionRol>

    @GET("roles/{id}")
    suspend fun getRolById(@Path("id") id: Int): Rol

    // --- Catálogos para llamar lista ---------------------------------------

    @GET("materias")
    suspend fun getMaterias(): List<Materia>

    @GET("asesores")
    suspend fun getAsesores(): List<Asesor>

    @GET("capacitaciones")
    suspend fun getCapacitaciones(): List<Capacitacion>

    @GET("temas")
    suspend fun getTemas(): List<Tema>

    @GET("aulas")
    suspend fun getAulas(
        @Query("limit") limit: Int = 100
    ): List<Aula>

    @GET("estudiantes")
    suspend fun getEstudiantes(): List<Estudiante>

    @GET("asignaciones-materias")
    suspend fun getAsignacionesMaterias(
        @Query("id_curso_capacitacion") idCursoCapacitacion: Int? = null,
        @Query("limit") limit: Int = 100
    ): List<AsignacionMateria>

    @GET("matriculaciones")
    suspend fun getMatriculaciones(
        @Query("id_estudiante") idEstudiante: Int? = null,
        @Query("id_paralelo") idParalelo: Int? = null,
        @Query("limit") limit: Int = 100
    ): List<Matriculacion>

    @GET("mis-paralelos")
    suspend fun getMisParalelos(): List<MiParalelo>

    // --- Clases y asistencias ----------------------------------------------

    @GET("clases")
    suspend fun getClases(
        @Query("desde") desde: String? = null,
        @Query("hasta") hasta: String? = null,
        @Query("limit") limit: Int = 100
    ): List<Clase>

    @GET("capacitaciones/{id}")
    suspend fun getCapacitacion(@Path("id") id: Int): Capacitacion

    @GET("temas/{id}")
    suspend fun getTema(@Path("id") id: Int): Tema

    @GET("materias/{id}")
    suspend fun getMateria(@Path("id") id: Int): Materia

    @GET("asesores/{id}")
    suspend fun getAsesor(@Path("id") id: Int): Asesor

    @GET("asistencias")
    suspend fun getAsistencias(
        @Query("id_clase") idClase: Int,
        @Query("limit") limit: Int = 100
    ): List<Asistencia>

    @POST("temas")
    suspend fun createTema(@Body request: CreateTemaRequest): Tema

    @POST("clases")
    suspend fun createClase(@Body request: CreateClaseRequest): Clase

    @POST("asistencias")
    suspend fun createAsistencia(@Body request: CreateAsistenciaRequest): Asistencia
}
