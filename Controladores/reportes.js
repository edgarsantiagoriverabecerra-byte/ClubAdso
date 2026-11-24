document.addEventListener("DOMContentLoaded", () => {
    const kpiTotalPrestado = document.getElementById("kpiTotalPrestado");
    const kpiTotalPagado = document.getElementById("kpiTotalPagado");
    const kpiCarteraPendiente = document.getElementById("kpiCarteraPendiente");
    const kpiRecaudoActividades = document.getElementById("kpiRecaudoActividades");

    const tablaCartera = document.getElementById("tablaCartera");
    const tablaActividades = document.getElementById("tablaActividadesBalance");
    const filtroCartera = document.getElementById("filtroCartera");
    const mensajeAlerta = document.getElementById("mensajeAlerta");

    let listaCartera = [];

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
    };

    async function cargarReportes() {
        try {
            const res = await fetch("../Modelos/gestionarReportes.php", {
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
                throw new Error(data.mensaje || "Error al cargar los reportes financieros");
            }

            // 1. Cargar KPIs
            if (data.kpis) {
                kpiTotalPrestado.textContent = formatearMoneda(data.kpis.totalPrestado);
                kpiTotalPagado.textContent = formatearMoneda(data.kpis.totalPagado);
                kpiCarteraPendiente.textContent = formatearMoneda(data.kpis.carteraPendiente);
                if (kpiRecaudoActividades) {
                    kpiRecaudoActividades.textContent = formatearMoneda(data.kpis.totalRecaudadoActividades ?? 0);
                }
            }

            // 2. Cargar Cartera
            listaCartera = Array.isArray(data.cartera) ? data.cartera : [];
            renderizarCartera(listaCartera);

            // 3. Cargar Balance de Actividades
            renderizarActividades(Array.isArray(data.actividades) ? data.actividades : []);

        } catch (error) {
            console.error("Error al cargar reportes:", error);
            mostrarAlerta(error.message, true);
        }
    }

    function renderizarCartera(datos) {
        if (!tablaCartera) return;
        tablaCartera.innerHTML = "";

        if (datos.length === 0) {
            tablaCartera.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted py-3">No hay registros de cartera para mostrar.</td>
                </tr>
            `;
            return;
        }

        datos.forEach((item) => {
            const fila = document.createElement("tr");

            const saldo = Number(item.saldoPendiente || 0);
            const numPrestamos = Number(item.numeroPrestamos || 0);

            let badgeEstado = '';
            if (numPrestamos === 0) {
                badgeEstado = '<span class="badge bg-secondary">Sin Créditos</span>';
            } else if (saldo <= 0) {
                badgeEstado = '<span class="badge bg-success">Al Día (Paz y Salvo)</span>';
            } else {
                badgeEstado = `<span class="badge bg-danger">Saldo Pendiente (${formatearMoneda(saldo)})</span>`;
            }

            fila.innerHTML = `
                <td class="fw-semibold">${item.documento}</td>
                <td>${item.nombres} ${item.apellidos}</td>
                <td>${item.telefono || 'N/A'}</td>
                <td class="text-center">${numPrestamos}</td>
                <td>${formatearMoneda(item.totalPrestado)}</td>
                <td class="text-success fw-semibold">${formatearMoneda(item.totalPagado)}</td>
                <td class="${saldo > 0 ? 'text-danger fw-bold' : 'text-muted'}">${formatearMoneda(saldo)}</td>
                <td>${badgeEstado}</td>
            `;

            tablaCartera.appendChild(fila);
        });
    }

    function renderizarActividades(datos) {
        if (!tablaActividades) return;
        tablaActividades.innerHTML = "";

        if (datos.length === 0) {
            tablaActividades.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted py-3">No hay eventos o actividades registradas con balance.</td>
                </tr>
            `;
            return;
        }

        datos.forEach((act) => {
            const fila = document.createElement("tr");
            const recaudado = Number(act.totalRecaudado || 0);
            const participantes = Number(act.totalParticipantes || 0);
            const parteClub = Number(act.parteClub || 0);
            const parteDistribuida = Number(act.parteDistribuida || 0);
            const gananciaPorParticipante = Number(act.gananciaPorParticipante || 0);

            fila.innerHTML = `
                <td class="fw-semibold">${act.nombreActividad}</td>
                <td>${act.fechaEvento}</td>
                <td>${act.municipio}</td>
                <td class="fw-bold">${formatearMoneda(recaudado)}</td>
                <td class="text-center"><span class="badge bg-primary fs-6">${participantes}</span></td>
                <td class="text-info fw-semibold">${formatearMoneda(parteClub)}</td>
                <td class="text-success fw-semibold">${formatearMoneda(parteDistribuida)}</td>
                <td class="fw-bold text-dark">${participantes > 0 ? formatearMoneda(gananciaPorParticipante) : '<span class="text-muted small">Sin participantes</span>'}</td>
            `;

            tablaActividades.appendChild(fila);
        });
    }

    if (filtroCartera) {
        filtroCartera.addEventListener("input", (e) => {
            const texto = e.target.value.toLowerCase().trim();
            const filtrados = listaCartera.filter((item) => {
                const nombreCompleto = `${item.nombres} ${item.apellidos}`.toLowerCase();
                const doc = String(item.documento).toLowerCase();
                return nombreCompleto.includes(texto) || doc.includes(texto);
            });
            renderizarCartera(filtrados);
        });
    }

    cargarReportes();
});
