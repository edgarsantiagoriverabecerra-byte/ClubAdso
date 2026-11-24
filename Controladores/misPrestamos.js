document.addEventListener("DOMContentLoaded", () => {
    const simMonto = document.getElementById("simMonto");
    const simTasa = document.getElementById("simTasa");
    const simCuotas = document.getElementById("simCuotas");
    const formSimulador = document.getElementById("formSimulador");

    const resCuotaMensual = document.getElementById("resCuotaMensual");
    const resTotalIntereses = document.getElementById("resTotalIntereses");
    const resTotalPagar = document.getElementById("resTotalPagar");

    const tablaMisPrestamos = document.getElementById("tablaMisPrestamos");
    const mensajeAlerta = document.getElementById("mensajeAlerta");

    let listaPrestamos = [];

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

    function calcularSimulacion() {
        const monto = parseFloat(simMonto.value) || 0;
        const tasaMensual = parseFloat(simTasa.value) || 0;
        const cuotas = parseInt(simCuotas.value) || 1;

        if (monto <= 0 || cuotas <= 0) {
            resCuotaMensual.textContent = "$ 0";
            resTotalIntereses.textContent = "$ 0";
            resTotalPagar.textContent = "$ 0";
            return;
        }

        // Interés simple mensual acordado
        const interesTotal = monto * (tasaMensual / 100) * cuotas;
        const totalPagar = monto + interesTotal;
        const cuotaMensual = totalPagar / cuotas;

        resCuotaMensual.textContent = formatearMoneda(cuotaMensual);
        resTotalIntereses.textContent = formatearMoneda(interesTotal);
        resTotalPagar.textContent = formatearMoneda(totalPagar);
    }

    [simMonto, simTasa, simCuotas].forEach((el) => {
        if (el) el.addEventListener("input", calcularSimulacion);
    });

    async function cargarMisPrestamos() {
        try {
            // Cargar préstamos y pagos en paralelo
            const [resPrestamos, resPagos] = await Promise.all([
                fetch("../Modelos/gestionarPrestamos.php", {
                    method: "GET",
                    headers: { "Accept": "application/json" },
                    credentials: "include"
                }),
                fetch("../Modelos/gestionarPagos.php", {
                    method: "GET",
                    headers: { "Accept": "application/json" },
                    credentials: "include"
                })
            ]);

            if (resPrestamos.status === 401) {
                window.location.href = "Login.html";
                return;
            }

            const dataPrestamos = await resPrestamos.json();
            if (!resPrestamos.ok || !dataPrestamos.success) {
                throw new Error(dataPrestamos.mensaje || "Error al cargar los préstamos");
            }

            const dataPagos = resPagos.ok ? await resPagos.json() : { pagos: [] };
            const listaPagos = Array.isArray(dataPagos.pagos) ? dataPagos.pagos : [];

            listaPrestamos = Array.isArray(dataPrestamos.prestamos) ? dataPrestamos.prestamos : [];
            renderizarTabla(listaPagos);
        } catch (error) {
            console.error("Error al cargar préstamos:", error);
            mostrarAlerta(error.message, true);
        }
    }

    function renderizarTabla(listaPagos = []) {
        if (!tablaMisPrestamos) return;
        tablaMisPrestamos.innerHTML = "";

        if (listaPrestamos.length === 0) {
            tablaMisPrestamos.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        <i class="bi bi-info-circle me-1"></i> No tienes préstamos activos registrados actualmente.
                    </td>
                </tr>
            `;
            return;
        }

        const TASA_FIJA = 0.25;

        listaPrestamos.forEach((p) => {
            const valorTotal = parseFloat(p.valorPrestamo) || 0;
            const totalAbonado = listaPagos
                .filter(pago => Number(pago.idPrestamo) === Number(p.idPrestamo))
                .reduce((acum, pago) => acum + (parseFloat(pago.valorCuota) || 0), 0);
            const saldoPendiente = Math.max(0, valorTotal * (1 + TASA_FIJA) - totalAbonado);
            const estaPagado = saldoPendiente <= 0;

            const estadoBadge = estaPagado
                ? `<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Pagado</span>`
                : `<span class="badge bg-warning text-dark"><i class="bi bi-exclamation-circle me-1"></i>Debe</span>`;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="fw-bold">#${p.idPrestamo}</td>
                <td class="text-primary fw-semibold">${formatearMoneda(p.valorPrestamo)}</td>
                <td>${Number(p.tasaInteres)}% mes</td>
                <td><span class="badge bg-light text-dark border">${p.numeroCuotas} meses</span></td>
                <td>${p.fechaPrestamo}</td>
                <td>${estadoBadge}</td>
            `;

            tablaMisPrestamos.appendChild(tr);
        });
    }

    if (formSimulador) {
        formSimulador.addEventListener("submit", async (e) => {
            e.preventDefault();

            const hoy = new Date().toISOString().split("T")[0];
            const datos = {
                valorPrestamo: simMonto.value,
                tasaInteres: simTasa.value,
                numeroCuotas: simCuotas.value,
                fechaPrestamo: hoy
            };

            try {
                const res = await fetch("../Modelos/gestionarPrestamos.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(datos)
                });

                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error(data.mensaje || "No se pudo solicitar el crédito");
                }

                mostrarAlerta("¡Crédito solicitado y registrado con éxito!");
                await cargarMisPrestamos();
            } catch (error) {
                mostrarAlerta(error.message, true);
            }
        });
    }

    calcularSimulacion();
    cargarMisPrestamos();
});
