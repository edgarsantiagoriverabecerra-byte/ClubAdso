document.addEventListener("DOMContentLoaded", () => {
    const formPago = document.getElementById("formPago");
    const tablaPagos = document.getElementById("tablaPagos");
    const selectPrestamo = document.getElementById("idPrestamo");
    const mensajeAlerta = document.getElementById("mensajeAlerta");

    let esAdmin = false;
    let listaPagos = [];

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

    async function cargarPagos() {
        try {
            const res = await fetch("../Modelos/gestionarPagos.php", {
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
                throw new Error(data.mensaje || "Error al cargar los pagos");
            }

            esAdmin = data.rol === "admin";
            listaPagos = Array.isArray(data.pagos) ? data.pagos : [];

            // Llenar selector de préstamos disponibles
            if (selectPrestamo) {
                selectPrestamo.innerHTML = "";
                const optDefault = document.createElement("option");
                optDefault.value = "";
                optDefault.textContent = "-- Seleccione el Préstamo a pagar --";
                selectPrestamo.appendChild(optDefault);

                (data.prestamos || []).forEach((p) => {
                    const opt = document.createElement("option");
                    opt.value = p.idPrestamo;
                    opt.textContent = `Préstamo #${p.idPrestamo} - ${p.nombres} ${p.apellidos} (${formatearMoneda(p.valorPrestamo)})`;
                    selectPrestamo.appendChild(opt);
                });
            }

            renderizarTabla();
        } catch (error) {
            console.error("Error al cargar pagos:", error);
            mostrarAlerta(error.message, true);
        }
    }

    function renderizarTabla() {
        if (!tablaPagos) return;
        tablaPagos.innerHTML = "";

        if (listaPagos.length === 0) {
            tablaPagos.innerHTML = `
                <tr>
                    <td colspan="${esAdmin ? 6 : 5}" class="text-center text-muted py-3">No hay pagos registrados.</td>
                </tr>
            `;
            return;
        }

        listaPagos.forEach((p) => {
            const fila = document.createElement("tr");

            const colIdPago = document.createElement("td");
            colIdPago.textContent = `#${p.idPago}`;
            colIdPago.className = "fw-semibold";

            const colPrestamo = document.createElement("td");
            colPrestamo.textContent = `Préstamo #${p.idPrestamo}`;

            const colAsociado = document.createElement("td");
            colAsociado.textContent = `${p.nombres} ${p.apellidos}`;

            const colValor = document.createElement("td");
            colValor.textContent = formatearMoneda(p.valorCuota);
            colValor.className = "text-success fw-semibold";

            const colFecha = document.createElement("td");
            colFecha.textContent = p.fechaPago;

            fila.append(colIdPago, colPrestamo, colAsociado, colValor, colFecha);

            if (esAdmin) {
                const colAcciones = document.createElement("td");
                const btnEliminar = document.createElement("button");
                btnEliminar.type = "button";
                btnEliminar.className = "btn btn-sm btn-outline-danger";
                btnEliminar.innerHTML = '<i class="bi bi-trash"></i>';
                btnEliminar.title = "Eliminar comprobante";
                btnEliminar.addEventListener("click", () => eliminarPago(p.idPago));
                colAcciones.appendChild(btnEliminar);
                fila.appendChild(colAcciones);
            }

            tablaPagos.appendChild(fila);
        });

        const thAcciones = document.getElementById("thAccionesPagos");
        if (thAcciones) {
            thAcciones.style.display = esAdmin ? "" : "none";
        }
    }

    async function eliminarPago(idPago) {
        if (!confirm(`¿Seguro que deseas eliminar el registro de pago #${idPago}?`)) return;

        try {
            const res = await fetch("../Modelos/gestionarPagos.php", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ idPago })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.mensaje || "Error al eliminar pago");
            }

            mostrarAlerta(data.mensaje || "Pago eliminado correctamente");
            await cargarPagos();
        } catch (error) {
            mostrarAlerta(error.message, true);
        }
    }

    if (formPago) {
        formPago.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btnGuardar = formPago.querySelector('button[type="submit"]');
            if (btnGuardar) btnGuardar.disabled = true;

            const datos = {
                valorCuota: document.getElementById("valorCuota").value,
                fechaPago: document.getElementById("fechaPago").value,
                idPrestamo: selectPrestamo ? selectPrestamo.value : null
            };

            try {
                const res = await fetch("../Modelos/gestionarPagos.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "same-origin",
                    body: JSON.stringify(datos)
                });

                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error(data.mensaje || "No se pudo registrar el pago");
                }

                mostrarAlerta(data.mensaje || "Pago registrado exitosamente");
                formPago.reset();
                await cargarPagos();
            } catch (error) {
                mostrarAlerta(error.message, true);
            } finally {
                if (btnGuardar) btnGuardar.disabled = false;
            }
        });
    }

    cargarPagos();
});
