document.addEventListener("DOMContentLoaded", () => {
    const contenedorSaldos = document.getElementById("contenedorSaldosPrestamos");
    const selectPrestamo = document.getElementById("selectPrestamoPago");
    const inputValorCuota = document.getElementById("inputValorCuota");
    const inputFechaPago = document.getElementById("inputFechaPago");
    const formPago = document.getElementById("formRegistrarPago");
    const tablaMisPagos = document.getElementById("tablaMisPagos");
    const mensajeAlerta = document.getElementById("mensajeAlerta");

    let listaPrestamos = [];
    let listaPagos = [];

    const TASA_FIJA = 0.25;

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

    function calcularCuota(prestamo) {
        const valor = parseFloat(prestamo.valorPrestamo) || 0;
        const cuotas = parseInt(prestamo.numeroCuotas) || 1;
        return (valor * (1 + TASA_FIJA)) / cuotas;
    }

    // Al cambiar el préstamo seleccionado, auto-llenar cuota y fecha
    if (selectPrestamo) {
        selectPrestamo.addEventListener("change", () => {
            const prestamoSel = listaPrestamos.find(p => String(p.idPrestamo) === selectPrestamo.value);
            if (prestamoSel) {
                const cuota = calcularCuota(prestamoSel);
                inputValorCuota.value = cuota.toFixed(2);
                inputValorCuota.readOnly = true;
            } else {
                inputValorCuota.value = "";
                inputValorCuota.readOnly = false;
            }
            // Fecha del pago = hoy (readonly)
            if (inputFechaPago) {
                inputFechaPago.value = new Date().toISOString().split("T")[0];
                inputFechaPago.readOnly = true;
            }
        });
    }

    async function cargarDatosPagos() {
        try {
            const res = await fetch("../Modelos/gestionarPagos.php", {
                method: "GET",
                headers: { "Accept": "application/json" },
                credentials: "include"
            });

            if (res.status === 401) {
                window.location.href = "Login.html";
                return;
            }

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.mensaje || "Error al cargar los comprobantes de pago");
            }

            listaPrestamos = Array.isArray(data.prestamos) ? data.prestamos : [];
            listaPagos = Array.isArray(data.pagos) ? data.pagos : [];

            renderizarSaldosYSelect();
            renderizarTablaPagos();
        } catch (error) {
            console.error("Error al cargar pagos:", error);
            mostrarAlerta(error.message, true);
        }
    }

    function renderizarSaldosYSelect() {
        if (!contenedorSaldos) return;
        contenedorSaldos.innerHTML = "";

        if (selectPrestamo) {
            selectPrestamo.innerHTML = "";
            const optDefault = document.createElement("option");
            optDefault.value = "";
            optDefault.textContent = "-- Selecciona el Crédito a Abonar --";
            selectPrestamo.appendChild(optDefault);
        }

        if (listaPrestamos.length === 0) {
            contenedorSaldos.innerHTML = `
                <div class="col-12">
                    <div class="p-3 text-center text-muted bg-white rounded border shadow-sm">
                        <i class="bi bi-info-circle me-1"></i> No tienes préstamos activos registrados.
                    </div>
                </div>
            `;
            return;
        }

        listaPrestamos.forEach((p) => {
            const valorTotal = parseFloat(p.valorPrestamo) || 0;
            const pagosEsteCredito = listaPagos
                .filter((pago) => Number(pago.idPrestamo) === Number(p.idPrestamo))
                .reduce((acum, pago) => acum + (parseFloat(pago.valorCuota) || 0), 0);

            const saldoPendiente = Math.max(0, valorTotal - pagosEsteCredito);
            const porcentajePagado = valorTotal > 0 ? Math.min(100, Math.round((pagosEsteCredito / valorTotal) * 100)) : 100;
            const cuota = calcularCuota(p);

            const col = document.createElement("div");
            col.className = "col-md-6 col-lg-4";
            col.innerHTML = `
                <div class="card shadow-sm border-0 h-100 p-3 bg-white">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge bg-primary">Crédito #${p.idPrestamo}</span>
                        <span class="badge ${saldoPendiente <= 0 ? 'bg-success' : 'bg-danger'}">
                            ${saldoPendiente <= 0 ? 'Paz y Salvo' : 'Saldo Pendiente'}
                        </span>
                    </div>
                    <div class="small text-muted">Valor Acordado: <strong>${formatearMoneda(valorTotal)}</strong></div>
                    <div class="small text-muted">Cuota mensual: <strong class="text-primary">${formatearMoneda(cuota)}</strong></div>
                    <div class="small text-muted mb-2">Abonado: <strong class="text-success">${formatearMoneda(pagosEsteCredito)}</strong></div>
                    <h5 class="fw-bold text-danger mb-2">Saldo: ${formatearMoneda(saldoPendiente)}</h5>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar bg-success" role="progressbar" style="width: ${porcentajePagado}%;"></div>
                    </div>
                    <small class="text-muted mt-1 text-end">${porcentajePagado}% pagado</small>
                </div>
            `;
            contenedorSaldos.appendChild(col);

            if (selectPrestamo) {
                const opt = document.createElement("option");
                opt.value = p.idPrestamo;
                // Deshabilitar si ya está pagado completamente
                if (saldoPendiente <= 0) {
                    opt.disabled = true;
                    opt.textContent = `Crédito #${p.idPrestamo} - ✅ PAZ Y SALVO`;
                } else {
                    opt.textContent = `Crédito #${p.idPrestamo} - Cuota: ${formatearMoneda(cuota)} - Saldo: ${formatearMoneda(saldoPendiente)}`;
                }
                selectPrestamo.appendChild(opt);
            }
        });
    }

    function renderizarTablaPagos() {
        if (!tablaMisPagos) return;
        tablaMisPagos.innerHTML = "";

        if (listaPagos.length === 0) {
            tablaMisPagos.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="bi bi-info-circle me-1"></i> Aún no has registrado comprobantes de pago.
                    </td>
                </tr>
            `;
            return;
        }

        // Calcular saldo pendiente por préstamo para determinar el estado
        const saldosPorPrestamo = {};
        listaPrestamos.forEach(p => {
            const valorTotal = parseFloat(p.valorPrestamo) || 0;
            const totalAbonado = listaPagos
                .filter(pago => Number(pago.idPrestamo) === Number(p.idPrestamo))
                .reduce((acum, pago) => acum + (parseFloat(pago.valorCuota) || 0), 0);
            saldosPorPrestamo[p.idPrestamo] = Math.max(0, valorTotal - totalAbonado);
        });

        listaPagos.forEach((pago) => {
            const saldo = saldosPorPrestamo[pago.idPrestamo];
            const estaPagado = saldo !== undefined && saldo <= 0;
            const estadoBadge = estaPagado
                ? `<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Pagado</span>`
                : `<span class="badge bg-warning text-dark"><i class="bi bi-exclamation-circle me-1"></i>Debe</span>`;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="fw-bold">#${pago.idPago}</td>
                <td>Crédito #${pago.idPrestamo}</td>
                <td class="text-success fw-bold">${formatearMoneda(pago.valorCuota)}</td>
                <td>${pago.fechaPago}</td>
                <td>${estadoBadge}</td>
            `;
            tablaMisPagos.appendChild(tr);
        });
    }

    if (formPago) {
        formPago.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (!selectPrestamo.value) {
                mostrarAlerta("Selecciona un préstamo antes de registrar el pago.", true);
                return;
            }

            const prestamoSeleccionado = listaPrestamos.find(p => String(p.idPrestamo) === selectPrestamo.value);
            if (!prestamoSeleccionado) {
                mostrarAlerta("Préstamo no encontrado.", true);
                return;
            }

            // Forzar cuota y fecha al enviar
            const cuotaCalculada = calcularCuota(prestamoSeleccionado);
            inputValorCuota.value = cuotaCalculada.toFixed(2);
            if (inputFechaPago) {
                inputFechaPago.value = new Date().toISOString().split("T")[0];
            }

            const datos = {
                idPrestamo: selectPrestamo.value,
                valorCuota: cuotaCalculada.toFixed(2),
                fechaPago: inputFechaPago ? inputFechaPago.value : new Date().toISOString().split("T")[0]
            };

            try {
                const res = await fetch("../Modelos/gestionarPagos.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(datos)
                });

                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error(data.mensaje || "Error al registrar el pago");
                }

                mostrarAlerta("¡Comprobante de pago registrado exitosamente!");
                formPago.reset();
                if (inputValorCuota) inputValorCuota.readOnly = false;
                if (inputFechaPago) inputFechaPago.readOnly = false;
                await cargarDatosPagos();
            } catch (error) {
                mostrarAlerta(error.message, true);
            }
        });
    }

    // Fecha predeterminada al cargar
    if (inputFechaPago && !inputFechaPago.value) {
        inputFechaPago.value = new Date().toISOString().split("T")[0];
    }

    cargarDatosPagos();
});
