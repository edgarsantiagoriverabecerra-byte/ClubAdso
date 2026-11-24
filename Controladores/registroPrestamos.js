document.addEventListener("DOMContentLoaded", () => {
    const formPrestamo = document.getElementById("formPrestamo");
    const tablaPrestamos = document.getElementById("tablaPrestamos");
    const selectAsociado = document.getElementById("idAsociado");
    const contenedorAsociado = document.getElementById("contenedorAsociado");
    const mensajeAlerta = document.getElementById("mensajeAlerta");

    let esAdmin = false;
    let listaPrestamos = [];

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

    const formatearMoneda = (val) => {
        return Number(val || 0).toLocaleString("es-CO", { style: "currency", currency: "COP" });
    };

    async function cargarPrestamos() {
        try {
            const res = await fetch("../Modelos/gestionarPrestamos.php", {
                method: "GET",
                headers: { "Accept": "application/json" },
                credentials: "same-origin"
            });

            if (res.status === 401) {
                window.location.href = "Login.html";
                return;
            }

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.mensaje || "Error al cargar los préstamos");
            }

            esAdmin = data.rol === "admin";
            listaPrestamos = Array.isArray(data.prestamos) ? data.prestamos : [];

            // Llenar selector de asociados
            if (selectAsociado) {
                selectAsociado.innerHTML = "";
                if (esAdmin) {
                    if (contenedorAsociado) contenedorAsociado.classList.remove("d-none");
                    const optDefault = document.createElement("option");
                    optDefault.value = "";
                    optDefault.textContent = "-- Seleccione un Asociado --";
                    selectAsociado.appendChild(optDefault);

                    (data.asociados || []).forEach((a) => {
                        const opt = document.createElement("option");
                        opt.value = a.idAsociado;
                        opt.textContent = `${a.nombres} ${a.apellidos} (Doc: ${a.documento})`;
                        if (Number(a.idAsociado) === Number(data.idAsociadoActual)) {
                            opt.selected = true;
                        }
                        selectAsociado.appendChild(opt);
                    });
                } else {
                    if (contenedorAsociado) contenedorAsociado.classList.add("d-none");
                    const opt = document.createElement("option");
                    opt.value = data.idAsociadoActual;
                    opt.textContent = data.nombreUsuario;
                    opt.selected = true;
                    selectAsociado.appendChild(opt);
                }
            }

            renderizarTabla();
        } catch (error) {
            console.error("Error al cargar préstamos:", error);
            mostrarAlerta(error.message, true);
        }
    }

    function renderizarTabla() {
        if (!tablaPrestamos) return;
        tablaPrestamos.innerHTML = "";

        if (listaPrestamos.length === 0) {
            tablaPrestamos.innerHTML = `
                <tr>
                    <td colspan="${esAdmin ? 7 : 6}" class="text-center text-muted py-3">No hay préstamos registrados.</td>
                </tr>
            `;
            return;
        }

        listaPrestamos.forEach((p) => {
            const fila = document.createElement("tr");

            const colId = document.createElement("td");
            colId.textContent = `#${p.idPrestamo}`;
            colId.className = "fw-semibold";

            const colAsociado = document.createElement("td");
            colAsociado.textContent = `${p.nombres} ${p.apellidos}`;

            const colValor = document.createElement("td");
            colValor.textContent = formatearMoneda(p.valorPrestamo);

            const colTasa = document.createElement("td");
            colTasa.textContent = `${Number(p.tasaInteres)}%`;

            const colCuotas = document.createElement("td");
            colCuotas.textContent = p.numeroCuotas;

            const colFecha = document.createElement("td");
            colFecha.textContent = p.fechaPrestamo;

            fila.append(colId, colAsociado, colValor, colTasa, colCuotas, colFecha);

            if (esAdmin) {
                const colAcciones = document.createElement("td");
                const btnEliminar = document.createElement("button");
                btnEliminar.type = "button";
                btnEliminar.className = "btn btn-sm btn-outline-danger";
                btnEliminar.innerHTML = '<i class="bi bi-trash"></i>';
                btnEliminar.title = "Eliminar préstamo";
                btnEliminar.addEventListener("click", () => eliminarPrestamo(p.idPrestamo));
                colAcciones.appendChild(btnEliminar);
                fila.appendChild(colAcciones);
            }

            tablaPrestamos.appendChild(fila);
        });

        // Mostrar / ocultar encabezado de acciones
        const thAcciones = document.getElementById("thAccionesPrestamos");
        if (thAcciones) {
            thAcciones.style.display = esAdmin ? "" : "none";
        }
    }

    async function eliminarPrestamo(idPrestamo) {
        if (!confirm(`¿Seguro que deseas eliminar el préstamo #${idPrestamo}?`)) return;

        try {
            const res = await fetch("../Modelos/gestionarPrestamos.php", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ idPrestamo })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.mensaje || "Error al eliminar");
            }

            mostrarAlerta(data.mensaje || "Préstamo eliminado correctamente");
            await cargarPrestamos();
        } catch (error) {
            mostrarAlerta(error.message, true);
        }
    }

    if (formPrestamo) {
        formPrestamo.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btnGuardar = formPrestamo.querySelector('button[type="submit"]');
            if (btnGuardar) btnGuardar.disabled = true;

            const datos = {
                valorPrestamo: document.getElementById("valorPrestamo").value,
                tasaInteres: document.getElementById("tasaInteres").value,
                numeroCuotas: document.getElementById("numeroCuotas").value,
                fechaPrestamo: document.getElementById("fechaPrestamo").value,
                idAsociado: selectAsociado ? selectAsociado.value : null
            };

            try {
                const res = await fetch("../Modelos/gestionarPrestamos.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "same-origin",
                    body: JSON.stringify(datos)
                });

                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error(data.mensaje || "No se pudo registrar el préstamo");
                }

                mostrarAlerta(data.mensaje || "Préstamo registrado exitosamente");
                formPrestamo.reset();
                await cargarPrestamos();
            } catch (error) {
                mostrarAlerta(error.message, true);
            } finally {
                if (btnGuardar) btnGuardar.disabled = false;
            }
        });
    }

    cargarPrestamos();
});
