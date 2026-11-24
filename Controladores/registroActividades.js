document.addEventListener("DOMContentLoaded", () => {
    const listaActividades = document.getElementById("listaActividades");
    const formularioActividad = document.getElementById("formActividad");
    const modalEl = document.getElementById("modalActividad");
    const modalActividad = modalEl ? new bootstrap.Modal(modalEl) : null;

    const modalPartEl = document.getElementById("modalParticipantes");
    const modalParticipantes = modalPartEl ? new bootstrap.Modal(modalPartEl) : null;

    const botonNueva = document.getElementById("btnNuevaActividad") || document.getElementById("nuevaActvidad");
    const mensajeAlerta = document.getElementById("mensajeAlerta");

    const btnToggleInscripcion = document.getElementById("btnToggleInscripcion");
    const tablaListaParticipantes = document.getElementById("tablaListaParticipantes");
    const countParticipantes = document.getElementById("countParticipantes");
    const distTotalRecaudado = document.getElementById("distTotalRecaudado");
    const distParteClub = document.getElementById("distParteClub");
    const distParteAsociados = document.getElementById("distParteAsociados");
    const distGananciaIndividual = document.getElementById("distGananciaIndividual");

    let esAdministrador = false;
    let actividades = [];
    let actividadSeleccionada = null;

    const formatearMoneda = (val) => {
        return Number(val || 0).toLocaleString("es-CO", { style: "currency", currency: "COP" });
    };

    const mostrarAlerta = (mensaje, esError = false) => {
        if (!mensajeAlerta) return;
        mensajeAlerta.textContent = mensaje;
        mensajeAlerta.className = esError
            ? "alert alert-danger mb-3 py-2"
            : "alert alert-success mb-3 py-2";
        mensajeAlerta.classList.remove("d-none");
        setTimeout(() => {
            mensajeAlerta.classList.add("d-none");
        }, 4000);
    };

    function crearCelda(texto) {
        const celda = document.createElement("td");
        celda.textContent = texto ?? "";
        return celda;
    }

    async function solicitarApi(metodo, datos) {
        const opciones = {
            method: metodo,
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            credentials: "include"
        };

        if (datos) {
            opciones.body = JSON.stringify(datos);
        }

        const respuesta = await fetch("../Modelos/gestionarActividades.php", opciones);

        if (respuesta.status === 401) {
            window.location.href = "Login.html";
            return;
        }

        let resultado = {};
        try {
            resultado = await respuesta.json();
        } catch {
            throw new Error(`Respuesta no válida del servidor (HTTP ${respuesta.status})`);
        }

        if (!respuesta.ok || !resultado.success) {
            throw new Error(resultado.mensaje || resultado.message || "Error en la solicitud");
        }

        return resultado;
    }

    function configurarAcciones() {
        if (botonNueva) {
            if (esAdministrador) {
                botonNueva.classList.remove("d-none");
            } else {
                botonNueva.classList.add("d-none");
            }
        }
    }

    function mostrarActividades() {
        if (!listaActividades) return;
        listaActividades.replaceChildren();

        if (actividades.length === 0) {
            const fila = document.createElement("tr");
            const celda = document.createElement("td");
            celda.colSpan = 6;
            celda.className = "text-center py-4 text-muted";
            celda.textContent = "No hay actividades disponibles.";
            fila.append(celda);
            listaActividades.append(fila);
            return;
        }

        actividades.forEach((actividad) => {
            const fila = document.createElement("tr");
            const totalTexto = actividad.totalRecaudado === null || actividad.totalRecaudado === undefined || actividad.totalRecaudado === ""
                ? "Pendiente"
                : formatearMoneda(actividad.totalRecaudado);

            const numParticipantes = Number(actividad.totalParticipantes || 0);

            fila.append(
                crearCelda(actividad.nombreActividad),
                crearCelda(actividad.fechaEvento),
                crearCelda(actividad.municipio),
                crearCelda(totalTexto)
            );

            // Celda de participantes
            const celdaParticipantes = document.createElement("td");
            celdaParticipantes.className = "text-center";
            celdaParticipantes.innerHTML = `<span class="badge bg-secondary fs-6">${numParticipantes}</span>`;
            fila.append(celdaParticipantes);

            // Celda de acciones
            const acciones = document.createElement("td");
            acciones.className = "text-nowrap";

            // Botón ver participantes y distribución
            const btnParticipantes = document.createElement("button");
            btnParticipantes.type = "button";
            btnParticipantes.className = "btn btn-sm btn-outline-info me-2 text-dark";
            btnParticipantes.innerHTML = '<i class="bi bi-people-fill me-1"></i> Participantes & Recaudo';
            btnParticipantes.addEventListener("click", () => abrirParticipantes(actividad));
            acciones.append(btnParticipantes);

            if (esAdministrador) {
                const botonEditar = document.createElement("button");
                botonEditar.type = "button";
                botonEditar.className = "btn btn-sm btn-outline-primary me-2";
                botonEditar.innerHTML = '<i class="bi bi-pencil"></i>';
                botonEditar.title = "Editar actividad";
                botonEditar.addEventListener("click", () => abrirEdicion(actividad));

                const botonEliminar = document.createElement("button");
                botonEliminar.type = "button";
                botonEliminar.className = "btn btn-sm btn-outline-danger";
                botonEliminar.innerHTML = '<i class="bi bi-trash"></i>';
                botonEliminar.title = "Eliminar actividad";
                botonEliminar.addEventListener("click", () => eliminarActividad(actividad));

                acciones.append(botonEditar, botonEliminar);
            }

            fila.append(acciones);
            listaActividades.append(fila);
        });
    }

    async function cargarActividades() {
        try {
            const resultado = await solicitarApi("GET");
            if (!resultado) return;

            esAdministrador = String(resultado.rol).toLowerCase() === "admin";
            configurarAcciones();
            actividades = Array.isArray(resultado.actividades) ? resultado.actividades : [];
            mostrarActividades();
        } catch (error) {
            console.error("Error al cargar actividades:", error);
            mostrarAlerta("Error al cargar las actividades: " + error.message, true);
        }
    }

    async function abrirParticipantes(actividad) {
        if (!modalParticipantes) return;
        actividadSeleccionada = actividad;

        try {
            const res = await fetch(`../Modelos/gestionarActividades.php?accion=participantes&idActividad=${actividad.idActividad}`, {
                method: "GET",
                headers: { "Accept": "application/json" },
                credentials: "include"
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.mensaje || "Error al cargar participantes");
            }

            // Actualizar resumen de distribución
            const calc = data.calculo;
            distTotalRecaudado.textContent = formatearMoneda(calc.totalRecaudado);
            distParteClub.textContent = formatearMoneda(calc.parteClub);
            distParteAsociados.textContent = formatearMoneda(calc.parteDistribuida);
            distGananciaIndividual.textContent = calc.totalParticipantes > 0
                ? formatearMoneda(calc.montoIndividual)
                : "$ 0.00";
            countParticipantes.textContent = calc.totalParticipantes;

            // Renderizar lista
            tablaListaParticipantes.innerHTML = "";
            if (data.participantes.length === 0) {
                tablaListaParticipantes.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center text-muted py-3">Aún no hay asociados inscritos en este evento.</td>
                    </tr>
                `;
            } else {
                data.participantes.forEach((p) => {
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td class="fw-semibold">${p.documento}</td>
                        <td>${p.nombres} ${p.apellidos}</td>
                        <td>${p.telefono || 'N/A'}</td>
                        <td>${p.email}</td>
                    `;
                    tablaListaParticipantes.appendChild(tr);
                });
            }

            // Configurar botón inscribirme / retirarme
            if (btnToggleInscripcion) {
                if (data.estaInscrito) {
                    btnToggleInscripcion.className = "btn btn-sm btn-outline-danger";
                    btnToggleInscripcion.innerHTML = '<i class="bi bi-x-circle me-1"></i> Retirar mi inscripción';
                    btnToggleInscripcion.onclick = () => alternarInscripcion("desinscribir");
                } else {
                    btnToggleInscripcion.className = "btn btn-sm btn-success";
                    btnToggleInscripcion.innerHTML = '<i class="bi bi-check2-circle me-1"></i> Inscribirme a este evento';
                    btnToggleInscripcion.onclick = () => alternarInscripcion("inscribir");
                }
            }

            modalParticipantes.show();
        } catch (error) {
            mostrarAlerta(error.message, true);
        }
    }

    async function alternarInscripcion(accion) {
        if (!actividadSeleccionada) return;

        try {
            await solicitarApi("POST", {
                accion: accion,
                idActividad: actividadSeleccionada.idActividad
            });

            await abrirParticipantes(actividadSeleccionada);
            await cargarActividades();
        } catch (error) {
            alert(error.message);
        }
    }

    function abrirCreacion() {
        if (!modalActividad || !formularioActividad) return;
        formularioActividad.reset();
        document.getElementById("idActividad").value = "";
        const campoTotal = document.getElementById("campoTotalRecaudado");
        if (campoTotal) campoTotal.classList.add("d-none");
        const titulo = document.getElementById("tituloModalActividad");
        if (titulo) titulo.textContent = "Nueva actividad";
        const btnGuardar = document.getElementById("guardarActividad");
        if (btnGuardar) btnGuardar.textContent = "Guardar";
        modalActividad.show();
    }

    function abrirEdicion(actividad) {
        if (!modalActividad || !formularioActividad) return;
        formularioActividad.reset();
        document.getElementById("idActividad").value = actividad.idActividad ?? "";
        document.getElementById("nombreActividad").value = actividad.nombreActividad ?? "";
        document.getElementById("fechaEvento").value = actividad.fechaEvento ?? "";
        document.getElementById("municipio").value = actividad.municipio ?? "";

        const inputTotal = document.getElementById("totalRecaudado");
        if (inputTotal) {
            inputTotal.value = actividad.totalRecaudado ?? "";
        }

        const campoTotal = document.getElementById("campoTotalRecaudado");
        if (campoTotal) campoTotal.classList.remove("d-none");

        const titulo = document.getElementById("tituloModalActividad");
        if (titulo) titulo.textContent = "Editar actividad";

        const btnGuardar = document.getElementById("guardarActividad");
        if (btnGuardar) btnGuardar.textContent = "Guardar cambios";

        modalActividad.show();
    }

    async function eliminarActividad(actividad) {
        const confirmar = window.confirm(`¿Desea eliminar la actividad "${actividad.nombreActividad}"?`);
        if (!confirmar) return;

        try {
            await solicitarApi("DELETE", { idActividad: actividad.idActividad });
            mostrarAlerta("Actividad eliminada correctamente");
            await cargarActividades();
        } catch (error) {
            mostrarAlerta(error.message, true);
        }
    }

    if (botonNueva) {
        botonNueva.addEventListener("click", abrirCreacion);
    }

    if (formularioActividad) {
        formularioActividad.addEventListener("submit", async (evento) => {
            evento.preventDefault();
            const idActividad = document.getElementById("idActividad").value;

            const datos = {
                nombreActividad: document.getElementById("nombreActividad").value.trim(),
                fechaEvento: document.getElementById("fechaEvento").value,
                municipio: document.getElementById("municipio").value.trim()
            };

            const inputTotal = document.getElementById("totalRecaudado");
            if (idActividad) {
                datos.idActividad = Number(idActividad);
                const total = inputTotal ? inputTotal.value : "";
                datos.totalRecaudado = total === "" ? null : Number(total);
            } else if (inputTotal && inputTotal.value !== "") {
                datos.totalRecaudado = Number(inputTotal.value);
            }

            try {
                await solicitarApi(idActividad ? "PUT" : "POST", datos);
                if (modalActividad) modalActividad.hide();
                mostrarAlerta(idActividad ? "Actividad actualizada correctamente" : "Actividad creada exitosamente");
                await cargarActividades();
            } catch (error) {
                alert(error.message);
            }
        });
    }

    cargarActividades();
});
