const formulario = document.getElementById("FormRegistro");

if (formulario) {
    formulario.addEventListener("submit", async function (event) {
        event.preventDefault();

        const botonGuardar = formulario.querySelector('button[type="submit"]');
        const asociado = Object.fromEntries(new FormData(formulario).entries());

        if (asociado.contraseña !== asociado.confirmarContraseña) {
            const mensajeEl = document.getElementById("mensajeRegistro");
            if (mensajeEl) {
                mensajeEl.textContent = "Las contraseñas no coinciden.";
                mensajeEl.style.color = "red";
            }
            return;
        }

        delete asociado.confirmarContraseña;
        if (botonGuardar) botonGuardar.disabled = true;

        try {
            const respuesta = await fetch(formulario.action, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(asociado)
            });

            const texto = await respuesta.text();
            let resultado;
            try {
                resultado = JSON.parse(texto);
            } catch {
                throw new Error(`Respuesta no válida del servidor (HTTP ${respuesta.status})`);
            }

            const mensajeEl = document.getElementById("mensajeRegistro");
            if (mensajeEl) {
                mensajeEl.textContent = resultado.mensaje || "";
                mensajeEl.style.color = (respuesta.ok && resultado.success) ? "green" : "red";
            }

            if (respuesta.ok && resultado.success) {
                formulario.reset();
                if (resultado.redirect) {
                    setTimeout(() => {
                        window.location.href = resultado.redirect;
                    }, 1200);
                }
            }
        } catch (error) {
            console.error("Error al enviar el formulario", error);
            const mensajeEl = document.getElementById("mensajeRegistro");
            if (mensajeEl) {
                mensajeEl.textContent = error.message || "Ocurrió un error. Por favor, inténtalo de nuevo.";
                mensajeEl.style.color = "red";
            }
        } finally {
            if (botonGuardar) botonGuardar.disabled = false;
        }
    });
}

