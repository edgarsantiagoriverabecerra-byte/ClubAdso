document.addEventListener("DOMContentLoaded", () => {
    const modalEl = document.getElementById("modalEditarMisDatos");
    const modalEditar = modalEl ? new bootstrap.Modal(modalEl) : null;
    const btnEditar = document.getElementById("btnEditarPerfil");
    const formEditar = document.getElementById("formActualizarMisDatos");
    const mensajeAlerta = document.getElementById("mensajeAlerta");

    let datosAsociado = null;

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

    async function cargarMisDatos() {
        try {
            const res = await fetch("../Modelos/gestionarAsociados.php", {
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
                throw new Error(data.mensaje || "Error al consultar la información");
            }

            if (!Array.isArray(data.asociados) || data.asociados.length === 0) {
                throw new Error("No se encontró el registro del asociado en el sistema.");
            }

            datosAsociado = data.asociados[0];
            renderizarFicha(datosAsociado);
        } catch (error) {
            console.error("Error al cargar datos personales:", error);
            mostrarAlerta(error.message, true);
        }
    }

    function renderizarFicha(asoc) {
        document.getElementById("perfilDocumento").textContent = asoc.documento || "-";
        document.getElementById("perfilRol").textContent = asoc.rol || "Asociado";
        document.getElementById("perfilNombres").textContent = asoc.nombres || "-";
        document.getElementById("perfilApellidos").textContent = asoc.apellidos || "-";
        document.getElementById("perfilFechaNacimiento").textContent = asoc.fechaNacimiento || "-";
        document.getElementById("perfilGenero").textContent = asoc.genero || "-";
        document.getElementById("perfilCiudad").textContent = asoc.ciudad || "-";
        document.getElementById("perfilDireccion").textContent = asoc.direccionResidencia || "-";
        document.getElementById("perfilTelefono").textContent = asoc.telefono || "-";
        document.getElementById("perfilEmail").textContent = asoc.email || "-";
    }

    if (btnEditar) {
        btnEditar.addEventListener("click", () => {
            if (!datosAsociado || !modalEditar) return;
            document.getElementById("edit_idAsociado").value = datosAsociado.idAsociado;
            document.getElementById("edit_documento").value = datosAsociado.documento;
            document.getElementById("edit_nombres").value = datosAsociado.nombres;
            document.getElementById("edit_apellidos").value = datosAsociado.apellidos;
            document.getElementById("edit_fechaNacimiento").value = datosAsociado.fechaNacimiento;
            document.getElementById("edit_genero").value = datosAsociado.genero;
            document.getElementById("edit_ciudad").value = datosAsociado.ciudad;
            document.getElementById("edit_telefono").value = datosAsociado.telefono;
            document.getElementById("edit_email").value = datosAsociado.email;
            document.getElementById("edit_direccionResidencia").value = datosAsociado.direccionResidencia;

            modalEditar.show();
        });
    }

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

                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error(data.mensaje || "Error al actualizar la información");
                }

                if (modalEditar) modalEditar.hide();
                mostrarAlerta("Información personal actualizada exitosamente");
                await cargarMisDatos();
            } catch (error) {
                mostrarAlerta(error.message, true);
            }
        });
    }

    cargarMisDatos();
});
