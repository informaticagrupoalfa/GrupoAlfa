package com.example.grupoalfa.data.repository

import com.example.grupoalfa.data.model.MiParalelo
import com.example.grupoalfa.data.remote.ApiService
import com.example.grupoalfa.data.remote.RetrofitClient

class MisParalelosRepository(
    private val api: ApiService = RetrofitClient.apiService
) {

    /**
     * El backend resuelve al estudiante a partir del JWT de la sesión,
     * por lo que no se envía ningún identificador desde la app.
     */
    suspend fun cargarParalelos(): List<MiParalelo> = api.getMisParalelos()
}