function inicializarGestionAsociados() {
    const tablaAsociados = document.getElementById("tablaAsociados");
    const formEditar = document.getElementById("formEditarAsociado");
    const modalEl = document.getElementById("modalEditarAsociado");
    const mensajeGestion = document.getElementById("mensajeGestion");

    if (!tablaAsociados) return;

    let modalEditar = null;
    try {
        if (modalEl && typeof bootstrap !== "undefined" && bootstrap.Modal) {
            modalEditar = new bootstrap.Modal(modalEl);
        }
    } catch (err) {
        console.warn("Bootstrap Modal no disponible:", err);
    }

    let listaAsociados = [];

    const mostrarMensaje = (texto, esError = false) => {
        if (!mensajeGestion) return;
        mensajeGestion.textContent = texto;
        mensajeGestion.className = esError
            ? "mb-3 small fw-semibold text-danger"
            : "mb-3 small fw-semibold text-success";
    };

    const escapeHtml = (valor) => {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    };

    async function cargarAsociados() {
        try {
            console.log("Cargando asociados desde backend...");
            const res = await fetch("../Modelos/gestionarAsociados.php", {
                method: "GET",
                headers: { "Accept": "application/json" },
                credentials: "include"
            });

            if (res.status === 401) {
                mostrarMensaje("No has iniciado sesión o tu sesión ha expirado. Redirigiendo...", true);
                setTimeout(() => {
                    window.location.href = "Login.html";
                }, 1500);
                return;
            }

            const texto = await res.text();
            let data;
            try {
                data = JSON.parse(texto);
            } catch {
                throw new Error(`Respuesta no válida del servidor (HTTP ${res.status}): ${texto.slice(0, 100)}`);
            }

            if (!res.ok || !data.success) {
                throw new Error(data.mensaje || `Error HTTP ${res.status}`);
            }

            console.log("Datos recibidos correctamente:", data);

            const rolUsuario = (data.rol || localStorage.getItem("rol") || "").toLowerCase();
            const esAdmin = rolUsuario === "admin";

            const btnNuevo = document.querySelector('a[href="Registro.html"]');
            if (btnNuevo && !esAdmin) {
                btnNuevo.classList.add("d-none");
            }

            listaAsociados = Array.isArray(data.asociados) ? data.asociados : [];
            renderizarTabla(esAdmin);
        } catch (error) {
            console.error("Error al listar asociados:", error);
            mostrarMensaje(error.message, true);
            tablaAsociados.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-danger py-3">
                        <i class="bi bi-exclamation-triangle me-1"></i> No se pudieron cargar los datos: ${escapeHtml(error.message)}
                    </td>
                </tr>
            `;
        }
    }

    function renderizarTabla(esAdmin = true) {
        if (listaAsociados.length === 0) {
            tablaAsociados.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted py-3">No hay información registrada en la base de datos.</td>
                </tr>
            `;
            return;
        }

        tablaAsociados.innerHTML = listaAsociados.map((a) => `
            <tr>
                <td>${escapeHtml(a.documento)}</td>
                <td>${escapeHtml(a.nombres)}</td>
                <td>${escapeHtml(a.apellidos)}</td>
                <td>${escapeHtml(a.genero)}</td>
                <td>${escapeHtml(a.ciudad)}</td>
                <td>${escapeHtml(a.telefono)}</td>
                <td>${escapeHtml(a.email)}</td>
                <td class="text-nowrap">
                    <button type="button" class="btn btn-sm btn-warning text-dark me-1" onclick="prepararEdicion(${Number(a.idAsociado)})">
                        <i class="bi bi-pencil-square"></i> Editar
                    </button>
                    ${esAdmin ? `
                    <button type="button" class="btn btn-sm btn-danger" onclick="eliminarAsociado(${Number(a.idAsociado)})">
                        <i class="bi bi-trash"></i>
                    </button>
                    ` : ''}
                </td>
            </tr>
        `).join("");
    }

    window.prepararEdicion = (idAsociado) => {
        const asociado = listaAsociados.find((item) => Number(item.idAsociado) === Number(idAsociado));
        if (!asociado || !modalEditar) return;

        document.getElementById("edit_idAsociado").value = asociado.idAsociado ?? "";
        document.getElementById("edit_documento").value = asociado.documento ?? "";
        document.getElementById("edit_nombres").value = asociado.nombres ?? "";
        document.getElementById("edit_apellidos").value = asociado.apellidos ?? "";
        document.getElementById("edit_fechaNacimiento").value = asociado.fechaNacimiento ?? "";
        document.getElementById("edit_genero").value = asociado.genero ?? "";
        document.getElementById("edit_direccionResidencia").value = asociado.direccionResidencia ?? "";
        document.getElementById("edit_ciudad").value = asociado.ciudad ?? "";
        document.getElementById("edit_telefono").value = asociado.telefono ?? "";
        document.getElementById("edit_email").value = asociado.email ?? "";

        modalEditar.show();
    };

    window.eliminarAsociado = async (idAsociado) => {
        if (!confirm("¿Seguro que deseas eliminar este asociado?")) return;

        try {
            const res = await fetch("../Modelos/gestionarAsociados.php", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ idAsociado })
            });

            const texto = await res.text();
            let data;
            try {
                data = JSON.parse(texto);
            } catch {
                throw new Error(`Respuesta no válida del servidor: ${texto.slice(0, 100)}`);
            }

            if (!res.ok || !data.success) {
                throw new Error(data.mensaje || "No se pudo eliminar el asociado");
            }

            mostrarMensaje(data.mensaje || "Asociado eliminado correctamente");
            await cargarAsociados();
        } catch (error) {
            console.error("Error al eliminar asociado:", error);
            mostrarMensaje(error.message, true);
        }
    };

    if (formEditar) {
        formEditar.addEventListener("submit", async (e) => {
            e.preventDefault();
            const datos = Object.fromEntries(new FormData(formEditar).entries());
            datos.idAsociado = Number(datos.idAsociado);

            try {
                const res = await fetch("../Modelos/gestionarAsociados.php", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(datos)
                });

                const texto = await res.text();
                let data;
                try {
                    data = JSON.parse(texto);
                } catch {
                    throw new Error(`Respuesta no válida del servidor: ${texto.slice(0, 100)}`);
                }

                if (!res.ok || !data.success) {
                    throw new Error(data.mensaje || "No se pudo actualizar el asociado");
                }

                if (modalEditar) modalEditar.hide();
                mostrarMensaje(data.mensaje || "Asociado actualizado correctamente");
                await cargarAsociados();
            } catch (error) {
                console.error("Error al actualizar asociado:", error);
                mostrarMensaje(error.message, true);
            }
        });
    }

    cargarAsociados();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializarGestionAsociados);
} else {
    inicializarGestionAsociados();
}
